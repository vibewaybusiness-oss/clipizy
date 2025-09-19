# runpod_client.py
from __future__ import annotations

import os
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import httpx
from fastapi import APIRouter, Depends, HTTPException
from functools import lru_cache
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# -----------------------------------------------------------------------------
# Load environment (.env then .env.local — latter overrides)
# -----------------------------------------------------------------------------
cwd = Path.cwd()
load_dotenv(dotenv_path=cwd / ".env")
load_dotenv(dotenv_path=cwd / ".env.local", override=True)
# Also try loading from parent directory (api/.env)
load_dotenv(dotenv_path=cwd.parent / ".env", override=True)
load_dotenv(dotenv_path=cwd.parent / ".env.local", override=True)


# -----------------------------------------------------------------------------
# Pydantic models (mirror your TS interfaces)
# -----------------------------------------------------------------------------
class RunPodUser(BaseModel):
    id: str
    email: Optional[str] = None
    minBalance: Optional[float] = None


class RunPodPod(BaseModel):
    id: str
    name: Optional[str] = None
    imageName: Optional[str] = None
    uptimeSeconds: Optional[int] = 0
    costPerHr: Optional[float] = 0
    createdAt: Optional[str] = None
    status: Optional[str] = None
    desiredStatus: Optional[str] = None
    ip: Optional[str] = None
    publicIp: Optional[str] = None
    machineId: Optional[str] = None
    gpuCount: Optional[int] = None
    memoryInGb: Optional[int] = None
    vcpuCount: Optional[int] = None
    lastStartedAt: Optional[str] = None
    portMappings: Optional[Dict[str, int]] = None
    networkVolumeId: Optional[str] = None
    volumeInGb: Optional[int] = None
    volumeMountPath: Optional[str] = None


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


class NetworkVolume(BaseModel):
    id: str
    name: str
    size: int
    dataCenterId: str


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
def _load_api_key() -> str:
    # 1) ENV
    env_key = os.getenv("RUNPOD_API_KEY")
    if env_key:
        print("✅ Using RUNPOD_API_KEY from environment variable")
        return env_key

    # 2) File api/runpod/runpod_api_key
    key_path = cwd / "api" / "runpod" / "runpod_api_key"
    if key_path.exists():
        content = key_path.read_text(encoding="utf-8").strip()
        if "BEGIN OPENSSH PRIVATE KEY" in content:
            raise RuntimeError(
                "SSH key found instead of API key. Set RUNPOD_API_KEY or write the API key to backend/runpod_api_key."
            )
        if content.startswith("rpa_") or content:
            print("✅ Using API key from file")
            return content

        raise RuntimeError(
            "RunPod API key not found. Set RUNPOD_API_KEY or create api/runpod/runpod_api_key file"
        )


