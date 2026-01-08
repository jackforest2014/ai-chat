# System Overview

**Module**: 01 - System Overview
**Last Updated**: 2025-12-26

[← Back to Architecture Index](README.md)

---

## Introduction

The AI Chat Application is a full-stack web application that provides AI-powered resume analysis and interview preparation. The system enables users to upload resumes, receive AI-generated analysis, prepare for interviews, and export results in multiple formats.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                               │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Next.js Frontend (Port 3000)                │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │  Pages   │  │Components│  │  Hooks   │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP/WebSocket
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              Go Backend Server (Port 8081)                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   HTTP Handlers                      │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │    │
│  │  │ Auth   │ │Upload  │ │Analysis│ │Interview│       │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘       │    │
│  └──────────────────────┬──────────────────────────────┘    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │              WebSocket Hub (Gorilla)                 │    │
│  │  ┌──────────────┐         ┌──────────────┐         │    │
│  │  │   Hub        │◄───────►│   Client     │         │    │
│  │  │  Broadcast   │         │  (per conn)  │         │    │
│  │  └──────────────┘         └──────────────┘         │    │
│  └──────────────────────┬──────────────────────────────┘    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │            Resume Analyzer (Worker Pool)             │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │    │
│  │  │Extract │→│ Chunk  │→│ Embed  │→│  LLM   │       │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘       │    │
│  └──────────────────────┬──────────────────────────────┘    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │                  Repositories                        │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │    │
│  │  │ User   │ │ Upload │ │Analysis│ │Questions│       │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘       │    │
│  └──────────────────────┬──────────────────────────────┘    │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (Port 5432)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  users   │ │ uploads  │ │  jobs    │ │ profiles │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                 External Services                             │
│  ┌────────────┐              ┌────────────┐                 │
│  │  OpenAI    │              │  ChromaDB  │                 │
│  │  GPT-4     │              │  (Future)  │                 │
│  │ Embeddings │              │            │                 │
│  └────────────┘              └────────────┘                 │
└──────────────────────────────────────────────────────────────┘
```

---

## System Components

### 1. Frontend (Next.js Application)

**Purpose**: User interface for resume upload, analysis viewing, and chat interaction

**Key Responsibilities**:
- User authentication and session management
- Resume upload and file handling
- Real-time job progress display
- WebSocket chat interface
- Analysis result visualization
- Export functionality UI

**Technology**: Next.js 15 + React 19 + TypeScript

### 2. Backend (Go Server)

**Purpose**: Business logic, API endpoints, WebSocket server, and job processing

**Key Responsibilities**:
- HTTP API endpoints (REST)
- WebSocket connection management
- Resume analysis orchestration
- Job queue and worker pool management
- Authentication and authorization
- Export file generation

**Technology**: Go 1.24.4 + gorilla/websocket

### 3. Database (PostgreSQL)

**Purpose**: Persistent storage for all application data

**Key Responsibilities**:
- User account storage
- Resume file storage (BYTEA)
- Analysis job tracking
- Processed results storage
- Chat message persistence
- Interview question library

**Technology**: PostgreSQL 15+

### 4. External Services

**OpenAI API**:
- GPT-4 for resume analysis and interview questions
- text-embedding-ada-002 for embeddings (1536 dimensions)

**ChromaDB** (Planned):
- Vector database for semantic search
- Currently using placeholder implementation

---

## Technology Stack

### Frontend Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | Next.js | 15.3.2 | React framework with App Router |
| UI Library | React | 19.0.0 | Component-based UI |
| Language | TypeScript | 5.7.2 | Type-safe development |
| Styling | Tailwind CSS | 4.1.13 | Utility-first CSS |
| Icons | Lucide React | 0.468.0 | Icon library |
| Date Utils | date-fns | 4.1.0 | Date manipulation |
| Package Manager | pnpm | 10.11.0 | Fast package management |

### Backend Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Language | Go | 1.24.4 | High-performance backend |
| WebSocket | gorilla/websocket | 1.5.1 | WebSocket implementation |
| Database Driver | lib/pq | 1.10.9 | PostgreSQL driver |
| CORS | rs/cors | 1.10.1 | Cross-origin requests |
| Environment | godotenv | 1.5.1 | Environment variables |
| LLM Framework | langchaingo | 0.1.14 | LLM abstraction |
| PDF Generation | gofpdf | Latest | PDF export |
| DOCX Handling | docx | Latest | DOCX read/write |
| UUID | google/uuid | 1.6.0 | Unique identifiers |

### Database & Infrastructure

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Database | PostgreSQL | 15+ | Primary data store |
| Vector DB | ChromaDB | Planned | Semantic search (future) |

---

## Key Features

### 1. Resume Upload & Management
- Upload PDF, DOC, DOCX files (max 10MB)
- LinkedIn profile URL integration
- File storage in PostgreSQL (BYTEA)
- User-specific upload tracking

### 2. AI-Powered Resume Analysis
- Multi-stage processing pipeline:
  1. Text extraction (2 min timeout)
  2. Text chunking (1000 chars, 200 overlap)
  3. Embedding generation (OpenAI ada-002)
  4. Vector storage (ChromaDB placeholder)
  5. LLM analysis (GPT-4, 3 min timeout)
- Real-time progress tracking (0-100%)
- Async job processing with worker pool (5 concurrent jobs)
- Extracted data: skills, experience, education, summary, recommendations

### 3. Job Management
- View all analysis jobs per upload
- Real-time status updates (auto-polling every 2s)
- Retry failed jobs without re-uploading
- Delete completed/failed jobs
- Job states: queued → extracting_text → chunking → generating_embeddings → analyzing → completed/failed

### 4. Export Functionality
- **JSON**: Structured data export for developers
- **CSV**: Spreadsheet-compatible format
- **PDF**: Professional report with styling
- **DOCX**: Editable Word document
- Proper file download with Content-Disposition headers

### 5. Interview Preparation
- AI-generated personalized interview questions
- Question categories: Technical, Behavioral, Situational, Problem-Solving
- Difficulty levels: Easy, Medium, Hard
- Answer regeneration
- Save to personal question library
- Tag-based filtering

### 6. Real-Time Chat
- WebSocket-based bidirectional communication
- Semantic Q&A matching (cosine similarity, 0.75 threshold)
- Text and audio message support
- Message persistence
- Connection state tracking with auto-reconnection

### 7. User Authentication
- Session-based authentication
- JWT-like token storage in localStorage
- Protected routes
- User profile management

---

## System Characteristics

### Performance

| Metric | Target | Current |
|--------|--------|---------|
| Resume upload | <2s | ✅ |
| Analysis completion | <10 min | ✅ (typical: 3-5 min) |
| WebSocket latency | <100ms | ✅ |
| JSON export | <50ms | ✅ (<1ms) |
| CSV export | <100ms | ✅ (1-5ms) |
| PDF export | <300ms | ✅ (50-200ms) |
| DOCX export | <200ms | ✅ (20-100ms) |
| Concurrent jobs | 5 | ✅ (configurable) |

### Scalability

- **Worker Pool**: Semaphore-based, configurable (default: 5 concurrent jobs)
- **Database**: Connection pooling supported (not yet configured)
- **WebSocket**: Hub-spoke pattern, supports 100+ concurrent connections
- **Storage**: PostgreSQL BYTEA for files (<10MB each)

### Reliability

- **Job Retry**: Failed jobs can be retried without re-upload
- **Auto-Reconnection**: WebSocket reconnects with exponential backoff (2s → 30s max)
- **Timeout Handling**: All external calls have timeouts
- **Error Logging**: Comprehensive error messages and logging
- **Graceful Shutdown**: 10-second shutdown timeout for cleanup

### Security

**Current Implementation**:
- ✅ Session tokens (in-memory)
- ✅ File size validation (10MB max)
- ✅ File type verification (signature check)
- ✅ MIME type validation
- ⚠️ **Plain text passwords** (MOCK - not production ready)
- ⚠️ **No authorization checks** (any user can access any job)

**Production Requirements**:
- ❌ Password hashing (bcrypt recommended)
- ❌ User-scoped resources
- ❌ Rate limiting
- ❌ HTTPS/TLS
- ❌ CORS whitelist

---

## Communication Protocols

### HTTP/REST API
- **Protocol**: HTTP/1.1
- **Port**: 8081
- **Format**: JSON request/response
- **Authentication**: Bearer token in Authorization header
- **CORS**: Currently open (`*`), should be restricted in production

### WebSocket
- **Protocol**: WebSocket (RFC 6455)
- **Port**: 8081 (same as HTTP)
- **Endpoint**: `/ws`
- **Message Format**: JSON
- **Heartbeat**: Ping every 54s, Pong timeout 60s
- **Max Message Size**: 512 KB

---

## Development Environment

### Local Setup

**Prerequisites**:
- Go 1.24.4+
- Node.js 18+ and pnpm
- PostgreSQL 15+
- OpenAI API key

**Environment Variables**:
See [Deployment Guide](07_deployment.md) for complete list.

### Project Structure

```
/home/coder/projects/ai_chat/
├── chat-app/                 # Next.js frontend
├── websocket-server/         # Go backend
├── docs/                     # Documentation
│   ├── architecture/         # Architecture modules (this)
│   └── design_decisions/     # Design documents
├── change_logs/              # Daily change logs
└── 2025_11_28.checkpoint.log # Previous checkpoint
```

---

## System Boundaries

### In Scope
- Resume analysis and insights
- Interview question generation
- Real-time chat with Q&A matching
- Job management (retry, delete, export)
- User authentication

### Out of Scope (Future)
- Multi-user collaboration
- Real-time notifications (push)
- Video interview practice
- Resume editing
- Job application tracking
- Analytics dashboard

---

## Non-Functional Requirements

### Availability
- **Target**: 99% uptime
- **Downtime Window**: Planned maintenance on weekends
- **Recovery**: Manual restart (automated health checks planned)

### Maintainability
- **Code Coverage**: Target 70%+ (current: not measured)
- **Documentation**: Inline comments + architecture docs
- **Code Style**: Standard Go + ESLint for TypeScript

### Observability
- **Logging**: Console logs (structured logging planned)
- **Metrics**: None (Prometheus planned)
- **Tracing**: None (OpenTelemetry planned)
- **Monitoring**: Manual (automated alerts planned)

---

## System Constraints

### Technical Constraints
- Single PostgreSQL instance (no replication)
- In-memory session tokens (lost on restart)
- No distributed tracing
- Sequential job processing (5 concurrent max)

### Business Constraints
- Max file size: 10MB
- OpenAI API rate limits apply
- No SLA guarantees (development phase)

### Resource Constraints
- Worker pool: 5 concurrent jobs (configurable)
- WebSocket connections: ~100-200 (not tested beyond)
- Database: Shared server resources

---

## Dependencies

### Runtime Dependencies

**Frontend**:
- Node.js runtime
- Browser with WebSocket support
- LocalStorage for session tokens

**Backend**:
- Go runtime
- PostgreSQL database
- OpenAI API access
- Network connectivity

### External Services

| Service | Purpose | SLA | Fallback |
|---------|---------|-----|----------|
| OpenAI API | GPT-4, Embeddings | 99.9% | Placeholder implementations |
| ChromaDB | Vector search | N/A | Placeholder (not critical) |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.9.0 | 2025-12-26 | Added PDF/DOCX export |
| 1.8.0 | 2025-12-26 | Added job retry functionality |
| 1.7.0 | 2025-11-28 | Added job management features |
| 1.0.0 | 2025-11-28 | Initial implementation |

---

[Next: Frontend Architecture →](02_frontend.md)

[← Back to Architecture Index](README.md)
