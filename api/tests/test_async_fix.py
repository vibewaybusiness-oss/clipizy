#!/usr/bin/env python3
"""
Test to isolate and fix the async issue with get_pod_by_id
"""

import os
import sys
import asyncio
import time
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

async def test_async_client():
    """Test the async client directly"""
    print("🧪 ===== ASYNC CLIENT TEST =====")
    
    try:
        import httpx
        
        # Test basic httpx client
        print("🔧 Testing basic httpx client...")
        async with httpx.AsyncClient() as client:
            response = await client.get("https://httpbin.org/get")
            print(f"✅ Basic httpx test successful: {response.status_code}")
        
        # Test RunPod API client
        print("🔧 Testing RunPod API client...")
        from api.services.runpod_manager import PodManager
        
        # Use test API key
        pod_manager = PodManager(api_key="rpa_TEST_API_KEY_FOR_TESTING_PURPOSES_ONLY")
        print(f"✅ PodManager created: {pod_manager}")
        print(f"✅ Client type: {type(pod_manager.client)}")
        
        # Test make_request method directly
        print("🔧 Testing make_request method...")
        try:
            result = await pod_manager.make_request("/pods")
            print(f"✅ make_request successful: {result}")
        except Exception as e:
            print(f"❌ make_request failed: {e}")
            import traceback
            traceback.print_exc()
        
        # Test get_pod_by_id with a fake ID
        print("🔧 Testing get_pod_by_id with fake ID...")
        try:
            result = await pod_manager.get_pod_by_id("fake-pod-id")
            print(f"✅ get_pod_by_id successful: {result}")
        except Exception as e:
            print(f"❌ get_pod_by_id failed: {e}")
            import traceback
            traceback.print_exc()
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    success = await test_async_client()
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
