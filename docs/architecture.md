# AI Chat Application - Architecture Documentation

**Last Updated**: 2025-12-26
**Version**: 1.9.0

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Data Flow](#data-flow)
8. [Deployment](#deployment)

---

## System Overview

The AI Chat Application is a full-stack web application that provides AI-powered resume analysis and interview preparation. The system consists of two main components:

1. **Frontend**: Next.js 15 + React 19 application
2. **Backend**: Go WebSocket server with PostgreSQL database

### Key Features

- **Resume Upload & Analysis**: Upload resumes (PDF/DOCX) for AI-powered analysis
- **Real-Time Chat**: WebSocket-based chat interface with semantic Q&A matching
- **Interview Preparation**: AI-generated interview questions with personalized answers
- **Job Management**: Track, retry, and delete analysis jobs
- **Export Functionality**: Download analysis results in JSON/CSV formats
- **User Authentication**: Session-based authentication with token management

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Next.js Frontend (Port 3000)               │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │    │
│  │  │  Pages   │  │Components│  │  Hooks   │         │    │
│  │  └──────────┘  └──────────┘  └──────────┘         │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/WebSocket
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Go Backend Server (Port 8081)                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │                   HTTP Handlers                     │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │    │
│  │  │ Auth   │ │Upload  │ │Analysis│ │Interview│      │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘      │    │
│  └─────────────────────┬──────────────────────────────┘    │
│  ┌─────────────────────▼──────────────────────────────┐    │
│  │              WebSocket Hub (Gorilla)                │    │
│  │  ┌──────────────┐         ┌──────────────┐        │    │
│  │  │   Hub        │◄───────►│   Client     │        │    │
│  │  │  Broadcast   │         │  (per conn)  │        │    │
│  │  └──────────────┘         └──────────────┘        │    │
│  └─────────────────────┬──────────────────────────────┘    │
│  ┌─────────────────────▼──────────────────────────────┐    │
│  │            Resume Analyzer (Worker Pool)            │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │    │
│  │  │Extract │→│ Chunk  │→│ Embed  │→│  LLM   │      │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘      │    │
│  └─────────────────────┬──────────────────────────────┘    │
│  ┌─────────────────────▼──────────────────────────────┐    │
│  │                  Repositories                       │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │    │
│  │  │ User   │ │ Upload │ │Analysis│ │Questions│      │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘      │    │
│  └─────────────────────┬──────────────────────────────┘    │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (Port 5432)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  users   │ │ uploads  │ │  jobs    │ │ profiles │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 External Services                            │
│  ┌────────────┐              ┌────────────┐                │
│  │  OpenAI    │              │  ChromaDB  │                │
│  │  GPT-4     │              │  (Future)  │                │
│  │ Embeddings │              │            │                │
│  └────────────┘              └────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Technology Stack

- **Framework**: Next.js 15.3.2 (App Router)
- **UI Library**: React 19.0.0
- **Language**: TypeScript 5.7.2
- **Styling**: Tailwind CSS 4.1.13
- **Icons**: Lucide React 0.468.0
- **Package Manager**: pnpm 10.11.0

### Directory Structure

```
chat-app/src/
├── app/                        # Next.js App Router
│   ├── api/chat/              # HTTP chat fallback
│   ├── analysis/[jobId]/      # Dynamic analysis result page
│   ├── interview/[jobId]/     # Interview prep page
│   ├── saved-questions/       # Saved Q&A library
│   ├── upload/                # Resume upload page
│   ├── profile/               # User profile & job management
│   ├── layout.tsx             # Root layout with AuthProvider
│   ├── page.tsx               # Home/chat page
│   └── globals.css            # Global styles & animations
│
├── components/                 # Reusable components
│   ├── auth/                  # Login, Signup forms
│   ├── chat/                  # Chat UI components
│   ├── upload/                # Upload & progress components
│   ├── interview/             # Interview question components
│   └── ui/                    # Base UI (buttons, modals, etc.)
│
├── contexts/                   # React Context
│   └── AuthContext.tsx        # Authentication state
│
├── hooks/                      # Custom hooks
│   └── useWebSocket.ts        # WebSocket connection logic
│
├── types/                      # TypeScript types
│   ├── websocket.ts
│   └── chat.ts
│
├── config/                     # Configuration
│   └── websocket.ts
│
└── lib/                        # Utilities
    └── utils.ts               # Helper functions
```

### Key Components

#### Authentication Flow
1. User enters credentials → `AuthContext.login()`
2. POST to `/api/auth/login` → receives token
3. Token stored in localStorage
4. Token sent in Authorization header for protected routes

#### WebSocket Connection
- Uses `useWebSocket` custom hook
- Auto-reconnection with exponential backoff (2s → 30s max)
- Max 3 reconnection attempts
- Client ID assigned by server
- Connection states tracked in UI

#### State Management
- **Global**: AuthContext (user, token, login/logout)
- **Local**: useState for component-specific state
- **Server**: React Query patterns for data fetching
- **WebSocket**: Custom hook with connection state

---

## Backend Architecture

### Technology Stack

- **Language**: Go 1.24.4
- **WebSocket**: gorilla/websocket v1.5.1
- **Database**: PostgreSQL 15+ with lib/pq v1.10.9
- **CORS**: rs/cors v1.10.1
- **Environment**: joho/godotenv v1.5.1
- **AI/ML**: langchaingo v0.1.14, OpenAI GPT-4

### Directory Structure

```
websocket-server/
├── cmd/server/
│   └── main.go                # Application entry point
│
├── internal/                  # Private application code
│   ├── handler/               # HTTP/WebSocket handlers
│   │   ├── websocket.go       # WebSocket upgrade & management
│   │   ├── auth.go            # Authentication endpoints
│   │   ├── upload.go          # File upload handling
│   │   ├── analysis.go        # Resume analysis endpoints
│   │   ├── interview.go       # Interview question generation
│   │   ├── chat.go            # Q&A chat memory
│   │   └── chat_message.go    # Message persistence
│   │
│   ├── hub/                   # WebSocket connection management
│   │   ├── hub.go             # Central hub coordinator
│   │   └── client.go          # Per-client connection handler
│   │
│   ├── analyzer/              # Resume analysis pipeline
│   │   ├── analyzer.go        # Core interfaces
│   │   ├── worker.go          # Async job processor
│   │   ├── extractor.go       # PDF/DOCX text extraction
│   │   ├── chunker.go         # Text chunking
│   │   ├── embeddings.go      # OpenAI embeddings
│   │   ├── vectorstore.go     # ChromaDB integration
│   │   └── llm.go             # OpenAI LLM client
│   │
│   ├── exporter/              # Export analysis results (NEW)
│   │   ├── exporter.go        # Interface & types
│   │   ├── default_exporter.go # Main coordinator
│   │   ├── json_exporter.go   # JSON export
│   │   ├── csv_exporter.go    # CSV export
│   │   ├── pdf_exporter.go    # PDF export (future)
│   │   └── docx_exporter.go   # DOCX export (future)
│   │
│   ├── qamatcher/             # Q&A semantic matching
│   │   ├── matcher.go         # Matcher interface
│   │   └── embedding_matcher.go # Cosine similarity
│   │
│   └── repository/            # Data access layer
│       ├── repository.go      # Upload repository
│       ├── user_repository.go
│       ├── analysis_repository.go
│       ├── saved_question_repository.go
│       ├── chat_message_repository.go
│       └── postgres/          # PostgreSQL implementations
│
├── pkg/models/                # Public data models
│   ├── message.go
│   ├── user.go
│   ├── upload.go
│   ├── analysis.go
│   ├── saved_question.go
│   └── chat_message.go
│
├── db/                        # Database schemas
│   ├── schema1_users.sql
│   ├── schema2_uploads.sql
│   ├── schema3_analysis.sql
│   ├── schema4_profiles.sql
│   ├── schema5_questions.sql
│   └── schema6_messages.sql
│
└── scripts/                   # Utility scripts
```

### Key Architectural Patterns

#### Hub-Spoke WebSocket Pattern
```
Hub (central coordinator)
  ├── register channel   → Add new clients
  ├── unregister channel → Remove clients
  ├── broadcast channel  → Message to all
  └── clients map        → Active connections

Each Client:
  ├── readPump()  goroutine → Receive from client
  └── writePump() goroutine → Send to client
```

#### Worker Pool Pattern
```
Semaphore channel (capacity: 5)
  ├── Job 1 → processJob() goroutine
  ├── Job 2 → processJob() goroutine
  ├── Job 3 → processJob() goroutine
  ├── Job 4 → processJob() goroutine
  └── Job 5 → processJob() goroutine

Waiting jobs queue in database (status='queued')
```

#### Repository Pattern
```
Interface Definition
  ↓
PostgreSQL Implementation
  ↓
Database Operations
```

---

## Database Schema

### Entity Relationship Diagram

```
users (1) ─────────┬──────────> (N) user_uploads
                   │
                   └──────────> (N) analysis_jobs
                   │
                   └──────────> (N) saved_interview_questions
                   │
                   └──────────> (N) chat_messages

user_uploads (1) ──┬──────────> (N) analysis_jobs
                   │
                   └──────────> (N) user_profile

analysis_jobs (1) ─┴──────────> (1) user_profile
```

### Tables

#### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,  -- Plain text (MOCK - not production)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### user_uploads
```sql
CREATE TABLE user_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,  -- Semantic reference to users.id
    linkedin_url VARCHAR(500),
    file_name VARCHAR(255) NOT NULL,
    file_content BYTEA NOT NULL,  -- Binary file storage
    file_size INTEGER CHECK (file_size <= 10485760),  -- 10MB max
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### analysis_jobs
```sql
CREATE TABLE analysis_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(100) UNIQUE NOT NULL,
    upload_id INTEGER,  -- Semantic reference to user_uploads.id
    user_id INTEGER,    -- Semantic reference to users.id
    status VARCHAR(50) NOT NULL,  -- queued, extracting_text, chunking,
                                  -- generating_embeddings, analyzing,
                                  -- completed, failed
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_step VARCHAR(100),
    extracted_text TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

#### user_profile
```sql
CREATE TABLE user_profile (
    id SERIAL PRIMARY KEY,
    upload_id INTEGER,  -- Semantic reference to user_uploads.id
    job_id VARCHAR(100), -- Semantic reference to analysis_jobs.job_id
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),
    age INTEGER CHECK (age > 0 AND age < 150),
    race VARCHAR(100),
    location VARCHAR(255),
    total_work_years NUMERIC(5,2) CHECK (total_work_years >= 0),
    skills JSONB,              -- {"technical": [...], "soft": [...]}
    experience JSONB,          -- [{company, role, years, description}]
    education JSONB,           -- [{degree, institution, year}]
    summary TEXT,
    job_recommendations JSONB,
    strengths JSONB,
    weaknesses JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### saved_interview_questions
```sql
CREATE TABLE saved_interview_questions (
    id BIGSERIAL PRIMARY KEY,
    auth_user_id INTEGER,  -- Semantic reference to users.id
    user_id VARCHAR(255),  -- Legacy identifier
    job_id VARCHAR(255),
    question_id VARCHAR(255),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),    -- Technical, Behavioral, etc.
    difficulty VARCHAR(50),   -- Easy, Medium, Hard
    tags TEXT[],
    job_title VARCHAR(255),
    company VARCHAR(255),
    question_embedding BYTEA, -- Serialized float32 1536-dim vector
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, job_id, question_id)
);
```

#### chat_messages
```sql
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER,      -- Sender (System = 10)
    to_user_id INTEGER,   -- Recipient (System = 10)
    msg_type VARCHAR(20) DEFAULT 'text',  -- text, image, audio, video
    text_content TEXT,
    content BYTEA,        -- Binary data for audio/image/video
    metadata JSONB,       -- {duration_ms, mime_type, from_qa, similarity}
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### No Foreign Key Constraints

