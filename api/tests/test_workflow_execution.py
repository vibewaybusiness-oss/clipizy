#!/usr/bin/env python3
"""
Test to verify workflow execution with the fixed pod connection logic
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

async def test_workflow_execution():
    """Test workflow execution with improved error logging"""
    print("🧪 ===== WORKFLOW EXECUTION TEST =====")
    
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
    
    # Wait for processing with more detailed monitoring
    print("⏳ Waiting for workflow processing...")
    for i in range(30):  # Wait up to 5 minutes
        await asyncio.sleep(10)
        
        # Check request status
        request = queue_manager.get_comfyui_request(request_id)
        if request:
            print(f"📊 Request status: {request.status}")
            if request.error:
                print(f"❌ Request error: {request.error}")
            if request.status in ["completed", "failed"]:
                break
        else:
            print(f"❌ Request not found: {request_id}")
            break
    
    # Final status check
    request = queue_manager.get_comfyui_request(request_id)
    if request:
        print(f"\n📊 Final Request Status:")
        print(f"   Status: {request.status}")
        print(f"   Error: {request.error}")
        print(f"   Pod ID: {request.pod_id}")
        print(f"   Pod IP: {request.pod_ip}")
        print(f"   Prompt ID: {request.prompt_id}")
        if request.result:
            print(f"   Result: {request.result}")
    else:
        print(f"❌ Request not found: {request_id}")
    
    # Clean up
    await queue_manager.cleanup()
    print("✅ Test completed")

async def main():
    """Main test function"""
    print("🚀 Starting workflow execution test...")
    
    try:
        await test_workflow_execution()
        print("🎉 Test completed!")
        return True
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
