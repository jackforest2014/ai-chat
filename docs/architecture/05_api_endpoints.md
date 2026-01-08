# API Endpoints

**Module**: 05 - API Endpoints
**Last Updated**: 2025-12-26

[← Back to Architecture Index](README.md)

---

## Overview

The backend exposes REST API endpoints for authentication, file upload, analysis management, interview questions, and export functionality. It also provides a WebSocket endpoint for real-time chat.

**Base URL**: `http://localhost:8081`
**Protocol**: HTTP/1.1 (HTTPS recommended for production)
**Format**: JSON request/response bodies
**Authentication**: Bearer token in Authorization header

---

## Authentication

All endpoints (except login/register) require authentication via Bearer token:

```http
Authorization: Bearer <token>
```

Token is obtained from `/api/auth/login` and should be stored in client (localStorage).

---

## Endpoint Summary

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Auth** | `/api/auth/login` | POST | User login |
| **Upload** | `/api/upload` | POST | Upload resume |
| **Upload** | `/api/uploads` | GET | Get all uploads |
| **Analysis** | `/api/analysis/start` | POST | Start analysis job |
| **Analysis** | `/api/analysis/jobs` | GET | Get jobs for upload |
| **Analysis** | `/api/analysis/delete-job` | DELETE | Delete job |
| **Analysis** | `/api/analysis/retry-job` | POST | Retry failed job |
| **Analysis** | `/api/analysis/export` | GET | Export results |
| **Interview** | `/api/interview/generate` | POST | Generate questions |
| **Interview** | `/api/interview/regenerate-answer` | POST | Regenerate answer |
| **Interview** | `/api/interview/save-question` | POST | Save question |
| **Interview** | `/api/interview/library` | GET | Get saved questions |
| **WebSocket** | `/ws` | WS | WebSocket connection |

---

## Authentication Endpoints

### POST /api/auth/login

**Description**: Authenticate user and obtain session token

**Request**:
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response 200 (Success)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com"
  }
}
```

**Response 401 (Invalid credentials)**:
```json
{
  "error": "Invalid credentials"
}
```

**Response 400 (Missing fields)**:
```json
{
  "error": "Email and password are required"
}
```

**Notes**:
- ⚠️ Passwords are stored in plain text (MOCK implementation only)
- Token format is not JWT (custom session token)
- Tokens stored in-memory (lost on server restart)

---

## Upload Endpoints

### POST /api/upload

**Description**: Upload resume file (PDF, DOC, DOCX)

**Authentication**: Required

**Request**:
```http
POST /api/upload HTTP/1.1
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="resume.pdf"
Content-Type: application/pdf

<binary file data>
------WebKitFormBoundary
Content-Disposition: form-data; name="linkedin_url"

https://linkedin.com/in/johndoe
------WebKitFormBoundary--
```

**Parameters**:
- `file` (required): Resume file (PDF, DOC, DOCX, max 10MB)
- `linkedin_url` (optional): LinkedIn profile URL

**Response 201 (Success)**:
```json
{
  "id": 123,
  "filename": "resume.pdf",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "file_size": 524288,
  "upload_date": "2025-12-26T10:30:00Z"
}
```

**Response 400 (Validation error)**:
```json
{
  "error": "File too large",
  "message": "Maximum file size is 10MB"
}
```

```json
{
  "error": "Invalid file type",
  "message": "Only PDF, DOC, and DOCX files are supported"
}
```

**Response 413 (File too large)**:
```json
{
  "error": "File size exceeds limit",
  "max_size_mb": 10
}
```

**File Validation**:
- **Size**: Max 10MB (10,485,760 bytes)
- **Types**: PDF (.pdf), Word (.doc, .docx)
- **MIME types**: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Signature check**: Validates file signature (magic bytes)

---

### GET /api/uploads

**Description**: Get all uploads for authenticated user

**Authentication**: Required

**Request**:
```http
GET /api/uploads HTTP/1.1
Authorization: Bearer <token>
```

**Response 200 (Success)**:
```json
[
  {
    "id": 123,
    "filename": "resume.pdf",
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "file_size": 524288,
    "upload_date": "2025-12-26T10:30:00Z"
  },
  {
    "id": 124,
    "filename": "resume_v2.pdf",
    "linkedin_url": null,
    "file_size": 612345,
    "upload_date": "2025-12-25T14:15:00Z"
  }
]
```

**Response 200 (Empty)**:
```json
[]
```

**Notes**:
- Returns uploads in descending order by upload_date (newest first)
- ⚠️ Currently returns ALL uploads (not scoped to user)

---

## Analysis Endpoints

### POST /api/analysis/start

**Description**: Start a new resume analysis job

**Authentication**: Required

**Request**:
```http
POST /api/analysis/start?upload_id=123 HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters**:
- `upload_id` (required): ID of the uploaded resume