# -----------------------------------------------------------------------------
# GraphQL client (async httpx)
# -----------------------------------------------------------------------------
class RunPodGraphQLClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or _load_api_key()
        self.base_url = "https://api.runpod.io/graphql"

    async def _gql(self, query: str, variables: Optional[Dict[str, Any]] = None) -> RunPodApiResponse:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    self.base_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={"query": query, "variables": variables or {}},
                )
            if resp.status_code >= 400:
                return RunPodApiResponse(success=False, error=f"HTTP error! status: {resp.status_code}")
            result = resp.json()
            if "errors" in result and result["errors"]:
                return RunPodApiResponse(
                    success=False,
                    error=", ".join(err.get("message", "GraphQL error") for err in result["errors"]),
                )
            return RunPodApiResponse(success=True, data=result.get("data"))
        except Exception as e:
            return RunPodApiResponse(success=False, error=str(e))

    async def getAccountInfo(self) -> RunPodApiResponse:
        query = """
        query {
          myself {
            id
            email
            minBalance
          }
        }
        """
        res = await self._gql(query)
        if res.success and res.data:
            return RunPodApiResponse(success=True, data=RunPodUser(**res.data["myself"]))
        return res

    async def getPods(self) -> RunPodApiResponse:
        # GraphQL limitation – keep the same message as TS
        return RunPodApiResponse(
            success=False,
            error="RunPod GraphQL API does not support listing all pods. Use getPodById() with specific pod IDs instead.",
        )

    async def getPodById(self, pod_id: str) -> RunPodApiResponse:
        query = """
        query GetPod($id: String!) {
          pod(input: { podId: $id }) {
            id
            name
            imageName
            status
            uptimeSeconds
            costPerHr
            createdAt
          }
        }
        """
        res = await self._gql(query, {"id": pod_id})
        if res.success and res.data:
            return RunPodApiResponse(success=True, data=RunPodPod(**res.data["pod"]))
        return res

    async def createPod(
        self,
        pod_config: Dict[str, Any],
    ) -> RunPodApiResponse:
        mutation = """
        mutation CreatePod($input: PodFindAndDeployOnDemandInput!) {
          podFindAndDeployOnDemand(input: $input) {
            id
            name
            imageName
            uptimeSeconds
            costPerHr
            createdAt
          }
        }
        """
        variables = {"input": pod_config}
        res = await self._gql(mutation, variables)
        if res.success and res.data:
            return RunPodApiResponse(
                success=True, data=RunPodPod(**res.data["podFindAndDeployOnDemand"])
            )
        return res

    async def stopPod(self, pod_id: str) -> RunPodApiResponse:
        mutation = """
        mutation StopPod($input: PodStopInput!) {
          podStop(input: $input) {
            id
            status
          }
        }
        """
        res = await self._gql(mutation, {"input": {"podId": pod_id}})
        if res.success and res.data:
            return RunPodApiResponse(success=True, data={"success": True})
        return res

    async def startPod(self, pod_id: str) -> RunPodApiResponse:
        mutation = """
        mutation StartPod($input: PodStartInput!) {
          podStart(input: $input) {
            id
            status
          }
        }
        """
        res = await self._gql(mutation, {"input": {"podId": pod_id}})
        if res.success and res.data:
            return RunPodApiResponse(success=True, data={"success": True})
        return res

    async def pausePod(self, pod_id: str) -> RunPodApiResponse:
        mutation = """
        mutation StopPod($input: PodStopInput!) {
          podStop(input: $input) {
            id
            desiredStatus
          }
        }
        """
        res = await self._gql(mutation, {"input": {"podId": pod_id}})
        if res.success and res.data:
            return RunPodApiResponse(success=True, data={"success": True})
        return res

    async def terminatePod(self, pod_id: str) -> RunPodApiResponse:
        # Use REST endpoint (as in TS)
        try:
            api_key = self.api_key
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.delete(
                    f"https://rest.runpod.io/v1/pods/{pod_id}",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                )
            if 200 <= resp.status_code < 300:
                return RunPodApiResponse(success=True, data={"success": True})
            return RunPodApiResponse(
                success=False, error=f"HTTP error! status: {resp.status_code} - {resp.text}"
            )
        except Exception as e:
            return RunPodApiResponse(success=False, error=f"Error terminating pod: {e}")

    async def getGpuTypes(self) -> RunPodApiResponse:
        query = """
        query {
          gpuTypes { id }
        }
        """
        res = await self._gql(query)
        if res.success and res.data:
            return RunPodApiResponse(success=True, data=res.data["gpuTypes"])
        return res

    async def getCloudTypes(self) -> RunPodApiResponse:
        query = """
        query {
          cloudStorages { id }
        }
        """
        res = await self._gql(query)
        if res.success and res.data:
            return RunPodApiResponse(success=True, data=res.data["cloudStorages"])
        return res


