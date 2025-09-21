@echo off
echo 🧪 Running Pod Recruitment Test
echo ================================

REM Check if we're in the right directory
if not exist "api\services\runpod_manager.py" (
    echo ❌ Please run this script from the project root directory
    exit /b 1
)

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    exit /b 1
)

echo ✅ Environment check passed
echo.

REM Run the quick test
echo 🚀 Running quick pod test...
python quick_pod_test.py

echo.
echo 🎯 Test completed. Check the output above for results.
pause