**Response 202 (Accepted)**:
```json
{
  "job_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "status": "queued",
  "message": "Analysis job started successfully"
}
```

**Response 400 (Invalid upload_id)**:
```json
{
  "error": "Invalid upload_id parameter"
}
```

**Response 404 (Upload not found)**:
```json
{
  "error": "Upload not found",
  "upload_id": 123
}
```

**Notes**:
- Job is added to worker pool queue (max 5 concurrent jobs)
- Processing starts asynchronously
- Poll `/api/analysis/jobs` for status updates

---

### GET /api/analysis/jobs

**Description**: Get all analysis jobs for an upload

**Authentication**: Required

**Request**:
```http
GET /api/analysis/jobs?upload_id=123 HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters**:
- `upload_id` (required): ID of the uploaded resume

**Response 200 (Success)**:
```json
[
  {
    "job_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "upload_id": 123,
    "status": "completed",
    "progress": 100,
    "current_step": "Analysis complete",
    "error_message": null,
    "created_at": "2025-12-26T10:35:00Z",
    "completed_at": "2025-12-26T10:40:00Z"
  },
  {
    "job_id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    "upload_id": 123,
    "status": "failed",
    "progress": 30,
    "current_step": "Chunking text",
    "error_message": "Embedding generation failed: OpenAI API error",
    "created_at": "2025-12-25T15:00:00Z",
    "completed_at": "2025-12-25T15:03:00Z"
  }
]
```

**Job Status Values**:
- `queued`: Job waiting to be processed
- `extracting_text`: Extracting text from resume (progress: 10%)
- `chunking`: Chunking text for embeddings (progress: 30%)
- `generating_embeddings`: Generating vector embeddings (progress: 50%)
- `analyzing`: Analyzing with GPT-4 (progress: 70%)
- `completed`: Analysis successfully completed (progress: 100%)
- `failed`: Analysis failed with error (progress: varies)

**Notes**:
- Returns jobs in descending order by created_at (newest first)
- Frontend polls this endpoint every 2 seconds for auto-updating status
- ⚠️ Currently returns ALL jobs for upload (not scoped to user)

---

### DELETE /api/analysis/delete-job

**Description**: Delete an analysis job (completed or failed)

**Authentication**: Required

**Request**:
```http
DELETE /api/analysis/delete-job?job_id=a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters**:
- `job_id` (required): UUID of the job to delete

**Response 200 (Success)**:
```json
{
  "success": true,
  "message": "Job deleted successfully",
  "job_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
}
```

**Response 400 (Cannot delete queued/processing job)**:
```json
{
  "error": "Cannot delete job",
  "message": "Only completed or failed jobs can be deleted"
}
```

**Response 404 (Job not found)**:
```json
{
  "error": "Job not found",
  "job_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
}
```

**Notes**:
- Deletes both `analysis_jobs` and associated `user_profile` records
- Cannot delete jobs with status `queued`, `extracting_text`, `chunking`, `generating_embeddings`, or `analyzing`
- ⚠️ No authorization check (any user can delete any job)

---

### POST /api/analysis/retry-job

**Description**: Retry a failed analysis job without re-uploading

**Authentication**: Required