# -----------------------------------------------------------------------------
# REST client (async httpx)
# -----------------------------------------------------------------------------
class RunPodRestClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or _load_api_key()
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

    async def getAccountInfo(self) -> RunPodApiResponse:
        # Mock (API parity with TS)
        return RunPodApiResponse(
            success=True,
            data={
                "id": "mock-user",
                "username": "mock-user",
                "email": "mock@example.com",
                "credits": 1000,
            },
        )

    async def getPods(self) -> RunPodApiResponse:
        return await self._request("/pods")

    async def getPodById(self, pod_id: str) -> RunPodApiResponse:
        res = await self._request(f"/pods/{pod_id}")
        if res.success and res.data:
            raw = res.data
            pod = RunPodPod(
                id=raw.get("id"),
                name=raw.get("name"),
                imageName=raw.get("imageName"),
                uptimeSeconds=raw.get("uptimeSeconds") or 0,
                costPerHr=raw.get("costPerHr") or 0,
                createdAt=raw.get("createdAt"),
                status=raw.get("desiredStatus") or raw.get("status"),
                desiredStatus=raw.get("desiredStatus"),
                ip=raw.get("ip"),
                publicIp=raw.get("publicIp"),
                machineId=raw.get("machineId"),
                gpuCount=raw.get("gpuCount"),
                memoryInGb=raw.get("memoryInGb"),
                vcpuCount=raw.get("vcpuCount"),
                lastStartedAt=raw.get("lastStartedAt"),
                portMappings=raw.get("portMappings"),
                networkVolumeId=raw.get("networkVolumeId"),
                volumeInGb=raw.get("volumeInGb"),
                volumeMountPath=raw.get("volumeMountPath"),
            )
            return RunPodApiResponse(success=True, data=pod)
        return res

    async def createPod(self, pod_config: RestPodConfig) -> RunPodApiResponse:
        return await self._request("/pods", method="POST", data=pod_config.dict(exclude_none=True))

    async def stopPod(self, pod_id: str) -> RunPodApiResponse:
        return await self._request(f"/pods/{pod_id}/stop", method="POST")

    async def startPod(self, pod_id: str) -> RunPodApiResponse:
        return await self._request(f"/pods/{pod_id}/start", method="POST")

    async def exposeHttpPorts(self, pod_id: str, ports: List[int]) -> RunPodApiResponse:
        return await self._request(f"/pods/{pod_id}", method="PATCH", data={"exposeHttpPorts": ports})

    async def restartPod(self, pod_id: str) -> RunPodApiResponse:
        return await self._request(f"/pods/{pod_id}/restart", method="POST")

    async def updatePod(self, pod_id: str, update_data: Dict[str, Any]) -> RunPodApiResponse:
        return await self._request(f"/pods/{pod_id}", method="PATCH", data=update_data)

    async def pausePod(self, pod_id: str) -> RunPodApiResponse:
        return await self._request(f"/pods/{pod_id}/stop", method="POST")

    async def terminatePod(self, pod_id: str) -> RunPodApiResponse:
        return await self._request(f"/pods/{pod_id}", method="DELETE")

    async def getGpuTypes(self) -> RunPodApiResponse:
        # Mock (API parity with TS)
        return RunPodApiResponse(
            success=True,
            data=[
                {"id": "NVIDIA GeForce RTX 3090", "memoryInGb": 24},
                {"id": "NVIDIA GeForce RTX 4090", "memoryInGb": 24},
                {"id": "NVIDIA A40", "memoryInGb": 48},
            ],
        )

    async def getCloudTypes(self) -> RunPodApiResponse:
        # Mock (API parity with TS)
        return RunPodApiResponse(
            success=True,
            data=[
                {"id": "COMMUNITY", "name": "Community Cloud"},
                {"id": "SECURE", "name": "Secure Cloud"},
            ],
        )

    async def getNetworkVolumes(self) -> RunPodApiResponse:
        return await self._request("/networkvolumes")

    async def getNetworkVolumeById(self, volume_id: str) -> RunPodApiResponse:
        return await self._request(f"/networkvolumes/{volume_id}")

    # Public wrapper (for tests)
    async def makeRequestPublic(self, endpoint: str, method: str = "GET", data: Optional[Dict[str, Any]] = None) -> RunPodApiResponse:
        return await self._request(endpoint, method, data)


# -----------------------------------------------------------------------------
# Singleton-style accessors (good with FastAPI Depends)
# -----------------------------------------------------------------------------
@lru_cache()
def get_runpod_graphql_client() -> RunPodGraphQLClient:
    return RunPodGraphQLClient()


@lru_cache()
def get_runpod_rest_client() -> RunPodRestClient:
    return RunPodRestClient()


# -----------------------------------------------------------------------------
# Convenience free functions (parity with your TS exports)
# -----------------------------------------------------------------------------
async def fetchAccountInfo() -> RunPodApiResponse:
    return await get_runpod_graphql_client().getAccountInfo()


async def fetchPods() -> RunPodApiResponse:
    return await get_runpod_graphql_client().getPods()


async def fetchPodById(pod_id: str) -> RunPodApiResponse:
    return await get_runpod_graphql_client().getPodById(pod_id)


async def createPod_gql(pod_config: Dict[str, Any]) -> RunPodApiResponse:
    return await get_runpod_graphql_client().createPod(pod_config)


async def stopPod_gql(pod_id: str) -> RunPodApiResponse:
    return await get_runpod_graphql_client().stopPod(pod_id)


async def startPod_gql(pod_id: str) -> RunPodApiResponse:
    return await get_runpod_graphql_client().startPod(pod_id)


async def terminatePod_gql(pod_id: str) -> RunPodApiResponse:
    return await get_runpod_graphql_client().terminatePod(pod_id)


