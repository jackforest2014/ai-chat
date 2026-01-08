# AI Chat Application

A full-stack AI-powered resume analysis and chat application with real-time WebSocket communication, intelligent interview preparation, and comprehensive job management features.

![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react)
![Go](https://img.shields.io/badge/Go-1.24-00ADD8?style=for-the-badge&logo=go)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql)

## Overview

This application combines modern web technologies to deliver a powerful platform for resume analysis, interview preparation, and real-time communication. Built with a Go WebSocket server backend and a Next.js 15 React frontend, it leverages OpenAI's GPT-4 for intelligent resume parsing and personalized interview question generation.

### Key Features

- 🔐 **User Authentication** - Secure signup, login, and session management
- 📄 **Resume Analysis** - AI-powered resume parsing with OpenAI GPT-4
- 💬 **Real-time Chat** - WebSocket-based instant messaging with audio support
- 🎯 **Interview Prep** - AI-generated personalized interview questions
- 🧠 **Q&A Memory** - Semantic matching with 75% similarity threshold
- 📊 **Job Management** - Complete CRUD operations with retry, batch delete, and export
- 📥 **Export Functionality** - Download analysis in JSON, CSV, PDF, or DOCX
- 🔄 **Auto-Polling** - Real-time job status updates with visual progress indicators
- ✅ **Batch Operations** - Select and manage multiple jobs simultaneously

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Clients                          │
│                    (Next.js 15 / React 19)                   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Go WebSocket Server                        │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐  │
│  │   Auth   │ │  Upload  │ │ Interview │ │     Chat     │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐  │
│  │ Analysis │ │  Export  │ │    Hub    │ │  QAMatcher   │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (15+)                       │
│  Users | Uploads | Analysis Jobs | Profiles | Questions     │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│            OpenAI GPT-4 | ChromaDB | Embeddings              │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
ai_chat/
├── chat-app/                      # Next.js 15 Frontend
│   ├── src/
│   │   ├── app/                   # App Router pages
│   │   ├── components/            # React components
│   │   ├── contexts/              # AuthContext
│   │   ├── hooks/                 # useWebSocket
│   │   └── types/                 # TypeScript types
│   └── README.md                  # Frontend documentation
│
├── websocket-server/              # Go Backend
│   ├── cmd/server/                # Entry point
│   ├── internal/
│   │   ├── handler/               # HTTP & WS handlers
│   │   ├── hub/                   # WebSocket hub
│   │   ├── repository/            # Data access layer
│   │   ├── analyzer/              # Resume analysis pipeline
│   │   └── exporter/              # Export formats (JSON/CSV/PDF/DOCX)
│   ├── db/                        # Database schemas
│   └── README.md                  # Backend documentation
│
└── docs/                          # Design documents & architecture
    ├── design_decisions/          # Feature design docs
    ├── architecture/              # Architecture documentation
    └── batch_delete_frontend_implementation.md
```

## Tech Stack

### Frontend
- **Framework**: Next.js 15.3.2 (App Router)
- **UI Library**: React 19.0.0
- **Language**: TypeScript 5.7.2
- **Styling**: Tailwind CSS 4.1.13
- **Icons**: Lucide React 0.468.0
- **WebSocket**: Native WebSocket API with custom hooks

### Backend
- **Language**: Go 1.24
- **WebSocket**: gorilla/websocket 1.5.1
- **Database**: PostgreSQL 15+ with lib/pq
- **AI/ML**: OpenAI GPT-4, text-embedding-ada-002
- **Vector Store**: ChromaDB (via chroma-go)
- **PDF/DOCX**: pdfcpu, unipdf, nguyenthenguyen/docx
- **Export**: gofpdf, encoding/csv

### Infrastructure
- **Database**: PostgreSQL 15+
- **Deployment**: Docker & Docker Compose
- **API**: RESTful HTTP + WebSocket

## Quick Start

### Prerequisites

- **Node.js** 20+ (for frontend)
- **Go** 1.24+ (for backend)
- **PostgreSQL** 15+
- **Docker** (optional, for containerized deployment)
- **OpenAI API Key** (for AI features)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai_chat
```

### 2. Set Up PostgreSQL

```bash
# Create database user
sudo -u postgres psql -c "CREATE USER chatapp WITH PASSWORD 'chatapp_password';"

# Create database
sudo -u postgres psql -c "CREATE DATABASE chatapp_db OWNER chatapp;"

# Apply schemas (in order)
cd websocket-server
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

### 3. Configure Backend

```bash
cd websocket-server
cp .env.example .env
```

Edit `.env` with your settings:

```env
PORT=8081
DB_HOST=localhost
DB_PORT=5432
DB_USER=chatapp
DB_PASSWORD=chatapp_password
DB_NAME=chatapp_db
OPENAI_API_KEY=sk-your-api-key
LLM_MODEL=gpt-4
```

### 4. Start Backend

```bash
# Install Go dependencies
go mod download

# Run server
go run cmd/server/main.go
```

Backend runs on http://localhost:8081

### 5. Configure Frontend

```bash
cd ../chat-app
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8081/ws
NEXT_PUBLIC_BACKEND_URL=http://localhost:8081
```

### 6. Start Frontend

```bash
# Install dependencies
corepack enable
pnpm install

# Run development server
pnpm dev
```

Frontend runs on http://localhost:3000

## Core Features

### 1. User Authentication
- Secure signup and login with password hashing
- Session token management
- User profile with activity statistics
- Protected routes and API endpoints

### 2. Resume Upload & Analysis
- Support for PDF, DOC, DOCX files (up to 10MB)
- LinkedIn URL integration
- Asynchronous job processing with progress tracking
- AI-powered parsing with OpenAI GPT-4
- RAG pipeline with ChromaDB vector store
- Extracted profile includes:
  - Personal information (name, email, phone, location, age)
  - Skills (technical & soft)
  - Work experience with dates and descriptions
  - Education history
  - AI insights (strengths, weaknesses, job recommendations)

### 3. Job Management
- **View Jobs** - List all analysis jobs by upload with status
- **Delete Jobs** - Remove completed or failed jobs with confirmation
- **Retry Jobs** - Reprocess failed jobs from scratch
- **Batch Delete** - Select multiple jobs with checkboxes and delete in one operation
- **Export Results** - Download analysis in JSON, CSV, PDF, or DOCX formats
- **Auto-Polling** - Real-time updates for in-progress jobs (every 2 seconds)
- **Visual Indicators** - Animated progress bars and pulsing status icons

### 4. Interview Preparation
- AI-generated personalized questions based on resume
- Job-specific questions with company and role context
- 10 questions per session with categories:
  - Technical
  - Behavioral
  - Situational
  - Problem-Solving
- Difficulty levels: Easy, Medium, Hard
- Individual answer regeneration
- Save questions to profile with embeddings
- Filter and sort saved questions

### 5. Q&A Chat Memory
- Load saved interview questions into chat session
- Semantic matching with 75% similarity threshold
- Cosine similarity on OpenAI embeddings
- Visual badges for Q&A-matched responses
- Display matched question and similarity score
- Automatic response from saved answers

### 6. Real-time Chat
- WebSocket-based instant messaging
- Text and audio message support
- Connection status indicators
- Auto-reconnect with exponential backoff (2s → 30s max)
- Message history with timestamps
- Audio recording with MediaRecorder API

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Upload & Analysis
- `POST /api/upload` - Upload resume
- `GET /api/uploads` - List uploads
- `POST /api/analyze?id=X` - Start analysis
- `GET /api/analysis/status?job_id=X` - Get job status
- `GET /api/analysis/result?job_id=X` - Get results
- `DELETE /api/analysis/delete-job?job_id=X` - Delete job
- `POST /api/analysis/retry-job?job_id=X` - Retry failed job
- `POST /api/analysis/batch-delete` - Batch delete jobs
- `GET /api/analysis/export?job_id=X&format=Y` - Export results

### Interview Preparation
- `POST /api/interview/generate` - Generate questions
- `POST /api/interview/regenerate-answer` - Regenerate answer
- `POST /api/interview/save-question` - Save Q&A pair
- `GET /api/interview/saved-questions` - Get saved questions

### Chat & Q&A
- `POST /api/chat/load-qa` - Load Q&A into session
- `POST /api/chat/unload-qa` - Clear Q&A memory
- `POST /api/chat/message/text` - Save text message
- `POST /api/chat/message/audio` - Save audio message
- `GET /api/chat/messages` - Get message history

## Deployment

### Using Docker Compose

```bash
cd websocket-server
docker-compose up -d
```

### Manual Deployment

1. **Backend**: Build Go binary and run with environment variables
2. **Frontend**: Build Next.js app with `pnpm build` and deploy with `pnpm start`
3. **Database**: Ensure PostgreSQL is accessible from backend

### Environment Considerations

- Use HTTPS/WSS for production
- Configure CORS for frontend domain
- Set strong database passwords
- Rotate API keys regularly
- Enable PostgreSQL SSL mode in production

## Documentation

- [Backend Documentation](./websocket-server/README.md) - Go server, API, database
- [Frontend Documentation](./chat-app/README.md) - Next.js app, components, hooks
- [Design Decisions](./docs/design_decisions/) - Feature design documents
- [Architecture](./docs/architecture/) - System architecture documentation

## Development Workflow

1. **Feature Design** - Create design document in `docs/design_decisions/`
2. **Backend Implementation** - Add endpoints, handlers, and repository methods
3. **Frontend Integration** - Build UI components and API integration
4. **Testing** - Manual testing with real data
5. **Documentation** - Update READMEs and design docs
6. **Commit** - Commit with descriptive messages

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -h localhost -U chatapp -d chatapp_db
```

### WebSocket Connection Failed
- Verify backend is running on port 8081
- Check `NEXT_PUBLIC_WEBSOCKET_URL` includes `/ws` path
- Ensure CORS is configured for frontend origin

### OpenAI API Errors
- Verify `OPENAI_API_KEY` is set correctly
- Check API key has sufficient credits
- Review rate limits and quotas

## Recent Updates

### Version 1.10.0 (2025-12-26)
- ✨ Batch delete jobs (1-100 jobs per request)
- 🔒 Transaction safety with PostgreSQL
- 🎨 Checkbox selection UI with "Select All"

### Version 1.9.0 (2025-12-26)
- 📥 Export analysis to JSON, CSV, PDF, DOCX
- 📄 Professional PDF generation
- 📝 Microsoft Word document export

### Version 1.8.0 (2025-12-26)
- 🔄 Retry failed analysis jobs
- ♻️ Automatic job reset and cleanup
- 🚀 Complete reprocessing from scratch

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the [Backend README](./websocket-server/README.md)
- Check the [Frontend README](./chat-app/README.md)
- Review [Design Documents](./docs/design_decisions/)
- Open an issue on GitHub

---

**Built with Go, Next.js, React, and PostgreSQL**
