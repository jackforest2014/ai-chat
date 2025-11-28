# Project Structure

Complete overview of the WebSocket server project structure and file organization.

## 📁 Directory Layout

```
websocket-server/
│
├── cmd/                          # Main applications
│   └── server/
│       └── main.go              # Entry point - starts the HTTP server and WebSocket hub
│
├── internal/                     # Private application code
│   ├── handler/
│   │   └── websocket.go         # HTTP/WebSocket request handlers
│   │                            # - WebSocket upgrade logic
│   │                            # - Health check endpoint
│   │                            # - Statistics endpoint
│   │
│   └── hub/
│       ├── hub.go               # Connection hub (manages all active clients)
│       │                        # - Client registration/unregistration
│       │                        # - Message broadcasting
│       │                        # - Thread-safe client map
│       │
│       └── client.go            # Individual client connection management
│                                # - Read pump (receive messages)
│                                # - Write pump (send messages)
│                                # - Ping/pong heartbeat
│
├── pkg/                          # Public library code
│   └── models/
│       └── message.go           # Data structures for WebSocket messages
│                                # - Message type definitions
│                                # - JSON serialization structs
│
├── scripts/                      # Helper scripts
│   ├── test-websocket.js        # Node.js WebSocket client test
│   └── test-http.sh             # HTTP endpoints test script
│
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml           # Docker Compose configuration
├── .dockerignore                # Files to exclude from Docker build
├── .gitignore                   # Files to exclude from Git
│
├── go.mod                       # Go module dependencies
├── go.sum                       # Dependency checksums
│
├── Makefile                     # Build automation commands
│
├── README.md                    # Main documentation
├── QUICKSTART.md                # Quick start guide
└── PROJECT_STRUCTURE.md         # This file
```

## 📋 File Descriptions

### Core Application Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `cmd/server/main.go` | Application entry point | - Initialize Hub<br>- Setup HTTP routes<br>- Start server<br>- Graceful shutdown |
| `internal/handler/websocket.go` | HTTP/WebSocket handlers | - `HandleWebSocket()` - Upgrade to WS<br>- `HandleHealth()` - Health check<br>- `HandleStats()` - Server stats |
| `internal/hub/hub.go` | Connection management | - `Run()` - Main event loop<br>- `BroadcastMessage()` - Send to all<br>- Client registration/unregistration |
| `internal/hub/client.go` | Client connection | - `readPump()` - Receive messages<br>- `writePump()` - Send messages<br>- `Run()` - Start goroutines |
| `pkg/models/message.go` | Data structures | - `Message` struct<br>- Message type constants |

### Configuration Files

| File | Purpose |
|------|---------|
| `go.mod` | Go module definition and dependencies |
| `go.sum` | Cryptographic checksums of dependencies |
| `Dockerfile` | Docker image build instructions |
| `docker-compose.yml` | Multi-container Docker applications |
| `.dockerignore` | Files to exclude from Docker context |
| `.gitignore` | Files to exclude from version control |
| `Makefile` | Build automation commands |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Complete project documentation |
| `QUICKSTART.md` | Quick start guide (60-second setup) |
| `PROJECT_STRUCTURE.md` | This file - project structure overview |

### Test Scripts

| File | Purpose |
|------|---------|
| `scripts/test-websocket.js` | Node.js script to test WebSocket connection |
| `scripts/test-http.sh` | Bash script to test HTTP endpoints |

## 🔄 Data Flow

### Client Connection Flow

```
1. HTTP Request
   ↓
2. Handler: HandleWebSocket()
   ↓
3. Upgrade to WebSocket
   ↓
4. Create Client instance
   ↓
5. Register with Hub
   ↓
6. Start readPump() and writePump() goroutines
   ↓
7. Client communicates via WebSocket
   ↓
8. Unregister on disconnect
```

### Message Flow

```
Client → WebSocket → readPump() → Process Message → Create Response → writePump() → WebSocket → Client
```

## 🏗️ Architecture Patterns

### 1. Hub-Spoke Pattern
The Hub acts as a central coordinator for all WebSocket connections (spokes). This simplifies:
- Client lifecycle management
- Message broadcasting
- Resource cleanup

