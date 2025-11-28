-- ============================================================================
-- Table: saved_interview_questions
-- Description: Stores user-saved interview questions and personalized answers
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_interview_questions (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,

    -- User & Job Context
    user_id VARCHAR(255) NOT NULL,           -- User identifier (can be email, UUID, etc.)
    job_id VARCHAR(255) NOT NULL,            -- Reference to analysis job

    -- Question Data
    question_id VARCHAR(50) NOT NULL,        -- Question identifier (e.g., "q1", "q2")
    question TEXT NOT NULL,                  -- The interview question
    answer TEXT NOT NULL,                    -- Personalized answer

    -- Question Metadata
    category VARCHAR(50),                    -- Technical, Behavioral, Situational, Problem-Solving
    difficulty VARCHAR(20),                  -- Easy, Medium, Hard
    tags TEXT[],                             -- Array of tags for filtering

    -- Job Context (for reference)
    job_title VARCHAR(255),                  -- The job being applied for
    company VARCHAR(255),                    -- Target company

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_user_question UNIQUE (user_id, job_id, question_id),
    CONSTRAINT valid_difficulty CHECK (difficulty IN ('Easy', 'Medium', 'Hard', NULL)),
    CONSTRAINT valid_category CHECK (category IN ('Technical', 'Behavioral', 'Situational', 'Problem-Solving', NULL))
);

-- ============================================================================
-- Indexes for Efficient Querying
-- ============================================================================

-- Primary index: Query all saved questions for a user
CREATE INDEX IF NOT EXISTS idx_saved_questions_user_id
    ON saved_interview_questions (user_id, created_at DESC);

-- Composite index: Query by user and specific question text (for checking if saved)
CREATE INDEX IF NOT EXISTS idx_saved_questions_user_question
    ON saved_interview_questions (user_id, question);

-- Index for filtering by user and job
CREATE INDEX IF NOT EXISTS idx_saved_questions_user_job
    ON saved_interview_questions (user_id, job_id, created_at DESC);

-- Index for filtering by category and difficulty
CREATE INDEX IF NOT EXISTS idx_saved_questions_category
    ON saved_interview_questions (user_id, category, difficulty);

-- GIN index for efficient tag searches
CREATE INDEX IF NOT EXISTS idx_saved_questions_tags
    ON saved_interview_questions USING GIN (tags);

-- Partial index for recently saved questions (last 30 days)
CREATE INDEX IF NOT EXISTS idx_saved_questions_recent
    ON saved_interview_questions (user_id, created_at DESC)
    WHERE created_at > (CURRENT_TIMESTAMP - INTERVAL '30 days');

-- ============================================================================
-- Trigger: Update timestamp on row modification
-- ============================================================================

CREATE OR REPLACE FUNCTION update_saved_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_saved_questions_updated_at
    BEFORE UPDATE ON saved_interview_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_questions_updated_at();

-- ============================================================================
-- Partitioning Strategy (for scaling with large data)
-- ============================================================================
-- Note: This is a foundation. For very large scale (millions of rows),
-- consider partitioning by created_at (monthly or quarterly)
-- Example:
-- CREATE TABLE saved_interview_questions_2025_q1 PARTITION OF saved_interview_questions
--     FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE saved_interview_questions IS 'Stores user-saved interview questions with personalized answers';
COMMENT ON COLUMN saved_interview_questions.user_id IS 'User identifier (email, UUID, etc.)';
COMMENT ON COLUMN saved_interview_questions.job_id IS 'Reference to the analysis job that generated this question';
COMMENT ON COLUMN saved_interview_questions.question_id IS 'Question identifier within the job (q1, q2, etc.)';
COMMENT ON COLUMN saved_interview_questions.question IS 'The interview question text';
COMMENT ON COLUMN saved_interview_questions.answer IS 'Personalized answer based on user profile';
COMMENT ON COLUMN saved_interview_questions.tags IS 'Array of tags for filtering and search';
COMMENT ON COLUMN saved_interview_questions.job_title IS 'Job title for context';
COMMENT ON COLUMN saved_interview_questions.company IS 'Target company for context';

-- ============================================================================
-- Permissions
-- ============================================================================

GRANT ALL PRIVILEGES ON TABLE saved_interview_questions TO chatapp;
GRANT USAGE, SELECT ON SEQUENCE saved_interview_questions_id_seq TO chatapp;

-- ============================================================================
-- Sample Queries for Testing
-- ============================================================================

-- Query all saved questions for a user
-- SELECT * FROM saved_interview_questions WHERE user_id = 'user@example.com' ORDER BY created_at DESC;

-- Query saved questions for a user and specific job
-- SELECT * FROM saved_interview_questions WHERE user_id = 'user@example.com' AND job_id = 'job_123' ORDER BY created_at DESC;

-- Check if a specific question is already saved
-- SELECT EXISTS (SELECT 1 FROM saved_interview_questions WHERE user_id = 'user@example.com' AND question_id = 'q1' AND job_id = 'job_123');

-- Filter by tags (questions containing 'python' tag)
-- SELECT * FROM saved_interview_questions WHERE user_id = 'user@example.com' AND 'python' = ANY(tags);

-- Filter by category and difficulty
-- SELECT * FROM saved_interview_questions WHERE user_id = 'user@example.com' AND category = 'Technical' AND difficulty = 'Hard';
