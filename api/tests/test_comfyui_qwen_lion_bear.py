#!/usr/bin/env python3
"""
Test script for ComfyUI Qwen Image Generation
Tests the Qwen image generation workflow with the prompt "a lion and a bear fighting"
"""

import os
import sys
import asyncio
import time
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.services.ai.comfyui_service import get_comfyui_manager, WorkflowType, WorkflowRequest, QwenImageInput
from api.services.ai.runpod_manager import get_pod_manager

class ComfyUIQwenLionBearTest:
    """Test class for ComfyUI Qwen image generation with lion and bear prompt"""
    
    def __init__(self):
        self.comfyui_manager = get_comfyui_manager()
        self.pod_manager = get_pod_manager()
        self.test_results = {
            "test_timestamp": time.time(),
            "test_name": "ComfyUI Qwen Lion and Bear Image Generation Test",
            "prompt": "a lion and a bear fighting",
            "workflow_type": "comfyui_image_qwen",
            "status": "pending",
            "request_id": None,
            "pod_id": None,
            "pod_ip": None,
            "prompt_id": None,
            "result": None,
            "error": None,
            "execution_time": None
        }
    
    async def run_test(self):
        """Run the ComfyUI Qwen image generation test"""
        print("🦁🐻 ===== COMFYUI QWEN LION AND BEAR IMAGE GENERATION TEST =====")
        print(f"📝 Prompt: {self.test_results['prompt']}")
        print(f"🎯 Workflow: {self.test_results['workflow_type']}")
        print()
        
        start_time = time.time()
        
        try:
            # Create workflow request
            inputs = {
                "prompt": self.test_results['prompt'],
                "width": 1328,
                "height": 1328,
                "seed": str(int(time.time())),
                "negative_prompt": "blurry, low quality, distorted, cartoon, anime, unrealistic, fake"
            }
            
            workflow_request = WorkflowRequest(
                workflow_type=WorkflowType.IMAGE_QWEN,
                inputs=inputs
            )
            
            print("🚀 Executing workflow...")
            print(f"   Inputs: {inputs}")
            
            # Execute the workflow
            result = await self.comfyui_manager.execute_workflow(workflow_request)
            
            # Update test results
            self.test_results.update({
                "request_id": result.id,
                "pod_id": result.pod_id,
                "pod_ip": result.pod_ip,
                "prompt_id": result.prompt_id,
                "status": result.status,
                "error": result.error,
                "execution_time": time.time() - start_time
            })
            
            if result.status == "completed" and result.result:
                self.test_results["result"] = {
                    "success": result.result.success,
                    "files": result.result.files,
                    "images": result.result.images,
                    "pod_id": result.result.pod_id,
                    "pod_ip": result.result.pod_ip,
                    "prompt_id": result.result.prompt_id
                }
                print("✅ Workflow completed successfully!")
                print(f"   Request ID: {result.id}")
                print(f"   Pod ID: {result.pod_id}")
                print(f"   Pod IP: {result.pod_ip}")
                print(f"   Prompt ID: {result.prompt_id}")
                print(f"   Generated files: {len(result.result.files) if result.result.files else 0}")
                if result.result.images:
                    for i, image in enumerate(result.result.images):
                        print(f"   Image {i+1}: {image.get('filename', 'Unknown')}")
                        print(f"     URL: {image.get('url', 'No URL')}")
            elif result.status == "failed":
                print(f"❌ Workflow failed: {result.error}")
            else:
                print(f"⏳ Workflow status: {result.status}")
                if result.error:
                    print(f"   Error: {result.error}")
            
            return result
            
        except Exception as e:
            self.test_results.update({
                "status": "error",
                "error": str(e),
                "execution_time": time.time() - start_time
            })
            print(f"❌ Test failed with exception: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def monitor_completion(self, max_wait_minutes=15):
        """Monitor workflow completion"""
        if not self.test_results.get("request_id"):
            print("❌ No request ID to monitor")
            return False
        
        print(f"⏳ Monitoring workflow completion (max {max_wait_minutes} minutes)...")
        
        start_time = time.time()
        max_wait_seconds = max_wait_minutes * 60
        
        while time.time() - start_time < max_wait_seconds:
            try:
                request = self.comfyui_manager.get_request(self.test_results["request_id"])
                if request:
                    print(f"📊 Status: {request.status}")
                    
                    if request.status == "completed":
                        if request.result:
                            self.test_results["result"] = {
                                "success": request.result.success,
                                "files": request.result.files,
                                "images": request.result.images,
                                "pod_id": request.result.pod_id,
                                "pod_ip": request.result.pod_ip,
                                "prompt_id": request.result.prompt_id
                            }
                            print("✅ Workflow completed successfully!")
                            if request.result.images:
                                for i, image in enumerate(request.result.images):
                                    print(f"   Image {i+1}: {image.get('filename', 'Unknown')}")
                                    print(f"     URL: {image.get('url', 'No URL')}")
                        return True
                    elif request.status == "failed":
                        print(f"❌ Workflow failed: {request.error}")
                        self.test_results["error"] = request.error
                        return False
                
                await asyncio.sleep(10)  # Check every 10 seconds
                
            except Exception as e:
                print(f"⚠️ Error monitoring workflow: {e}")
                await asyncio.sleep(10)
        
        print(f"⏰ Workflow monitoring timed out after {max_wait_minutes} minutes")
        return False
    
    def print_summary(self):
        """Print test summary"""
        print("\n📊 ===== TEST SUMMARY =====")
        print(f"Test: {self.test_results['test_name']}")
        print(f"Prompt: {self.test_results['prompt']}")
        print(f"Status: {self.test_results['status']}")
        print(f"Execution Time: {self.test_results.get('execution_time', 0):.2f} seconds")
        
        if self.test_results.get("request_id"):
            print(f"Request ID: {self.test_results['request_id']}")
        if self.test_results.get("pod_id"):
            print(f"Pod ID: {self.test_results['pod_id']}")
        if self.test_results.get("pod_ip"):
            print(f"Pod IP: {self.test_results['pod_ip']}")
        if self.test_results.get("prompt_id"):
            print(f"Prompt ID: {self.test_results['prompt_id']}")
        
        if self.test_results.get("result"):
            result = self.test_results["result"]
            print(f"Success: {result.get('success', False)}")
            if result.get("files"):
                print(f"Generated Files: {len(result['files'])}")
            if result.get("images"):
                print(f"Generated Images: {len(result['images'])}")
                for i, image in enumerate(result["images"]):
                    print(f"  Image {i+1}: {image.get('filename', 'Unknown')}")
                    print(f"    URL: {image.get('url', 'No URL')}")
        
        if self.test_results.get("error"):
            print(f"Error: {self.test_results['error']}")
        
        print("=" * 50)

    async def test_direct_api_call(self):
        """Test direct API call to the ComfyUI router"""
        print("🌐 Testing direct API call to ComfyUI router...")
        
        try:
            import httpx
            
            # Test the health endpoint first
            health_url = "http://localhost:8000/api/comfyui/health"
            async with httpx.AsyncClient() as client:
                response = await client.get(health_url)
                if response.status_code == 200:
                    print("✅ ComfyUI API is healthy")
                else:
                    print(f"⚠️ ComfyUI API health check failed: {response.status_code}")
                    return False
            
            # Test the Qwen image generation endpoint
            generate_url = "http://localhost:8000/api/comfyui/image/qwen/generate"
            payload = {
                "prompt": "a lion and a bear fighting",
                "width": 1328,
                "height": 1328,
                "seed": str(int(time.time())),
                "negative_prompt": "blurry, low quality, distorted, cartoon, anime"
            }
            
            print(f"📡 Making API call to: {generate_url}")
            print(f"📝 Payload: {payload}")
            
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(generate_url, json=payload)
                
                print(f"📊 Response Status: {response.status_code}")
                print(f"📄 Response Headers: {dict(response.headers)}")
                
                if response.status_code == 200:
                    result = response.json()
                    print("✅ API call successful!")
                    print(f"📋 Response: {result}")
                    return result
                else:
                    print(f"❌ API call failed: {response.status_code}")
                    print(f"📄 Error Response: {response.text}")
                    return None
                    
        except Exception as e:
            print(f"❌ Direct API call failed: {e}")
            import traceback
            traceback.print_exc()
            return None

async def main():
    """Main test function"""
    test = ComfyUIQwenLionBearTest()
    
    try:
        print("🧪 Starting ComfyUI Qwen Lion and Bear Image Generation Test")
        print("=" * 70)
        
        # First try direct API call
        print("\n1️⃣ Testing Direct API Call...")
        api_result = await test.test_direct_api_call()
        
        if api_result:
            print("✅ Direct API call successful!")
            test.print_summary()
            return True
        
        # If direct API fails, try the service method
        print("\n2️⃣ Testing Service Method...")
        result = await test.run_test()
        
        if result and result.status in ["processing", "pending"]:
            # Monitor completion if workflow is still running
            await test.monitor_completion(max_wait_minutes=20)
        
        # Print summary
        test.print_summary()
        
        # Check if test was successful
        if test.test_results.get("status") == "completed" and test.test_results.get("result", {}).get("success"):
            print("🎉 Test completed successfully!")
            return True
        else:
            print("❌ Test failed or did not complete")
            return False
            
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        test.print_summary()
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
