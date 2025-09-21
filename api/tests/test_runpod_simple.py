#!/usr/bin/env python3
"""
Simple test for RunPod pod creation and status checking
"""

import os
import sys
import asyncio
import time
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.services.runpod_manager import get_pod_manager

async def test_pod_creation():
    """Test basic pod creation and status checking"""
    print("🧪 ===== SIMPLE RUNPOD TEST =====")
    
    try:
        # Get pod manager
        pod_manager = get_pod_manager()
        print(f"✅ PodManager initialized")
        
        # Test creating a simple pod
        print("🚀 Testing pod creation...")
        
        # Create a simple pod config
        from api.schemas.runpod import RestPodConfig
        
        pod_config = RestPodConfig(
            gpu_type_ids=["NVIDIA A40"],
            image_name="runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
            name=f"test-pod-{int(time.time()*1000)}",
            container_disk_in_gb=20,
            gpu_count=1,
            support_public_ip=True,
            ports=["8188/http"],
            env={
                "JUPYTER_PASSWORD": "test-password",
                "RUNPOD_POD_ID": "will-be-set-by-runpod"
            }
        )
        
        print(f"📝 Pod config: {pod_config.model_dump(by_alias=True)}")
        
        # Create the pod
        result = await pod_manager.create_pod(pod_config)
        print(f"📊 Create pod result: {result}")
        
        if result.success and result.data:
            pod_id = result.data.get("id")
            print(f"✅ Pod created successfully: {pod_id}")
            
            # Test getting pod by ID
            print(f"🔍 Testing get_pod_by_id for pod {pod_id}...")
            pod_status = await pod_manager.get_pod_by_id(pod_id)
            print(f"📊 Pod status result: {pod_status}")
            
            if pod_status and pod_status.success:
                print(f"✅ Pod status retrieved successfully")
                print(f"   Status: {pod_status.data.status if pod_status.data else 'No data'}")
                print(f"   Public IP: {pod_status.data.public_ip if pod_status.data else 'No data'}")
            else:
                print(f"❌ Failed to get pod status: {pod_status.error if pod_status else 'No response'}")
            
            # Clean up - terminate the pod
            print(f"🧹 Cleaning up pod {pod_id}...")
            terminate_result = await pod_manager.terminate_pod(pod_id)
            print(f"📊 Terminate result: {terminate_result}")
            
        else:
            print(f"❌ Pod creation failed: {result.error}")
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()

async def main():
    """Main test function"""
    await test_pod_creation()

if __name__ == "__main__":
    asyncio.run(main())
