# Deployment Guide

**Module**: 07 - Deployment Guide
**Last Updated**: 2025-12-26

[← Back to Architecture Index](README.md)

---

## Overview

This guide covers local development setup, environment configuration, startup procedures, and production deployment considerations for the AI Chat Application.

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Go | 1.24.4+ | Backend runtime |
| Node.js | 18+ | Frontend build and runtime |
| pnpm | 10.11.0+ | Frontend package manager |
| PostgreSQL | 15+ | Database |
| Git | Latest | Version control |

### API Keys

| Service | Required | Purpose |
|---------|----------|---------|
| OpenAI API | Yes | GPT-4 and embeddings |
| ChromaDB | No | Vector storage (placeholder) |

---

## Environment Configuration

### Backend (.env)

Create `/home/coder/projects/ai_chat/websocket-server/.env`:

```env
# Database Configuration
DATABASE_URL=postgres://chatapp:password@localhost:5432/ai_chat?sslmode=disable

# OpenAI API
OPENAI_API_KEY=sk-...your-api-key-here...

# Server Configuration
PORT=8081
WORKER_POOL_SIZE=5

# CORS (Development)
ALLOWED_ORIGINS=http://localhost:3000

# WebSocket Configuration
WS_MAX_MESSAGE_SIZE=524288  # 512 KB
WS_PING_INTERVAL=54s
WS_PONG_TIMEOUT=60s

# ChromaDB (Optional - Placeholder)
CHROMA_DB_URL=http://localhost:8000
CHROMA_COLLECTION=resume_embeddings
```

**Security Notes**:
- ⚠️ Never commit `.env` files to version control
- ⚠️ Use strong database passwords in production
- ⚠️ Rotate OpenAI API keys regularly

### Frontend (.env.local)

Create `/home/coder/projects/ai_chat/chat-app/.env.local`:

```env
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8081
```

**Next.js Environment Variables**:
- Prefix with `NEXT_PUBLIC_` for client-side access
- Without prefix: server-side only

---

## Database Setup

### Step 1: Install PostgreSQL

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS (Homebrew)**:
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Step 2: Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE ai_chat;

# Create user with password
CREATE USER chatapp WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ai_chat TO chatapp;

# Connect to database
\c ai_chat

# Grant schema privileges
GRANT ALL ON SCHEMA public TO chatapp;

# Exit
\q
```

### Step 3: Run Migrations

```bash
cd /home/coder/projects/ai_chat/websocket-server

# Apply schema files in order
psql -U chatapp -d ai_chat -f db/schema_users.sql
psql -U chatapp -d ai_chat -f db/schema.sql
psql -U chatapp -d ai_chat -f db/migrations/002_analysis_tables.sql
psql -U chatapp -d ai_chat -f db/schema_saved_questions.sql
psql -U chatapp -d ai_chat -f db/schema_chat_messages.sql
```

### Step 4: Verify Tables

```bash
psql -U chatapp -d ai_chat

# List tables
\dt

# Expected output:
# users
# user_uploads
# analysis_jobs
# user_profile
# saved_interview_questions
# chat_messages

# Exit
\q
```

---

## Local Development Setup

### Backend Setup

```bash
# Navigate to backend directory
cd /home/coder/projects/ai_chat/websocket-server

# Install dependencies
go mod download

# Verify Go version
go version  # Should be 1.24.4+

# Create .env file
cp .env.example .env  # If example exists, otherwise create manually

# Edit .env with your configuration
nano .env

# Run backend server
go run cmd/server/main.go
```

**Expected Output**:
```
2025/12/26 10:00:00 Database connected successfully
2025/12/26 10:00:00 OpenAI client initialized
2025/12/26 10:00:00 Worker pool initialized (5 workers)
2025/12/26 10:00:00 WebSocket hub started
2025/12/26 10:00:00 Server starting on :8081
```

**Verify Backend**:
```bash
curl http://localhost:8081/api/auth/login
# Should return 400 or 405 (method not allowed)
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd /home/coder/projects/ai_chat/chat-app

# Install dependencies
pnpm install

