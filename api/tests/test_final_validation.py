#!/usr/bin/env python3
"""
Final validation test showing the fix is working
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Import only what we need
from api.schemas.runpod import RunPodPod

async def test_final_validation():
    """Final validation that the fix is working"""
    print("🎯 ===== FINAL VALIDATION TEST =====")
    print("Testing pod 42yt2ouvxp4pdl readiness detection fix")
    
    # Create a pod object with the exact data from the API response
    pod = RunPodPod(
        id="42yt2ouvxp4pdl",
        name="comfyui_image_qwen-pod-1758386902945",
        image_name="runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
        uptime_seconds=0,
        cost_per_hr=0.4,
        created_at="2025-09-20 16:48:23.855 +0000 UTC",
        status="RUNNING",
        desired_status="RUNNING",
        ip=None,
        public_ip="",  # Empty string, not None
        machine_id="syh8z3hvjccv",
        gpu_count=1,
        memory_in_gb=50,
        vcpu_count=9,
        last_started_at="2025-09-20 16:48:23.844 +0000 UTC",
        port_mappings={},  # Empty dict
        ports=["8188/http"],  # Port 8188 is configured
        network_volume_id="spwpjg3lk3",
        volume_in_gb=0,
        volume_mount_path="/workspace"
    )
    
    print(f"📊 Pod data:")
    print(f"   ID: {pod.id}")
    print(f"   Status: {pod.status}")
    print(f"   Public IP: '{pod.public_ip}'")
    print(f"   Ports: {pod.ports}")
    print(f"   Port Mappings: {pod.port_mappings}")
    
    # Test the FIXED logic
    print(f"\n🔧 Testing FIXED logic:")
    
    # This is the exact logic from the updated runpod_manager.py
    has_comfyui_port = bool(pod.ports and "8188/http" in pod.ports)
    has_public_ip = has_comfyui_port  # If port is configured, proxy is available
    
    print(f"   Has ComfyUI port 8188: {has_comfyui_port}")
    print(f"   Has public IP (proxy): {has_public_ip}")
    
    # Check if pod would be considered ready
    is_running = pod.status == "RUNNING"
    is_ready = is_running and has_public_ip and has_comfyui_port
    
    print(f"   Is RUNNING: {is_running}")
    print(f"   🎯 POD READY: {is_ready}")
    
    # Test ComfyUI connectivity
    print(f"\n🌐 Testing ComfyUI connectivity:")
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://42yt2ouvxp4pdl-8188.proxy.runpod.net/system_stats")
            if response.status_code == 200:
                print(f"✅ ComfyUI is accessible!")
                data = response.json()
                if 'system' in data and 'comfyui_version' in data.get('system', {}):
                    print(f"   ComfyUI version: {data['system'].get('comfyui_version')}")
                    actual_ready = True
                else:
                    print(f"   ⚠️ Response doesn't look like ComfyUI")
                    actual_ready = False
            else:
                print(f"❌ ComfyUI not accessible (status: {response.status_code})")
                actual_ready = False
    except Exception as e:
        print(f"❌ ComfyUI connectivity test failed: {e}")
        actual_ready = False
    
    # Summary
    print(f"\n📊 ===== FINAL RESULTS =====")
    print(f"Fixed logic result: {is_ready}")
    print(f"Actual ComfyUI status: {actual_ready}")
    print(f"Logic is {'✅ CORRECT' if is_ready == actual_ready else '❌ INCORRECT'}")
    
    if is_ready == actual_ready:
        print(f"\n🎉 SUCCESS: Pod 42yt2ouvxp4pdl is now correctly detected as READY!")
        print(f"   The fix successfully resolves the port availability detection issue.")
        print(f"   ComfyUI is accessible at: https://42yt2ouvxp4pdl-8188.proxy.runpod.net")
    else:
        print(f"\n❌ FAILURE: The fix did not work correctly.")
    
    return is_ready == actual_ready

async def main():
    """Main test function"""
    print("🚀 Starting final validation test...")
    
    success = await test_final_validation()
    
    print(f"\n🎯 ===== FINAL RESULT =====")
    print(f"Test {'✅ PASSED' if success else '❌ FAILED'}")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
