#!/bin/bash
echo "🔍 CHECKING COMFYUI STATUS ON POD"
echo "================================="

# Check if ComfyUI process is running
echo "1️⃣ Checking if ComfyUI process is running..."
if pgrep -f "python3 main.py" > /dev/null; then
    echo "   ✅ ComfyUI process is running"
    echo "   📊 Process ID: $(pgrep -f 'python3 main.py')"
else
    echo "   ❌ ComfyUI process is NOT running"
fi

# Check if port 8188 is listening
echo ""
echo "2️⃣ Checking if port 8188 is listening..."
if netstat -tlnp | grep 8188 > /dev/null; then
    echo "   ✅ Port 8188 is listening"
    netstat -tlnp | grep 8188
else
    echo "   ❌ Port 8188 is not listening"
fi

# Check ComfyUI directory
echo ""
echo "3️⃣ Checking ComfyUI installation..."
if [ -d "/workspace/ComfyUI" ]; then
    echo "   ✅ ComfyUI directory exists"
    echo "   📁 Location: /workspace/ComfyUI"
    
    if [ -f "/workspace/ComfyUI/main.py" ]; then
        echo "   ✅ ComfyUI main.py found"
    else
        echo "   ❌ ComfyUI main.py not found"
    fi
else
    echo "   ❌ ComfyUI directory not found"
fi

# Check ComfyUI log
echo ""
echo "4️⃣ Checking ComfyUI log..."
if [ -f "/workspace/ComfyUI/comfyui.log" ]; then
    echo "   ✅ ComfyUI log exists"
    echo "   📄 Last 10 lines of log:"
    tail -10 /workspace/ComfyUI/comfyui.log
else
    echo "   ❌ ComfyUI log not found"
fi

# Test HTTP access
echo ""
echo "5️⃣ Testing HTTP access..."
if curl -s http://localhost:8188/system_stats > /dev/null; then
    echo "   ✅ ComfyUI HTTP service is responding"
    echo "   🌐 Access URL: http://localhost:8188"
else
    echo "   ❌ ComfyUI HTTP service is not responding"
fi

echo ""
echo "🔧 STARTING COMFYUI (if not running)..."
echo "========================================"

# Start ComfyUI if not running
if ! pgrep -f "python3 main.py" > /dev/null; then
    echo "🚀 Starting ComfyUI..."
    
    cd /workspace/ComfyUI
    
    # Activate virtual environment if it exists
    if [ -f ".comfyui/bin/activate" ]; then
        echo "   📦 Activating virtual environment..."
        source .comfyui/bin/activate
    fi
    
    # Start ComfyUI
    echo "   🎨 Starting ComfyUI on port 8188..."
    nohup python3 main.py --listen 0.0.0.0 --port 8188 > comfyui.log 2>&1 &
    
    # Wait a moment
    sleep 5
    
    # Check if it started
    if pgrep -f "python3 main.py" > /dev/null; then
        echo "   ✅ ComfyUI started successfully!"
        echo "   📊 Process ID: $(pgrep -f 'python3 main.py')"
        echo "   🌐 Access URL: http://localhost:8188"
    else
        echo "   ❌ Failed to start ComfyUI"
        echo "   📄 Check log: tail -f /workspace/ComfyUI/comfyui.log"
    fi
else
    echo "   ✅ ComfyUI is already running"
fi

echo ""
echo "🎯 FINAL STATUS CHECK"
echo "===================="

# Final status check
if pgrep -f "python3 main.py" > /dev/null && netstat -tlnp | grep 8188 > /dev/null; then
    echo "✅ ComfyUI is running and listening on port 8188"
    echo "🌐 Web Access: http://localhost:8188"
    echo "📊 Process: $(pgrep -f 'python3 main.py')"
else
    echo "❌ ComfyUI is not running properly"
    echo "🔍 Check logs: tail -f /workspace/ComfyUI/comfyui.log"
fi
