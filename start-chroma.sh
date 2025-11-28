#!/bin/bash
# Start ChromaDB server in the background

CHROMA_DIR="/home/coder/projects/ai_chat"
VENV_PATH="$CHROMA_DIR/chromadb-env"

echo "Starting ChromaDB server..."
cd "$CHROMA_DIR"

# Activate virtual environment and start ChromaDB
source "$VENV_PATH/bin/activate"
chroma run --host 0.0.0.0 --port 8000 --path ./chromadb_data
