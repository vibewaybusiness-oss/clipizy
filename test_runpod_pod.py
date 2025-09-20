#!/usr/bin/env python3
"""
Independent test function to start a RunPod pod with specific volume and template.
This script is standalone and doesn't depend on the workspace structure.
"""

import asyncio
import os
import json
import time
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

class RunPodApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None

class RestPodConfig(BaseModel):
    gpuTypeIds: List[str]
    imageName: str
    name: str
    env: Optional[Dict[str, str]] = None
    containerDiskInGb: int
    volumeInGb: Optional[int] = None
    volumeMountPath: Optional[str] = None
    networkVolumeId: Optional[str] = None
    ports: List[str]
    templateId: Optional[str] = None

class RunPodRestClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://rest.runpod.io/v1"

    async def _request(
        self,
        endpoint: str,
        method: str = "GET",
        data: Optional[Dict[str, Any]] = None,
    ) -> RunPodApiResponse:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.request(
                    method,
                    f"{self.base_url}{endpoint}",
                    headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"},
                    json=data,
                )
            if resp.status_code >= 400:
                return RunPodApiResponse(
                    success=False, error=f"HTTP error! status: {resp.status_code} - {resp.text}"
                )

            text = resp.text or ""
            if not text:
                return RunPodApiResponse(success=True, data={})
            try:
                return RunPodApiResponse(success=True, data=resp.json())
            except json.JSONDecodeError as e:
                return RunPodApiResponse(success=False, error=f"Failed to parse JSON response: {e}")
        except Exception as e:
            return RunPodApiResponse(success=False, error=str(e))

    async def createPod(self, pod_config: RestPodConfig) -> RunPodApiResponse:
        return await self._request("/pods", method="POST", data=pod_config.model_dump(exclude_none=True))

    async def getPodById(self, pod_id: str) -> RunPodApiResponse:
        return await self._request(f"/pods/{pod_id}")

    async def getNetworkVolumes(self) -> RunPodApiResponse:
        return await self._request("/networkvolumes")

    async def getNetworkVolumeById(self, volume_id: str) -> RunPodApiResponse:
        return await self._request(f"/networkvolumes/{volume_id}")

    async def getGpuTypes(self) -> RunPodApiResponse:
        return await self._request("/gpu-types")

def load_api_key() -> str:
    """Load RunPod API key from RUNPOD_API_KEY environment variable"""
    env_key = os.getenv("RUNPOD_API_KEY")
    if not env_key:
        raise RuntimeError(
            "RUNPOD_API_KEY environment variable not set. Please set it with: export RUNPOD_API_KEY=your_api_key_here"
        )
    
    logger.info("✅ Using RUNPOD_API_KEY from environment variable")
    return env_key