# Verify Node.js version
node -v  # Should be v18+

# Create .env.local file
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8081" > .env.local

# Run development server
pnpm dev
```

**Expected Output**:
```
▲ Next.js 15.3.2
- Local:        http://localhost:3000
- Network:      http://192.168.1.100:3000

✓ Ready in 2.3s
```

**Verify Frontend**:
- Open browser: `http://localhost:3000`
- Should see login page

---

## Startup Sequence

### Complete System Startup

**Terminal 1 - Database**:
```bash
# Start PostgreSQL
sudo pg_ctlcluster 15 main start

# Verify running
sudo pg_ctlcluster 15 main status
```

**Terminal 2 - Backend**:
```bash
cd /home/coder/projects/ai_chat/websocket-server
go run cmd/server/main.go
```

**Terminal 3 - Frontend**:
```bash
cd /home/coder/projects/ai_chat/chat-app
pnpm dev
```

**Verification Checklist**:
- [ ] PostgreSQL running on port 5432
- [ ] Backend running on port 8081
- [ ] Frontend running on port 3000
- [ ] Can access http://localhost:3000
- [ ] Can login with test user
- [ ] Can upload resume

---

## Production Build

### Backend Production Build

```bash
cd /home/coder/projects/ai_chat/websocket-server

# Build binary
go build -o bin/server cmd/server/main.go

# Run binary
./bin/server
```

**Build Options**:
```bash
# Optimized build (smaller binary)
go build -ldflags="-s -w" -o bin/server cmd/server/main.go

# Cross-compile for Linux
GOOS=linux GOARCH=amd64 go build -o bin/server-linux cmd/server/main.go
```

### Frontend Production Build

```bash
cd /home/coder/projects/ai_chat/chat-app

# Build for production
pnpm build

# Start production server
pnpm start
```

**Build Output**:
```
Route (app)                              Size     First Load JS
┌ ○ /                                    5.2 kB          95 kB
├ ○ /chat                                8.1 kB          98 kB
├ ○ /interview                           7.5 kB          97 kB
├ ○ /profile                             9.3 kB          99 kB
└ ○ /upload                              6.8 kB          96 kB

○  (Static)  automatically rendered as static HTML
```

**Production Environment Variables**:
```env
# .env.production
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
NODE_ENV=production
```

---

## Production Deployment

### Option 1: Traditional Server (VPS)

**Architecture**:
```
┌─────────────────┐
│   Cloudflare    │  (CDN + DNS)
└────────┬────────┘
         │
┌────────▼────────┐
│     Nginx       │  (Reverse Proxy + SSL)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│Next.js│ │ Go    │
│ :3000 │ │ :8081 │
└───────┘ └───┬───┘
               │
        ┌──────▼──────┐
        │ PostgreSQL  │
        │   :5432     │
        └─────────────┘
```

**Nginx Configuration** (`/etc/nginx/sites-available/ai-chat`):
```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_read_timeout 86400;
    }

    # WebSocket endpoint
    location /ws {
        proxy_pass http://localhost:8081/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

**SSL with Let's Encrypt**:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

**Systemd Service** (`/etc/systemd/system/ai-chat-backend.service`):
```ini
[Unit]
Description=AI Chat Backend
After=network.target postgresql.service

[Service]
Type=simple
User=chatapp
WorkingDirectory=/home/chatapp/websocket-server
ExecStart=/home/chatapp/websocket-server/bin/server
Restart=always
RestartSec=10
Environment="DATABASE_URL=postgres://chatapp:password@localhost:5432/ai_chat?sslmode=require"
Environment="OPENAI_API_KEY=sk-..."
Environment="PORT=8081"

[Install]
WantedBy=multi-user.target
```

**Enable and Start Service**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-chat-backend
sudo systemctl start ai-chat-backend
sudo systemctl status ai-chat-backend
```

### Option 2: Docker Deployment

**Backend Dockerfile** (`websocket-server/Dockerfile`):
```dockerfile
FROM golang:1.24-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -ldflags="-s -w" -o /server cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /server .
EXPOSE 8081
CMD ["./server"]
```

