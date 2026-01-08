# Database Schema

**Module**: 04 - Database Schema
**Last Updated**: 2025-12-26

[← Back to Architecture Index](README.md)

---

## Overview

The application uses PostgreSQL 15+ as the primary data store. The database stores user accounts, uploaded resumes, analysis jobs, user profiles, interview questions, and chat messages. The schema uses semantic references instead of foreign key constraints for flexibility.

---

## Database Information

**DBMS**: PostgreSQL 15+
**Database Name**: `ai_chat`
**Database User**: `chatapp`
**Character Encoding**: UTF-8 (supports emojis)
**Timezone**: UTC (all timestamps stored with timezone)

---

## Design Principles

1. **Semantic References**: Uses semantic references instead of FK constraints for flexibility
2. **JSONB for Flexibility**: Uses JSONB columns for semi-structured data (skills, experience, etc.)
3. **Auto-Updating Timestamps**: Triggers automatically update `updated_at` columns
4. **Indexing Strategy**: Comprehensive indexes for common query patterns
5. **Check Constraints**: Data validation at database level
6. **Comments**: All tables and columns documented with comments

---

## Entity Relationship Diagram

```
┌──────────────┐
│    users     │
│──────────────│
│ id (PK)      │
│ name         │
│ email        │◄────────────┐
│ password     │             │
└──────────────┘             │
                             │ (semantic ref)
                             │
┌──────────────┐             │
│user_uploads  │             │
│──────────────│             │
│ id (PK)      │◄────────────┤
│ user_id      │─────────────┘
│ linkedin_url │
│ file_name    │
│ file_content │
│ file_size    │
│ mime_type    │
└───────┬──────┘
        │
        │ (semantic ref)
        │
        ▼
┌──────────────┐
│analysis_jobs │
│──────────────│
│ id (PK)      │
│ job_id (UK)  │
│ upload_id    │─────────┐
│ status       │         │
│ progress     │         │
│ current_step │         │
│ error_msg    │         │
└───────┬──────┘         │
        │                │
        │ (semantic ref) │ (semantic ref)
        │                │
        ▼                ▼
┌──────────────┐     ┌──────────────┐
│user_profile  │     │ saved_inter  │
│──────────────│     │  view_ques   │
│ id (PK)      │     │──────────────│
│ upload_id    │     │ id (PK)      │
│ job_id (UK)  │     │ user_id      │
│ skills (JSON)│     │ job_id       │
│ experience   │     │ question     │
│ education    │     │ answer       │
│ summary      │     │ category     │
│ job_recom    │     │ difficulty   │
│ strengths    │     │ tags[]       │
│ weaknesses   │     └──────────────┘
└──────────────┘

┌──────────────┐
│chat_messages │
│──────────────│
│ id (PK)      │
│ user_id      │─────────────┐
│ to_user_id   │             │ (semantic ref)
│ msg_type     │             │ to users.id
│ text_content │             │ System user_id = 10
│ content      │             │
│ metadata     │             │
│ session_id   │             │
└──────────────┘             ▼
```

**Note**: All `user_id`, `upload_id`, and `job_id` relationships are semantic references (no FK constraints).

---

## Table Schemas

### 1. users