**Rationale**: Simplifies deployment and provides flexibility
- Application-level integrity enforcement
- Column comments document relationships
- Easier to manage across microservices (future)

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create new user account |
| POST | `/api/auth/login` | User authentication, returns token |
| POST | `/api/auth/logout` | Invalidate session token |
| GET | `/api/auth/me` | Get current user info (requires auth) |

### File Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload resume (PDF/DOCX, max 10MB) |
| GET | `/api/uploads` | List uploads (paginated, user filter) |
| GET | `/api/upload/get?id=X` | Get upload metadata |
| GET | `/api/upload/download?id=X` | Download file content |
| DELETE | `/api/upload/delete?id=X` | Delete upload |

### Resume Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze?id=X&user_id=Y` | Start async analysis |
| GET | `/api/analysis/status?job_id=X` | Get job progress (0-100%) |
| GET | `/api/analysis/result?job_id=X` | Get completed analysis |
| GET | `/api/analysis/search?query=X` | Vector similarity search |
| GET | `/api/analysis/user-jobs?user_id=X` | User's analysis jobs |
| GET | `/api/analysis/upload-jobs?upload_id=X` | Jobs for upload |
| DELETE | `/api/analysis/delete-job?job_id=X` | Delete job (completed/failed only) |
| POST | `/api/analysis/retry-job?job_id=X` | **NEW** Retry failed job |
| GET | `/api/analysis/export?job_id=X&format=json` | **NEW** Export results |

