# AI Chat Application - Architecture Documentation

**Last Updated**: 2025-12-26
**Version**: 1.9.0
**Status**: Production Ready (Development)

---

## Table of Contents

1. [**System Overview**](01_system_overview.md) - High-level architecture, technology stack, key features
2. [**Frontend Architecture**](02_frontend.md) - Next.js app structure, components, state management
3. [**Backend Architecture**](03_backend.md) - Go server, handlers, services, patterns
4. [**Database Schema**](04_database.md) - PostgreSQL tables, relationships, data model
5. [**API Endpoints**](05_api_endpoints.md) - REST API, WebSocket endpoints, request/response formats
6. [**Data Flows**](06_data_flows.md) - Resume analysis pipeline, retry flow, export flow, WebSocket chat
7. [**Deployment Guide**](07_deployment.md) - Environment setup, startup sequence, production considerations
8. [**Recent Changes & Roadmap**](08_recent_changes.md) - Latest updates, pending features, future plans

---

## Quick Reference

### System Architecture Diagram

```
┌─────────────┐
│   Browser   │
│  (Port 3000)│
└──────┬──────┘
       │ HTTP/WebSocket
       ▼
┌─────────────┐
│  Next.js    │
│  Frontend   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ Go Backend  │────▶│ PostgreSQL  │
│ (Port 8081) │     │ (Port 5432) │
└──────┬──────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│  OpenAI API │
│  (GPT-4 +   │
│  Embeddings)│
└─────────────┘
```

### Technology Stack Summary

**Frontend**:
- Next.js 15.3.2 (App Router)
- React 19.0.0
- TypeScript 5.7.2
- Tailwind CSS 4.1.13

**Backend**:
- Go 1.24.4
- PostgreSQL 15+
- gorilla/websocket
- OpenAI GPT-4

### Key Features

1. **Resume Analysis** - AI-powered analysis with progress tracking
2. **Job Management** - Retry failed jobs, delete completed jobs
3. **Export Functionality** - Download results in JSON, CSV, PDF, DOCX formats
4. **Real-Time Chat** - WebSocket-based chat with Q&A matching
5. **Interview Prep** - AI-generated interview questions
6. **User Authentication** - Session-based auth with token management

---

## How to Navigate This Documentation

### For New Developers
1. Start with [System Overview](01_system_overview.md)
2. Read [Frontend Architecture](02_frontend.md) and [Backend Architecture](03_backend.md)
3. Review [Database Schema](04_database.md)
4. Check [Deployment Guide](07_deployment.md) to get started

### For Feature Development
1. Review [API Endpoints](05_api_endpoints.md) for existing APIs
2. Study [Data Flows](06_data_flows.md) for business logic
3. Check [Recent Changes](08_recent_changes.md) for latest updates
4. Refer to `docs/design_decisions/` for detailed design docs

### For Operations/DevOps
1. [Deployment Guide](07_deployment.md) - Setup and configuration
2. [System Overview](01_system_overview.md) - Infrastructure requirements
3. [Database Schema](04_database.md) - Database setup

---

## Architecture Principles

### Design Philosophy

1. **Separation of Concerns**: Clear boundaries between frontend, backend, and data layers
2. **Async Processing**: Long-running tasks (resume analysis) use worker pool pattern
3. **Real-Time Updates**: WebSocket for instant feedback, polling for job progress
4. **Extensibility**: Modular exporters, pluggable analyzers
5. **Developer Experience**: Comprehensive documentation, clear APIs

### Architectural Patterns Used

- **Repository Pattern**: Data access abstraction
- **Hub-Spoke Pattern**: WebSocket connection management
- **Worker Pool Pattern**: Concurrent job processing
- **Strategy Pattern**: Multiple export formats, PDF extraction fallback
- **Dependency Injection**: Components passed to handlers

---

## Quick Start

```bash
# 1. Start PostgreSQL
sudo pg_ctlcluster 15 main start

# 2. Start Backend
cd /home/coder/projects/ai_chat/websocket-server
go run cmd/server/main.go

# 3. Start Frontend
cd /home/coder/projects/ai_chat/chat-app
pnpm dev

# 4. Access Application
# Frontend: http://localhost:3000
# Backend: http://localhost:8081
# WebSocket: ws://localhost:8081/ws
```

---

## Documentation Conventions

### File Naming
- `##_descriptive_name.md` - Numbered for ordering
- README.md - Entry point (this file)

### Code Examples
- Inline code: `functionName()`
- Code blocks: Include language identifier
- File paths: Absolute from project root

### Diagrams
- ASCII art for simple diagrams
- Mermaid/PlantUML for complex flows (future)

---

## Contributing to Documentation

When making changes:

1. **Update relevant module** - Edit specific architecture file
2. **Update this README** if structure changes
3. **Add to Recent Changes** - Document in `08_recent_changes.md`
4. **Version control** - Update "Last Updated" date

---

## External Resources

- **Design Decisions**: `/docs/design_decisions/*.md`
- **Change Logs**: `/change_logs/YYYY_MM_DD.log`
- **Code README**: `/websocket-server/README.md`, `/chat-app/README.md`
- **Checkpoint**: `/2025_11_28.checkpoint.log`

---

## Document Maintenance

- **Review Frequency**: Monthly
- **Owner**: Development Team
- **Last Review**: 2025-12-26
- **Next Review**: 2026-01-26

---

**For detailed information, navigate to the specific architecture module using the links above.**
