# Data Flows

**Module**: 06 - Data Flows
**Last Updated**: 2025-12-26

[← Back to Architecture Index](README.md)

---

## Overview

This module documents the key data flows and business processes in the AI Chat Application. Each flow shows how data moves through the system from user action to final result.

---

## Flow 1: User Authentication

**Purpose**: User login and session creation

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ Browser  │         │ Frontend │         │ Backend  │         │ Database │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ 1. Enter email     │                    │                    │
     │    and password    │                    │                    │
     ├───────────────────>│                    │                    │
     │                    │                    │                    │
     │                    │ 2. POST /api/auth/login                 │
     │                    │    {email, password}                    │
     │                    ├───────────────────>│                    │
     │                    │                    │                    │
     │                    │                    │ 3. SELECT * FROM users
     │                    │                    │    WHERE email = ?
     │                    │                    ├───────────────────>│
     │                    │                    │                    │
     │                    │                    │ 4. User record     │
     │                    │                    │<───────────────────┤
     │                    │                    │                    │
     │                    │                    │ 5. Compare password│
     │                    │                    │    (plain text)    │
     │                    │                    │                    │
     │                    │                    │ 6. Generate token  │
     │                    │                    │    (in-memory)     │
     │                    │                    │                    │
     │                    │ 7. {token, user}   │                    │
     │                    │<───────────────────┤                    │
     │                    │                    │                    │
     │ 8. Display user    │                    │                    │
     │    info            │                    │                    │
     │<───────────────────┤                    │                    │
     │                    │                    │                    │
     │                    │ 9. Store token in  │                    │
     │                    │    localStorage    │                    │
     │                    │                    │                    │
     │                    │ 10. Redirect to    │                    │
     │                    │     /upload        │                    │
     │<───────────────────┤                    │                    │
```

**Steps**:
1. User enters email and password
2. Frontend sends POST to `/api/auth/login`
3. Backend queries `users` table by email
4. Backend compares password (⚠️ plain text comparison)
5. Backend generates session token (stored in-memory map)
6. Backend returns `{token, user}` to frontend
7. Frontend stores token in localStorage
8. Frontend redirects to `/upload` page

**Security Issues**:
- ⚠️ Plain text passwords (MOCK only)
- ⚠️ Tokens stored in-memory (lost on restart)
- ⚠️ localStorage vulnerable to XSS

---

## Flow 2: Resume Upload

**Purpose**: Upload resume file to backend

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ Browser  │         │ Frontend │         │ Backend  │         │ Database │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ 1. Select file     │                    │                    │
     │    (resume.pdf)    │                    │                    │
     ├───────────────────>│                    │                    │
     │                    │                    │                    │
     │                    │ 2. Validate file   │                    │
     │                    │    - Type: PDF/DOCX│                    │
     │                    │    - Size: < 10MB  │                    │
     │                    │                    │                    │
     │                    │ 3. POST /api/upload │                   │
     │                    │    multipart/form-data                  │
     │                    │    - file: binary   │                   │
     │                    │    - linkedin_url   │                   │
     │                    ├───────────────────>│                    │
     │                    │                    │                    │
     │                    │                    │ 4. Validate file   │
     │                    │                    │    - MIME type     │
     │                    │                    │    - File signature│
     │                    │                    │    - Size limit    │
     │                    │                    │                    │
     │                    │                    │ 5. INSERT INTO user_uploads
     │                    │                    │    (file_name, file_content,
     │                    │                    │     file_size, mime_type,
     │                    │                    │     linkedin_url)
     │                    │                    ├───────────────────>│
     │                    │                    │                    │
     │                    │                    │ 6. Upload record   │
     │                    │                    │    with ID         │
     │                    │                    │<───────────────────┤
     │                    │                    │                    │
     │                    │ 7. {id, filename,  │                    │
     │                    │     upload_date}   │                    │
     │                    │<───────────────────┤                    │
     │                    │                    │                    │
     │ 8. Upload success  │                    │                    │
     │    message         │                    │                    │
     │<───────────────────┤                    │                    │
     │                    │                    │                    │
     │                    │ 9. Redirect to     │                    │
     │                    │    /profile        │                    │
     │<───────────────────┤                    │                    │
```

**Steps**:
1. User selects resume file (PDF, DOC, DOCX)
2. Frontend validates:
   - File type (extension check)
   - File size (<10MB)
