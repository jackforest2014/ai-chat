# Quick Start Guide

Get the WebSocket server running in 60 seconds!

## 🚀 Fastest Way (Docker Compose)

```bash
# 1. Navigate to the project
cd websocket-server

# 2. Start the server
docker-compose up -d

# 3. Test the connection
curl http://localhost:8080/health

# ✅ Server is now running at ws://localhost:8080/ws
```

## 🔧 Alternative Methods

### Using Make (if you have Make installed)

```bash
# Start with Docker Compose
make docker-compose-up

# Or build and run locally
make build
make run
```

### Using Go Directly

```bash
# Download dependencies
go mod download

# Run the server
go run cmd/server/main.go
```

## 🧪 Test the Server

### Option 1: Browser Console

Open your browser console (F12) and paste:

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onopen = () => console.log('✅ Connected!');
ws.onmessage = (e) => console.log('📨 Received:', JSON.parse(e.data));
ws.send(JSON.stringify({ type: 'message', content: 'Hello!' }));
```

### Option 2: curl (HTTP endpoints)

```bash
# Health check
curl http://localhost:8080/health

# Statistics
curl http://localhost:8080/stats
```

### Option 3: wscat

```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c ws://localhost:8080/ws

# Type a message
{"type":"message","content":"Hello!"}
```

## 📱 Connect from Your Chat App

1. Make sure the server is running:
   ```bash
   curl http://localhost:8080/health
   ```

2. In your chat app's `.env.local`:
   ```env
   NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080/ws
   ```

3. Restart your chat app:
   ```bash
   cd ../chat-app
   pnpm dev
   ```

4. Click "Start Chatting" and watch the connection succeed! 🎉

## 🛑 Stop the Server

```bash
# Docker Compose
docker-compose down

# Or if running locally
Ctrl+C
```

## 📊 View Logs

```bash
# Docker Compose
docker-compose logs -f

# Docker
docker logs -f websocket-server
```

## 🔥 Common Issues

### Port 8080 already in use?

```bash
# Option 1: Use a different port
PORT=8081 docker-compose up

# Option 2: Find and kill the process
lsof -i :8080
kill -9 <PID>
```

### Can't connect from chat app?

1. Check server is running: `curl http://localhost:8080/health`
2. Verify WebSocket URL in chat app `.env.local`
3. Make sure you're using `ws://` not `http://`
4. Restart both server and chat app

## 🎯 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize the server behavior in `cmd/server/main.go`
- Modify message handling in `internal/hub/client.go`
- Add authentication in `internal/handler/websocket.go`

## 💡 Pro Tips

- Use `make help` to see all available commands
- Check `/stats` endpoint to see connected clients
- Use Docker Compose for easiest development
- Enable logging with `-v` flag for debugging

---

**That's it! You're now running a production-ready WebSocket server! 🚀**
