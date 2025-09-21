#!/usr/bin/env python3
"""
Test to verify that a specific pod (42yt2ouvxp4pdl) is properly detected as ready
using the current port availability detection logic
"""

import os
import sys
import asyncio
import time
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.services.runpod_manager import PodManager

async def test_specific_pod_readiness():
    """Test readiness detection for pod 42yt2ouvxp4pdl"""
    print("🧪 ===== SPECIFIC POD READINESS TEST =====")
    print("🎯 Testing pod: 42yt2ouvxp4pdl")
    
    try:
        # Create pod manager (will use real API key from environment or file)
        pod_manager = PodManager()
        print(f"✅ PodManager created")
        
        # Test getting the specific pod
        print(f"🔍 Getting pod 42yt2ouvxp4pdl from RunPod API...")
        pod_status = await pod_manager.get_pod_by_id("42yt2ouvxp4pdl")
        
        if pod_status and pod_status.success and pod_status.data:
            pod = pod_status.data
            print(f"✅ Pod retrieved successfully!")
            print(f"📊 Pod details:")
            print(f"   ID: {pod.id}")
            print(f"   Name: {pod.name}")
            print(f"   Status: {pod.status}")
            print(f"   Desired Status: {pod.desired_status}")
            print(f"   Public IP: {pod.public_ip}")
            print(f"   Port Mappings: {pod.port_mappings}")
            print(f"   Created At: {pod.created_at}")
            print(f"   Uptime: {pod.uptime_seconds} seconds")
            
            # Test the current readiness logic
            print(f"\n🔧 Testing current readiness logic:")
            
            # Apply the same logic as in wait_for_pod_ready
            has_public_ip = bool(pod.public_ip)
            has_comfyui_port = bool(pod.public_ip)  # Current logic: if public IP, port 8188 is accessible via proxy
            
            print(f"   Has public IP: {has_public_ip}")
            print(f"   Has ComfyUI port 8188: {has_comfyui_port}")
            print(f"   Pod status: {pod.desired_status or pod.status}")
            
            # Check if pod would be considered ready
            is_running = (pod.desired_status or pod.status) == "RUNNING"
            is_ready = is_running and has_public_ip and has_comfyui_port
            
            print(f"\n📊 Readiness Assessment:")
            print(f"   Is RUNNING: {is_running}")
            print(f"   Has public IP: {has_public_ip}")
            print(f"   Has ComfyUI port 8188: {has_comfyui_port}")
            print(f"   🎯 POD READY: {is_ready}")
            
            if is_ready:
                print(f"✅ SUCCESS: Pod 42yt2ouvxp4pdl is correctly detected as READY!")
                print(f"   ComfyUI should be accessible at: https://42yt2ouvxp4pdl-8188.proxy.runpod.net")
            else:
                print(f"❌ ISSUE: Pod 42yt2ouvxp4pdl is NOT detected as ready")
                if not is_running:
                    print(f"   Reason: Pod is not RUNNING (status: {pod.desired_status or pod.status})")
                if not has_public_ip:
                    print(f"   Reason: No public IP available")
                if not has_comfyui_port:
                    print(f"   Reason: ComfyUI port 8188 not available")
            
            # Test the actual wait_for_pod_ready method
            print(f"\n🔧 Testing wait_for_pod_ready method:")
            try:
                readiness_result = await pod_manager.wait_for_pod_ready("42yt2ouvxp4pdl", max_attempts=3)
                print(f"📊 wait_for_pod_ready result: {readiness_result}")
                
                if readiness_result.get("success"):
                    print(f"✅ wait_for_pod_ready: Pod is ready!")
                else:
                    print(f"❌ wait_for_pod_ready: Pod not ready - {readiness_result.get('error')}")
            except Exception as e:
                print(f"❌ wait_for_pod_ready failed: {e}")
            
            return is_ready
            
        else:
            print(f"❌ Failed to get pod 42yt2ouvxp4pdl")
            if pod_status:
                print(f"   Error: {pod_status.error}")
            else:
                print(f"   No response received")
            return False
        
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_comfyui_connectivity():
    """Test if ComfyUI is actually accessible on the pod"""
    print(f"\n🌐 ===== COMFYUI CONNECTIVITY TEST =====")
    
    try:
        import httpx
        
        # Test the ComfyUI endpoint
        comfyui_url = "https://42yt2ouvxp4pdl-8188.proxy.runpod.net/system_stats"
        print(f"🔍 Testing ComfyUI at: {comfyui_url}")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(comfyui_url)
                print(f"📊 Response status: {response.status_code}")
                
                if response.status_code == 200:
                    print(f"✅ ComfyUI is accessible!")
                    try:
                        data = response.json()
                        if 'system' in data and 'comfyui_version' in data.get('system', {}):
                            print(f"✅ Valid ComfyUI response detected")
                            print(f"   ComfyUI version: {data['system'].get('comfyui_version')}")
                        else:
                            print(f"⚠️ Response doesn't look like ComfyUI system stats")
                    except Exception as e:
                        print(f"⚠️ Could not parse JSON response: {e}")
                else:
                    print(f"❌ ComfyUI not accessible (status: {response.status_code})")
                    
            except httpx.TimeoutException:
                print(f"⏰ Timeout connecting to ComfyUI")
            except httpx.ConnectError:
                print(f"❌ Connection error - ComfyUI not accessible")
            except Exception as e:
                print(f"❌ Error testing ComfyUI: {e}")
                
    except ImportError:
        print(f"⚠️ httpx not available for connectivity test")
    except Exception as e:
        print(f"❌ Connectivity test failed: {e}")

async def main():
    """Main test function"""
    print("🚀 Starting specific pod readiness test...")
    
    # Test pod readiness detection
    readiness_success = await test_specific_pod_readiness()
    
    # Test ComfyUI connectivity
    await test_comfyui_connectivity()
    
    print(f"\n📊 ===== TEST SUMMARY =====")
    print(f"Pod 42yt2ouvxp4pdl readiness detection: {'✅ SUCCESS' if readiness_success else '❌ FAILED'}")
    
    return readiness_success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
