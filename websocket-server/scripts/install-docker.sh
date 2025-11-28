#!/bin/bash

# Docker Installation Script for Debian 12
# This script installs Docker Engine and Docker Compose plugin

set -e

echo "🐳 Installing Docker and Docker Compose on Debian 12..."
echo ""

# Update package index
echo "📦 Updating package index..."
sudo apt-get update

# Install prerequisites
echo "📦 Installing prerequisites..."
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
echo "🔑 Adding Docker's GPG key..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo "📚 Setting up Docker repository..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index again
echo "📦 Updating package index with Docker repository..."
sudo apt-get update

# Install Docker Engine
echo "🐳 Installing Docker Engine, containerd, and Docker Compose..."
sudo apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

# Add current user to docker group
echo "👤 Adding user to docker group..."
sudo usermod -aG docker $USER

# Start and enable Docker
echo "🚀 Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

echo ""
echo "✅ Docker installation complete!"
echo ""
echo "📋 Installed versions:"
sudo docker --version
sudo docker compose version

echo ""
echo "⚠️  IMPORTANT: You need to log out and log back in for group changes to take effect!"
echo "    Or run: newgrp docker"
echo ""
echo "🧪 To test Docker:"
echo "    docker run hello-world"
echo ""
echo "🚀 To start the WebSocket server:"
echo "    cd /home/coder/projects/ai_chat/websocket-server"
echo "    docker compose up -d"
