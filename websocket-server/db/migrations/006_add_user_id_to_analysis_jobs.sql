-- Migration: Add user_id column to analysis_jobs table
-- This allows filtering analysis jobs by user

-- Add user_id column
ALTER TABLE analysis_jobs ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Add comment explaining the semantic reference
COMMENT ON COLUMN analysis_jobs.user_id IS 'Semantic reference to users.id - the user who initiated the analysis job';

-- Create index for efficient user-based queries
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON analysis_jobs(user_id);

-- Backfill existing records: Get user_id from the associated upload
UPDATE analysis_jobs aj
SET user_id = uu.user_id
FROM user_uploads uu
WHERE aj.upload_id = uu.id
  AND aj.user_id IS NULL;

-- For any remaining records without a matching upload, set a default (optional)
-- UPDATE analysis_jobs SET user_id = 1 WHERE user_id IS NULL;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON analysis_jobs TO chatapp;