**Purpose**: User authentication and account management

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,  -- ⚠️ Plain text (MOCK only)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Columns**:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | SERIAL | NO | Auto-incrementing primary key |
| name | VARCHAR(255) | NO | User display name |
| email | VARCHAR(255) | NO | User email address (unique) |
| password | VARCHAR(255) | NO | ⚠️ Plain text password (MOCK - not production ready) |
| created_at | TIMESTAMPTZ | NO | Account creation timestamp |
| updated_at | TIMESTAMPTZ | NO | Last update timestamp (auto-updated) |

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (email)`
- `idx_users_email` on `(email)`
- `idx_users_name` on `(name)`

**Triggers**:
- `trigger_update_users_updated_at`: Auto-update `updated_at` on row modification

**Security Warning**:
- ⚠️ Passwords stored in **plain text** (MOCK implementation only)
- ❌ **NOT production ready** - must use bcrypt hashing before deployment

---

### 2. user_uploads

**Purpose**: Stores uploaded resumes and LinkedIn profile URLs

```sql
CREATE TABLE user_uploads (
    id SERIAL PRIMARY KEY,
    linkedin_url VARCHAR(500),
    file_name VARCHAR(255) NOT NULL,
    file_content BYTEA,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 10485760),  -- Max 10MB
    CONSTRAINT valid_linkedin_url CHECK (
        linkedin_url IS NULL OR
        linkedin_url ~* '^https?://(www\.)?linkedin\.com/.*'
    )
);
```

**Columns**:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | SERIAL | NO | Auto-incrementing primary key |
| linkedin_url | VARCHAR(500) | YES | Optional LinkedIn profile URL (validated format) |
| file_name | VARCHAR(255) | NO | Original filename of uploaded resume |
| file_content | BYTEA | YES | Binary content of resume file (PDF, DOCX) |
| file_size | INTEGER | NO | File size in bytes (max 10MB) |
| mime_type | VARCHAR(100) | NO | MIME type (e.g., application/pdf) |
| created_at | TIMESTAMPTZ | NO | Upload timestamp |
| updated_at | TIMESTAMPTZ | NO | Last update timestamp (auto-updated) |

**Indexes**:
- `PRIMARY KEY (id)`
- `idx_user_uploads_created_at` on `(created_at DESC)`
- `idx_user_uploads_filename` on `(file_name)`

**Constraints**:
- `valid_file_size`: Ensures file size is between 1 byte and 10MB (10,485,760 bytes)
- `valid_linkedin_url`: Validates LinkedIn URL format using regex

**Triggers**:
- `update_user_uploads_updated_at`: Auto-update `updated_at` on row modification

---

### 3. analysis_jobs

**Purpose**: Tracks asynchronous resume analysis job status and progress

```sql
CREATE TABLE analysis_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(100) UNIQUE NOT NULL,
    upload_id INTEGER NOT NULL,  -- Semantic ref to user_uploads.id
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    progress INTEGER NOT NULL DEFAULT 0,
    current_step VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100),
    CONSTRAINT valid_status CHECK (
        status IN ('queued', 'extracting_text', 'chunking',
                   'generating_embeddings', 'analyzing',
                   'completed', 'failed')
    )
);
```

**Columns**:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | SERIAL | NO | Auto-incrementing primary key |
| job_id | VARCHAR(100) | NO | Unique job identifier (UUID) |
| upload_id | INTEGER | NO | Semantic reference to user_uploads.id |
| status | VARCHAR(50) | NO | Current job status (see status values below) |
| progress | INTEGER | NO | Progress percentage (0-100) |
| current_step | VARCHAR(100) | YES | Human-readable description of current step |
| error_message | TEXT | YES | Error message if status = 'failed' |
| created_at | TIMESTAMPTZ | NO | Job creation timestamp |
| updated_at | TIMESTAMPTZ | NO | Last update timestamp (auto-updated) |
| completed_at | TIMESTAMPTZ | YES | Job completion timestamp (set when completed/failed) |

**Status Values**:
- `queued`: Job is waiting to be processed
- `extracting_text`: Extracting text from resume PDF/DOCX
- `chunking`: Splitting text into chunks for embedding
- `generating_embeddings`: Generating vector embeddings with OpenAI
- `analyzing`: Analyzing resume with GPT-4
- `completed`: Analysis successfully completed
- `failed`: Analysis failed with error

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (job_id)`
- `idx_analysis_jobs_job_id` on `(job_id)`
- `idx_analysis_jobs_upload_id` on `(upload_id)`
- `idx_analysis_jobs_status` on `(status)`
- `idx_analysis_jobs_created_at` on `(created_at DESC)`

**Constraints**:
- `valid_progress`: Ensures progress is 0-100
- `valid_status`: Ensures status is one of the predefined values

**Triggers**:
- `update_analysis_jobs_updated_at`: Auto-update `updated_at` on row modification

---

### 4. user_profile

**Purpose**: Stores analyzed resume information and extracted user profile data

```sql
CREATE TABLE user_profile (
    id SERIAL PRIMARY KEY,
    upload_id INTEGER NOT NULL,      -- Semantic ref to user_uploads.id
    job_id VARCHAR(100) UNIQUE NOT NULL,  -- Semantic ref to analysis_jobs.job_id
    age INTEGER,
    race VARCHAR(100),
    location VARCHAR(255),
    total_work_years INTEGER,
    skills JSONB,
    experience JSONB,
    education JSONB,
    summary TEXT,
    job_recommendations JSONB,
    strengths JSONB,
    weaknesses JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_age CHECK (age IS NULL OR (age >= 16 AND age <= 100)),
    CONSTRAINT valid_work_years CHECK (total_work_years IS NULL OR (total_work_years >= 0 AND total_work_years <= 80))
);
```

