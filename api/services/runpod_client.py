"""
RunPod API Client - Python implementation
"""
import os
import json
import httpx
import asyncio
from typing import Optional, Dict, Any, List
from api.models.runpod import (
    RunPodUser, RunPodPod, RunPodApiResponse, RestPodConfig,
    NetworkVolume, GpuType, CloudType, WorkflowInput, WorkflowResult
)


class RunPodGraphQLClient:
    """RunPod GraphQL API Client"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or self._get_api_key()
        self.base_url = "https://api.runpod.io/graphql"
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )
    
    def _get_api_key(self) -> str:
        """Get API key from environment or file"""
        # Try environment variable first
        api_key = os.getenv("RUNPOD_API_KEY")
        if api_key:
            return api_key
        
        # Try reading from file
        key_file = os.path.join(os.path.dirname(__file__), "..", "runpod", "runpod_api_privatekey")
        if os.path.exists(key_file):
            with open(key_file, "r") as f:
                return f.read().strip()
        
        raise ValueError("RunPod API key not found. Set RUNPOD_API_KEY environment variable or create runpod_api_privatekey file")
    
    async def make_graphql_request(self, query: str, variables: Optional[Dict[str, Any]] = None) -> RunPodApiResponse:
        """Make a GraphQL request to RunPod API"""
        try:
            payload = {
                "query": query,
                "variables": variables or {}
            }
            
            response = await self.client.post(self.base_url, json=payload)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get("errors") and len(result["errors"]) > 0:
                return RunPodApiResponse(
                    success=False,
                    error=", ".join([e.get("message", "Unknown error") for e in result["errors"]])
                )
            
            return RunPodApiResponse(
                success=True,
                data=result.get("data")
            )
            
        except httpx.HTTPError as e:
            return RunPodApiResponse(
                success=False,
                error=f"HTTP error: {str(e)}"
            )
        except Exception as e:
            return RunPodApiResponse(
                success=False,
                error=f"Request failed: {str(e)}"
            )
    
    async def get_account_info(self) -> RunPodApiResponse[RunPodUser]:
        """Get account information"""
        query = """
        query {
            myself {
                id
                email
                minBalance
            }
        }
        """
        
        result = await self.make_graphql_request(query)
        
        if result.success and result.data:
            return RunPodApiResponse(
                success=True,
                data=RunPodUser(**result.data["myself"])
            )
        
        return result
    
    async def get_pods(self) -> RunPodApiResponse[List[RunPodPod]]:
        """Get all pods (Note: RunPod GraphQL API doesn't support listing all pods)"""
        return RunPodApiResponse(
            success=False,
            error="RunPod GraphQL API does not support listing all pods. Use get_pod_by_id() with specific pod IDs instead."
        )
    
    async def get_pod_by_id(self, pod_id: str) -> RunPodApiResponse[RunPodPod]:
        """Get pod by ID"""
        query = """
        query GetPod($id: String!) {
            pod(input: { podId: $id }) {
                id
                name
                imageName
                uptimeSeconds
                costPerHr
                createdAt
                status
                desiredStatus
                ip
                publicIp
                machineId
                gpuCount
                memoryInGb
                vcpuCount
                lastStartedAt
                portMappings
                networkVolumeId
                volumeInGb
                volumeMountPath
            }
        }
        """
        
        result = await self.make_graphql_request(query, {"id": pod_id})
        
        if result.success and result.data:
            return RunPodApiResponse(
                success=True,
                data=RunPodPod(**result.data["pod"])
            )
        
        return result
    
    async def create_pod(self, pod_config: RestPodConfig) -> RunPodApiResponse[RunPodPod]:
        """Create a new pod"""
        mutation = """
        mutation CreatePod($input: PodFindAndDeployOnDemandInput!) {
            podFindAndDeployOnDemand(input: $input) {
                id
                name
                imageName
                uptimeSeconds
                costPerHr
                createdAt
                status
                desiredStatus
                ip
                publicIp
                machineId
                gpuCount
                memoryInGb
                vcpuCount
                lastStartedAt
                portMappings
                networkVolumeId
                volumeInGb
                volumeMountPath
            }
        }
        """
        
        variables = {
            "input": {
                "gpuTypeId": pod_config.gpu_type_ids[0] if pod_config.gpu_type_ids else None,
                "imageName": pod_config.image_name,
                "name": pod_config.name,
                "env": pod_config.env or {},
                "containerDiskInGb": pod_config.container_disk_in_gb,
                "volumeInGb": pod_config.volume_in_gb,
                "volumeMountPath": pod_config.volume_mount_path,
                "networkVolumeId": pod_config.network_volume_id,
                "gpuCount": pod_config.gpu_count,
                "minMemoryInGb": pod_config.min_memory_in_gb,
                "countryCode": pod_config.country_code,
                "supportPublicIp": pod_config.support_public_ip,
                "minVcpuCount": pod_config.min_vcpu_count,
                "ports": pod_config.ports,
                "dockerArgs": pod_config.docker_args
            }
        }
        
        result = await self.make_graphql_request(mutation, variables)
        
        if result.success and result.data:
            return RunPodApiResponse(
                success=True,
                data=RunPodPod(**result.data["podFindAndDeployOnDemand"])
            )
        
        return result
    
    async def stop_pod(self, pod_id: str) -> RunPodApiResponse[Dict[str, bool]]:
        """Stop a pod"""
        mutation = """
        mutation StopPod($input: PodStopInput!) {
            podStop(input: $input) {
                id
                status
            }
        }
        """
        
        result = await self.make_graphql_request(mutation, {"input": {"podId": pod_id}})
        
        if result.success and result.data:
            return RunPodApiResponse(
                success=True,
                data={"success": True}
            )
        
        return result
    
    async def start_pod(self, pod_id: str) -> RunPodApiResponse[Dict[str, bool]]:
        """Start a pod"""
        mutation = """
        mutation StartPod($input: PodStartInput!) {
            podStart(input: $input) {
                id
                status
            }
        }
        """
        
        result = await self.make_graphql_request(mutation, {"input": {"podId": pod_id}})
        
        if result.success and result.data:
            return RunPodApiResponse(
                success=True,
                data={"success": True}
            )
        
        return result
    
    async def pause_pod(self, pod_id: str) -> RunPodApiResponse[Dict[str, bool]]:
        """Pause a pod (same as stop)"""
        return await self.stop_pod(pod_id)
    
    async def terminate_pod(self, pod_id: str) -> RunPodApiResponse[Dict[str, bool]]:
        """Terminate a pod"""
        mutation = """
        mutation TerminatePod($input: PodTerminateInput!) {
            podTerminate(input: $input) {
                id
                desiredStatus
            }
        }
        """
        
        result = await self.make_graphql_request(mutation, {"input": {"podId": pod_id}})
        
        if result.success and result.data:
            return RunPodApiResponse(
                success=True,
                data={"success": True}
            )
        
        return result
    
    async def get_gpu_types(self) -> RunPodApiResponse[List[GpuType]]:
        """Get available GPU types"""
        query = """
        query {
            gpuTypes {
                id
                displayName
                memoryInGb
                secureCloud
                communityCloud
                lowestPrice
            }
        }
        """
        
        result = await self.make_graphql_request(query)
        
        if result.success and result.data:
            return RunPodApiResponse(
                success=True,
                data=[GpuType(**gpu) for gpu in result.data["gpuTypes"]]
            )
        
        return result
    
    async def get_cloud_types(self) -> RunPodApiResponse[List[CloudType]]:
        """Get available cloud types"""
        query = """
        query {
            cloudStorages {
                id
            }
        }
        """
        
        result = await self.make_graphql_request(query)
        
        if result.success and result.data:
            return RunPodApiResponse(
                success=True,
                data=[CloudType(id=storage["id"], name=f"Cloud {storage['id']}") for storage in result.data["cloudStorages"]]
            )
        
        return result
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


class RunPodRestClient:
    """RunPod REST API Client"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or self._get_api_key()
        self.base_url = "https://api.runpod.io/v2"
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )
    
    def _get_api_key(self) -> str:
        """Get API key from environment or file"""
        api_key = os.getenv("RUNPOD_API_KEY")
        if api_key:
            return api_key
        
        key_file = os.path.join(os.path.dirname(__file__), "..", "runpod", "runpod_api_privatekey")
        if os.path.exists(key_file):
            with open(key_file, "r") as f:
                return f.read().strip()
        
        raise ValueError("RunPod API key not found. Set RUNPOD_API_KEY environment variable or create runpod_api_privatekey file")
    
    async def make_request(self, endpoint: str, method: str = "GET", data: Optional[Dict[str, Any]] = None) -> RunPodApiResponse:
        """Make a REST API request"""
        try:
            response = await self.client.request(
                method=method,
                url=f"{self.base_url}{endpoint}",
                json=data
            )
            response.raise_for_status()
            
            result = response.json()
            
            if result.get("errors") and len(result["errors"]) > 0:
                return RunPodApiResponse(
                    success=False,
                    error=", ".join([e.get("message", "Unknown error") for e in result["errors"]])
                )
            
            return RunPodApiResponse(
                success=True,
                data=result.get("data")
            )
            
        except httpx.HTTPError as e:
            return RunPodApiResponse(
                success=False,
                error=f"HTTP error: {str(e)}"
            )
        except Exception as e:
            return RunPodApiResponse(
                success=False,
                error=f"Request failed: {str(e)}"
            )
    
    async def get_account_info(self) -> RunPodApiResponse[RunPodUser]:
        """Get account information (mock for REST API)"""
        return RunPodApiResponse(
            success=True,
            data=RunPodUser(
                id="mock-user",
                email="mock@example.com",
                min_balance=0.0
            )
        )
    
    async def get_pods(self) -> RunPodApiResponse[List[RunPodPod]]:
        """Get all pods"""
        result = await self.make_request("/pods")
        return result
    
    async def get_pod_by_id(self, pod_id: str) -> RunPodApiResponse[RunPodPod]:
        """Get pod by ID"""
        result = await self.make_request(f"/pods/{pod_id}")
        
        if result.success and result.data:
            return RunPodApiResponse(
                success=True,
                data=RunPodPod(**result.data)
            )
        
        return result
    
    async def create_pod(self, pod_config: RestPodConfig) -> RunPodApiResponse[RunPodPod]:
        """Create a new pod"""
        result = await self.make_request("/pods", "POST", pod_config.dict(by_alias=True))
        return result
    
    async def stop_pod(self, pod_id: str) -> RunPodApiResponse[Dict[str, bool]]:
        """Stop a pod"""
        result = await self.make_request(f"/pods/{pod_id}/stop", "POST")
        return result
    
    async def start_pod(self, pod_id: str) -> RunPodApiResponse[Dict[str, bool]]:
        """Start a pod"""
        result = await self.make_request(f"/pods/{pod_id}/start", "POST")
        return result
    
    async def restart_pod(self, pod_id: str) -> RunPodApiResponse[Dict[str, bool]]:
        """Restart a pod"""
        result = await self.make_request(f"/pods/{pod_id}/restart", "POST")
        return result
    
    async def update_pod(self, pod_id: str, update_data: Dict[str, Any]) -> RunPodApiResponse[RunPodPod]:
        """Update a pod"""
        result = await self.make_request(f"/pods/{pod_id}", "PATCH", update_data)
        return result
    
    async def pause_pod(self, pod_id: str) -> RunPodApiResponse[Dict[str, bool]]:
        """Pause a pod (same as stop)"""
        return await self.stop_pod(pod_id)
    
    async def terminate_pod(self, pod_id: str) -> RunPodApiResponse[Dict[str, bool]]:
        """Terminate a pod"""
        result = await self.make_request(f"/pods/{pod_id}/terminate", "POST")
        return result
    
    async def get_network_volumes(self) -> RunPodApiResponse[List[NetworkVolume]]:
        """Get network volumes"""
        result = await self.make_request("/networkvolumes")
        return result
    
    async def get_network_volume_by_id(self, volume_id: str) -> RunPodApiResponse[NetworkVolume]:
        """Get network volume by ID"""
        result = await self.make_request(f"/networkvolumes/{volume_id}")
        return result
    
    async def get_templates(self, include_public: bool = False, include_runpod: bool = False, include_endpoint_bound: bool = False) -> RunPodApiResponse[List[Dict[str, Any]]]:
        """Get templates"""
        params = []
        if include_public:
            params.append("includePublicTemplates=true")
        if include_runpod:
            params.append("includeRunpodTemplates=true")
        if include_endpoint_bound:
            params.append("includeEndpointBoundTemplates=true")
        
        query_string = "&".join(params)
        endpoint = f"/templates?{query_string}" if query_string else "/templates"
        
        result = await self.make_request(endpoint)
        return result
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global client instances
_graphql_client: Optional[RunPodGraphQLClient] = None
_rest_client: Optional[RunPodRestClient] = None


def get_graphql_client() -> RunPodGraphQLClient:
    """Get or create GraphQL client instance"""
    global _graphql_client
    if _graphql_client is None:
        _graphql_client = RunPodGraphQLClient()
    return _graphql_client


def get_rest_client() -> RunPodRestClient:
    """Get or create REST client instance"""
    global _rest_client
    if _rest_client is None:
        _rest_client = RunPodRestClient()
    return _rest_client


async def cleanup_clients():
    """Cleanup client connections"""
    global _graphql_client, _rest_client
    
    if _graphql_client:
        await _graphql_client.close()
        _graphql_client = None
    
    if _rest_client:
        await _rest_client.close()
        _rest_client = None
