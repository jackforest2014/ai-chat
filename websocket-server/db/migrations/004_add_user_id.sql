-- Migration: Add user_id to tables for user association
-- This migration adds user_id columns for semantic references to the users table
-- Note: No foreign key constraints are used - relationships are semantic only
--
-- Table Relationships (semantic, not enforced):
--   user_uploads.user_id -> users.id (user who uploaded the file)
--   saved_interview_questions.auth_user_id -> users.id (user who saved the question)

-- Add user_id column to user_uploads table
ALTER TABLE user_uploads ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_user_uploads_user_id ON user_uploads (user_id);

-- Drop foreign key constraint if it exists (we don't use FK constraints)
ALTER TABLE user_uploads DROP CONSTRAINT IF EXISTS user_uploads_user_id_fkey;

-- Add comment documenting the semantic reference
COMMENT ON COLUMN user_uploads.user_id IS 'Semantic reference to users.id - the user who uploaded the file. No FK constraint enforced.';

-- Add auth_user_id column to saved_interview_questions for authenticated user reference
ALTER TABLE saved_interview_questions ADD COLUMN IF NOT EXISTS auth_user_id INTEGER;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_saved_questions_auth_user_id ON saved_interview_questions (auth_user_id);

-- Drop foreign key constraint if it exists (we don't use FK constraints)
ALTER TABLE saved_interview_questions DROP CONSTRAINT IF EXISTS saved_interview_questions_auth_user_id_fkey;

-- Add comment documenting the semantic reference
COMMENT ON COLUMN saved_interview_questions.auth_user_id IS 'Semantic reference to users.id - the authenticated user who saved the question. No FK constraint enforced.';

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE user_uploads TO chatapp;
GRANT ALL PRIVILEGES ON TABLE saved_interview_questions TO chatapp;
