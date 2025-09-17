#!/bin/bash
set -e

echo "🚀 Starting ComfyUI setup and launch..."

# Check if ComfyUI is already installed
if [ ! -d "/workspace/ComfyUI" ]; then
    echo "📦 Installing ComfyUI..."
    
    # Install ComfyUI
    cd /workspace
    git clone https://github.com/comfyanonymous/ComfyUI.git
    cd ComfyUI
    
    # Create virtual environment
    python3 -m venv .comfyui
    source .comfyui/bin/activate
    
    # Install requirements
    pip install -r requirements.txt
    
    # Install additional packages
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126
    
    echo "✅ ComfyUI installed successfully"
else
    echo "✅ ComfyUI already installed, activating environment..."
    cd /workspace/ComfyUI
    source .comfyui/bin/activate
fi

# Start ComfyUI
echo "🎨 Starting ComfyUI..."
nohup python3 main.py --listen 0.0.0.0 --port 8188 > comfyui.log 2>&1 &

# Wait a moment for ComfyUI to start
sleep 5

# Check if ComfyUI is running
if pgrep -f "python3 main.py" > /dev/null; then
    echo "✅ ComfyUI started successfully on port 8188"
    echo "🌐 Internal access: http://$(hostname -I | awk '{print $1}'):8188"
    
    # Get pod ID from environment variable
    POD_ID=${RUNPOD_POD_ID:-$(hostname)}
    echo "🆔 Pod ID: $POD_ID"
    
    # Expose port 8188 via RunPod API
    echo ""
    echo "🔧 Exposing port 8188 via RunPod API..."
    
    # Check if RUNPOD_API_KEY is available
    if [ -n "$RUNPOD_API_KEY" ]; then
        echo "🔑 Using RunPod API key to expose port 8188..."
        
        # Get current pod configuration
        POD_CONFIG=$(curl -s -H "Authorization: Bearer $RUNPOD_API_KEY" \
            "https://rest.runpod.io/v1/pods/$POD_ID" 2>/dev/null)
        
        if [ $? -eq 0 ] && echo "$POD_CONFIG" | grep -q '"id"'; then
            echo "📋 Retrieved pod configuration"
            
            # Extract current ports and add 8188 if not present
            CURRENT_PORTS=$(echo "$POD_CONFIG" | grep -o '"ports":\[[^]]*\]' | sed 's/"ports":\[\([^]]*\)\]/\1/' | tr -d '"')
            
            # Check if port 8188 is already exposed
            if echo "$CURRENT_PORTS" | grep -q "8188/http"; then
                echo "✅ Port 8188 is already exposed"
            else
                echo "➕ Adding port 8188 to pod configuration..."
                
                # Add port 8188 to the ports array
                NEW_PORTS=$(echo "$CURRENT_PORTS" | sed 's/\]/, "8188\/http"]/')
                
                # Update pod configuration
                UPDATE_RESPONSE=$(curl -s -X PATCH \
                    -H "Authorization: Bearer $RUNPOD_API_KEY" \
                    -H "Content-Type: application/json" \
                    -d "{\"ports\": [$NEW_PORTS]}" \
                    "https://rest.runpod.io/v1/pods/$POD_ID" 2>/dev/null)
                
                if [ $? -eq 0 ] && echo "$UPDATE_RESPONSE" | grep -q '"id"'; then
                    echo "✅ Port 8188 exposed successfully via RunPod API"
                    echo "🌐 ComfyUI will be accessible at: https://$POD_ID-8188.proxy.runpod.net"
                else
                    echo "⚠️ Failed to expose port 8188 via API, manual setup required"
                    echo "📋 API Response: $UPDATE_RESPONSE"
                fi
            fi
        else
            echo "⚠️ Failed to retrieve pod configuration, manual setup required"
            echo "📋 API Response: $POD_CONFIG"
        fi
    else
        echo "⚠️ RUNPOD_API_KEY not found, manual port exposure required"
    fi
    
    echo ""
    echo "🔧 Manual setup instructions (if API failed):"
    echo "1. Go to your RunPod console: https://console.runpod.io"
    echo "2. Find your pod and click 'Edit Pod'"
    echo "3. Add '8188' to 'Expose HTTP Ports' field"
    echo "4. Save and wait for the pod to restart"
    echo "5. Access via: https://$POD_ID-8188.proxy.runpod.net"
    echo ""
    echo "📋 Your pod ID: $POD_ID"
else
    echo "❌ Failed to start ComfyUI"
    echo "📄 Check comfyui.log for details:"
    tail -20 comfyui.log
fi

echo "✅ Services started: ComfyUI (8188)"