### Interview Preparation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interview/generate` | Generate 10 interview questions |
| POST | `/api/interview/regenerate-answer` | Regenerate single answer |
| POST | `/api/interview/save-question` | Save question with embedding |
| GET | `/api/interview/check-saved` | Check if question saved |
| GET | `/api/interview/saved-questions` | Paginated saved questions |

### Q&A Chat Memory

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/load-qa` | Load Q&A into WebSocket session |
| POST | `/api/chat/unload-qa` | Clear Q&A from session |

### Chat Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/message/text` | Save text message |
| POST | `/api/chat/message/audio` | Save audio message (base64) |
| GET | `/api/chat/message/audio/content?id=X` | Get audio binary |
| GET | `/api/chat/messages` | Get conversation history |
| POST | `/api/chat/message/system` | Save system message |

### WebSocket

| Endpoint | Protocol | Description |
|----------|----------|-------------|
| `/ws` | WebSocket | Real-time chat connection |

---

## Data Flow

### Resume Analysis Pipeline

```
1. Upload
   User → Frontend → POST /api/upload
   → Backend saves to user_uploads (BYTEA)
   → Returns upload_id

2. Start Analysis
   User → Frontend → POST /api/analyze?id=upload_id
   → Backend creates analysis_job (status='queued')
   → Worker pool picks up job
   → Returns job_id

3. Processing (Async)
   Worker:
   ├─ Extract Text (10-20%)     → 2 min timeout
   ├─ Chunk Text (20-40%)       → 1000 chars, 200 overlap
   ├─ Generate Embeddings (40-60%) → OpenAI ada-002, 3 min timeout
   ├─ Store Vectors (55-60%)    → ChromaDB (placeholder)
   └─ LLM Analysis (60-95%)     → GPT-4, 3 min timeout

4. Completion
   Worker creates user_profile
   → Sets status='completed', progress=100

5. Polling (Frontend)
   Every 2 seconds:
   Frontend → GET /api/analysis/status?job_id=X
   → Updates progress bar

6. View Results
   Frontend → GET /api/analysis/result?job_id=X
   → Returns user_profile data

7. Export (NEW)
   Frontend → GET /api/analysis/export?job_id=X&format=json
   → Exporter generates file
   → Browser downloads
```

