@echo off
REM Vibewave Development Environment Startup Script for Windows
REM This script starts all required services for local development

echo 🚀 Starting Vibewave Development Environment...
echo ================================================

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Start MinIO (S3 replacement)
echo 🗄️  Starting MinIO (S3 replacement)...
docker run -d --name vibewave-minio -p 9000:9000 -p 9001:9001 -e "MINIO_ROOT_USER=admin" -e "MINIO_ROOT_PASSWORD=admin123" quay.io/minio/minio server /data --console-address ":9001"
echo ✅ MinIO started at http://localhost:9000 (Console: http://localhost:9001)

REM Start PostgreSQL
echo 🗄️  Starting PostgreSQL...
docker run -d --name vibewave-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=vibewave -p 5432:5432 postgres:15
echo ✅ PostgreSQL started at localhost:5432

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 5 /nobreak >nul

REM Start FastAPI Backend
echo 🐍 Starting FastAPI Backend...
cd api
if not exist ".venv" (
    echo 📦 Creating Python virtual environment...
    python -m venv .venv
)

echo 📦 Installing Python dependencies...
call .venv\Scripts\activate.bat
pip install -r requirements.txt

echo 🚀 Starting FastAPI server...
start "FastAPI" cmd /k "call .venv\Scripts\activate.bat && python start.py"
cd ..
echo ✅ FastAPI started at http://localhost:8000

REM Start Next.js Frontend
echo ⚛️  Starting Next.js Frontend...
cd src
if not exist "node_modules" (
    echo 📦 Installing Node.js dependencies...
    npm install
)

echo 🚀 Starting Next.js development server...
start "Next.js" cmd /k "npm run dev"
cd ..
echo ✅ Next.js started at http://localhost:3000

echo.
echo 🎉 Vibewave Development Environment Started!
echo ================================================
echo 📱 Frontend: http://localhost:3000
echo 🔧 API Docs: http://localhost:8000/docs
echo 🗄️  MinIO Console: http://localhost:9001 (admin/admin123)
echo 🗄️  PostgreSQL: localhost:5432 (postgres/postgres)
echo.
echo 💡 To stop all services, run: stop.bat
echo.
echo Happy coding! 🚀
pause