**Request**:
```http
POST /api/analysis/retry-job?job_id=a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters**:
- `job_id` (required): UUID of the failed job to retry

**Response 202 (Accepted)**:
```json
{
  "success": true,
  "message": "Job retry started successfully",
  "job_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "status": "queued"
}
```

**Response 400 (Job not failed)**:
```json
{
  "error": "Cannot retry job",
  "message": "only failed jobs can be retried, current status: completed"
}
```

**Response 404 (Job not found)**:
```json
{
  "error": "Job not found",
  "job_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
}
```

**Implementation Details**:
1. Validates job status is `failed`
2. Deletes old `user_profile` record (from previous failed attempt)
3. Resets job: status → `queued`, progress → 0, error_message → NULL, completed_at → NULL
4. Resubmits job to worker pool with original upload data
5. Processing starts asynchronously

**Notes**:
- No re-upload required (uses original file from database)
- ⚠️ No retry limit (can retry indefinitely)
- ⚠️ No authorization check (any user can retry any job)

---

### GET /api/analysis/export

**Description**: Export analysis results in various formats (JSON, CSV, PDF, DOCX)

**Authentication**: Required

**Request**:
```http
GET /api/analysis/export?job_id=a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d&format=json HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters**:
- `job_id` (required): UUID of the completed job
- `format` (required): Export format - `json`, `csv`, `pdf`, or `docx`

**Response 200 (Success - JSON)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Disposition: attachment; filename="resume_analysis_a1b2c3d4.json"
Content-Length: 5432

{
  "job_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "personal_info": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-1234",
    "location": "San Francisco, CA"
  },
  "skills": {
    "Technical": ["Python", "Go", "React", "PostgreSQL"],
    "Soft Skills": ["Leadership", "Communication"]
  },
  "experience": [
    {
      "company": "ABC Corp",
      "role": "Software Engineer",
      "years": 3,
      "description": "Developed backend services"
    }
  ],
  "education": [
    {
      "degree": "BS Computer Science",
      "institution": "XYZ University",
      "year": 2020
    }
  ],
  "summary": "Experienced software engineer with 5+ years...",
  "job_recommendations": ["Senior Software Engineer", "Tech Lead"],
  "strengths": ["Strong technical skills", "Leadership abilities"],
  "weaknesses": ["Limited cloud experience"],
  "exported_at": "2025-12-26T11:00:00Z"
}
```

**Response 200 (Success - CSV)**:
```http
HTTP/1.1 200 OK
Content-Type: text/csv
Content-Disposition: attachment; filename="resume_analysis_a1b2c3d4.csv"
Content-Length: 8192

SECTION,KEY,VALUE
PERSONAL INFORMATION,Name,John Doe
PERSONAL INFORMATION,Email,john@example.com
PERSONAL INFORMATION,Phone,+1-555-1234
PERSONAL INFORMATION,Location,"San Francisco, CA"

SKILLS,Technical,Python
SKILLS,Technical,Go
SKILLS,Technical,React
SKILLS,Soft Skills,Leadership

WORK EXPERIENCE,Company,ABC Corp
WORK EXPERIENCE,Role,Software Engineer
WORK EXPERIENCE,Years,3
WORK EXPERIENCE,Description,Developed backend services
...
```

**Response 200 (Success - PDF)**:
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="resume_analysis_a1b2c3d4.pdf"
Content-Length: 102400

<binary PDF data>
```

**Response 200 (Success - DOCX)**:
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="resume_analysis_a1b2c3d4.docx"
Content-Length: 40960