3. Frontend sends multipart/form-data to `/api/upload`
4. Backend validates:
   - MIME type
   - File signature (magic bytes)
   - Size limit
5. Backend inserts into `user_uploads` table (BYTEA column stores binary)
6. Backend returns upload record with ID
7. Frontend redirects to `/profile` page

**File Storage**:
- Stored in PostgreSQL BYTEA column (max 10MB)
- Not recommended for large scale (consider S3/object storage)

---

## Flow 3: Resume Analysis Pipeline

**Purpose**: Async resume analysis with AI (GPT-4 + Embeddings)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Frontend │    │ Backend  │    │  Worker  │    │ Database │    │  OpenAI  │    │ ChromaDB │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │               │               │
     │ 1. Start job  │               │               │               │               │
     ├──────────────>│               │               │               │               │
     │               │               │               │               │               │
     │               │ 2. Create job │               │               │               │
     │               │    (status=queued)            │               │               │
     │               ├──────────────────────────────>│               │               │
     │               │               │               │               │               │
     │               │ 3. Submit to  │               │               │               │
     │               │    worker pool│               │               │               │
     │               ├──────────────>│               │               │               │
     │               │               │               │               │               │
     │ 4. {job_id}   │               │               │               │               │
     │<──────────────┤               │               │               │               │
     │               │               │               │               │               │
     │               │               │ 5. Acquire    │               │               │
     │               │               │    semaphore  │               │               │
     │               │               │    (1 of 5)   │               │               │
     │               │               │               │               │               │
     │               │               │ 6. Update status:             │               │
     │               │               │    "extracting_text" (10%)    │               │
     │               │               ├──────────────>│               │               │
     │               │               │               │               │               │
     │               │               │ 7. Extract text from PDF/DOCX │               │
     │               │               │    (timeout: 2 min)           │               │
     │               │               │               │               │               │
     │               │               │ 8. Update status:             │               │
     │               │               │    "chunking" (30%)           │               │
     │               │               ├──────────────>│               │               │
     │               │               │               │               │               │
     │               │               │ 9. Chunk text │               │               │
     │               │               │    (1000 chars,│               │               │
     │               │               │     200 overlap)               │               │
     │               │               │               │               │               │
     │               │               │ 10. Update status:            │               │
     │               │               │     "generating_embeddings" (50%)             │
     │               │               ├──────────────>│               │               │
     │               │               │               │               │               │
     │               │               │ 11. For each chunk            │               │
     │               │               ├──────────────────────────────>│               │
     │               │               │     POST /embeddings          │               │
     │               │               │     (ada-002, 1536 dim)       │               │
     │               │               │               │               │               │
     │               │               │ 12. Embeddings│               │               │
     │               │               │<──────────────────────────────┤               │
     │               │               │               │               │               │
     │               │               │ 13. Store vectors             │               │
     │               │               │     (ChromaDB placeholder)    │               │
     │               │               ├──────────────────────────────────────────────>│
     │               │               │               │               │               │
     │               │               │ 14. Update status:            │               │
     │               │               │     "analyzing" (70%)         │               │
     │               │               ├──────────────>│               │               │
     │               │               │               │               │               │
     │               │               │ 15. LLM analysis              │               │
     │               │               ├──────────────────────────────>│               │
     │               │               │     POST /chat/completions    │               │
     │               │               │     (GPT-4, timeout: 3 min)   │               │
     │               │               │               │               │               │
     │               │               │ 16. Analysis  │               │               │
     │               │               │     (JSON)    │               │               │
     │               │               │<──────────────────────────────┤               │
     │               │               │               │               │               │
     │               │               │ 17. INSERT INTO user_profile  │               │
     │               │               │     (skills, experience, etc.)│               │
     │               │               ├──────────────>│               │               │
     │               │               │               │               │               │
     │               │               │ 18. Update status:            │               │
     │               │               │     "completed" (100%)        │               │
     │               │               ├──────────────>│               │               │
     │               │               │               │               │               │
     │               │               │ 19. Release   │               │               │
     │               │               │     semaphore │               │               │
     │               │               │               │               │               │
     │ 20. Poll for  │               │               │               │               │
     │     status    │               │               │               │               │
     │     (every 2s)│               │               │               │               │
     ├──────────────>│               │               │               │               │
     │               │ 21. SELECT *  │               │               │               │
     │               │     FROM jobs │               │               │               │
     │               ├──────────────────────────────>│               │               │
     │               │               │               │               │               │
     │               │ 22. Job with  │               │               │               │
     │               │     status    │               │               │               │
     │               │<──────────────────────────────┤               │               │
     │               │               │               │               │               │
     │ 23. Display   │               │               │               │               │
     │     progress  │               │               │               │               │
     │<──────────────┤               │               │               │               │