**Frontend Dockerfile** (`chat-app/Dockerfile`):
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install

COPY . .
RUN pnpm build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --prod

EXPOSE 3000
CMD ["pnpm", "start"]
```

**Docker Compose** (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ai_chat
      POSTGRES_USER: chatapp
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./websocket-server/db:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: always

  backend:
    build:
      context: ./websocket-server
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgres://chatapp:${DB_PASSWORD}@postgres:5432/ai_chat?sslmode=disable
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      PORT: 8081
      WORKER_POOL_SIZE: 5
    ports:
      - "8081:8081"
    depends_on:
      - postgres
    restart: always

  frontend:
    build:
      context: ./chat-app
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_BACKEND_URL: http://backend:8081
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: always

volumes:
  postgres_data:
```

**Deploy with Docker Compose**:
```bash
# Create .env file
echo "DB_PASSWORD=your_secure_password" > .env
echo "OPENAI_API_KEY=sk-..." >> .env

# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 3: Cloud Platforms

#### AWS Deployment

**Services**:
- **Frontend**: AWS Amplify or S3 + CloudFront
- **Backend**: ECS (Fargate) or EC2
- **Database**: RDS PostgreSQL
- **Storage**: S3 (for resume files instead of BYTEA)

#### Heroku Deployment

**Backend** (`Procfile`):
```
web: ./bin/server
```

**Commands**:
```bash
heroku create ai-chat-backend
heroku addons:create heroku-postgresql:mini
heroku config:set OPENAI_API_KEY=sk-...
git push heroku main
```

**Frontend** (Vercel):
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd chat-app
vercel --prod
```

---

## Environment-Specific Configuration

### Development

```env
# .env.development
DATABASE_URL=postgres://chatapp:password@localhost:5432/ai_chat?sslmode=disable
ALLOWED_ORIGINS=http://localhost:3000
LOG_LEVEL=debug
WORKER_POOL_SIZE=3
```

### Staging

```env
# .env.staging
DATABASE_URL=postgres://chatapp:password@staging-db.example.com:5432/ai_chat?sslmode=require
ALLOWED_ORIGINS=https://staging.yourdomain.com
LOG_LEVEL=info
WORKER_POOL_SIZE=5
```

### Production

```env
# .env.production
DATABASE_URL=postgres://chatapp:password@prod-db.example.com:5432/ai_chat?sslmode=require
ALLOWED_ORIGINS=https://yourdomain.com
LOG_LEVEL=warn
WORKER_POOL_SIZE=10
```

---

## Health Checks & Monitoring

### Health Check Endpoint (NOT YET IMPLEMENTED)

**Recommended Implementation**:
```go
func HandleHealthCheck(w http.ResponseWriter, r *http.Request) {
    // Check database connection
    err := db.Ping()
    if err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{
            "status": "unhealthy",
            "database": "unreachable",
        })
        return
    }

    // Check OpenAI API (optional)
    // ...

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{
        "status": "healthy",
        "database": "connected",
        "version": "1.9.0",
    })
}
```

**Usage**:
```bash
curl http://localhost:8081/health
```

### Logging

**Current**: Console logs with `log.Printf()`

**Production Recommendations**:
- Structured logging (JSON format) with zap or logrus
- Log aggregation (ELK stack, Datadog, Loggly)
- Log levels: DEBUG, INFO, WARN, ERROR, FATAL
- Request ID tracing

### Metrics

**Recommended Metrics** (Prometheus):
- HTTP request count by endpoint
- HTTP request duration by endpoint
- WebSocket connections (active, total)
- Analysis job duration by stage
- Database query duration
- OpenAI API call duration and errors

---

## Backup & Recovery

### Database Backup

**Automated Daily Backup** (cron):
```bash
# /etc/cron.daily/backup-ai-chat
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U chatapp ai_chat | gzip > /backups/ai_chat_$DATE.sql.gz

# Keep only last 30 days
find /backups -name "ai_chat_*.sql.gz" -mtime +30 -delete
```

