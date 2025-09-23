#!/usr/bin/env python3
"""
Simple test to verify that pod 42yt2ouvxp4pdl is properly detected as ready
using the updated port availability detection logic
"""

import os
import sys
import asyncio
import time
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Import only what we need
import httpx
from api.schemas.ai.runpod import RunPodPod, RunPodApiResponse

async def test_pod_readiness_logic():
    """Test the updated readiness logic for pod 42yt2ouvxp4pdl"""
    print("🧪 ===== POD READINESS LOGIC TEST =====")
    print("🎯 Testing pod: 42yt2ouvxp4pdl")
    
    # Get API key from environment
    api_key = os.getenv("RUNPOD_API_KEY")
    if not api_key:
        print("❌ RUNPOD_API_KEY not found in environment")
        return False
    
    print(f"✅ Using API key: {api_key[:20]}...")
    
    try:
        # Create HTTP client
        async with httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        ) as client:
            
            # Get pod details
            print(f"🔍 Getting pod 42yt2ouvxp4pdl from RunPod API...")
            response = await client.get("https://rest.runpod.io/v1/pods/42yt2ouvxp4pdl")
            
            if response.status_code != 200:
                print(f"❌ API request failed: {response.status_code}")
                return False
            
            data = response.json()
            print(f"✅ Pod data retrieved successfully")
            
            # Create pod object
            pod = RunPodPod(
                id=data.get("id"),
                name=data.get("name"),
                image_name=data.get("imageName"),
                uptime_seconds=data.get("uptimeSeconds") or 0,
                cost_per_hr=data.get("costPerHr") or 0.0,
                created_at=data.get("createdAt"),
                status=data.get("desiredStatus") or data.get("status"),
                desired_status=data.get("desiredStatus"),
                ip=data.get("ip"),
                public_ip=data.get("publicIp"),
                machine_id=data.get("machineId"),
                gpu_count=data.get("gpuCount"),
                memory_in_gb=data.get("memoryInGb"),
                vcpu_count=data.get("vcpuCount"),
                last_started_at=data.get("lastStartedAt"),
                port_mappings=data.get("portMappings"),
                network_volume_id=data.get("networkVolumeId"),
                volume_in_gb=data.get("volumeInGb"),
                volume_mount_path=data.get("volumeMountPath"),
                ports=data.get("ports", [])
            )
            
            print(f"📊 Pod details:")
            print(f"   ID: {pod.id}")
            print(f"   Name: {pod.name}")
            print(f"   Status: {pod.status}")
            print(f"   Public IP: '{pod.public_ip}'")
            print(f"   Ports: {pod.ports}")
            print(f"   Port Mappings: {pod.port_mappings}")
            
            # Test OLD logic (based on public_ip)
            print(f"\n🔧 Testing OLD logic (public_ip based):")
            old_has_public_ip = bool(pod.public_ip and pod.public_ip.strip())
            old_has_comfyui_port = bool(pod.public_ip and pod.public_ip.strip())
            old_is_ready = pod.status == "RUNNING" and old_has_public_ip and old_has_comfyui_port
            
            print(f"   Has public IP: {old_has_public_ip}")
            print(f"   Has ComfyUI port 8188: {old_has_comfyui_port}")
            print(f"   🎯 OLD LOGIC READY: {old_is_ready}")
            
            # Test NEW logic (based on ports array)
            print(f"\n🔧 Testing NEW logic (ports array based):")
            new_has_comfyui_port = bool(pod.ports and "8188/http" in pod.ports)
            new_has_public_ip = new_has_comfyui_port  # If port is configured, proxy is available
            new_is_ready = pod.status == "RUNNING" and new_has_public_ip and new_has_comfyui_port
            
            print(f"   Has ComfyUI port 8188: {new_has_comfyui_port}")
            print(f"   Has public IP (proxy): {new_has_public_ip}")
            print(f"   🎯 NEW LOGIC READY: {new_is_ready}")
            
            # Test ComfyUI connectivity
            print(f"\n🌐 Testing ComfyUI connectivity:")
            try:
                comfyui_response = await client.get("https://42yt2ouvxp4pdl-8188.proxy.runpod.net/system_stats", timeout=10.0)
                if comfyui_response.status_code == 200:
                    print(f"✅ ComfyUI is accessible!")
                    comfyui_data = comfyui_response.json()
                    if 'system' in comfyui_data and 'comfyui_version' in comfyui_data.get('system', {}):
                        print(f"   ComfyUI version: {comfyui_data['system'].get('comfyui_version')}")
                        print(f"   🎯 ACTUAL READY: True")
                    else:
                        print(f"   ⚠️ Response doesn't look like ComfyUI")
                        print(f"   🎯 ACTUAL READY: False")
                else:
                    print(f"❌ ComfyUI not accessible (status: {comfyui_response.status_code})")
                    print(f"   🎯 ACTUAL READY: False")
            except Exception as e:
                print(f"❌ ComfyUI connectivity test failed: {e}")
                print(f"   🎯 ACTUAL READY: False")
            
            # Summary
            print(f"\n📊 ===== TEST SUMMARY =====")
            print(f"OLD logic (public_ip): {'✅ CORRECT' if old_is_ready == (comfyui_response.status_code == 200) else '❌ INCORRECT'}")
            print(f"NEW logic (ports array): {'✅ CORRECT' if new_is_ready == (comfyui_response.status_code == 200) else '❌ INCORRECT'}")
            
            return new_is_ready == (comfyui_response.status_code == 200)
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    print("🚀 Starting pod readiness logic test...")
    
    success = await test_pod_readiness_logic()
    
    print(f"\n🎯 ===== FINAL RESULT =====")
    print(f"Test {'✅ PASSED' if success else '❌ FAILED'}")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
