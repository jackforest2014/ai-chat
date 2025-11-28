-- Add extracted_text column to analysis_jobs table
ALTER TABLE analysis_jobs ADD COLUMN IF NOT EXISTS extracted_text TEXT;
