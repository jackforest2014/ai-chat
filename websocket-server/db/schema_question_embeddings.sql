-- Migration: Add question embeddings to saved_interview_questions table
-- This enables semantic search for Q&A matching in chat

-- Add embedding column to store vector representation of questions
-- Using BYTEA to store the embedding as binary data (float32 array serialized)
-- Alternative: Use pgvector extension with VECTOR type if available
ALTER TABLE saved_interview_questions
ADD COLUMN IF NOT EXISTS question_embedding BYTEA;

-- Add index for efficient embedding searches
-- Note: This is a placeholder. For production, consider:
-- 1. pgvector extension with VECTOR type and IVFFlat/HNSW index
-- 2. Separate vector database (Qdrant, Milvus, etc.)
CREATE INDEX IF NOT EXISTS idx_saved_questions_embedding
ON saved_interview_questions (id)
WHERE question_embedding IS NOT NULL;

-- Add comment
COMMENT ON COLUMN saved_interview_questions.question_embedding IS
'Vector embedding of the question for semantic similarity search. Stored as serialized float32 array.';
