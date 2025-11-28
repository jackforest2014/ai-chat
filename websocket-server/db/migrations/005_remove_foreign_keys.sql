-- Migration: Remove foreign key constraints
-- This migration removes all FK constraints and documents relationships as semantic references
-- Relationships are documented in column comments instead of being enforced by the database
--
-- Table Relationships (semantic, not enforced):
--   analysis_jobs.upload_id -> user_uploads.id (the uploaded resume being analyzed)
--   user_profile.upload_id -> user_uploads.id (the uploaded resume for this profile)
--   user_profile.job_id -> analysis_jobs.job_id (the analysis job that created this profile)
--   user_uploads.user_id -> users.id (the user who uploaded the file)
--   saved_interview_questions.auth_user_id -> users.id (the user who saved the question)

-- Drop foreign key constraints from analysis_jobs
ALTER TABLE analysis_jobs DROP CONSTRAINT IF EXISTS analysis_jobs_upload_id_fkey;

-- Drop foreign key constraints from user_profile
ALTER TABLE user_profile DROP CONSTRAINT IF EXISTS user_profile_upload_id_fkey;
ALTER TABLE user_profile DROP CONSTRAINT IF EXISTS user_profile_job_id_fkey;

-- Drop foreign key constraints from user_uploads (if any exist)
ALTER TABLE user_uploads DROP CONSTRAINT IF EXISTS user_uploads_user_id_fkey;

-- Drop foreign key constraints from saved_interview_questions (if any exist)
ALTER TABLE saved_interview_questions DROP CONSTRAINT IF EXISTS saved_interview_questions_auth_user_id_fkey;

-- Update column comments to document semantic references
COMMENT ON COLUMN analysis_jobs.upload_id IS 'Semantic reference to user_uploads.id - the uploaded resume being analyzed. No FK constraint enforced.';
COMMENT ON COLUMN user_profile.upload_id IS 'Semantic reference to user_uploads.id - the uploaded resume for this profile. No FK constraint enforced.';
COMMENT ON COLUMN user_profile.job_id IS 'Semantic reference to analysis_jobs.job_id - the analysis job that created this profile. No FK constraint enforced.';
