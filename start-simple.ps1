# clipizy Development Environment Startup Script (Simplified)
# This script starts the essential services without Docker

Write-Host "🚀 Starting clipizy Development Environment (Simplified)..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

Write-Host "📋 Checking prerequisites..." -ForegroundColor Blue

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Python not found"
    }
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python is not installed. Please install Python 3.10+ first." -ForegroundColor Red
    exit 1
}

# Check if Node.js is available
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found"
    }
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ All prerequisites found" -ForegroundColor Green

# Check if virtual environment exists
if (-not (Test-Path ".venv")) {
    Write-Host "📦 Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
}

Write-Host "📦 Activating Python virtual environment..." -ForegroundColor Yellow
& .\.venv\Scripts\Activate.ps1

Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Start FastAPI Backend
Write-Host "🐍 Starting FastAPI Backend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\.venv\Scripts\Activate.ps1; python scripts\backend\start.py" -WindowStyle Normal

# Wait a moment for FastAPI to start
Start-Sleep -Seconds 3

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
}

# Start Next.js Frontend
Write-Host "⚛️ Starting Next.js Frontend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "🎉 clipizy Development Environment Started!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Blue
Write-Host "🔧 API Docs: http://localhost:8000/docs" -ForegroundColor Blue
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Register a user at http://localhost:3000/auth/register" -ForegroundColor Yellow
Write-Host "   2. To create an admin user, run:" -ForegroundColor Yellow
Write-Host "      cd api && python create_admin_user.py" -ForegroundColor Yellow
Write-Host "   3. Access admin panel at http://localhost:3000/admin" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 To stop services, close the command windows that opened" -ForegroundColor Yellow
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Green
