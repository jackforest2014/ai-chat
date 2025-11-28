-- Database Schema for Resume Analysis
-- PostgreSQL 15+
-- Migration: Add analysis_jobs and user_profile tables
--
-- NOTE: This project uses semantic references instead of FK constraints.
-- Relationships are documented in column comments.
-- See migration 005_remove_foreign_keys.sql for constraint removal.

-- ============================================================================
-- Table: analysis_jobs
-- Description: Tracks asynchronous resume analysis job status and progress
-- ============================================================================

CREATE TABLE IF NOT EXISTS analysis_jobs (
    -- Primary Key
    id SERIAL PRIMARY KEY,

    -- Job Information
    job_id VARCHAR(100) UNIQUE NOT NULL,
    upload_id INTEGER NOT NULL,  -- Semantic ref to user_uploads.id

    -- Status Tracking
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    -- Status values: 'queued', 'extracting_text', 'chunking',
    --                'generating_embeddings', 'analyzing',
    --                'completed', 'failed'

    progress INTEGER NOT NULL DEFAULT 0,  -- Progress percentage (0-100)
    current_step VARCHAR(100),            -- Human-readable current step description

    -- Error Handling
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100),
    CONSTRAINT valid_status CHECK (
        status IN ('queued', 'extracting_text', 'chunking',
                   'generating_embeddings', 'analyzing',
                   'completed', 'failed')
    )
);

-- ============================================================================
-- Table: user_profile
-- Description: Stores analyzed resume information and extracted user profile data
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profile (
    -- Primary Key
    id SERIAL PRIMARY KEY,

    -- References (semantic, no FK constraints)
    upload_id INTEGER NOT NULL,      -- Semantic ref to user_uploads.id
    job_id VARCHAR(100) UNIQUE NOT NULL,  -- Semantic ref to analysis_jobs.job_id

    -- Personal Information
    age INTEGER,
    race VARCHAR(100),
    location VARCHAR(255),
    total_work_years INTEGER,

    -- Analysis Results (JSONB for flexible structured data)
    skills JSONB,
    -- Example: {"technical": ["Python", "Go", "React"], "soft": ["Leadership", "Communication"]}

    experience JSONB,
    -- Example: [{"company": "ABC Corp", "role": "Software Engineer", "years": 3, "description": "..."}]

    education JSONB,
    -- Example: [{"degree": "BS Computer Science", "institution": "XYZ University", "year": 2020}]

    summary TEXT,              -- Executive summary of the resume

    job_recommendations JSONB,
    -- Example: ["Senior Software Engineer", "Full Stack Developer", "Tech Lead"]

    strengths JSONB,
    -- Example: ["Strong technical skills", "10+ years experience", "Leadership abilities"]

    weaknesses JSONB,
    -- Example: ["Limited cloud experience", "No certifications"]

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_age CHECK (age IS NULL OR (age >= 16 AND age <= 100)),
    CONSTRAINT valid_work_years CHECK (total_work_years IS NULL OR (total_work_years >= 0 AND total_work_years <= 80))
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index for job lookups by job_id
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_job_id ON analysis_jobs (job_id);

-- Index for finding jobs by upload_id
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_upload_id ON analysis_jobs (upload_id);

-- Index for finding jobs by status
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs (status);

-- Index for time-based queries (recent jobs)
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at ON analysis_jobs (created_at DESC);

-- Index for finding profiles by upload_id
CREATE INDEX IF NOT EXISTS idx_user_profile_upload_id ON user_profile (upload_id);

-- Index for finding profiles by job_id
CREATE INDEX IF NOT EXISTS idx_user_profile_job_id ON user_profile (job_id);

-- Index for location-based searches
CREATE INDEX IF NOT EXISTS idx_user_profile_location ON user_profile (location);

-- ============================================================================
-- Triggers: Update timestamp on row modification
-- ============================================================================

CREATE TRIGGER update_analysis_jobs_updated_at
    BEFORE UPDATE ON analysis_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profile_updated_at
    BEFORE UPDATE ON user_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE analysis_jobs IS 'Tracks asynchronous resume analysis job status and progress';
COMMENT ON COLUMN analysis_jobs.job_id IS 'Unique job identifier for tracking analysis progress';
COMMENT ON COLUMN analysis_jobs.upload_id IS 'Reference to the uploaded resume';
COMMENT ON COLUMN analysis_jobs.status IS 'Current status of the analysis job';
COMMENT ON COLUMN analysis_jobs.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN analysis_jobs.current_step IS 'Human-readable description of current processing step';

COMMENT ON TABLE user_profile IS 'Stores analyzed resume information and extracted user profile data';
COMMENT ON COLUMN user_profile.skills IS 'JSONB containing technical and soft skills';
COMMENT ON COLUMN user_profile.experience IS 'JSONB array of work experience entries';
COMMENT ON COLUMN user_profile.education IS 'JSONB array of education entries';
COMMENT ON COLUMN user_profile.job_recommendations IS 'JSONB array of recommended job roles';
COMMENT ON COLUMN user_profile.strengths IS 'JSONB array of identified strengths';
COMMENT ON COLUMN user_profile.weaknesses IS 'JSONB array of areas for improvement';

-- ============================================================================
-- Permissions
-- ============================================================================

-- Grant privileges to the chatapp user
GRANT ALL PRIVILEGES ON TABLE analysis_jobs TO chatapp;
GRANT ALL PRIVILEGES ON TABLE user_profile TO chatapp;

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE analysis_jobs_id_seq TO chatapp;
GRANT USAGE, SELECT ON SEQUENCE user_profile_id_seq TO chatapp;
