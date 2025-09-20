#!/usr/bin/env python3
"""
Test script to trigger a ComfyUI workflow execution
"""
import asyncio
import httpx
import json

async def test_qwen_image_generation():
    """Test Qwen image generation workflow"""
    print("🧪 Testing Qwen Image Generation Workflow")
    print("=" * 50)
    
    # Test data as query parameters
    params = {
        "prompt": "Superman on the moon, cinematic lighting, detailed, high quality, photorealistic, space suit, Earth in background, dramatic pose, heroic",
        "width": 1024,
        "height": 1024,
        "seed": "42",
        "negative_prompt": "blurry, low quality, distorted, cartoon, anime, dark, gloomy, low resolution"
    }
    
    # Make API request
    url = "http://localhost:8000/comfyui/image/qwen/generate"
    
    try:
        print(f"📡 Making request to: {url}")
        print(f"📋 Request params: {json.dumps(params, indent=2)}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, params=params)
            
            print(f"📊 Response status: {response.status_code}")
            print(f"📄 Response headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Success! Response: {json.dumps(result, indent=2)}")
            else:
                print(f"❌ Error: {response.text}")
                
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_qwen_image_generation())