### Job Retry Flow (NEW)

```
1. Job Fails
   Worker sets status='failed', error_message

2. User Clicks Retry
   Frontend shows confirmation modal

3. Retry Initiated
   Frontend → POST /api/analysis/retry-job?job_id=X
   → Backend validates status='failed'
   → Deletes user_profile (if exists)
   → Resets job: status='queued', progress=0
   → Resubmits to worker pool
   → Returns 202 Accepted

4. Processing Resumes
   Worker picks up job from queue
   → Follows normal analysis pipeline
```

### WebSocket Chat Flow

```
1. Connect
   Frontend → ws://backend:8081/ws
   → Hub registers client
   → Sends welcome message with client_id

2. Send Message
   Frontend → WebSocket.send(JSON)
   → readPump() receives
   → Q&A matcher checks (if loaded)
   → Returns answer (matched or default)
   → writePump() sends response

3. Q&A Matching
   Client has matcher loaded?
   Yes → Generate query embedding
      → Cosine similarity search
      → Threshold 0.75
      → Return matched answer
   No → Return default response

4. Disconnect
   Frontend closes connection
   → Hub unregisters client
   → Cleanup resources
```

---

## Deployment

### Environment Variables

**Backend (.env)**:
```bash
# Server
PORT=8081

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=chatapp
DB_PASSWORD=chatapp_password
DB_NAME=chatapp_db
DB_SSLMODE=disable

# OpenAI
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000

# Analyzer
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_CONCURRENT_JOBS=5
```

