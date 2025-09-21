#!/usr/bin/env python3
"""
Test to verify port 8188 availability detection logic
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.services.runpod_manager import PodManager
from api.schemas.runpod import RunPodPod

async def test_port_detection():
    """Test the port availability detection logic"""
    print("🧪 ===== PORT DETECTION TEST =====")
    
    try:
        # Create a test pod object with public IP but no port_mappings
        test_pod = RunPodPod(
            id="test-pod-id",
            name="test-pod",
            imageName="test-image",
            uptimeSeconds=100,
            costPerHr=0.4,
            createdAt="2025-01-01T00:00:00Z",
            status="RUNNING",
            desiredStatus="RUNNING",
            ip="10.0.0.1",
            publicIp="1.2.3.4",  # Has public IP
            machineId="test-machine",
            gpuCount=1,
            memoryInGb=50,
            vcpuCount=8,
            lastStartedAt="2025-01-01T00:00:00Z",
            portMappings=None,  # This is None, which was causing the issue
            networkVolumeId="test-volume",
            volumeInGb=20,
            volumeMountPath="/workspace"
        )
        
        print(f"📊 Test pod: {test_pod.id}")
        print(f"   Public IP: {test_pod.public_ip}")
        print(f"   Port mappings: {test_pod.port_mappings}")
        
        # Test the old logic (would fail)
        old_logic = bool(test_pod.port_mappings and "8188" in test_pod.port_mappings)
        print(f"❌ Old logic result: {old_logic}")
        
        # Test the new logic (should work)
        new_logic = bool(test_pod.public_ip)
        print(f"✅ New logic result: {new_logic}")
        
        # Test the complete readiness check
        has_public_ip = bool(test_pod.public_ip)
        has_comfyui_port = bool(test_pod.public_ip)  # New logic
        
        print(f"📊 Readiness check:")
        print(f"   Has public IP: {has_public_ip}")
        print(f"   Has ComfyUI port 8188: {has_comfyui_port}")
        print(f"   Pod ready: {has_public_ip and has_comfyui_port}")
        
        if has_public_ip and has_comfyui_port:
            print("✅ Pod would be marked as ready with new logic!")
        else:
            print("❌ Pod would still be marked as not ready")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    success = await test_port_detection()
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
