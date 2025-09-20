#!/bin/bash

echo "🧪 Testing ComfyUI API with curl"
echo "================================="

# Test Qwen image generation
echo "📡 Making request to Qwen image generation endpoint..."

curl -X POST "http://localhost:8000/comfyui/image/qwen/generate?prompt=Superman%20on%20the%20moon%2C%20cinematic%20lighting%2C%20detailed%2C%20high%20quality%2C%20photorealistic%2C%20space%20suit%2C%20Earth%20in%20background%2C%20dramatic%20pose%2C%20heroic&width=1024&height=1024&seed=42&negative_prompt=blurry%2C%20low%20quality%2C%20distorted%2C%20cartoon%2C%20anime%2C%20dark%2C%20gloomy%2C%20low%20resolution" \
  -w "\n\n📊 HTTP Status: %{http_code}\n📊 Response Time: %{time_total}s\n"

echo "✅ Test completed!"
