#!/bin/bash

# Check if Docker is available and working
echo "🔍 Checking Docker availability..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    echo "💡 To install Docker on WSL/Ubuntu:"
    echo "   curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "   sudo sh get-docker.sh"
    echo "   sudo usermod -aG docker \$USER"
    echo "   # Then restart your terminal or run: newgrp docker"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running"
    echo "💡 Try starting Docker:"
    echo "   sudo systemctl start docker"
    echo "   # Or on Windows with Docker Desktop, make sure it's running"
    exit 1
fi

echo "✅ Docker is available and running"
echo "🐳 Docker version: $(docker --version)"
echo "🔧 Docker info:"
docker info | head -10