**Frontend (.env.local)**:
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8081
NEXT_PUBLIC_WS_URL=ws://localhost:8081/ws
```

### Startup Sequence

1. **PostgreSQL**: `sudo pg_ctlcluster 15 main start`
2. **Backend**: `cd websocket-server && go run cmd/server/main.go`
3. **Frontend**: `cd chat-app && pnpm dev`

### Production Considerations

1. **Authentication**: Implement bcrypt password hashing
2. **Foreign Keys**: Add FK constraints for data integrity
3. **Caching**: Redis for session tokens and PDF exports
4. **Rate Limiting**: Prevent API abuse
5. **Monitoring**: Prometheus metrics, distributed tracing
6. **HTTPS**: TLS certificates for production
7. **CORS**: Restrict to specific origins
8. **Database**: Connection pooling, read replicas

---

## Recent Changes (2025-12-26)

### 1. Job Retry Functionality
- Added retry capability for failed analysis jobs
- New endpoint: `POST /api/analysis/retry-job`
- Resets job to queued status and reprocesses
- Frontend: Retry button + confirmation modal

### 2. Export Analysis Results
- Export completed analyses in JSON/CSV formats
- New package: `internal/exporter`
- New endpoint: `GET /api/analysis/export?format=json|csv`
- Frontend: Export dropdown menu
- Future: PDF and DOCX formats

---

## Future Roadmap

### Phase 1 (Current)
- ✅ Job Retry
- ✅ Export JSON/CSV
- ⏳ Export PDF/DOCX
- ⏳ Batch Delete
- ⏳ Job Completion Notifications

### Phase 2 (Q1 2026)
- Real-time notifications (WebSocket events)
- Batch operations (retry/delete multiple jobs)
- Auto-retry with exponential backoff
- Export history tracking

### Phase 3 (Q2 2026)
- Multi-user collaboration
- Interview mock sessions
- Video recording for interview practice
- Advanced analytics dashboard

---

**Document Version**: 1.0
**Last Review**: 2025-12-26
**Next Review**: 2026-01-26
