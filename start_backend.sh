#!/bin/bash
# Start the backend server from WSL

echo "🚀 Starting clipizi backend server..."

# Activate virtual environment
source .venv/bin/activate

# Initialize database and storage
echo "📊 Initializing database and storage..."
python init_db.py

# Start the FastAPI server
echo "🐍 Starting FastAPI server..."
python api/main.py