```

**Processing Stages**:

1. **Queued** (0%): Job created, waiting for worker
2. **Extracting Text** (10%): Extract text from PDF/DOCX (2 min timeout)
   - Uses pdfcpu library (primary)
   - Falls back to unidoc if pdfcpu fails
3. **Chunking** (30%): Split text into chunks
   - Chunk size: 1000 characters
   - Overlap: 200 characters
4. **Generating Embeddings** (50%): Create vector embeddings
   - OpenAI text-embedding-ada-002 model
   - 1536 dimensions per embedding
   - Sequentially processes each chunk
5. **Analyzing** (70%): AI analysis with GPT-4 (3 min timeout)
   - Extract personal info, skills, experience, education
   - Generate summary, recommendations, strengths, weaknesses
6. **Completed** (100%): Save profile to database

**Concurrency**:
- Worker pool: 5 concurrent jobs (configurable)
- Semaphore pattern using buffered channel
- Jobs queued if pool is full

**Error Handling**:
- Any stage failure → status = "failed", error_message stored
- OpenAI API errors logged and job marked as failed
- Timeouts enforced (2 min for extraction, 3 min for LLM)

**Performance**:
- Typical completion time: 3-5 minutes
- Max time: ~10 minutes (with retries)

---

## Flow 4: Job Retry

**Purpose**: Retry failed job without re-uploading

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ Frontend │         │ Backend  │         │  Worker  │         │ Database │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ 1. Click Retry     │                    │                    │
     │    (failed job)    │                    │                    │
     ├───────────────────>│                    │                    │
     │                    │                    │                    │
     │                    │ 2. POST /api/analysis/retry-job         │
     │                    │    ?job_id=abc123  │                    │
     │                    ├───────────────────>│                    │
     │                    │                    │                    │
     │                    │                    │ 3. SELECT * FROM jobs
     │                    │                    │    WHERE job_id=?  │
     │                    │                    ├───────────────────>│
     │                    │                    │                    │
     │                    │                    │ 4. Job (status=failed)
     │                    │                    │<───────────────────┤
     │                    │                    │                    │
     │                    │                    │ 5. Validate status │
     │                    │                    │    = "failed"      │
     │                    │                    │                    │
     │                    │                    │ 6. BEGIN TRANSACTION
     │                    │                    ├───────────────────>│
     │                    │                    │                    │
     │                    │                    │ 7. DELETE FROM user_profile
     │                    │                    │    WHERE job_id=?  │
     │                    │                    ├───────────────────>│
     │                    │                    │                    │
     │                    │                    │ 8. UPDATE jobs SET │
     │                    │                    │    status='queued',│
     │                    │                    │    progress=0,     │
     │                    │                    │    error_msg=NULL  │
     │                    │                    ├───────────────────>│
     │                    │                    │                    │
     │                    │                    │ 9. COMMIT          │
     │                    │                    ├───────────────────>│
     │                    │                    │                    │
     │                    │                    │ 10. SELECT * FROM uploads
     │                    │                    │     WHERE id=?     │
     │                    │                    ├───────────────────>│
     │                    │                    │                    │
     │                    │                    │ 11. Upload record  │
     │                    │                    │     (file_content) │
     │                    │                    │<───────────────────┤
     │                    │                    │                    │
     │                    │ 12. {success, job_id}                   │
     │                    │<───────────────────┤                    │
     │                    │                    │                    │
     │                    │                    │ 13. Submit to      │
     │                    │                    │     worker pool    │
     │                    │                    │     (same as Flow 3)
     │                    │                    │<───────────────────┤
     │                    │                    │                    │
     │ 14. Optimistic UI  │                    │                    │
     │     update (queued)│                    │                    │
     │<───────────────────┤                    │                    │
     │                    │                    │                    │
     │ 15. Poll for status│                    │                    │
     │     (every 2s)     │                    │                    │
     ├───────────────────>│                    │                    │
```