async def fetchGpuTypes_gql() -> RunPodApiResponse:
    return await get_runpod_graphql_client().getGpuTypes()


async def fetchCloudTypes_gql() -> RunPodApiResponse:
    return await get_runpod_graphql_client().getCloudTypes()


async def fetchNetworkVolumes_rest() -> RunPodApiResponse:
    return await get_runpod_rest_client().getNetworkVolumes()


async def fetchNetworkVolumeById_rest(volume_id: str) -> RunPodApiResponse:
    return await get_runpod_rest_client().getNetworkVolumeById(volume_id)


# -----------------------------------------------------------------------------
# FastAPI router (optional, handy to plug in immediately)
# -----------------------------------------------------------------------------
router = APIRouter(prefix="/runpod", tags=["runpod"])

@router.get("/account", response_model=RunPodApiResponse)
async def account(gql: RunPodGraphQLClient = Depends(get_runpod_graphql_client)):
    return await gql.getAccountInfo()

@router.get("/pods", response_model=RunPodApiResponse)
async def list_pods(rest: RunPodRestClient = Depends(get_runpod_rest_client)):
    return await rest.getPods()

@router.get("/pods/{pod_id}", response_model=RunPodApiResponse)
async def pod_by_id(pod_id: str, rest: RunPodRestClient = Depends(get_runpod_rest_client)):
    return await rest.getPodById(pod_id)

class CreatePodGQLBody(BaseModel):
    name: str
    imageName: str
    gpuTypeId: str
    cloudType: str
    networkVolumeId: Optional[str] = None
    gpuCount: Optional[int] = None
    minMemoryInGb: Optional[int] = None
    countryCode: Optional[str] = None
    supportPublicIp: Optional[bool] = None
    containerDiskInGb: Optional[int] = None
    minVcpuCount: Optional[int] = None
    ports: Optional[str] = None
    dockerArgs: Optional[str] = None
    templateId: Optional[str] = None

@router.post("/pods/gql", response_model=RunPodApiResponse)
async def create_pod_gql(body: CreatePodGQLBody, gql: RunPodGraphQLClient = Depends(get_runpod_graphql_client)):
    return await gql.createPod(body.dict(exclude_none=True))

@router.post("/pods/{pod_id}/start", response_model=RunPodApiResponse)
async def start_pod(pod_id: str, gql: RunPodGraphQLClient = Depends(get_runpod_graphql_client)):
    return await gql.startPod(pod_id)

@router.post("/pods/{pod_id}/stop", response_model=RunPodApiResponse)
async def stop_pod(pod_id: str, gql: RunPodGraphQLClient = Depends(get_runpod_graphql_client)):
    return await gql.stopPod(pod_id)

@router.post("/pods/{pod_id}/pause", response_model=RunPodApiResponse)
async def pause_pod(pod_id: str, gql: RunPodGraphQLClient = Depends(get_runpod_graphql_client)):
    return await gql.pausePod(pod_id)

@router.delete("/pods/{pod_id}", response_model=RunPodApiResponse)
async def terminate_pod(pod_id: str, gql: RunPodGraphQLClient = Depends(get_runpod_graphql_client)):
    return await gql.terminatePod(pod_id)

@router.get("/gpu-types/gql", response_model=RunPodApiResponse)
async def gpu_types_gql(gql: RunPodGraphQLClient = Depends(get_runpod_graphql_client)):
    return await gql.getGpuTypes()

@router.get("/cloud-types/gql", response_model=RunPodApiResponse)
async def cloud_types_gql(gql: RunPodGraphQLClient = Depends(get_runpod_graphql_client)):
    return await gql.getCloudTypes()

@router.get("/network-volumes", response_model=RunPodApiResponse)
async def network_volumes(rest: RunPodRestClient = Depends(get_runpod_rest_client)):
    return await rest.getNetworkVolumes()

@router.get("/network-volumes/{volume_id}", response_model=RunPodApiResponse)
async def network_volume_by_id(volume_id: str, rest: RunPodRestClient = Depends(get_runpod_rest_client)):
    return await rest.getNetworkVolumeById(volume_id)

class CreatePodRestBody(RestPodConfig):
    pass

@router.post("/pods", response_model=RunPodApiResponse)
async def create_pod_rest(body: CreatePodRestBody, rest: RunPodRestClient = Depends(get_runpod_rest_client)):
    return await rest.createPod(body)