**Columns**:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | SERIAL | NO | Auto-incrementing primary key |
| upload_id | INTEGER | NO | Semantic reference to user_uploads.id |
| job_id | VARCHAR(100) | NO | Semantic reference to analysis_jobs.job_id |
| age | INTEGER | YES | Extracted age (16-100) |
| race | VARCHAR(100) | YES | Extracted race/ethnicity |
| location | VARCHAR(255) | YES | Extracted location |
| total_work_years | INTEGER | YES | Total years of work experience (0-80) |
| skills | JSONB | YES | Skills organized by category (see JSONB structure below) |
| experience | JSONB | YES | Work experience entries (see JSONB structure below) |
| education | JSONB | YES | Education entries (see JSONB structure below) |
| summary | TEXT | YES | Executive summary of resume |
| job_recommendations | JSONB | YES | AI-recommended job titles |
| strengths | JSONB | YES | Identified strengths |
| weaknesses | JSONB | YES | Areas for improvement |
| created_at | TIMESTAMPTZ | NO | Profile creation timestamp |
| updated_at | TIMESTAMPTZ | NO | Last update timestamp (auto-updated) |

**JSONB Structure Examples**:

```json
// skills
{
  "Technical": ["Python", "Go", "React", "PostgreSQL"],
  "Soft Skills": ["Leadership", "Communication", "Problem Solving"]
}

// experience
[
  {
    "company": "ABC Corp",
    "role": "Software Engineer",
    "years": 3,
    "description": "Developed backend services using Go and PostgreSQL"
  },
  {
    "company": "XYZ Inc",
    "role": "Junior Developer",
    "years": 2,
    "description": "Built frontend applications with React"
  }
]

// education
[
  {
    "degree": "BS Computer Science",
    "institution": "XYZ University",
    "year": 2020
  }
]

// job_recommendations
["Senior Software Engineer", "Full Stack Developer", "Tech Lead"]

// strengths
["Strong technical skills in Go and React", "10+ years experience", "Leadership abilities"]

// weaknesses
["Limited cloud experience", "No certifications in AWS/Azure"]
```

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (job_id)`
- `idx_user_profile_upload_id` on `(upload_id)`
- `idx_user_profile_job_id` on `(job_id)`
- `idx_user_profile_location` on `(location)`

**Constraints**:
- `valid_age`: Age must be 16-100 if provided
- `valid_work_years`: Work experience must be 0-80 years if provided

**Triggers**:
- `update_user_profile_updated_at`: Auto-update `updated_at` on row modification

---

### 5. saved_interview_questions

**Purpose**: Stores user-saved interview questions with personalized answers

```sql
CREATE TABLE saved_interview_questions (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    job_id VARCHAR(255) NOT NULL,
    question_id VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50),
    difficulty VARCHAR(20),
    tags TEXT[],
    job_title VARCHAR(255),
    company VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_question UNIQUE (user_id, job_id, question_id),
    CONSTRAINT valid_difficulty CHECK (difficulty IN ('Easy', 'Medium', 'Hard', NULL)),
    CONSTRAINT valid_category CHECK (category IN ('Technical', 'Behavioral', 'Situational', 'Problem-Solving', NULL))
);
```

**Columns**:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | BIGSERIAL | NO | Auto-incrementing primary key |
| user_id | VARCHAR(255) | NO | User identifier (email, UUID, etc.) |
| job_id | VARCHAR(255) | NO | Reference to analysis job |
| question_id | VARCHAR(50) | NO | Question identifier (q1, q2, etc.) |
| question | TEXT | NO | Interview question text |
| answer | TEXT | NO | Personalized answer based on profile |
| category | VARCHAR(50) | YES | Question category (Technical, Behavioral, etc.) |
| difficulty | VARCHAR(20) | YES | Difficulty level (Easy, Medium, Hard) |
| tags | TEXT[] | YES | Array of tags for filtering |
| job_title | VARCHAR(255) | YES | Target job title for context |
| company | VARCHAR(255) | YES | Target company for context |
| created_at | TIMESTAMPTZ | NO | Save timestamp |
| updated_at | TIMESTAMPTZ | NO | Last update timestamp (auto-updated) |

**Categories**:
- `Technical`: Technical/coding questions
- `Behavioral`: Behavioral questions (STAR method)
- `Situational`: Situational judgment questions
- `Problem-Solving`: Problem-solving and case study questions

**Difficulty Levels**:
- `Easy`: Entry-level questions
- `Medium`: Mid-level questions
- `Hard`: Senior-level questions

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE (user_id, job_id, question_id)`
- `idx_saved_questions_user_id` on `(user_id, created_at DESC)`
- `idx_saved_questions_user_question` on `(user_id, question)`
- `idx_saved_questions_user_job` on `(user_id, job_id, created_at DESC)`
- `idx_saved_questions_category` on `(user_id, category, difficulty)`
- `idx_saved_questions_tags` on `(tags)` using GIN index
- `idx_saved_questions_recent` on `(user_id, created_at DESC)` WHERE created_at > now() - 30 days (partial index)

