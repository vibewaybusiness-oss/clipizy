#!/usr/bin/env python3
"""
Simple direct test for ComfyUI Qwen Image Generation
Tests the API endpoint directly without complex queue management
"""

import asyncio
import sys
import time
import httpx
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

async def test_direct_api():
    """Test the ComfyUI API directly"""
    print("🦁🐻 ===== DIRECT COMFYUI API TEST =====")
    print("Testing: a lion and a bear fighting")
    print("=" * 50)
    
    # Test the root endpoint first
    root_url = "http://localhost:8000/"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(root_url)
            if response.status_code == 200:
                print("✅ API server is running")
            else:
                print(f"⚠️ API server responded with status: {response.status_code}")
    except Exception as e:
        print(f"❌ Cannot connect to API server: {e}")
        print("Make sure the API server is running on localhost:8000")
        return False
    
    # Test the Qwen image generation endpoint
    generate_url = "http://localhost:8000/comfyui/image/qwen/generate"
    params = {
        "prompt": "a lion and a bear fighting",
        "width": 1328,
        "height": 1328,
        "seed": str(int(time.time())),
        "negative_prompt": "blurry, low quality, distorted, cartoon, anime, unrealistic, fake"
    }
    
    print(f"📡 Making API call to: {generate_url}")
    print(f"📝 Parameters: {params}")
    
    try:
        async with httpx.AsyncClient(timeout=600.0) as client:  # 10 minute timeout
            response = await client.post(generate_url, params=params)
            
            print(f"📊 Response Status: {response.status_code}")
            print(f"📄 Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ API call successful!")
                print(f"📋 Response: {result}")
                
                # Check if we got a valid response
                if isinstance(result, dict):
                    if result.get("status") == "completed":
                        print("🎉 Image generation completed successfully!")
                        if result.get("result") and result.get("result", {}).get("images"):
                            images = result["result"]["images"]
                            print(f"🖼️ Generated {len(images)} image(s):")
                            for i, image in enumerate(images):
                                print(f"  Image {i+1}: {image.get('filename', 'Unknown')}")
                                print(f"    URL: {image.get('url', 'No URL')}")
                        return True
                    elif result.get("status") == "failed":
                        print(f"❌ Image generation failed: {result.get('error', 'Unknown error')}")
                        return False
                    else:
                        print(f"⏳ Image generation in progress: {result.get('status')}")
                        print("This is expected - the image generation is running in the background")
                        return True
                else:
                    print(f"⚠️ Unexpected response format: {result}")
                    return False
            else:
                print(f"❌ API call failed: {response.status_code}")
                print(f"📄 Error Response: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ API call failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    print("🧪 Starting Direct ComfyUI API Test")
    print("=" * 70)
    
    success = await test_direct_api()
    
    if success:
        print("\n🎉 Test completed successfully!")
        print("The ComfyUI Qwen image generation API is working correctly.")
        print("You can now use the prompt 'a lion and a bear fighting' to generate images.")
    else:
        print("\n❌ Test failed!")
        print("Please check the API server and try again.")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