async def test_start_pod_with_volume_and_template():
    """
    Test function to start a RunPod pod with specific volume and template.
    Volume: spwpjg3lk3
    Template: fdcc1twlxx
    """
    try:
        # Load API key
        api_key = load_api_key()
        client = RunPodRestClient(api_key)

        # Verify the network volume exists
        logger.info("🔍 Verifying network volume...")
        volume_response = await client.getNetworkVolumeById("spwpjg3lk3")
        if not volume_response.success:
            logger.error(f"❌ Network volume not found: {volume_response.error}")
            return False
        
        volume_data = volume_response.data
        logger.info(f"✅ Network volume verified: {volume_data.get('name', 'Unknown')} ({volume_data.get('id')})")
        logger.info(f"   Size: {volume_data.get('size', 'Unknown')}GB")
        logger.info(f"   Data Center: {volume_data.get('dataCenterId', 'Unknown')}")

        # Get available GPU types
        logger.info("🔍 Getting available GPU types...")
        gpu_response = await client.getGpuTypes()
        if not gpu_response.success:
            logger.warning(f"⚠️ Could not get GPU types: {gpu_response.error}")
            # Fallback to common GPU types
            gpu_types = ["NVIDIA GeForce RTX 4090", "NVIDIA GeForce RTX 3090", "NVIDIA A40"]
        else:
            gpu_data = gpu_response.data
            if isinstance(gpu_data, list) and gpu_data:
                gpu_types = [gpu.get("id", gpu.get("name", "")) for gpu in gpu_data if gpu.get("id") or gpu.get("name")]
                logger.info(f"✅ Found {len(gpu_types)} available GPU types")
            else:
                logger.warning("⚠️ No GPU types found in response, using fallback")
                gpu_types = ["NVIDIA GeForce RTX 4090", "NVIDIA GeForce RTX 3090", "NVIDIA A40"]

        # Try creating pod with different GPU types
        for i, gpu_type in enumerate(gpu_types[:3]):  # Try up to 3 different GPUs
            logger.info(f"\n🚀 Attempt {i+1}: Creating pod with GPU: {gpu_type}")
            
            # Create pod configuration
            pod_config = RestPodConfig(
                gpuTypeIds=[gpu_type],
                imageName="runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04",
                name=f"test-pod-{int(time.time())}",
                env={
                    "JUPYTER_PASSWORD": "test-password-123",
                    "OLLAMA_HOST": "0.0.0.0:11434",
                },
                containerDiskInGb=20,
                volumeInGb=0,  # Use network volume instead
                volumeMountPath="/workspace",
                networkVolumeId="spwpjg3lk3",
                ports=["22/tcp", "8080/http", "8188/http", "8888/http", "11434/tcp"],
                templateId="fdcc1twlxx"
            )

            logger.info("🚀 Pod configuration:")
            logger.info(f"   • Name: {pod_config.name}")
            logger.info(f"   • GPU: {gpu_type}")
            logger.info(f"   • Image: {pod_config.imageName}")
            logger.info(f"   • Network Volume: {pod_config.networkVolumeId}")
            logger.info(f"   • Template: {pod_config.templateId}")
            logger.info(f"   • Mount Path: {pod_config.volumeMountPath}")
            logger.info(f"   • Ports: {pod_config.ports}")

            # Create the pod
            result = await client.createPod(pod_config)
            
            if result.success and result.data:
                pod_id = result.data.get("id", "Unknown")
                logger.info(f"✅ Pod created successfully with {gpu_type}!")
                logger.info(f"   • Pod ID: {pod_id}")
                logger.info(f"   • Status: {result.data.get('status', 'Unknown')}")
                logger.info(f"   • Network Volume Attached: Yes")
                logger.info(f"   • Template Applied: Yes")
                
                # Wait for pod to be ready
                logger.info("\n⏳ Waiting for pod to be ready...")
                await wait_for_pod_ready(client, pod_id)
                
                return True
            else:
                logger.warning(f"⚠️ Pod creation failed with {gpu_type}: {result.error}")
                if i < len(gpu_types) - 1:
                    logger.info(f"🔄 Trying next GPU type...")
                    await asyncio.sleep(2)  # Brief pause before next attempt
                else:
                    logger.error(f"❌ All GPU types failed. Last error: {result.error}")
                    return False

        return False

    except Exception as e:
        logger.error(f"❌ Test failed with error: {e}")
        return False

async def wait_for_pod_ready(client: RunPodRestClient, pod_id: str, max_attempts: int = 12):
    """Wait for pod to be fully ready"""
    logger.info(f"⏳ Waiting for pod {pod_id} to be ready...")
    
    for attempt in range(1, max_attempts + 1):
        try:
            pod_response = await client.getPodById(pod_id)
            if pod_response.success and pod_response.data:
                pod = pod_response.data
                status = pod.get("desiredStatus") or pod.get("status")
                public_ip = pod.get("publicIp")
                port_mappings = pod.get("portMappings", {})
                
                logger.info(f"📊 Pod status (attempt {attempt}/{max_attempts}): {status}")
                logger.info(f"   • Public IP: {'Yes' if public_ip else 'No'}")
                logger.info(f"   • Port Mappings: {'Yes' if port_mappings else 'No'}")
                
                if status == "RUNNING" and public_ip and port_mappings:
                    logger.info(f"✅ Pod {pod_id} is ready!")
                    logger.info(f"   • Public IP: {public_ip}")
                    logger.info(f"   • Port Mappings: {port_mappings}")
                    return True
                elif status in {"FAILED", "TERMINATED", "EXITED"}:
                    logger.error(f"❌ Pod failed to start - status: {status}")
                    return False
            else:
                logger.warning(f"⚠️ Failed to get pod status (attempt {attempt}): {pod_response.error}")
            
            await asyncio.sleep(5)
        except Exception as e:
            logger.warning(f"⚠️ Error checking pod status (attempt {attempt}): {e}")
            await asyncio.sleep(5)
    
    logger.error(f"❌ Pod did not become ready within {max_attempts * 5} seconds")
    return False

async def main():
    """Main test function"""
    logger.info("🧪 Starting RunPod pod test with volume=spwpjg3lk3 and template=fdcc1twlxx")
    logger.info("=" * 80)
    
    # Check if API key is set
    if not os.getenv("RUNPOD_API_KEY"):
        logger.error("❌ RUNPOD_API_KEY environment variable not set!")
        logger.error("   Please set it with: export RUNPOD_API_KEY=your_api_key_here")
        return False
    
    success = await test_start_pod_with_volume_and_template()
    
    logger.info("=" * 80)
    if success:
        logger.info("🎉 Test completed successfully!")
    else:
        logger.error("💥 Test failed!")
    
    return success

if __name__ == "__main__":
    # Run the test
    result = asyncio.run(main())
    exit(0 if result else 1)
