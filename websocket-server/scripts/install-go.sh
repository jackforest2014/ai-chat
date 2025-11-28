#!/bin/bash

# Go Installation Script for Linux
# Installs Go 1.23

set -e

GO_VERSION="1.23.0"
GO_ARCH="linux-amd64"
GO_URL="https://go.dev/dl/go${GO_VERSION}.${GO_ARCH}.tar.gz"

echo "🐹 Installing Go ${GO_VERSION}..."
echo ""

# Download Go
echo "📥 Downloading Go ${GO_VERSION}..."
cd /tmp
wget -q --show-progress "$GO_URL"

# Remove old Go installation (if any)
echo "🗑️  Removing old Go installation (if any)..."
sudo rm -rf /usr/local/go

# Extract Go
echo "📦 Extracting Go..."
sudo tar -C /usr/local -xzf "go${GO_VERSION}.${GO_ARCH}.tar.gz"

# Add Go to PATH if not already added
if ! grep -q "/usr/local/go/bin" ~/.bashrc; then
    echo "🔧 Adding Go to PATH..."
    echo '' >> ~/.bashrc
    echo '# Go' >> ~/.bashrc
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    echo 'export GOPATH=$HOME/go' >> ~/.bashrc
    echo 'export PATH=$PATH:$GOPATH/bin' >> ~/.bashrc
fi

# Source bashrc to update current session
export PATH=$PATH:/usr/local/go/bin

# Verify installation
echo ""
echo "✅ Go installation complete!"
echo ""
echo "📋 Installed version:"
/usr/local/go/bin/go version

echo ""
echo "⚠️  IMPORTANT: Run this command to update your current session:"
echo "    source ~/.bashrc"
echo ""
echo "🚀 To run the WebSocket server:"
echo "    cd /home/coder/projects/ai_chat/websocket-server"
echo "    go mod download"
echo "    go run cmd/server/main.go"