**Steps**:
1. User clicks Retry button on failed job
2. Frontend sends POST to `/api/analysis/retry-job?job_id=X`
3. Backend validates job status is "failed"
4. Backend starts transaction:
   - Delete old user_profile record
   - Reset job: status='queued', progress=0, error_message=NULL, completed_at=NULL
5. Backend fetches original upload (file_content from BYTEA)
6. Backend resubmits job to worker pool (same as new job)
7. Frontend optimistically updates UI to show "queued"
8. Frontend polls for status updates

**Benefits**:
- No re-upload required (uses original file from database)
- Preserves job_id (useful for tracking)
- Can retry multiple times

**Limitations**:
- ⚠️ No retry limit (can retry indefinitely)
- ⚠️ No rate limiting on retries

---

## Flow 5: Export Analysis Results

**Purpose**: Export completed analysis in various formats

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ Browser  │         │ Frontend │         │ Backend  │         │ Database │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ 1. Click Export    │                    │                    │
     │    → Select JSON   │                    │                    │
     ├───────────────────>│                    │                    │
     │                    │                    │                    │
     │                    │ 2. GET /api/analysis/export             │
     │                    │    ?job_id=abc&format=json              │
     │                    ├───────────────────>│                    │
     │                    │                    │                    │
     │                    │                    │ 3. SELECT * FROM jobs
     │                    │                    │    WHERE job_id=?  │
     │                    │                    ├───────────────────>│
     │                    │                    │                    │
     │                    │                    │ 4. Job (status=completed)
     │                    │                    │<───────────────────┤
     │                    │                    │                    │
     │                    │                    │ 5. Validate status │
     │                    │                    │    = "completed"   │
     │                    │                    │                    │
     │                    │                    │ 6. SELECT * FROM user_profile
     │                    │                    │    WHERE job_id=?  │
     │                    │                    ├───────────────────>│
     │                    │                    │                    │
     │                    │                    │ 7. Profile data    │
     │                    │                    │<───────────────────┤
     │                    │                    │                    │
     │                    │                    │ 8. Export to format│
     │                    │                    │    (JSON/CSV/PDF/  │
     │                    │                    │     DOCX)          │
     │                    │                    │                    │
     │                    │ 9. File binary     │                    │
     │                    │    + headers:      │                    │
     │                    │    Content-Type    │                    │
     │                    │    Content-Disposition                  │
     │                    │<───────────────────┤                    │
     │                    │                    │                    │
     │                    │ 10. Create blob    │                    │
     │                    │     and trigger    │                    │
     │                    │     download       │                    │
     │                    │                    │                    │
     │ 11. File downloaded│                    │                    │
     │     to browser     │                    │                    │
     │<───────────────────┤                    │                    │
