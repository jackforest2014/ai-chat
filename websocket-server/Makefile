.PHONY: help build run docker-build docker-run docker-compose-up docker-compose-down clean test fmt

# Default target
help:
	@echo "Available targets:"
	@echo "  build              - Build the server binary"
	@echo "  run                - Run the server locally"
	@echo "  docker-build       - Build Docker image"
	@echo "  docker-run         - Run Docker container"
	@echo "  docker-compose-up  - Start with Docker Compose"
	@echo "  docker-compose-down- Stop Docker Compose"
	@echo "  clean              - Remove build artifacts"
	@echo "  test               - Run tests"
	@echo "  fmt                - Format code"

# Build the server
build:
	@echo "Building server..."
	go build -o websocket-server cmd/server/main.go
	@echo "Build complete: ./websocket-server"

# Run the server locally
run:
	@echo "Starting server..."
	go run cmd/server/main.go

# Build Docker image
docker-build:
	@echo "Building Docker image..."
	docker build -t websocket-server:latest .
	@echo "Docker image built successfully"

# Run Docker container
docker-run:
	@echo "Running Docker container..."
	docker run -d \
		--name websocket-server \
		-p 8080:8080 \
		websocket-server:latest
	@echo "Container started. Check logs with: docker logs -f websocket-server"

# Start with Docker Compose
docker-compose-up:
	@echo "Starting with Docker Compose..."
	docker-compose up -d
	@echo "Server started. Check logs with: docker-compose logs -f"

# Stop Docker Compose
docker-compose-down:
	@echo "Stopping Docker Compose..."
	docker-compose down

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -f websocket-server
	@echo "Clean complete"

# Run tests
test:
	@echo "Running tests..."
	go test -v ./...

# Format code
fmt:
	@echo "Formatting code..."
	go fmt ./...
	@echo "Format complete"
