@echo off
echo 🚀 Starting clipizy Development Environment (Simplified)...
echo ================================================

echo 📋 Checking prerequisites...

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.10+ first.
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

echo ✅ All prerequisites found

REM Check if virtual environment exists
if not exist ".venv" (
    echo 📦 Creating Python virtual environment...
    python -m venv .venv
)

echo 📦 Activating Python virtual environment...
call .venv\Scripts\activate.bat

echo 📦 Installing Python dependencies...
pip install -r requirements.txt

REM Start FastAPI Backend
echo 🐍 Starting FastAPI Backend...
start "FastAPI Backend" cmd /k "call .venv\Scripts\activate.bat && python scripts\backend\start.py"

REM Wait a moment for FastAPI to start
timeout /t 3 /nobreak >nul

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing Node.js dependencies...
    npm install
)

REM Start Next.js Frontend
echo ⚛️ Starting Next.js Frontend...
start "Next.js Frontend" cmd /k "npm run dev"

echo ""
echo 🎉 clipizy Development Environment Started!
echo ================================================
echo 📱 Frontend: http://localhost:3000
echo 🔧 API Docs: http://localhost:8000/docs
echo ""
echo 📝 Next Steps:
echo    1. Register a user at http://localhost:3000/auth/register
echo    2. To create an admin user, run:
echo       cd api && python create_admin_user.py
echo    3. Access admin panel at http://localhost:3000/admin
echo ""
echo 💡 To stop services, close the command windows that opened
echo ""
echo Happy coding! 🚀
pause
