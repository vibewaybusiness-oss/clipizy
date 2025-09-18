#!/bin/bash

# Vibewave Development Environment Startup Script
# This script starts all required services for local development

echo "🚀 Starting Vibewave Development Environment..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

bash stop.sh

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

docker stop vibewave-minio vibewave-postgres
docker rm vibewave-minio vibewave-postgres

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.10+ first.${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites found${NC}"

# Start MinIO (S3 replacement)
echo -e "${BLUE}🗄️  Starting MinIO (S3 replacement)...${NC}"
if port_in_use 9000; then
    echo -e "${YELLOW}⚠️  Port 9000 is already in use. MinIO might already be running.${NC}"
else
    sudo docker run -d --name vibewave-minio \
        -p 9000:9000 -p 9001:9001 \
        -e "MINIO_ROOT_USER=admin" \
        -e "MINIO_ROOT_PASSWORD=admin123" \
        quay.io/minio/minio server /data --console-address ":9001"
    echo -e "${GREEN}✅ MinIO started at http://localhost:9000 (Console: http://localhost:9001)${NC}"
fi

# Start PostgreSQL
echo -e "${BLUE}🗄️  Starting PostgreSQL...${NC}"
if port_in_use 5432; then
    echo -e "${YELLOW}⚠️  Port 5432 is already in use. PostgreSQL might already be running.${NC}"
else
    sudo docker run -d --name vibewave-postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=vibewave \
        -p 5432:5432 \
        postgres:15
    echo -e "${GREEN}✅ PostgreSQL started at localhost:5432${NC}"
fi

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Start FastAPI Backend
echo -e "${BLUE}🐍 Starting FastAPI Backend...${NC}"
if port_in_use 8000; then
    echo -e "${YELLOW}⚠️  Port 8000 is already in use. FastAPI might already be running.${NC}"
else
    # Check if virtual environment exists in root directory
    if [ ! -d ".venv" ]; then
        echo -e "${YELLOW}📦 Creating Python virtual environment...${NC}"
        python3 -m venv .venv
    fi
    
    echo -e "${YELLOW}📦 Activating Python virtual environment...${NC}"
    source .venv/bin/activate
    
    echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
    
    echo -e "${YELLOW}🚀 Starting FastAPI server...${NC}"
    cd api
    python start.py &
    echo -e "${GREEN}✅ FastAPI started at http://localhost:8000${NC}"
    cd ..
fi

# Start ComfyUI (GPU processing)
echo -e "${BLUE}🎨 Starting ComfyUI (GPU processing)...${NC}"
if port_in_use 8188; then
    echo -e "${YELLOW}⚠️  Port 8188 is already in use. ComfyUI might already be running.${NC}"
else
    # Check if ComfyUI directory exists
    if [ -d "ComfyUI" ]; then
        cd ComfyUI
        echo -e "${YELLOW}🚀 Starting ComfyUI server...${NC}"
        python3 main.py --listen 0.0.0.0 --port 8188 &
        echo -e "${GREEN}✅ ComfyUI started at http://localhost:8188${NC}"
        cd ..
    else
        echo -e "${YELLOW}⚠️  ComfyUI directory not found. Skipping ComfyUI startup.${NC}"
        echo -e "${YELLOW}   To install ComfyUI, run: git clone https://github.com/comfyanonymous/ComfyUI.git${NC}"
    fi
fi

# Start Next.js Frontend
echo -e "${BLUE}⚛️  Starting Next.js Frontend...${NC}"
if port_in_use 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use. Next.js might already be running.${NC}"
else
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
        npm install
    fi
    
    # echo -e "${YELLOW}🚀 Starting Next.js development server...${NC}"
    # npm run dev &
    # echo -e "${GREEN}✅ Next.js started at http://localhost:3000${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Vibewave Development Environment Started!${NC}"
echo "================================================"
echo -e "${BLUE}📱 Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}🔧 API Docs:${NC} http://localhost:8000/docs"
echo -e "${BLUE}🗄️  MinIO Console:${NC} http://localhost:9001 (admin/admin123)"
echo -e "${BLUE}🎨 ComfyUI:${NC} http://localhost:8188"
echo -e "${BLUE}🗄️  PostgreSQL:${NC} localhost:5432 (postgres/postgres)"
echo ""
echo -e "${YELLOW}💡 To stop all services, run: ./stop.sh${NC}"
echo -e "${YELLOW}💡 To view logs, run: docker logs -f vibewave-minio${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"