### 2. Goroutine-per-Client
Each client has two dedicated goroutines:
- **Read Pump**: Continuously reads from WebSocket
- **Write Pump**: Continuously writes to WebSocket

This allows concurrent, non-blocking I/O.

### 3. Channel-Based Communication
Clients communicate with the Hub using Go channels:
- `hub.register` - Register new clients
- `hub.unregister` - Remove clients
- `hub.broadcast` - Send to all clients
- `client.send` - Send to specific client

### 4. Graceful Shutdown
The server uses signal handling and context for graceful shutdown:
1. Receive SIGINT/SIGTERM
2. Stop accepting new connections
3. Wait for active connections (10s timeout)
4. Close all connections
5. Exit

## 🔒 Thread Safety

### Mutex Protection
The Hub uses `sync.RWMutex` to protect the clients map:
- **RLock**: Read operations (broadcasting)
- **Lock**: Write operations (register/unregister)

### Channel Safety
Go channels are inherently thread-safe, enabling safe concurrent communication between goroutines.

## 📦 Dependencies

### Production Dependencies
```go
github.com/gorilla/websocket v1.5.1  // WebSocket protocol implementation
github.com/rs/cors v1.10.1           // CORS middleware
```

### Standard Library
- `net/http` - HTTP server
- `encoding/json` - JSON serialization
- `sync` - Synchronization primitives
- `time` - Time operations
- `context` - Cancellation and timeouts

## 🚀 Build Artifacts

### Generated Files
- `websocket-server` - Compiled binary (Linux/macOS)
- `websocket-server.exe` - Compiled binary (Windows)

### Docker Artifacts
- `websocket-server:latest` - Docker image

## 📝 Code Organization Principles

### 1. Standard Go Layout
Follows [golang-standards/project-layout](https://github.com/golang-standards/project-layout):
- `cmd/` - Main applications
- `internal/` - Private code
- `pkg/` - Public libraries

### 2. Package Separation
- **handler**: HTTP request handling
- **hub**: WebSocket connection management
- **models**: Data structures

### 3. Single Responsibility
Each file/package has a clear, single purpose:
- `main.go`: Application startup
- `websocket.go`: HTTP/WS handling
- `hub.go`: Connection coordination
- `client.go`: Individual connection

## 🎯 Extension Points

Want to customize? Here are the key extension points:

### 1. Message Processing
Edit `internal/hub/client.go` → `readPump()` function

### 2. Authentication
Add to `internal/handler/websocket.go` → `HandleWebSocket()` function

### 3. Message Persistence
Add database calls in `internal/hub/client.go`

### 4. Custom Endpoints
Add routes in `cmd/server/main.go` → `main()` function

### 5. CORS Configuration
Modify `cmd/server/main.go` → CORS options

## 📊 Performance Characteristics

### Memory Usage
- **Base**: ~50MB
- **Per Connection**: ~10KB
- **10K Connections**: ~150MB

### Goroutines
- **Base**: ~5
- **Per Connection**: 2
- **10K Connections**: ~20,005

### Channels
- **Hub Channels**: 3 (register, unregister, broadcast)
- **Per Client**: 1 (send buffer: 256 messages)

## 🔍 Monitoring Points

### Logs to Watch
```go
"Hub started"                          // Hub initialization
"Client {id} registered"               // New connection
"Client {id} unregistered"             // Disconnection
"WebSocket error: {error}"             // Connection errors
"Shutting down server..."              // Graceful shutdown
```

### Metrics to Track
- Connected clients (`/stats` endpoint)
- Messages per second
- Connection duration
- Error rate

## 🎓 Learning Resources

To understand this codebase:

1. **Go Basics**: [Tour of Go](https://go.dev/tour/)
2. **Goroutines & Channels**: [Go Concurrency Patterns](https://go.dev/blog/pipelines)
3. **WebSocket Protocol**: [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455)
4. **Gorilla WebSocket**: [Documentation](https://pkg.go.dev/github.com/gorilla/websocket)
5. **Docker**: [Get Started](https://docs.docker.com/get-started/)

---

**This structure supports scalable, maintainable, and production-ready WebSocket applications! 🚀**