<binary DOCX data>
```

**Response 400 (Invalid format)**:
```json
{
  "error": "Invalid format",
  "message": "Supported formats: json, csv, pdf, docx"
}
```

**Response 400 (Job not completed)**:
```json
{
  "error": "Analysis not yet completed",
  "message": "Only completed analysis jobs can be exported",
  "current_status": "analyzing",
  "progress": 70
}
```

**Response 404 (Profile not found)**:
```json
{
  "error": "Profile not found",
  "message": "No analysis results available for this job"
}
```

**Export Format Details**:

| Format | Content-Type | File Size | Generation Time |
|--------|--------------|-----------|-----------------|
| JSON | application/json | ~5 KB | <1ms |
| CSV | text/csv | ~8 KB | 1-5ms |
| PDF | application/pdf | ~50-150 KB | 50-200ms |
| DOCX | application/vnd...wordprocessingml.document | ~20-80 KB | 20-100ms |

**Notes**:
- Frontend automatically triggers browser download
- Filename extracted from `Content-Disposition` header
- ⚠️ No caching (generates file on every request)
- ⚠️ No authorization check (any user can export any job)

---

## Interview Question Endpoints

### POST /api/interview/generate

**Description**: Generate personalized interview questions based on resume

**Authentication**: Required

**Request**:
```http
POST /api/interview/generate HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "job_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "job_title": "Senior Software Engineer",
  "company": "ABC Corp",
  "num_questions": 10
}
```

**Parameters**:
- `job_id` (required): Completed analysis job ID
- `job_title` (optional): Target job title
- `company` (optional): Target company
- `num_questions` (optional): Number of questions to generate (default: 10)

**Response 200 (Success)**:
```json
{
  "questions": [
    {
      "id": "q1",
      "question": "Describe your experience with Go and how you've used it in production systems.",
      "category": "Technical",
      "difficulty": "Medium",
      "answer": "In my role at ABC Corp, I developed backend services using Go for 3 years. I built RESTful APIs handling 10k requests/second..."
    },
    {
      "id": "q2",
      "question": "Tell me about a time when you had to lead a team through a challenging project.",
      "category": "Behavioral",
      "difficulty": "Hard",
      "answer": "As a team lead at ABC Corp, I managed a critical migration project..."
    }
  ],
  "job_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "generated_at": "2025-12-26T11:30:00Z"
}
```

**Categories**:
- `Technical`: Technical/coding questions
- `Behavioral`: Behavioral questions (STAR method)
- `Situational`: Situational judgment questions
- `Problem-Solving`: Problem-solving and case study questions

**Difficulty Levels**:
- `Easy`: Entry-level questions
- `Medium`: Mid-level questions
- `Hard`: Senior-level questions

**Notes**:
- Uses GPT-4 to generate questions based on user profile
- Answers are personalized using resume data
- Generation time: 10-30 seconds (depending on OpenAI API response)

---

### POST /api/interview/regenerate-answer

**Description**: Regenerate answer for a specific question

**Authentication**: Required

**Request**:
```http
POST /api/interview/regenerate-answer HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "job_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "question_id": "q1",
  "question": "Describe your experience with Go..."
}
```

**Response 200 (Success)**:
```json
{
  "question_id": "q1",
  "answer": "My experience with Go spans 3 years at ABC Corp where I architected microservices handling millions of requests daily...",
  "regenerated_at": "2025-12-26T11:35:00Z"
}
```

**Notes**:
- Generates new answer using GPT-4
- Uses same profile data but different prompt/temperature for variety

---

### POST /api/interview/save-question

**Description**: Save interview question to personal library

**Authentication**: Required

**Request**:
```http
POST /api/interview/save-question HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "job_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "question_id": "q1",
  "question": "Describe your experience with Go...",
  "answer": "My experience with Go spans 3 years...",
  "category": "Technical",
  "difficulty": "Medium",
  "tags": ["golang", "backend", "microservices"],
  "job_title": "Senior Software Engineer",
  "company": "ABC Corp"
}
```

**Response 201 (Created)**:
```json
{
  "success": true,
  "message": "Question saved successfully",
  "saved_question_id": 42
}
```

**Response 409 (Already saved)**:
```json
{
  "error": "Question already saved",
  "message": "This question is already in your library"
}
```

---

### GET /api/interview/library

**Description**: Get all saved interview questions

**Authentication**: Required

**Request**:
```http
GET /api/interview/library?category=Technical&difficulty=Medium HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters** (all optional):
- `category`: Filter by category (Technical, Behavioral, Situational, Problem-Solving)
- `difficulty`: Filter by difficulty (Easy, Medium, Hard)
- `tags`: Filter by tag (comma-separated)

**Response 200 (Success)**:
```json
[
  {
    "id": 42,
    "question_id": "q1",
    "question": "Describe your experience with Go...",
    "answer": "My experience with Go spans 3 years...",
    "category": "Technical",
    "difficulty": "Medium",
    "tags": ["golang", "backend", "microservices"],
    "job_title": "Senior Software Engineer",
    "company": "ABC Corp",
    "saved_at": "2025-12-26T11:40:00Z"
  }
]
```

---

## WebSocket Endpoint

### WS /ws

**Description**: WebSocket connection for real-time chat

**Protocol**: WebSocket (RFC 6455)
**Upgrade**: From HTTP to WebSocket

**Connection Handshake**:
```http
GET /ws HTTP/1.1
Host: localhost:8081
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

**Server Response**:
```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

