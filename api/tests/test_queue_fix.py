#!/usr/bin/env python3
"""
Test to verify the queue processing fix
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.services.queues_service import get_queue_manager
from api.schemas.comfyui import WorkflowType, WorkflowRequest

async def test_queue_processing():
    """Test the queue processing fix"""
    print("🧪 ===== QUEUE PROCESSING FIX TEST =====")
    
    # Get queue manager
    queue_manager = get_queue_manager()
    
    # Start the queue manager
    await queue_manager.start()
    print("✅ Queue manager started")
    
    # Create a test request
    test_inputs = {
        "prompt": "An image of spiderman in a cave",
        "width": 1328,
        "height": 1328,
        "seed": "12345",
        "negative_prompt": "blurry, low quality"
    }
    
    print("📝 Adding test request to queue...")
    request_id = await queue_manager.add_workflow_request(
        "comfyui_image_qwen",
        test_inputs,
        WorkflowType.IMAGE_QWEN
    )
    print(f"✅ Request added with ID: {request_id}")
    
    # Check queue status
    status = queue_manager.get_queue_status()
    print(f"📊 Queue status:")
    print(f"   Is running: {status.isRunning}")
    print(f"   Pending requests: {status.pendingRequests}")
    print(f"   ComfyUI requests: {status.comfyuiRequests}")
    
    # Wait a bit for processing
    print("⏳ Waiting for queue processing...")
    await asyncio.sleep(5)
    
    # Check status again
    status = queue_manager.get_queue_status()
    print(f"📊 Queue status after processing:")
    print(f"   Pending requests: {status.pendingRequests}")
    print(f"   ComfyUI requests: {status.comfyuiRequests}")
    
    # Get the request
    request = queue_manager.get_comfyui_request(request_id)
    if request:
        print(f"📋 Request status: {request.status}")
        print(f"📋 Request error: {request.error}")
    else:
        print("❌ Request not found")
    
    # Clean up
    await queue_manager.cleanup()
    print("✅ Test completed")

async def main():
    """Main test function"""
    print("🚀 Starting queue processing fix test...")
    
    try:
        await test_queue_processing()
        print("🎉 Test completed successfully!")
        return True
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
