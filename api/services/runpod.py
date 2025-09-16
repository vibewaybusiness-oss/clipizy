"""
RunPod service for GPU orchestration
"""
import httpx
import json
import logging
from typing import Dict, Any, Optional, List
try:
    from ..config import settings
    from ..models.job import JobType
except ImportError:
    from config import settings
    from models.job import JobType

logger = logging.getLogger(__name__)


class RunPodService:
    def __init__(self):
        self.api_key = settings.runpod_api_key
        self.endpoint = settings.runpod_endpoint
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def create_pod(self, job_id: str, job_type: JobType, config: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new RunPod instance for GPU processing"""
        try:
            logger.info(f"Creating RunPod for job {job_id} of type {job_type}")
            
            # Determine GPU type and resources based on job type
            gpu_config = self._get_gpu_config(job_type, config)
            
            mutation = """
            mutation PodFindAndDeployOnDemand($input: PodFindAndDeployOnDemandInput!) {
                podFindAndDeployOnDemand(input: $input) {
                    id
                    name
                    desiredStatus
                    runtimeInMinutes
                    gpuCount
                    gpuTypeId
                    volumeInGb
                    containerDiskInGb
                    ports {
                        ip
                        isIpPublic
                        privatePort
                        publicPort
                        type
                    }
                }
            }
            """
            
            variables = {
                "input": {
                    "gpuTypeId": gpu_config["gpu_type"],
                    "gpuCount": gpu_config["gpu_count"],
                    "volumeInGb": gpu_config["volume_gb"],
                    "containerDiskInGb": gpu_config["disk_gb"],
                    "name": f"vibewave-{job_type}-{job_id}",
                    "imageName": gpu_config["image_name"],
                    "containerArgs": gpu_config["container_args"],
                    "env": gpu_config.get("env", {}),
                    "networkVolumeId": gpu_config.get("network_volume_id"),
                    "templateId": gpu_config.get("template_id")
                }
            }
            
            payload = {
                "query": mutation,
                "variables": variables
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.endpoint,
                    json=payload,
                    headers=self.headers
                )
                response.raise_for_status()
                
                result = response.json()
                
                if "errors" in result:
                    logger.error(f"RunPod API errors: {result['errors']}")
                    raise Exception(f"RunPod API errors: {result['errors']}")
                
                pod_data = result["data"]["podFindAndDeployOnDemand"]
                logger.info(f"Created RunPod: {pod_data['id']}")
                
                return {
                    "pod_id": pod_data["id"],
                    "name": pod_data["name"],
                    "status": pod_data["desiredStatus"],
                    "runtime_minutes": pod_data.get("runtimeInMinutes"),
                    "gpu_count": pod_data.get("gpuCount"),
                    "gpu_type": pod_data.get("gpuTypeId"),
                    "ports": pod_data.get("ports", [])
                }
                
        except httpx.HTTPError as e:
            logger.error(f"HTTP error creating RunPod: {e}")
            raise
        except Exception as e:
            logger.error(f"Error creating RunPod: {e}")
            raise

    async def get_pod_status(self, pod_id: str) -> Dict[str, Any]:
        """Get the current status of a RunPod instance"""
        try:
            query = """
            query Pod($input: PodQueryInput!) {
                pod(input: $input) {
                    id
                    name
                    runtimeInMinutes
                    uptimeInSeconds
                    desiredStatus
                    lastStatusChange
                    machineId
                    gpuCount
                    gpuTypeId
                    ports {
                        ip
                        isIpPublic
                        privatePort
                        publicPort
                        type
                    }
                    container {
                        name
                        imageName
                        env
                        args
                        ports
                    }
                }
            }
            """
            
            variables = {"input": {"id": pod_id}}
            payload = {"query": query, "variables": variables}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.endpoint,
                    json=payload,
                    headers=self.headers
                )
                response.raise_for_status()
                
                result = response.json()
                
                if "errors" in result:
                    logger.error(f"RunPod API errors: {result['errors']}")
                    raise Exception(f"RunPod API errors: {result['errors']}")
                
                pod_data = result["data"]["pod"]
                return {
                    "pod_id": pod_data["id"],
                    "name": pod_data["name"],
                    "status": pod_data["desiredStatus"],
                    "runtime_minutes": pod_data.get("runtimeInMinutes"),
                    "uptime_seconds": pod_data.get("uptimeInSeconds"),
                    "last_status_change": pod_data.get("lastStatusChange"),
                    "machine_id": pod_data.get("machineId"),
                    "gpu_count": pod_data.get("gpuCount"),
                    "gpu_type": pod_data.get("gpuTypeId"),
                    "ports": pod_data.get("ports", []),
                    "container": pod_data.get("container", {})
                }
                
        except httpx.HTTPError as e:
            logger.error(f"HTTP error getting pod status: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting pod status: {e}")
            raise

    async def terminate_pod(self, pod_id: str) -> bool:
        """Terminate a RunPod instance"""
        try:
            mutation = """
            mutation PodTerminate($input: PodTerminateInput!) {
                podTerminate(input: $input) {
                    id
                    desiredStatus
                }
            }
            """
            
            variables = {"input": {"podId": pod_id}}
            payload = {"query": mutation, "variables": variables}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.endpoint,
                    json=payload,
                    headers=self.headers
                )
                response.raise_for_status()
                
                result = response.json()
                
                if "errors" in result:
                    logger.error(f"RunPod API errors: {result['errors']}")
                    return False
                
                logger.info(f"Terminated RunPod: {pod_id}")
                return True
                
        except httpx.HTTPError as e:
            logger.error(f"HTTP error terminating pod: {e}")
            return False
        except Exception as e:
            logger.error(f"Error terminating pod: {e}")
            return False

    async def list_pods(self, limit: int = 10) -> List[Dict[str, Any]]:
        """List all RunPod instances"""
        try:
            query = """
            query Pods($input: PodsQueryInput!) {
                pods(input: $input) {
                    id
                    name
                    runtimeInMinutes
                    uptimeInSeconds
                    desiredStatus
                    lastStatusChange
                    gpuCount
                    gpuTypeId
                }
            }
            """
            
            variables = {
                "input": {
                    "limit": limit,
                    "offset": 0
                }
            }
            payload = {"query": query, "variables": variables}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.endpoint,
                    json=payload,
                    headers=self.headers
                )
                response.raise_for_status()
                
                result = response.json()
                
                if "errors" in result:
                    logger.error(f"RunPod API errors: {result['errors']}")
                    return []
                
                pods = result["data"]["pods"]
                return [
                    {
                        "pod_id": pod["id"],
                        "name": pod["name"],
                        "status": pod["desiredStatus"],
                        "runtime_minutes": pod.get("runtimeInMinutes"),
                        "uptime_seconds": pod.get("uptimeInSeconds"),
                        "last_status_change": pod.get("lastStatusChange"),
                        "gpu_count": pod.get("gpuCount"),
                        "gpu_type": pod.get("gpuTypeId")
                    }
                    for pod in pods
                ]
                
        except httpx.HTTPError as e:
            logger.error(f"HTTP error listing pods: {e}")
            return []
        except Exception as e:
            logger.error(f"Error listing pods: {e}")
            return []

    def _get_gpu_config(self, job_type: JobType, config: Dict[str, Any]) -> Dict[str, Any]:
        """Get GPU configuration based on job type"""
        base_configs = {
            JobType.MUSIC_ANALYSIS: {
                "gpu_type": "RTX 3080",
                "gpu_count": 1,
                "volume_gb": 20,
                "disk_gb": 40,
                "image_name": "runpod/pytorch:2.0.1-py3.10-cuda11.8.0-devel-ubuntu22.04",
                "container_args": "bash /workspace/start-music-analysis.sh"
            },
            JobType.VIDEO_GENERATION: {
                "gpu_type": "RTX 4090",
                "gpu_count": 1,
                "volume_gb": 50,
                "disk_gb": 80,
                "image_name": "runpod/pytorch:2.0.1-py3.10-cuda11.8.0-devel-ubuntu22.04",
                "container_args": "bash /workspace/start-video-generation.sh"
            },
            JobType.AUDIO_PROCESSING: {
                "gpu_type": "RTX 3080",
                "gpu_count": 1,
                "volume_gb": 30,
                "disk_gb": 50,
                "image_name": "runpod/pytorch:2.0.1-py3.10-cuda11.8.0-devel-ubuntu22.04",
                "container_args": "bash /workspace/start-audio-processing.sh"
            },
            JobType.RENDER: {
                "gpu_type": "RTX 4090",
                "gpu_count": 2,
                "volume_gb": 100,
                "disk_gb": 120,
                "image_name": "runpod/pytorch:2.0.1-py3.10-cuda11.8.0-devel-ubuntu22.04",
                "container_args": "bash /workspace/start-render.sh"
            }
        }
        
        base_config = base_configs.get(job_type, base_configs[JobType.VIDEO_GENERATION])
        
        # Override with custom config if provided
        if config:
            base_config.update(config)
        
        return base_config

    async def submit_job(self, pod_id: str, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit a job to a running RunPod instance"""
        try:
            # This would typically involve calling a custom endpoint on the pod
            # For now, we'll return a mock response
            logger.info(f"Submitting job to pod {pod_id}")
            
            # In a real implementation, you would:
            # 1. Get the pod's IP and port
            # 2. Make an HTTP request to the pod's job endpoint
            # 3. Return the job submission result
            
            return {
                "job_id": f"job_{pod_id}_{hash(str(job_data))}",
                "status": "submitted",
                "pod_id": pod_id,
                "estimated_completion": "2024-01-01T12:00:00Z"
            }
            
        except Exception as e:
            logger.error(f"Error submitting job: {e}")
            raise


# Global RunPod service instance
runpod_service = RunPodService()