**Authentication Message** (sent after connection):
```json
{
  "type": "auth",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Text Message** (client → server):
```json
{
  "type": "message",
  "content": "What are my top skills?",
  "msg_type": "text"
}
```

**Text Response** (server → client):
```json
{
  "type": "message",
  "content": "Based on your resume, your top skills are: Python, Go, React, PostgreSQL, and Leadership.",
  "msg_type": "text",
  "metadata": {
    "from_qa": true,
    "similarity": 0.87,
    "matched_question": "What are the candidate's technical skills?"
  },
  "timestamp": "2025-12-26T11:50:00Z"
}
```

**System Message** (server → client):
```json
{
  "type": "system",
  "content": "Connected to chat server",
  "timestamp": "2025-12-26T11:45:00Z"
}
```

**Ping/Pong** (heartbeat):
- Server sends ping every 54 seconds
- Client must respond with pong within 60 seconds
- Connection closed if no pong received

**WebSocket Configuration**:
- **Max Message Size**: 512 KB (524,288 bytes)
- **Read Buffer**: 1024 bytes
- **Write Buffer**: 1024 bytes
- **Ping Interval**: 54 seconds
- **Pong Timeout**: 60 seconds

**Message Types**:
- `auth`: Authentication with bearer token
- `message`: Chat message (text, audio, image, video)
- `system`: System notification

**Connection Management**:
- Hub-spoke pattern (centralized message broadcaster)
- Supports 100+ concurrent connections
- Auto-reconnection with exponential backoff (client-side: 2s → 30s max)

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error title",
  "message": "Detailed error message",
  "field": "field_name",  // Optional: for validation errors
  "code": "ERROR_CODE"    // Optional: error code
}
```

### Common HTTP Status Codes

| Status | Meaning | Usage |
|--------|---------|-------|
| 200 OK | Success | GET, DELETE successful |
| 201 Created | Resource created | POST successful (upload, save) |
| 202 Accepted | Request accepted | Async job started (analysis, retry) |
| 400 Bad Request | Validation error | Invalid parameters, missing fields |
| 401 Unauthorized | Authentication failed | Invalid/missing token, wrong credentials |
| 403 Forbidden | Authorization failed | User not allowed to access resource |
| 404 Not Found | Resource not found | Job, upload, profile not found |
| 409 Conflict | Resource conflict | Question already saved |
| 413 Payload Too Large | File too large | Upload exceeds 10MB |
| 500 Internal Server Error | Server error | Unexpected error, database failure |

---

## Rate Limiting

**Current Status**: ❌ NOT IMPLEMENTED

**Recommended Implementation**:
- 100 requests/minute per user
- 10 requests/minute for expensive operations (generate questions, analyze)
- 429 Too Many Requests response

---

## CORS Configuration

**Current Configuration**:
```go
AllowedOrigins: []string{"*"}  // ⚠️ Allows all origins
AllowedMethods: []string{"GET", "POST", "DELETE"}
AllowedHeaders: []string{"Authorization", "Content-Type"}
```

**Production Configuration** (recommended):
```go
AllowedOrigins: []string{"https://yourdomain.com"}
AllowCredentials: true
MaxAge: 3600
```

---

## API Versioning

**Current**: No versioning (v1 implicit)

**Future**: Version in URL path
- `/api/v1/upload`
- `/api/v2/upload`

---

## Known Issues & Limitations

1. **No Authorization**: Any authenticated user can access/modify any resource
2. **No Rate Limiting**: Vulnerable to abuse
3. **CORS Wide Open**: Allows all origins (*)
4. **No Pagination**: All list endpoints return full results
5. **No Caching**: No cache headers or ETags
6. **No Request Validation**: Limited input validation
7. **Plain Text Passwords**: Authentication uses plain text passwords
8. **No API Documentation**: No Swagger/OpenAPI spec

---

## Future Enhancements

1. **Security**: Authorization checks, rate limiting, CORS whitelist, input validation
2. **Performance**: Pagination, caching, compression
3. **Documentation**: Swagger/OpenAPI specification
4. **Versioning**: API version in URL path
5. **Webhooks**: Notify on job completion
6. **GraphQL**: Alternative to REST for flexible queries
7. **API Gateway**: Centralized authentication, routing, rate limiting

---

[Next: Data Flows →](06_data_flows.md)

[← Back to Architecture Index](README.md)