**Constraints**:
- `unique_user_question`: Each user can save a question only once per job
- `valid_difficulty`: Must be Easy, Medium, Hard, or NULL
- `valid_category`: Must be one of the predefined categories or NULL

**Triggers**:
- `trigger_update_saved_questions_updated_at`: Auto-update `updated_at` on row modification

---

### 6. chat_messages

**Purpose**: Stores all chat messages including text, audio, image, and video

```sql
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    msg_type VARCHAR(20) NOT NULL DEFAULT 'text',
    text_content TEXT,
    content BYTEA,
    metadata JSONB,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_msg_type CHECK (msg_type IN ('text', 'image', 'audio', 'video')),
    CONSTRAINT valid_user_id CHECK (user_id > 0),
    CONSTRAINT valid_to_user_id CHECK (to_user_id > 0)
);
```

**Columns**:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | BIGSERIAL | NO | Auto-incrementing primary key |
| user_id | INTEGER | NO | Sender's user ID (system = 10) |
| to_user_id | INTEGER | NO | Recipient's user ID (system = 10) |
| msg_type | VARCHAR(20) | NO | Message type (text, image, audio, video) |
| text_content | TEXT | YES | Text content, URL, or transcript |
| content | BYTEA | YES | Binary content for media messages |
| metadata | JSONB | YES | Message metadata (see structure below) |
| session_id | VARCHAR(255) | YES | Session identifier for grouping conversations |
| created_at | TIMESTAMPTZ | NO | Message timestamp |

**Message Types**:
- `text`: Plain text message (content in `text_content`)
- `image`: Image message (URL in `text_content` or binary in `content`)
- `audio`: Voice message (transcript in `text_content`, audio data in `content`)
- `video`: Video message (description in `text_content`, video data in `content`)

**System User Convention**:
- System user ID = `10`
- User message: `user_id` = actual user, `to_user_id` = 10
- System/AI response: `user_id` = 10, `to_user_id` = actual user

**Metadata JSONB Structure Examples**:

```json
// Audio message metadata
{
  "duration_ms": 5000,
  "mime_type": "audio/webm",
  "sample_rate": 48000
}

// Image message metadata
{
  "width": 800,
  "height": 600,
  "mime_type": "image/jpeg"
}

// Text message with Q&A match
{
  "from_qa": true,
  "similarity": 0.87,
  "matched_question": "What is your experience with React?"
}
```

**Indexes**:
- `PRIMARY KEY (id)`
- `idx_chat_messages_user_id` on `(user_id)`
- `idx_chat_messages_to_user_id` on `(to_user_id)`
- `idx_chat_messages_created_at` on `(created_at DESC)`
- `idx_chat_messages_session` on `(session_id)` WHERE session_id IS NOT NULL
- `idx_chat_messages_msg_type` on `(msg_type)`
- `idx_chat_messages_conversation` on `(LEAST(user_id, to_user_id), GREATEST(user_id, to_user_id), created_at DESC)` (composite index for conversation queries)

**Constraints**:
- `valid_msg_type`: Must be text, image, audio, or video
- `valid_user_id`: Must be > 0
- `valid_to_user_id`: Must be > 0

---

## Common Queries

### Get all uploads for a user

```sql
SELECT *
FROM user_uploads
WHERE user_id = 123
ORDER BY created_at DESC;
```

### Get all jobs for an upload

```sql
SELECT *
FROM analysis_jobs
WHERE upload_id = 456
ORDER BY created_at DESC;
```

### Get profile for a completed job

