@echo off
REM clipizi Development Environment Stop Script for Windows
REM This script stops all running services

echo 🛑 Stopping clipizi Development Environment...
echo ================================================

REM Stop Docker containers
echo 🐳 Stopping Docker containers...

REM Stop MinIO
docker stop clipizi-minio 2>nul
docker rm clipizi-minio 2>nul
if %errorlevel% equ 0 (
    echo ✅ MinIO stopped and removed
) else (
    echo ⚠️  MinIO container not found
)

REM Stop PostgreSQL
docker stop clipizi-postgres 2>nul
docker rm clipizi-postgres 2>nul
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL stopped and removed
) else (
    echo ⚠️  PostgreSQL container not found
)

REM Stop FastAPI (kill processes on port 8000)
echo 🐍 Stopping FastAPI...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo ✅ FastAPI stopped

REM Stop Next.js (kill processes on port 3000)
echo ⚛️  Stopping Next.js...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo ✅ Next.js stopped

echo.
echo 🎉 All services stopped!
echo ================================================
echo 💡 To start services again, run: start.bat
echo.
pause
