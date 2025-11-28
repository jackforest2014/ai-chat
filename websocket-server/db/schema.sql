-- Database Schema for Chat Application
-- PostgreSQL 15+

-- ============================================================================
-- Table: user_uploads
-- Description: Stores user uploaded resumes and LinkedIn profile links
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_uploads (
    -- Primary Key
    id SERIAL PRIMARY KEY,

    -- User Information
    linkedin_url VARCHAR(500),  -- Optional LinkedIn profile URL

    -- File Information
    file_name VARCHAR(255) NOT NULL,            -- Original filename
    file_content BYTEA,                          -- File binary content (stores resume directly)
    file_size INTEGER NOT NULL,                  -- File size in bytes
    mime_type VARCHAR(100) NOT NULL,             -- MIME type (e.g., application/pdf)

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 10485760),  -- Max 10MB
    CONSTRAINT valid_linkedin_url CHECK (
        linkedin_url IS NULL OR
        linkedin_url ~* '^https?://(www\.)?linkedin\.com/.*'
    )
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for timestamp-based queries (e.g., recent uploads)
CREATE INDEX IF NOT EXISTS idx_user_uploads_created_at ON user_uploads (created_at DESC);

-- Index for filename searches
CREATE INDEX IF NOT EXISTS idx_user_uploads_filename ON user_uploads (file_name);

-- ============================================================================
-- Trigger: Update timestamp on row modification
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_uploads_updated_at
    BEFORE UPDATE ON user_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE user_uploads IS 'Stores user uploaded resumes and LinkedIn profile URLs';
COMMENT ON COLUMN user_uploads.id IS 'Auto-incrementing primary key';
COMMENT ON COLUMN user_uploads.linkedin_url IS 'Optional LinkedIn profile URL (validated format)';
COMMENT ON COLUMN user_uploads.file_name IS 'Original filename of the uploaded resume';
COMMENT ON COLUMN user_uploads.file_content IS 'Binary content of the resume file (BYTEA)';
COMMENT ON COLUMN user_uploads.file_size IS 'Size of the file in bytes (max 10MB)';
COMMENT ON COLUMN user_uploads.mime_type IS 'MIME type of the file (e.g., application/pdf, application/msword)';
COMMENT ON COLUMN user_uploads.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN user_uploads.updated_at IS 'Timestamp when the record was last updated';

-- ============================================================================
-- Permissions
-- ============================================================================

-- Grant all privileges on the table to the chatapp user
GRANT ALL PRIVILEGES ON TABLE user_uploads TO chatapp;

-- Grant usage and select on the sequence to allow auto-increment
GRANT USAGE, SELECT ON SEQUENCE user_uploads_id_seq TO chatapp;