```sql
SELECT p.*
FROM user_profile p
JOIN analysis_jobs j ON p.job_id = j.job_id
WHERE j.job_id = 'abc-123-def'
  AND j.status = 'completed';
```

### Get recent chat conversation

```sql
SELECT *
FROM chat_messages
WHERE (user_id = 123 AND to_user_id = 10)
   OR (user_id = 10 AND to_user_id = 123)
ORDER BY created_at DESC
LIMIT 50;
```

### Find saved questions by tag

```sql
SELECT *
FROM saved_interview_questions
WHERE user_id = 'user@example.com'
  AND 'python' = ANY(tags)
ORDER BY created_at DESC;
```

---

## Semantic References (No FK Constraints)

**Design Decision**: The schema uses semantic references instead of foreign key constraints.

**Why?**
- **Flexibility**: Easier to modify schema without cascade concerns
- **Performance**: No FK constraint checking overhead
- **Simpler migrations**: No need to manage FK dependencies during schema changes

**Trade-offs**:
- ⚠️ **No referential integrity**: Database won't prevent orphaned records
- ⚠️ **Application-level validation**: Must validate references in application code
- ✅ **Documented relationships**: All relationships documented in column comments

**Example Semantic References**:
- `analysis_jobs.upload_id` → `user_uploads.id` (documented in comment)
- `user_profile.job_id` → `analysis_jobs.job_id` (documented in comment)
- `chat_messages.user_id` → `users.id` (documented in comment)

---

## JSONB Usage

The schema uses JSONB columns for semi-structured data that may vary or expand over time.

**JSONB Columns**:
- `user_profile.skills` - Skills organized by category
- `user_profile.experience` - Work experience entries
- `user_profile.education` - Education entries
- `user_profile.job_recommendations` - Recommended job titles
- `user_profile.strengths` - Identified strengths
- `user_profile.weaknesses` - Areas for improvement
- `chat_messages.metadata` - Message metadata (duration, mime_type, etc.)

**Benefits**:
- Flexible schema evolution
- No need for separate tables for varying structures
- Efficient storage and indexing
- Native JSON operators for querying

**Example Queries**:

```sql
-- Find users with specific skill
SELECT *
FROM user_profile
WHERE skills->>'Technical' ? 'Python';

-- Filter by experience company
SELECT *
FROM user_profile
WHERE experience @> '[{"company": "ABC Corp"}]'::jsonb;
```

---

## Indexing Strategy

### Index Types Used

1. **B-Tree Indexes** (default): For exact matches, ranges, and sorting
   - Primary keys, foreign key columns, created_at columns

2. **GIN Indexes**: For JSONB columns and array columns
   - `saved_interview_questions.tags` (array search)

3. **Partial Indexes**: For frequent filtered queries
   - `idx_saved_questions_recent` (last 30 days only)
   - `idx_chat_messages_session` (WHERE session_id IS NOT NULL)

4. **Composite Indexes**: For multi-column queries
   - `idx_chat_messages_conversation` (user_id, to_user_id, created_at)

### Index Maintenance

**Analyze statistics** (run periodically):
```sql
ANALYZE users;
ANALYZE user_uploads;
ANALYZE analysis_jobs;
ANALYZE user_profile;
ANALYZE saved_interview_questions;
ANALYZE chat_messages;
```

**Reindex** (if performance degrades):
```sql
REINDEX TABLE user_uploads;
REINDEX TABLE analysis_jobs;
```

---

## Data Validation

### Database-Level Validation

**Check Constraints**:
- File size: 1 byte to 10MB
- LinkedIn URL format: Regex validation
- Job progress: 0-100%
- Job status: Predefined enum values
- Age: 16-100 years
- Work years: 0-80 years
- Message type: text, image, audio, video
- Difficulty: Easy, Medium, Hard
- Category: Technical, Behavioral, Situational, Problem-Solving

**Not Null Constraints**:
- All IDs
- Required fields (email, file_name, job_id, etc.)

### Application-Level Validation

**Required but not enforced by DB**:
- User ID ownership (any user can access any job)
- Token expiration
- File type verification (beyond MIME type)
- Input sanitization (SQL injection prevention)

---

## Migrations

**Migration Files** (in `/websocket-server/db/migrations/`):