**Manual Backup**:
```bash
pg_dump -U chatapp ai_chat > backup_$(date +%Y%m%d).sql
```

**Restore**:
```bash
psql -U chatapp -d ai_chat < backup_20251226.sql
```

### Application State

**Critical State** (in-memory, lost on restart):
- Session tokens (stored in Go map)
- Active WebSocket connections

**Recommendations**:
- Move session tokens to Redis or database
- Implement token expiration and refresh

---

## Security Checklist

### Pre-Production Requirements

- [ ] **Hash Passwords**: Implement bcrypt password hashing
- [ ] **HTTPS/TLS**: Enable SSL certificates (Let's Encrypt)
- [ ] **CORS Whitelist**: Restrict allowed origins
- [ ] **Rate Limiting**: Add rate limits to all endpoints
- [ ] **Input Validation**: Sanitize all user inputs (SQL injection prevention)
- [ ] **Authorization**: Implement user-scoped resource access
- [ ] **Token Expiration**: Add expiration to session tokens
- [ ] **CSRF Protection**: Add CSRF tokens for state-changing requests
- [ ] **Security Headers**: Add helmet.js or equivalent
- [ ] **Database SSL**: Enable sslmode=require for database connections
- [ ] **Environment Variables**: Never commit .env files
- [ ] **API Key Rotation**: Rotate OpenAI API keys regularly
- [ ] **Audit Logging**: Log all security events

---

## Troubleshooting

### Backend Won't Start

**Error**: `cannot connect to database`
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database credentials
psql -U chatapp -d ai_chat

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

**Error**: `OpenAI API key invalid`
```bash
# Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check .env file
cat .env | grep OPENAI_API_KEY
```

### Frontend Can't Connect to Backend

**Error**: `Failed to fetch`
```bash
# Check backend is running
curl http://localhost:8081/health

# Verify NEXT_PUBLIC_BACKEND_URL
cat .env.local

# Check CORS configuration in backend
```

### Database Migrations Failed

```bash
# Check current schema version
psql -U chatapp -d ai_chat -c "\dt"

# Re-run migrations
psql -U chatapp -d ai_chat -f db/schema.sql
```

### WebSocket Connection Fails

**Check**:
- Backend WebSocket handler is registered
- Frontend uses correct WebSocket URL (`ws://` not `http://`)
- CORS allows WebSocket connections
- Nginx/proxy supports WebSocket upgrade

---

## Performance Tuning

### Database

```sql
-- Connection pooling (application-level)
-- db.SetMaxOpenConns(25)
-- db.SetMaxIdleConns(5)
-- db.SetConnMaxLifetime(5 * time.Minute)

-- Analyze tables (periodic)
ANALYZE users;
ANALYZE user_uploads;
ANALYZE analysis_jobs;

-- Vacuum (periodic)
VACUUM ANALYZE;
```

### Backend

**Go Settings**:
```go
// Increase worker pool for production
WORKER_POOL_SIZE=10

// Tune garbage collection
GOGC=200  // Less frequent GC
```

### Frontend

**Next.js Optimizations**:
```javascript
// next.config.js
module.exports = {
  compress: true,
  images: {
    domains: ['yourdomain.com'],
  },
  experimental: {
    optimizeCss: true,
  },
}
```

---

## Scaling Considerations

### Horizontal Scaling

**Challenges**:
- In-memory session tokens (use Redis)
- WebSocket connections (use sticky sessions or Redis pub/sub)
- Worker pool (use distributed queue like RabbitMQ or Redis)

**Solutions**:
1. **Stateless Backend**: Move session tokens to Redis
2. **Load Balancer**: Nginx or HAProxy with sticky sessions
3. **Distributed Queue**: Redis or RabbitMQ for analysis jobs
4. **Database Replication**: PostgreSQL read replicas

### Vertical Scaling

**Increase Resources**:
- CPU: More cores for worker pool
- RAM: Larger worker pool, more connections
- Disk: Faster SSD for database

---

[Next: Recent Changes & Roadmap →](08_recent_changes.md)

[← Back to Architecture Index](README.md)