```

**Export Formats**:

1. **JSON** (application/json, <1ms):
   - Structured profile data with export timestamp
   - Pretty-printed with 2-space indentation
   - Size: ~5 KB

2. **CSV** (text/csv, 1-5ms):
   - Sectioned format (PERSONAL INFO, SKILLS, EXPERIENCE, etc.)
   - Excel/Google Sheets compatible
   - Proper escaping of special characters
   - Size: ~8 KB

3. **PDF** (application/pdf, 50-200ms):
   - Professional report with styling
   - A4 portrait, Arial fonts
   - Color scheme: Dark blue header (#1a365d), Medium blue sections (#2563eb)
   - Sections: Header, Summary, Skills, Experience, Education, AI Analysis, Footer
   - Size: ~50-150 KB

4. **DOCX** (application/vnd...wordprocessingml.document, 20-100ms):
   - Editable Word document
   - Heading levels (H1, H2, H3)
   - Formatted paragraphs and lists
   - Metadata footer
   - Size: ~20-80 KB

**Frontend Download Logic**:
```javascript
const blob = await response.blob()
const url = window.URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = filename  // From Content-Disposition header
a.click()
window.URL.revokeObjectURL(url)
```

---

## Flow 6: Real-Time Chat (WebSocket)

**Purpose**: Bidirectional real-time communication for Q&A

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ Browser  │         │ Frontend │         │ WS Hub   │         │ Database │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ 1. Navigate to     │                    │                    │
     │    /chat           │                    │                    │
     ├───────────────────>│                    │                    │
     │                    │                    │                    │
     │                    │ 2. new WebSocket('ws://localhost:8081/ws')
     │                    ├───────────────────>│                    │
     │                    │                    │                    │
     │                    │ 3. HTTP 101        │                    │
     │                    │    Switching Protocols                  │
     │                    │<───────────────────┤                    │
     │                    │                    │                    │
     │                    │ 4. {"type": "auth",│                    │
     │                    │     "token": "..."}│                    │
     │                    ├───────────────────>│                    │
     │                    │                    │                    │
     │                    │                    │ 5. Validate token  │
     │                    │                    │    (in-memory map) │
     │                    │                    │                    │
     │                    │                    │ 6. Register client │
     │                    │                    │    in hub          │
     │                    │                    │                    │
     │                    │ 7. {"type":"system"│                    │
     │                    │     "content":"Connected"}              │
     │                    │<───────────────────┤                    │
     │                    │                    │                    │
     │ 8. Connection      │                    │                    │
     │    indicator: ON   │                    │                    │
     │<───────────────────┤                    │                    │
     │                    │                    │                    │
     │ 9. Type message    │                    │                    │
     │    "What are my    │                    │                    │
     │     top skills?"   │                    │                    │
     ├───────────────────>│                    │                    │
     │                    │                    │                    │
     │                    │ 10. {"type":"message"                   │
     │                    │      "content":"What are my top skills?"}
     │                    ├───────────────────>│                    │
     │                    │                    │                    │
     │                    │                    │ 11. INSERT INTO    │
     │                    │                    │     chat_messages  │
     │                    │                    ├───────────────────>│
     │                    │                    │                    │
     │                    │                    │ 12. Semantic search│
     │                    │                    │     in Q&A vectors │
     │                    │                    │     (cosine sim >  │
     │                    │                    │      0.75)         │
     │                    │                    │                    │
     │                    │                    │ 13. Generate response
     │                    │                    │     (GPT-4 or      │
     │                    │                    │      matched Q&A)  │
     │                    │                    │                    │
     │                    │                    │ 14. INSERT assistant
     │                    │                    │     message        │
     │                    │                    ├───────────────────>│
     │                    │                    │                    │
     │                    │ 15. {"type":"message"                   │
     │                    │      "content":"Your top skills are..." │
     │                    │      "metadata":{"from_qa": true}}      │
     │                    │<───────────────────┤                    │
     │                    │                    │                    │
     │ 16. Display AI     │                    │                    │
     │     response       │                    │                    │
     │<───────────────────┤                    │                    │
     │                    │                    │                    │
     │                    │ 17. Ping (every 54s)                    │
     │                    │<───────────────────┤                    │
     │                    │                    │                    │
     │                    │ 18. Pong           │                    │
     │                    ├───────────────────>│                    │
```

**WebSocket Lifecycle**:

1. **Connection**:
   - Frontend initiates WebSocket connection
   - HTTP 101 Switching Protocols
   - Backend creates Client instance

2. **Authentication**:
   - Frontend sends `{type: "auth", token: "..."}`
   - Backend validates token against in-memory map
   - Backend registers client in Hub

3. **Message Exchange**:
   - User message → Hub → Semantic search → AI response
   - All messages persisted to `chat_messages` table
   - System messages (connection, disconnection) sent as needed

4. **Heartbeat**:
   - Server sends ping every 54 seconds
   - Client must respond with pong within 60 seconds
   - Connection closed if no pong received

5. **Disconnection**:
   - Client close → Hub unregisters client
   - Network error → Auto-reconnect with exponential backoff (2s → 30s max)

**Semantic Q&A Matching**:
- Pre-stored question/answer pairs with embeddings
- User query embedded and compared (cosine similarity)
- Threshold: 0.75 (if match found, return stored answer; else generate with GPT-4)

---

## Flow 7: Interview Question Generation