1. `001_initial_schema.sql` - Initial tables (users, uploads)
2. `002_analysis_tables.sql` - Analysis jobs and user profile
3. `003_add_extracted_text.sql` - Add extracted_text column
4. `004_add_user_id.sql` - Add user_id to user_uploads
5. `005_remove_foreign_keys.sql` - Remove FK constraints (semantic refs)
6. `006_add_user_id_to_analysis_jobs.sql` - Add user_id to analysis_jobs

**How to Apply Migrations**:

```bash
# Apply all migrations
psql -U chatapp -d ai_chat -f db/migrations/002_analysis_tables.sql
```

**Future Migration Tool**: Consider using Flyway, Liquibase, or golang-migrate for automated migrations.

---

## Backup & Recovery

### Backup Strategy

**Full backup** (daily):
```bash
pg_dump -U chatapp ai_chat > backup_$(date +%Y%m%d).sql
```

**Table-specific backup**:
```bash
pg_dump -U chatapp -t user_uploads ai_chat > uploads_backup.sql
```

### Restore

```bash
psql -U chatapp -d ai_chat < backup_20251226.sql
```

---

## Performance Considerations

### Current Performance

| Operation | Performance | Notes |
|-----------|-------------|-------|
| User login | <10ms | Indexed on email |
| Get all jobs for upload | <20ms | Indexed on upload_id |
| Get profile by job_id | <5ms | Unique index on job_id |
| Insert analysis job | <5ms | Serial PK, no FKs |
| Chat message query | <50ms | Composite index on conversation |

### Optimization Opportunities

1. **Connection Pooling**: Not yet configured (use pgBouncer or connection pool in app)
2. **Partitioning**: For large tables (chat_messages, saved_questions) by created_at
3. **Materialized Views**: For expensive aggregate queries
4. **JSONB Indexes**: Add GIN indexes on frequently queried JSONB fields

**Example Partitioning**:
```sql
-- Partition saved_interview_questions by quarter
CREATE TABLE saved_questions_2025_q1 PARTITION OF saved_interview_questions
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
```

---

## Security Considerations

### Current Status

**Implemented**:
- ✅ Check constraints for data validation
- ✅ Unique constraints (email, job_id)
- ✅ Indexes for fast lookups

**NOT Implemented** (CRITICAL for production):
- ❌ **Plain text passwords** (users.password) - MUST hash with bcrypt
- ❌ **Row-level security** (RLS) - Any user can query any data
- ❌ **Encrypted columns** for sensitive data
- ❌ **Audit logging** for data changes
- ❌ **SSL/TLS** connections

### Production Requirements

**Password hashing** (application-level, before insert):
```go
hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
```

**Row-level security** (PostgreSQL RLS):
```sql
ALTER TABLE user_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_uploads_policy ON user_uploads
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::int);
```

**Encrypted connections**:
```env
DATABASE_URL=postgres://chatapp:password@localhost:5432/ai_chat?sslmode=require
```

---

## Data Retention & Cleanup

### Retention Policy (NOT YET IMPLEMENTED)

**Proposed**:
- Chat messages: 90 days
- Failed analysis jobs: 30 days
- Completed analysis jobs: 1 year
- Saved questions: Indefinite (user-owned)

**Example Cleanup Query**:
```sql
-- Delete chat messages older than 90 days
DELETE FROM chat_messages
WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';

-- Delete failed jobs older than 30 days
DELETE FROM analysis_jobs
WHERE status = 'failed'
  AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
```

---

## Known Issues & Limitations

1. **No Foreign Key Constraints**: Semantic references only, no referential integrity
2. **Plain Text Passwords**: CRITICAL security issue (MOCK only)
3. **No Row-Level Security**: Any user can access any data
4. **No Audit Trail**: No tracking of who changed what
5. **No Data Encryption**: Sensitive data stored in plain text
6. **No Connection Pooling**: Each request creates new DB connection
7. **Large Binary Data**: Storing files in BYTEA (consider S3/object storage for scale)

---

## Future Enhancements

1. **Security**: Password hashing, RLS, encrypted columns, audit logging
2. **Scalability**: Connection pooling, partitioning, read replicas
3. **Performance**: Materialized views, JSONB indexes, query optimization
4. **Reliability**: Automated backups, point-in-time recovery, replication
5. **Monitoring**: pg_stat_statements, slow query logging, index usage tracking
6. **Migrations**: Automated migration tool (Flyway, golang-migrate)
7. **Object Storage**: Move file_content to S3/MinIO for better scalability

---

[Next: API Endpoints →](05_api_endpoints.md)

[← Back to Architecture Index](README.md)
