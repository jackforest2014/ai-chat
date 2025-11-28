# WebSocket Chat Server

A production-ready WebSocket server written in Go for real-time chat applications with AI-powered resume analysis and interview preparation.

![Go Version](https://img.shields.io/badge/Go-1.24-00ADD8?style=for-the-badge&logo=go)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Database Setup](#database-setup)
  - [Install PostgreSQL](#install-postgresql)
  - [Initialize Database](#initialize-database)
  - [Database Schema](#database-schema)
  - [Table Relationships](#table-relationships)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
  - [Health & Monitoring](#health--monitoring)
  - [Authentication](#authentication)
  - [Upload & Analysis](#upload--analysis)
  - [Interview Preparation](#interview-preparation)
  - [Q&A Chat Memory](#qa-chat-memory)
  - [Chat Messages](#chat-messages)
- [WebSocket Protocol](#websocket-protocol)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)
- [Changelog](#changelog)

## Features

- **Real-time Communication** - WebSocket-based bidirectional messaging
- **User Authentication** - Signup, login, logout with session management
- **Resume Upload & Storage** - PDF/Word documents stored in PostgreSQL as BYTEA
- **AI Resume Analysis** - OpenAI GPT-4 powered parsing with RAG pipeline
- **Interview Preparation** - AI-generated personalized interview questions
- **Q&A Chat Memory** - Semantic matching with embeddings (75% similarity threshold)
- **Audio Message Support** - Store and retrieve audio messages
- **Connection Management** - Automatic ping/pong and lifecycle handling
- **Job Management** - Delete completed/failed analysis jobs with cascade profile deletion
- **Docker Ready** - Containerized for easy deployment

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Language | Go | 1.24 |
| WebSocket | gorilla/websocket | 1.5.1 |
| Database | PostgreSQL | 15+ |
| ORM/Driver | lib/pq | 1.10.9 |
| LLM | OpenAI GPT-4 | - |
| Embeddings | text-embedding-ada-002 | - |
| PDF Parsing | pdfcpu, unipdf, ledongthuc/pdf | - |
| DOCX Parsing | nguyenthenguyen/docx | - |
| CORS | rs/cors | 1.10.1 |
| Vector Store | ChromaDB (via chroma-go) | 0.2.5 |
| LangChain | langchaingo | 0.1.14 |

## Project Structure

```
websocket-server/
├── cmd/
│   └── server/
│       └── main.go                      # Application entry point & route setup
├── internal/
│   ├── handler/
│   │   ├── websocket.go                 # WebSocket upgrade & connection
│   │   ├── upload.go                    # File upload handlers
│   │   ├── analysis.go                  # Resume analysis handlers
│   │   ├── auth.go                      # Authentication handlers
│   │   ├── interview.go                 # Interview question handlers
│   │   └── chat.go                      # Q&A chat memory & message handlers
│   ├── hub/
│   │   ├── hub.go                       # Connection hub (register/unregister/broadcast)
│   │   └── client.go                    # Client connection (readPump/writePump)
│   ├── repository/
│   │   ├── repository.go                # Upload repository interface
│   │   ├── saved_question_repository.go # Saved questions interface
│   │   └── postgres/
│   │       ├── postgres.go              # PostgreSQL upload implementation
│   │       ├── user_postgres.go         # PostgreSQL user implementation
│   │       ├── saved_question_postgres.go # PostgreSQL questions implementation
│   │       ├── analysis_postgres.go     # PostgreSQL analysis implementation
│   │       └── chat_message_postgres.go # PostgreSQL chat messages
│   ├── analyzer/
│   │   ├── analyzer.go                  # Resume analyzer coordinator
│   │   ├── text_extractor.go            # PDF/DOCX text extraction
│   │   ├── text_chunker.go              # Text chunking (1000 char, 200 overlap)
│   │   ├── embeddings.go                # OpenAI embeddings generator
│   │   ├── vector_store.go              # ChromaDB vector store
│   │   └── llm_client.go                # OpenAI LLM client
│   └── qamatcher/
│       ├── matcher.go                   # QAMatcher interface
│       └── embedding_matcher.go         # Cosine similarity matcher
├── pkg/
│   └── models/
│       ├── message.go                   # WebSocket message structures
│       ├── upload.go                    # Upload data structures
│       ├── user.go                      # User/auth data structures
│       ├── saved_question.go            # Saved question structures
│       └── chat_message.go              # Chat message structures
├── db/
│   ├── schema.sql                       # Main schema (user_uploads)
│   ├── schema_users.sql                 # Users table schema
│   ├── schema_saved_questions.sql       # Saved questions schema
│   ├── schema_chat_messages.sql         # Chat messages schema
│   └── migrations/
│       ├── 002_analysis_tables.sql      # Analysis jobs & user profile
│       ├── 004_add_user_id.sql          # User ID associations
│       └── 005_remove_foreign_keys.sql  # Remove FK constraints
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Prerequisites

### Option 1: Using Docker (Recommended)
- [Docker](https://docs.docker.com/get-docker/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0+)

### Option 2: Local Development
- [Go](https://golang.org/dl/) (v1.24+)
- [PostgreSQL](https://www.postgresql.org/download/) (v15+)

## Database Setup

### Install PostgreSQL

```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

# macOS
brew install postgresql@15
brew services start postgresql@15
```

### Start PostgreSQL

```bash
# Debian/Ubuntu (without systemd)
sudo pg_ctlcluster 15 main start

# macOS
brew services start postgresql@15
```

### Initialize Database

```bash
# Create database user
sudo -u postgres psql -c "CREATE USER chatapp WITH PASSWORD 'chatapp_password';"

# Create database
sudo -u postgres psql -c "CREATE DATABASE chatapp_db OWNER chatapp;"

# Apply schemas (in order)
cat db/schema.sql | sudo -u postgres psql -d chatapp_db
cat db/schema_users.sql | sudo -u postgres psql -d chatapp_db
cat db/schema_saved_questions.sql | sudo -u postgres psql -d chatapp_db
cat db/schema_chat_messages.sql | sudo -u postgres psql -d chatapp_db
cat db/migrations/002_analysis_tables.sql | sudo -u postgres psql -d chatapp_db
cat db/migrations/004_add_user_id.sql | sudo -u postgres psql -d chatapp_db
cat db/migrations/005_remove_foreign_keys.sql | sudo -u postgres psql -d chatapp_db

# Grant permissions
sudo -u postgres psql -d chatapp_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chatapp;"
sudo -u postgres psql -d chatapp_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chatapp;"
```

### Database Schema

#### Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### User Uploads Table

```sql
CREATE TABLE user_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,                      -- Semantic ref to users.id
    linkedin_url VARCHAR(500),
    file_name VARCHAR(255) NOT NULL,
    file_content BYTEA,                   -- Actual resume binary
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Analysis Jobs Table

```sql
CREATE TABLE analysis_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(100) UNIQUE NOT NULL,
    upload_id INTEGER NOT NULL,           -- Semantic ref to user_uploads.id
    user_id INTEGER,                      -- Semantic ref to users.id
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    progress INTEGER NOT NULL DEFAULT 0,
    current_step VARCHAR(100),
    extracted_text TEXT,                  -- Populated during analysis
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);
-- Status values: queued, extracting_text, chunking, generating_embeddings, analyzing, completed, failed
```

#### User Profile Table

```sql
CREATE TABLE user_profile (
    id SERIAL PRIMARY KEY,
    upload_id INTEGER NOT NULL,           -- Semantic ref to user_uploads.id
    job_id VARCHAR(100) UNIQUE NOT NULL,  -- Semantic ref to analysis_jobs.job_id
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),
    age INTEGER,
    location VARCHAR(255),
    total_work_years NUMERIC(5,2),
    skills JSONB,                         -- {"technical": [...], "soft": [...]}
    experience JSONB,                     -- [{company, role, years, description}]
    education JSONB,                      -- [{degree, institution, year}]
    summary TEXT,
    job_recommendations JSONB,
    strengths JSONB,
    weaknesses JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Saved Interview Questions Table

```sql
CREATE TABLE saved_interview_questions (
    id BIGSERIAL PRIMARY KEY,
    auth_user_id INTEGER,                 -- Semantic ref to users.id
    user_id VARCHAR(255) NOT NULL,
    job_id VARCHAR(255) NOT NULL,
    question_id VARCHAR(255) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    difficulty VARCHAR(50),
    tags TEXT[],
    job_title VARCHAR(255),
    company VARCHAR(255),
    question_embedding BYTEA,             -- Serialized float32 embedding
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, job_id, question_id)
);
```

#### Chat Messages Table

```sql
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL CHECK (user_id > 0),
    to_user_id INTEGER NOT NULL CHECK (to_user_id > 0),
    msg_type VARCHAR(20) NOT NULL CHECK (msg_type IN ('text', 'image', 'audio', 'video')),
    text_content TEXT,
    content BYTEA,                        -- Binary data (audio/image/video)
    metadata JSONB,                       -- {duration_ms, mime_type, from_qa, similarity}
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Table Relationships

This project uses **semantic references** instead of foreign key constraints for flexibility.

| Source Table | Column | References | Description |
|--------------|--------|------------|-------------|
| `user_uploads` | `user_id` | `users.id` | User who uploaded the file |
| `analysis_jobs` | `upload_id` | `user_uploads.id` | Resume being analyzed |
| `analysis_jobs` | `user_id` | `users.id` | User who owns the job |
| `user_profile` | `upload_id` | `user_uploads.id` | Resume for this profile |
| `user_profile` | `job_id` | `analysis_jobs.job_id` | Analysis job that created profile |
| `saved_interview_questions` | `auth_user_id` | `users.id` | Authenticated user who saved |
| `chat_messages` | `user_id` | `users.id` | Message sender |
| `chat_messages` | `to_user_id` | `users.id` | Message recipient |

**Why No Foreign Keys?**
- Simplified deployment and migrations
- Flexibility for data management
- Application-level integrity enforcement
- Documented relationships via comments

## Quick Start

### Using Docker Compose

```bash
cd websocket-server
docker-compose up -d
docker-compose logs -f
```

### Local Development

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# Download dependencies
go mod download

# Run server
go run cmd/server/main.go
```

Server runs on port **8081** by default.

## API Endpoints

### Health & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Server info |
| GET | `/health` | Health check |
| GET | `/stats` | Connected client statistics |
| POST | `/simulate/disconnect` | Test disconnection (dev) |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create new user account |
| POST | `/api/auth/login` | Login and get session token |
| POST | `/api/auth/logout` | Logout and invalidate token |
| GET | `/api/auth/me` | Get current user info |

**Signup Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Login Response:**
```json
{
  "success": true,
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com" },
  "token": "session_token_here"
}
```

**Validation Rules:**
- Name: minimum 2 characters
- Email: valid email format, unique
- Password: minimum 6 characters

### Upload & Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload resume (multipart/form-data) |
| GET | `/api/uploads` | List uploads (supports `user_id`, `limit`) |
| GET | `/api/upload/get?id=X` | Get upload metadata |
| GET | `/api/upload/download?id=X` | Download file |
| DELETE | `/api/upload/delete?id=X` | Delete upload |
| POST | `/api/analyze?id=X` | Start async resume analysis |
| GET | `/api/analysis/status?job_id=X` | Get analysis progress |
| GET | `/api/analysis/result?job_id=X` | Get analysis result |
| GET | `/api/analysis/search` | Search similar resumes |
| GET | `/api/analysis/user-jobs?user_id=X` | Get user's analysis jobs |
| GET | `/api/analysis/upload-jobs?upload_id=X` | Get jobs for upload |
| DELETE | `/api/analysis/delete-job?job_id=X` | Delete job (completed/failed only) |

**Upload with User ID:**
```bash
curl -X POST http://localhost:8081/api/upload \
  -F "resume=@resume.pdf" \
  -F "linkedin_url=https://linkedin.com/in/profile" \
  -F "user_id=1"
```

**Analysis Status Response:**
```json
{
  "job_id": "job_abc123",
  "status": "analyzing",
  "progress": 75,
  "current_step": "AI Analysis"
}
```

**File Constraints:**
- Maximum size: 10 MB
- Supported types: PDF, DOC, DOCX

**Delete Job:**
```bash
curl -X DELETE "http://localhost:8081/api/analysis/delete-job?job_id=job_abc123"
```

**Delete Job Response (Success):**
```json
{
  "success": true,
  "message": "Job deleted successfully",
  "job_id": "job_abc123"
}
```

**Delete Job Response (In Progress - Error):**
```json
{
  "error": "Cannot delete job in progress",
  "status": "analyzing",
  "message": "Only completed or failed jobs can be deleted"
}
```

### Interview Preparation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interview/generate` | Generate interview questions |
| POST | `/api/interview/regenerate-answer` | Regenerate single answer |
| POST | `/api/interview/save-question` | Save Q&A pair with embedding |
| GET | `/api/interview/check-saved` | Check if question is saved |
| GET | `/api/interview/saved-questions` | Get saved questions (paginated) |

**Generate Questions Request:**
```json
{
  "job_id": "job_abc123",
  "job_title": "Senior Software Engineer",
  "level": "Senior",
  "target_company": "Google",
  "job_description": "Build scalable systems...",
  "job_requirements": "5+ years experience..."
}
```

**Generate Questions Response:**
```json
{
  "questions": [
    {
      "id": "q1",
      "question": "Tell me about a time you optimized a system for scale",
      "category": "Technical",
      "difficulty": "Medium",
      "tags": ["scalability", "optimization"],
      "answer": "Based on your experience at X company..."
    }
  ]
}
```

**Get Saved Questions:**
```bash
curl "http://localhost:8081/api/interview/saved-questions?auth_user_id=1&limit=20"
```

### Q&A Chat Memory

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/load-qa` | Load Q&A pairs into client session |
| POST | `/api/chat/unload-qa` | Clear Q&A memory from client |

**Load Q&A Request:**
```json
{
  "client_id": "client_123",
  "user_id": "job_abc123",
  "job_id": "job_abc123",
  "limit": 20
}
```

**How It Works:**
1. Retrieves saved questions for user/job from database
2. Creates EmbeddingMatcher with 0.75 similarity threshold
3. Loads questions with embeddings into memory
4. Attaches matcher to WebSocket client
5. Subsequent messages are matched against loaded Q&A

### Chat Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/message/text` | Save text message |
| POST | `/api/chat/message/audio` | Save audio message |
| GET | `/api/chat/message/audio/content?id=X` | Get audio content |
| GET | `/api/chat/messages` | Get conversation history |
| POST | `/api/chat/message/system` | Save system message |

**Audio Message Request:**
```json
{
  "user_id": 1,
  "to_user_id": 10,
  "content": "base64_encoded_audio_data",
  "metadata": {
    "duration_ms": 5000,
    "mime_type": "audio/webm"
  }
}
```

## WebSocket Protocol

### Connection

```
WS /ws
```

**Welcome Message (Server → Client):**
```json
{
  "type": "system",
  "content": "Welcome!",
  "metadata": {
    "client_id": "abc123"
  }
}
```

### Message Format

**Client → Server:**
```json
{
  "type": "message",
  "sessionId": "optional-session-id",
  "content": "Message text",
  "timestamp": "2025-11-27T10:30:00Z"
}
```

**Server → Client (with Q&A match):**
```json
{
  "type": "message",
  "content": "Response text from saved Q&A",
  "sender": "assistant",
  "metadata": {
    "from_qa": true,
    "question": "Original matched question",
    "similarity": 0.87
  }
}
```

**Server → Client (no match):**
```json
{
  "type": "message",
  "content": "I don't have information about that.",
  "sender": "assistant"
}
```

### Connection Settings

| Setting | Value |
|---------|-------|
| Read timeout | 60 seconds |
| Ping period | 54 seconds |
| Max message size | 512 KB |
| Send buffer | 256 messages |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8081` | Server port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `chatapp` | Database user |
| `DB_PASSWORD` | `chatapp_password` | Database password |
| `DB_NAME` | `chatapp_db` | Database name |
| `DB_SSLMODE` | `disable` | SSL mode |
| `OPENAI_API_KEY` | - | OpenAI API key (required for analysis) |
| `LLM_API_KEY` | - | LLM API key |
| `LLM_API_URL` | `https://api.openai.com/v1` | LLM API URL |
| `LLM_MODEL` | `gpt-4` | LLM model name |
| `CHROMA_HOST` | `localhost` | ChromaDB host |
| `CHROMA_PORT` | `8000` | ChromaDB port |
| `CHUNK_SIZE` | `1000` | Text chunk size |
| `CHUNK_OVERLAP` | `200` | Text chunk overlap |
| `MAX_CONCURRENT_JOBS` | `5` | Max concurrent analysis jobs |

### Example .env

```env
PORT=8081

DB_HOST=localhost
DB_PORT=5432
DB_USER=chatapp
DB_PASSWORD=chatapp_password
DB_NAME=chatapp_db
DB_SSLMODE=disable

OPENAI_API_KEY=sk-your-api-key
LLM_MODEL=gpt-4

CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                               │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP / WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Handlers                                │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────────────┐  │
│  │   Auth   │ │  Upload  │ │ Interview │ │     Chat      │  │
│  └──────────┘ └──────────┘ └───────────┘ └───────────────┘  │
│  ┌──────────┐ ┌──────────────────────────────────────────┐  │
│  │ Analysis │ │              WebSocket                    │  │
│  └──────────┘ └──────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│     Hub     │   │  Analyzer   │   │  QAMatcher  │
│  (clients)  │   │  (pipeline) │   │  (cosine)   │
└─────────────┘   └─────────────┘   └─────────────┘
         │                │                │
         └────────────────┼────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Repository Layer                         │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────────────┐  │
│  │  Users   │ │ Uploads  │ │ Analysis  │ │   Questions   │  │
│  └──────────┘ └──────────┘ └───────────┘ └───────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL                              │
└─────────────────────────────────────────────────────────────┘
```

### Analysis Pipeline

```
Upload → Text Extraction → Chunking → Embeddings → LLM Analysis → Profile
         (PDF/DOCX)       (1000/200)   (ada-002)     (GPT-4)
```

### Q&A Matching Flow

```
1. User saves interview questions (embeddings generated & stored)
2. User loads Q&A into chat session (POST /api/chat/load-qa)
3. EmbeddingMatcher created with 0.75 threshold
4. User sends WebSocket message
5. Message → Generate embedding → Cosine similarity search
6. If similarity ≥ 0.75: Return matched answer with metadata
7. If no match: Return default response
```

### WebSocket Hub Architecture

```
Hub (goroutine)
├── register channel   ← New client connections
├── unregister channel ← Client disconnections
├── broadcast channel  ← Messages to all clients
└── clients map        ← Active client registry

Client (2 goroutines per connection)
├── readPump  → Reads messages, Q&A matching, sends response
└── writePump → Sends queued messages, ping/pong keepalive
```

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -h localhost -U chatapp -d chatapp_db
```

### Permission Denied on Tables

```bash
sudo -u postgres psql -d chatapp_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chatapp;"
sudo -u postgres psql -d chatapp_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chatapp;"
```

### Port Already in Use

```bash
lsof -i :8081
kill -9 <PID>
```

### OpenAI API Errors

1. Verify `OPENAI_API_KEY` is set correctly
2. Check API key has sufficient credits
3. Fallback to placeholder implementations if no key

### WebSocket Connection Issues

1. Check CORS configuration allows client origin
2. Verify `/ws` endpoint is accessible
3. Check for proxy/firewall blocking WebSocket upgrade

## Changelog

### Version 1.7.0 (2025-11-28)
- **Delete Analysis Job** - New endpoint to delete completed/failed jobs
- **Cascade Profile Deletion** - Deleting a job also removes associated user_profile
- **Status Validation** - Only allows deletion of completed or failed jobs
- **Error Handling** - Clear error messages for in-progress job deletion attempts

### Version 1.6.0 (2025-11-27)
- **User Authentication** - Signup, login, logout with session tokens
- **User ID Associations** - All operations now support user_id filtering
- **Chat Messages** - Text and audio message storage
- **Database Schema Updates** - Added users table, user_id columns
- **Removed FK Constraints** - Using semantic references instead

### Version 1.5.1 (2025-11-09)
- Fixed Q&A load endpoint user_id handling
- Added job_id validation for Q&A loading

### Version 1.5.0 (2025-01-09)
- Q&A Chat Memory feature with semantic matching
- Embedding storage for questions
- Load/Unload Q&A API endpoints

### Version 1.4.0 (2025-01-09)
- Interview preparation feature
- Question generation and management
- Saved questions with pagination

### Version 1.3.0 (2025-11-07)
- AI-powered resume analysis
- Asynchronous job processing
- RAG with ChromaDB integration

### Version 1.2.0 (2025-11-06)
- PostgreSQL integration
- Resume upload API
- Repository pattern

### Version 1.0.0 (2025-11-06)
- Initial release
- WebSocket server
- Health endpoints

---

**Built with Go and WebSockets**
