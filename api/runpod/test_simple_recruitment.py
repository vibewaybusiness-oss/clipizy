#!/usr/bin/env python3
"""
Simple test script to recruit a RunPod and test basic connectivity
"""
import asyncio
import time
from pathlib import Path

# Add the current directory to Python path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent))

from pod_management import PodManager, PodRecruitmentConfig, get_client


async def test_simple_recruitment():
    """Simple test to recruit a pod and check its status"""
    print("🎯 Simple RunPod Recruitment Test")
    print("=" * 40)
    
    # Initialize pod manager
    pod_manager = PodManager(get_client())
    
    try:
        # Create recruitment config
        config = PodRecruitmentConfig(
            name=f"comfyui-test-{int(time.time())}",
            imageName="runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
            cloudType="SECURE",
            gpuCount=1,
            minMemoryInGb=24,
            countryCode="CA",
            supportPublicIp=True,
            containerDiskInGb=20,
            minVcpuCount=4,
            ports="22,8080,8188,8888,11434",
            maxRetries=1,
            retryDelay=3000,
            workflowName="comfyui",
            templateId="fdcc1twlxx"
        )
        
        print("📋 Pod Configuration:")
        print(f"   Name: {config.name}")
        print(f"   Image: {config.imageName}")
        print(f"   GPU Count: {config.gpuCount}")
        print(f"   Memory: {config.minMemoryInGb}GB")
        print(f"   Ports: {config.ports}")
        print(f"   Template: {config.templateId}")
        print(f"   Workflow: {config.workflowName}")
        print()
        
        # Recruit pod
        print("🚀 Starting pod recruitment...")
        result = await pod_manager.recruit_pod(config)
        
        if result.success and result.pod:
            pod_id = result.pod['id']
            print(f"✅ Pod recruited successfully!")
            print(f"   Pod ID: {pod_id}")
            print(f"   GPU Type: {result.gpuType}")
            print(f"   Attempts: {result.attempts}")
            print()
            
            # Wait for pod to be ready
            print("⏳ Waiting for pod to be ready...")
            ready_result = await pod_manager.wait_for_pod_ready(pod_id, max_attempts=3)
            
            if ready_result.get("success"):
                pod_info = ready_result.get("podInfo", {})
                print(f"✅ Pod is ready!")
                print(f"   IP: {pod_info.get('ip')}")
                print(f"   Port: {pod_info.get('port')}")
                print(f"   Status: {pod_info.get('status')}")
                print()
                
                # Test basic connectivity
                pod_ip = pod_info.get('ip')
                if pod_ip:
                    print(f"🔗 Testing connectivity to {pod_ip}:8188...")
                    
                    import httpx
                    try:
                        async with httpx.AsyncClient(timeout=10.0) as client:
                            response = await client.get(f"http://{pod_ip}:8188/", timeout=5.0)
                            if response.status_code == 200:
                                print("✅ Port 8188 is accessible!")
                            else:
                                print(f"⚠️ Port 8188 returned status {response.status_code}")
                    except httpx.ConnectError:
                        print("❌ Cannot connect to port 8188 - service may not be running yet")
                    except Exception as e:
                        print(f"⚠️ Connection test error: {e}")
                
                print()
                print("🎉 Basic recruitment test completed successfully!")
                print("💡 You can now use this pod for ComfyUI workflows")
                
            else:
                print(f"❌ Pod did not become ready: {ready_result.get('error')}")
            
            # Cleanup
            print()
            print("🧹 Cleaning up pod...")
            cleanup_result = await pod_manager.release_pod(pod_id)
            if cleanup_result.success:
                print("✅ Pod terminated successfully")
            else:
                print(f"⚠️ Failed to terminate pod: {cleanup_result.error}")
                
        else:
            print(f"❌ Pod recruitment failed: {result.error}")
            if result.attempts:
                print(f"   Attempts made: {result.attempts}")
    
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_simple_recruitment())
