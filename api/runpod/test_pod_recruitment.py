#!/usr/bin/env python3
"""
Test script to recruit a RunPod and send a ComfyUI workflow to port 8188
"""
import asyncio
import json
import time
import uuid
from pathlib import Path
from typing import Dict, Any

# Add the current directory to Python path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent))

from pod_management import PodManager, PodRecruitmentConfig, get_client
from queue_manager import get_queue_manager
from client import get_runpod_rest_client


class ComfyUIWorkflowTester:
    """Test ComfyUI workflow execution on recruited pods"""
    
    def __init__(self):
        self.pod_manager = PodManager(get_client())
        self.queue_manager = get_queue_manager()
        self.recruited_pod = None
    
    async def recruit_test_pod(self) -> Dict[str, Any]:
        """Recruit a pod for testing"""
        print("🎯 Recruiting test pod...")
        
        config = PodRecruitmentConfig(
            name=f"comfyui-workflow-{int(time.time())}",
            imageName="runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
            cloudType="SECURE",
            gpuCount=1,
            minMemoryInGb=24,
            countryCode="CA",
            supportPublicIp=True,
            containerDiskInGb=20,
            minVcpuCount=4,
            ports="22,8080,8188,8888,11434",
            dockerArgs="",
            maxRetries=2,
            retryDelay=5000,
            workflowName="comfyui",
            templateId="fdcc1twlxx"
        )
        
        result = await self.pod_manager.recruit_pod(config)
        
        if result.success and result.pod:
            self.recruited_pod = result.pod
            print(f"✅ Pod recruited successfully!")
            print(f"   Pod ID: {result.pod['id']}")
            print(f"   GPU Type: {result.gpuType}")
            print(f"   Attempts: {result.attempts}")
            return result.pod
        else:
            print(f"❌ Pod recruitment failed: {result.error}")
            return None
    
    async def wait_for_pod_ready(self, pod_id: str, max_wait_minutes: int = 10) -> bool:
        """Wait for pod to be ready with IP and ports"""
        print(f"⏳ Waiting for pod {pod_id} to be ready...")
        
        # Use the pod manager's improved wait_for_pod_ready method
        result = await self.pod_manager.wait_for_pod_ready(pod_id, max_attempts=6)
        
        if result.get("success"):
            pod_info = result.get("podInfo", {})
            print(f"✅ Pod is ready!")
            print(f"   IP: {pod_info.get('ip')}")
            print(f"   Port: {pod_info.get('port')}")
            print(f"   Status: {pod_info.get('status')}")
            return True
        else:
            print(f"❌ Pod did not become ready: {result.get('error')}")
            return False
    
    async def test_comfyui_connection(self, pod_ip: str, port: int = 8188, pod_id: str = None) -> bool:
        """Test connection to ComfyUI on the pod"""
        import httpx
        
        # Try both direct IP and RunPod proxy URL
        urls_to_test = [f"http://{pod_ip}:{port}"]
        
        if pod_id:
            proxy_url = f"https://{pod_id}-{port}.proxy.runpod.net"
            urls_to_test.append(proxy_url)
            print(f"🔗 Testing ComfyUI connection:")
            print(f"   Direct IP: http://{pod_ip}:{port}")
            print(f"   RunPod Proxy: {proxy_url}")
        else:
            comfyui_url = f"http://{pod_ip}:{port}"
            print(f"🔗 Testing ComfyUI connection to {comfyui_url}")
        
        # Try multiple times with increasing delays for ComfyUI startup
        max_attempts = 12  # 2 minutes total
        for attempt in range(max_attempts):
            print(f"🔄 ComfyUI connection attempt {attempt + 1}/{max_attempts}...")
            
            for comfyui_url in urls_to_test:
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        # Test basic connection
                        response = await client.get(f"{comfyui_url}/")
                        if response.status_code == 200:
                            print(f"✅ ComfyUI is accessible at {comfyui_url}")
                            return True
                        else:
                            print(f"⚠️ ComfyUI at {comfyui_url} returned status {response.status_code}")
                            if response.status_code == 404:
                                print(f"   💡 ComfyUI may still be starting up...")
                            else:
                                print(f"   Response content: {response.text[:200]}...")
                            
                except httpx.ConnectError as e:
                    print(f"❌ Cannot connect to {comfyui_url} - service may not be running")
                    if attempt < max_attempts - 1:
                        print(f"   ⏳ Will retry in 10 seconds...")
                except httpx.TimeoutException:
                    print(f"❌ Connection timeout for {comfyui_url} - ComfyUI may be starting up")
                    if attempt < max_attempts - 1:
                        print(f"   ⏳ Will retry in 10 seconds...")
                except Exception as e:
                    print(f"❌ Error testing {comfyui_url}: {e}")
                    if attempt < max_attempts - 1:
                        print(f"   ⏳ Will retry in 10 seconds...")
            
            # Wait before next attempt (except on last attempt)
            if attempt < max_attempts - 1:
                print(f"⏳ Waiting 10 seconds before next attempt...")
                await asyncio.sleep(10)
        
        print("❌ ComfyUI connection test failed after all attempts")
        print("💡 ComfyUI may need more time to install and start")
        print("💡 You can manually check the pod or wait longer")
        return False
    
    async def test_available_services(self, pod_ip: str) -> None:
        """Test what services are available on the pod"""
        import httpx
        
        # Common ports to test
        ports_to_test = [22, 8080, 8188, 8888, 11434, 7860, 5000, 3000]
        
        print("🔍 Scanning available services...")
        for port in ports_to_test:
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    response = await client.get(f"http://{pod_ip}:{port}/", follow_redirects=True)
                    if response.status_code in [200, 404, 403]:  # Any response means something is running
                        print(f"   ✅ Port {port}: Service running (status {response.status_code})")
                    else:
                        print(f"   ⚠️ Port {port}: Responded with status {response.status_code}")
            except httpx.ConnectError:
                print(f"   ❌ Port {port}: No service")
            except httpx.TimeoutException:
                print(f"   ⏳ Port {port}: Timeout (may be starting)")
            except Exception as e:
                print(f"   ❓ Port {port}: Error - {e}")
    
    async def send_test_workflow(self, pod_ip: str, port: int = 8188, pod_id: str = None) -> Dict[str, Any]:
        """Send a test workflow to ComfyUI"""
        import httpx
        
        # Use proxy URL if available, otherwise direct IP
        if pod_id:
            comfyui_url = f"https://{pod_id}-{port}.proxy.runpod.net"
            print(f"📤 Sending test workflow to {comfyui_url} (RunPod proxy)")
        else:
            comfyui_url = f"http://{pod_ip}:{port}"
            print(f"📤 Sending test workflow to {comfyui_url}")
        
        # First, test if ComfyUI API is ready
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Test API readiness
                print("🔍 Testing ComfyUI API readiness...")
                try:
                    health_response = await client.get(f"{comfyui_url}/system_stats")
                    if health_response.status_code == 200:
                        print("✅ ComfyUI API is ready")
                    else:
                        print(f"⚠️ ComfyUI API returned status {health_response.status_code}")
                except Exception as e:
                    print(f"⚠️ ComfyUI API health check failed: {e}")
                
                # Test object info endpoint
                try:
                    object_info_response = await client.get(f"{comfyui_url}/object_info")
                    if object_info_response.status_code == 200:
                        print("✅ ComfyUI object info is available")
                    else:
                        print(f"⚠️ ComfyUI object info returned status {object_info_response.status_code}")
                except Exception as e:
                    print(f"⚠️ ComfyUI object info check failed: {e}")
        except Exception as e:
            print(f"⚠️ ComfyUI API readiness check failed: {e}")
        
        # Create a simple test workflow
        test_workflow = self.create_test_workflow()
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Queue the workflow
                queue_payload = {
                    "prompt": test_workflow,
                    "client_id": f"test-{uuid.uuid4().hex[:8]}"
                }
                
                print("📋 Queuing workflow...")
                queue_response = await client.post(f"{comfyui_url}/prompt", json=queue_payload)
                
                # Get detailed error information
                if queue_response.status_code != 200:
                    print(f"❌ Workflow queue failed with status {queue_response.status_code}")
                    print(f"   Response: {queue_response.text}")
                    return {"success": False, "error": f"HTTP {queue_response.status_code}: {queue_response.text}"}
                
                queue_response.raise_for_status()
                
                queue_result = queue_response.json()
                prompt_id = queue_result.get("prompt_id")
                
                if not prompt_id:
                    return {"success": False, "error": "Failed to get prompt ID"}
                
                print(f"✅ Workflow queued with ID: {prompt_id}")
                
                # Wait for completion
                print("⏳ Waiting for workflow completion...")
                max_attempts = 60  # 5 minutes max
                
                for attempt in range(max_attempts):
                    await asyncio.sleep(5)
                    
                    try:
                        # Check status
                        status_response = await client.get(f"{comfyui_url}/history/{prompt_id}")
                        if status_response.status_code == 404:
                            continue  # Not ready yet
                        
                        status_response.raise_for_status()
                        history = status_response.json()
                        
                        if prompt_id in history:
                            prompt_history = history[prompt_id]
                            if prompt_history.get("status"):
                                status = prompt_history["status"]
                                
                                if status.get("status") == "success":
                                    print("✅ Workflow completed successfully!")
                                    
                                    # Get output files
                                    outputs = status.get("outputs", {})
                                    files = []
                                    
                                    for node_id, node_output in outputs.items():
                                        if "images" in node_output:
                                            for image in node_output["images"]:
                                                if "filename" in image:
                                                    files.append(image["filename"])
                                    
                                    return {
                                        "success": True,
                                        "prompt_id": prompt_id,
                                        "files": files,
                                        "outputs": outputs
                                    }
                                
                                elif status.get("status") == "error":
                                    error_msg = status.get("error", "Unknown error")
                                    print(f"❌ Workflow failed: {error_msg}")
                                    return {
                                        "success": False,
                                        "error": error_msg,
                                        "prompt_id": prompt_id
                                    }
                    
                    except Exception as e:
                        print(f"⚠️ Error checking status (attempt {attempt + 1}): {e}")
                        continue
                
                return {
                    "success": False,
                    "error": "Workflow execution timeout",
                    "prompt_id": prompt_id
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to send workflow: {str(e)}"
            }
    
    def create_test_workflow(self) -> Dict[str, Any]:
        """Create a simple test workflow for ComfyUI"""
        return {
            "3": {
                "inputs": {
                    "seed": 12345,
                    "steps": 4,
                    "cfg": 1,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1,
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0]
                },
                "class_type": "KSampler"
            },
            "4": {
                "inputs": {
                    "ckpt_name": "v1-5-pruned-emaonly.ckpt"
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "5": {
                "inputs": {
                    "width": 512,
                    "height": 512,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "6": {
                "inputs": {
                    "text": "a beautiful landscape, mountains, sunset, high quality",
                    "clip": ["4", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "7": {
                "inputs": {
                    "text": "blurry, low quality, distorted",
                    "clip": ["4", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "8": {
                "inputs": {
                    "samples": ["3", 0],
                    "vae": ["4", 2]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "test_image",
                    "images": ["8", 0]
                },
                "class_type": "SaveImage"
            }
        }
    
    async def cleanup_pod(self, pod_id: str):
        """Clean up the test pod"""
        if not pod_id:
            return
        
        print(f"🧹 Cleaning up pod {pod_id}...")
        try:
            result = await self.pod_manager.release_pod(pod_id)
            if result.success:
                print("✅ Pod terminated successfully")
            else:
                print(f"⚠️ Failed to terminate pod: {result.error}")
        except Exception as e:
            print(f"⚠️ Error cleaning up pod: {e}")


async def main():
    """Main test function"""
    print("🚀 RunPod ComfyUI Workflow Test")
    print("=" * 50)
    
    tester = ComfyUIWorkflowTester()
    pod_id = None
    
    try:
        # Step 1: Recruit a pod
        pod = await tester.recruit_test_pod()
        if not pod:
            print("❌ Cannot proceed without a pod")
            return
        
        pod_id = pod['id']
        
        # Step 2: Wait for pod to be ready
        if not await tester.wait_for_pod_ready(pod_id, max_wait_minutes=2):
            print("❌ Pod did not become ready")
            return
        
        # Get pod IP
        pod_info = await tester.pod_manager.get_pod_connection_info(pod_id)
        if not pod_info.get("success"):
            print(f"❌ Cannot get pod connection info: {pod_info.get('error')}")
            return
        
        pod_ip = pod_info["podInfo"]["ip"]
        print(f"🌐 Pod IP: {pod_ip}")
        
        # Step 3: Test what services are running
        print(f"🔍 Testing what services are available on {pod_ip}...")
        await tester.test_available_services(pod_ip)
        
        # Step 4: Test ComfyUI connection
        if not await tester.test_comfyui_connection(pod_ip, 8188, pod_id):
            print("❌ ComfyUI connection test failed")
            print("💡 This is expected if ComfyUI is not pre-installed in the template")
            print("💡 You may need to install ComfyUI manually or use a different template")
            return
        
        # Step 4: Send test workflow
        workflow_result = await tester.send_test_workflow(pod_ip, 8188, pod_id)
        
        if workflow_result["success"]:
            print("🎉 Workflow test completed successfully!")
            print(f"   Prompt ID: {workflow_result.get('prompt_id')}")
            print(f"   Generated files: {workflow_result.get('files', [])}")
        else:
            print(f"❌ Workflow test failed: {workflow_result.get('error')}")
        
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup - DISABLED for debugging
        if pod_id:
            print(f"🔍 Keeping pod {pod_id} alive for debugging")
            # await tester.cleanup_pod(pod_id)
    
    print("\n🏁 Test completed")


if __name__ == "__main__":
    asyncio.run(main())