**Purpose**: Generate personalized interview questions based on resume

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ Frontend │         │ Backend  │         │  OpenAI  │         │ Database │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ 1. Generate        │                    │                    │
     │    Questions       │                    │                    │
     ├───────────────────>│                    │                    │
     │                    │                    │                    │
     │                    │ 2. SELECT * FROM user_profile           │
     │                    │    WHERE job_id=?  │                    │
     │                    ├───────────────────────────────────────>│
     │                    │                    │                    │
     │                    │ 3. Profile data    │                    │
     │                    │<───────────────────────────────────────┤
     │                    │                    │                    │
     │                    │ 4. Build prompt    │                    │
     │                    │    with profile    │                    │
     │                    │    data            │                    │
     │                    │                    │                    │
     │                    │ 5. POST /chat/completions               │
     │                    │    (GPT-4)         │                    │
     │                    │    Prompt: "Generate 10 interview       │
     │                    │    questions for [profile]..."          │
     │                    ├───────────────────>│                    │
     │                    │                    │                    │
     │                    │ 6. 10 questions    │                    │
     │                    │    with categories,│                    │
     │                    │    difficulty,     │                    │
     │                    │    and answers     │                    │
     │                    │<───────────────────┤                    │
     │                    │                    │                    │
     │ 7. {questions[]}   │                    │                    │
     │<───────────────────┤                    │                    │
     │                    │                    │                    │
     │ 8. Display         │                    │                    │
     │    questions       │                    │                    │
```

**Generated Data**:
- 10 interview questions (configurable)
- Each with:
  - Question text
  - Category (Technical, Behavioral, Situational, Problem-Solving)
  - Difficulty (Easy, Medium, Hard)
  - Personalized answer based on resume

**Generation Time**: 10-30 seconds (GPT-4 API latency)

---

## Performance Characteristics

### Typical Response Times

| Flow | Duration | Bottleneck |
|------|----------|------------|
| Authentication | 10-50ms | Database query |
| Resume Upload | 0.5-2s | File upload (network) |
| Analysis Pipeline | 3-5 min | OpenAI API calls |
| Job Retry | 50-100ms | Database transaction |
| Export JSON/CSV | 1-10ms | Data formatting |
| Export PDF | 50-200ms | PDF generation |
| Export DOCX | 20-100ms | DOCX generation |
| WebSocket Message | 50-200ms | Semantic search + GPT-4 |
| Interview Questions | 10-30s | GPT-4 API |

### Polling Strategy

**Frontend Auto-Polling** (Profile page):
- Interval: 2 seconds
- Target: `/api/analysis/jobs?upload_id=X`
- Condition: Only when upload is expanded
- Cleanup: Clear interval on unmount or collapse

**Impact**:
- 30 requests/minute per active user
- Lightweight (SELECT query, indexed)
- Consider WebSocket push for production

---

## Error Handling Strategies

### Retry Logic

1. **Analysis Pipeline**:
   - OpenAI API errors: Log and mark job as failed
   - Timeout errors: Mark as failed with timeout message
   - User can manually retry via UI

2. **WebSocket**:
   - Connection lost: Auto-reconnect with exponential backoff
   - Backoff: 2s → 4s → 8s → 16s → 30s (max)
   - Max retries: Infinite (until user closes tab)

3. **HTTP Requests**:
   - No automatic retry (user must manually retry)
   - Frontend shows error messages from backend

---

## Data Validation

### Client-Side Validation

- File type and size (before upload)
- Email format (before login)
- Required fields (before submit)

### Server-Side Validation

- MIME type and file signature
- File size limit (10MB)
- LinkedIn URL format (regex)
- Job status before retry (must be "failed")
- Job status before export (must be "completed")

### Database Validation

- Check constraints (file_size, age, work_years, etc.)
- Unique constraints (email, job_id)
- Not null constraints

---

## Known Issues & Limitations

1. **No User Scoping**: Any user can access/modify any resource
2. **No Pagination**: All list endpoints return full results
3. **Sequential Embeddings**: Embedding generation not parallelized
4. **Polling Overhead**: Frontend polls every 2s (use WebSocket push instead)
5. **No Retry Limits**: Jobs can be retried indefinitely
6. **No Export Caching**: Files generated on every request
7. **In-Memory Tokens**: Lost on server restart

---

## Future Optimizations

1. **WebSocket Push**: Replace polling with WebSocket job status updates
2. **Parallel Embeddings**: Generate embeddings concurrently
3. **Export Caching**: Cache generated PDF/DOCX for 1 hour
4. **User Scoping**: Add authorization checks for all resources
5. **Pagination**: Add limit/offset to list endpoints
6. **Rate Limiting**: Limit retry attempts, API calls per user
7. **Persistent Sessions**: Store tokens in database or Redis

---

[Next: Deployment Guide →](07_deployment.md)

[← Back to Architecture Index](README.md)
