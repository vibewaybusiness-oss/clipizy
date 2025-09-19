# pod_management.py
# FastAPI port of your TS "PodManager" with equivalent behavior.
# - Loads .env and .env.local
# - Provides a PodManager service with the same methods
# - Exposes a FastAPI app with matching endpoints

import os
import json
import time
import logging
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Protocol
try:
    from typing import TypedDict
except ImportError:
    from typing_extensions import TypedDict

from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import asyncio

# --------------------------------------------------------------------
# Environment
# --------------------------------------------------------------------
CWD = Path.cwd()
load_dotenv(dotenv_path=CWD / ".env")
load_dotenv(dotenv_path=CWD / ".env.local")

# --------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------
logger = logging.getLogger("pod_management")
handler = logging.StreamHandler()
formatter = logging.Formatter("[%(asctime)s] %(levelname)s %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# --------------------------------------------------------------------
# RunPod client protocol (plug your real client here)
# --------------------------------------------------------------------
class ApiResponse(TypedDict, total=False):
    success: bool
    data: Any
    error: str

class RunPodPod:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', '')
        self.status = kwargs.get('status', '')
        self.desiredStatus = kwargs.get('desiredStatus')
        self.publicIp = kwargs.get('publicIp')
        self.ip = kwargs.get('ip')
        self.portMappings = kwargs.get('portMappings', {})
        self.lastStartedAt = kwargs.get('lastStartedAt')

class NetworkVolume:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', '')
        self.name = kwargs.get('name', '')
        self.size = kwargs.get('size', 0)
        self.dataCenterId = kwargs.get('dataCenterId')

class RunPodRestClient(Protocol):
    async def create_pod(self, pod_config: Dict[str, Any]) -> ApiResponse: ...
    async def pause_pod(self, pod_id: str) -> ApiResponse: ...
    async def start_pod(self, pod_id: str) -> ApiResponse: ...
    async def terminate_pod(self, pod_id: str) -> ApiResponse: ...
    async def get_pod_by_id(self, pod_id: str) -> ApiResponse: ...
    async def update_pod(self, pod_id: str, patch: Dict[str, Any]) -> ApiResponse: ...
    async def get_gpu_types(self) -> ApiResponse: ...
    async def get_network_volumes(self) -> ApiResponse: ...
    async def get_network_volume_by_id(self, vol_id: str) -> ApiResponse: ...

# Placeholder "not implemented" client so the module imports cleanly.
# Replace with your real client (e.g., one backed by httpx/requests).
class NotImplementedRunPodClient:
    async def _nyi(self, *_, **__):
        return {"success": False, "error": "RunPod client not wired. Implement RunPodRestClient methods."}
    create_pod = _nyi
    pause_pod = _nyi
    start_pod = _nyi
    terminate_pod = _nyi
    get_pod_by_id = _nyi
    update_pod = _nyi
    get_gpu_types = _nyi
    get_network_volumes = _nyi
    get_network_volume_by_id = _nyi

# DI hook - use the existing FastAPI RunPod client
def get_client() -> RunPodRestClient:
    from client import get_runpod_rest_client
    return get_runpod_rest_client()

# --------------------------------------------------------------------
# Models (Pydantic) — mirrors your TS interfaces
# --------------------------------------------------------------------
CloudType = Literal["SECURE", "COMMUNITY", "ALL"]

class PodRecruitmentConfig(BaseModel):
    name: str
    imageName: str = Field(alias="imageName")
    cloudType: Optional[CloudType] = "ALL"
    networkVolumeId: Optional[str] = None
    maxRetries: Optional[int] = 3
    retryDelay: Optional[int] = 5000  # ms
    gpuCount: Optional[int] = 1
    minMemoryInGb: Optional[int] = None
    countryCode: Optional[str] = None
    supportPublicIp: Optional[bool] = True
    containerDiskInGb: Optional[int] = 20
    minVcpuCount: Optional[int] = None
    ports: Optional[str] = "22,8080,8188,8888,11434"
    dockerArgs: Optional[str] = None
    templateId: Optional[str] = None
    workflowName: Optional[str] = None

class PodRecruitmentResult(BaseModel):
    success: bool
    pod: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    gpuType: Optional[str] = None
    attempts: Optional[int] = None

class BasicResult(BaseModel):
    success: bool
    error: Optional[str] = None

class PodConnectionInfo(BaseModel):
    id: str
    ip: str
    port: int
    status: str
    ready: bool

# --------------------------------------------------------------------
# GPU priority (kept same order/intent)
# --------------------------------------------------------------------
GPU_PRIORITY_LIST: List[str] = [
    "NVIDIA A40",
    "NVIDIA GeForce RTX 4090",
    "NVIDIA GeForce RTX 5090",
    "NVIDIA GeForce RTX 3090",
]

COMMUNITY_GPU_PRIORITY_LIST: List[str] = [
    "NVIDIA GeForce RTX 3090",
    "NVIDIA GeForce RTX 3080",
    "NVIDIA GeForce RTX 3070",
    "NVIDIA A40",
    "NVIDIA GeForce RTX 4090",
]

# --------------------------------------------------------------------
# Pod Manager (logic ported from TS)
# --------------------------------------------------------------------
class PodManager:
    def __init__(self, client: RunPodRestClient):
        self.client = client

    async def recruit_pod(self, config: PodRecruitmentConfig) -> PodRecruitmentResult:
        max_retries = config.maxRetries or 3
        retry_delay_ms = config.retryDelay or 5000
        attempts = 0

        logger.info(f"🎯 Starting pod recruitment for: {config.name}")
        if config.templateId:
            logger.info(f"📋 Using template ID: {config.templateId}")

        gpu_list = COMMUNITY_GPU_PRIORITY_LIST if config.cloudType == "COMMUNITY" else GPU_PRIORITY_LIST
        logger.info(f"📋 GPU Priority: {' > '.join(gpu_list)}")
        logger.info(f"☁️ Cloud Type: {config.cloudType or 'ALL'}")

        for gpu_type in gpu_list:
            attempts += 1
            logger.info(f"\n🔄 Attempt {attempts}/{max_retries}: Trying GPU {gpu_type}")

            try:
                result = await self._create_pod_with_gpu(config, gpu_type, config.workflowName)
                if result.success and result.data:
                    pod: Dict[str, Any] = result.data
                    logger.info(f"✅ Successfully recruited pod with {gpu_type}")
                    logger.info(f"🆔 Pod ID: {pod.get('id')}")
                    logger.info(f"📊 Status: {pod.get('status')}")

                    logger.info("\n⏳ Waiting for pod to be fully loaded...")
                    wait = await self.wait_for_pod_ready(pod["id"])
                    if wait["success"]:
                        logger.info("🎉 Pod is ready for use!")
                    else:
                        logger.info(f"⚠️ Pod recruited but not ready: {wait.get('error')}")

                    return PodRecruitmentResult(
                        success=True, pod=pod, gpuType=gpu_type, attempts=attempts
                    )
                else:
                    logger.info(f"❌ Failed to recruit with {gpu_type}: {result.error}")
                    if attempts < max_retries:
                        logger.info(f"⏳ Waiting {retry_delay_ms}ms before next attempt...")
                        await asyncio.sleep(retry_delay_ms / 1000.0)
            except Exception as e:
                logger.info(f"❌ Error recruiting with {gpu_type}: {e}")
                if attempts < max_retries:
                    logger.info(f"⏳ Waiting {retry_delay_ms}ms before next attempt...")
                    await asyncio.sleep(retry_delay_ms / 1000.0)

        return PodRecruitmentResult(
            success=False,
            error=f"Failed to recruit pod after {attempts} attempts with all GPU types",
            attempts=attempts,
        )

    async def _create_pod_with_gpu(
        self, config: PodRecruitmentConfig, gpu_type: str, workflow_name: Optional[str]
    ) -> ApiResponse:
        selected_network_volume = await self.select_network_volume(config, workflow_name)

        ports = []
        for token in (config.ports or "22,8080,8188,8888,11434").split(","):
            p = token.strip()
            if p == "22":
                ports.append("22/tcp")
            elif p == "8080":
                ports.append("8080/http")
            elif p == "8188":
                ports.append("8188/http")
            elif p == "8888":
                ports.append("8888/http")
            elif p == "11434":
                ports.append("11434/tcp")
            else:
                ports.append(f"{p}/tcp")

        pod_config: Dict[str, Any] = {
            "name": config.name,
            "imageName": config.imageName,
            "gpuTypeIds": [gpu_type],
            "containerDiskInGb": config.containerDiskInGb or 20,
            "cloudType": "SECURE",
            "computeType": "GPU",
            "gpuCount": 1,
            "vcpuCount": 4,
            "supportPublicIp": True,
            "ports": ports,
            "env": {
                "JUPYTER_PASSWORD": os.getenv("JUPYTER_PASSWORD", "secure-password-123"),
                "OLLAMA_HOST": "0.0.0.0:11434",
            },
            "templateId": config.templateId,
            "dataCenterPriority": "availability",
            "gpuTypePriority": "availability",
            "cpuFlavorPriority": "availability",
            "minRAMPerGPU": 8,
            "minVCPUPerGPU": 2,
            "interruptible": False,
            "locked": False,
            "globalNetworking": True,
        }

        if selected_network_volume:
            pod_config["networkVolumeId"] = selected_network_volume
            pod_config["volumeMountPath"] = "/workspace"
            pod_config["volumeInGb"] = 0
            logger.info(f"🔗 Attaching network volume {selected_network_volume} to pod at /workspace")
            logger.info("🌐 Using network volume - local volume set to 0GB")
        else:
            pod_config["volumeInGb"] = 20
            pod_config["volumeMountPath"] = "/workspace"
            logger.info("📁 Using local volume (20GB) at /workspace")
            logger.info("⚠️ No network volume selected - pod will be created without network volume")

        # Convert dict to RestPodConfig object
        from client import RestPodConfig
        
        # Only include optional fields if they have values
        config_data = {
            "gpuTypeIds": [gpu_type],
            "imageName": config.imageName,
            "name": config.name,
            "env": pod_config.get("env", {}),
            "containerDiskInGb": pod_config.get("containerDiskInGb", 20),
            "ports": ports,
        }
        
        # Add optional fields only if they have values
        if pod_config.get("volumeInGb"):
            config_data["volumeInGb"] = pod_config.get("volumeInGb")
        if pod_config.get("volumeMountPath"):
            config_data["volumeMountPath"] = pod_config.get("volumeMountPath")
        if pod_config.get("networkVolumeId"):
            config_data["networkVolumeId"] = pod_config.get("networkVolumeId")
        if config.templateId:
            config_data["templateId"] = config.templateId
            
        rest_config = RestPodConfig(**config_data)
        return await self.client.createPod(rest_config)

    async def pause_pod(self, pod_id: str) -> BasicResult:
        logger.info(f"⏸️ Pausing pod: {pod_id}")
        try:
            res = await self.client.pausePod(pod_id)
            if res.success:
                logger.info(f"✅ Successfully paused pod: {pod_id}")
                return BasicResult(success=True)
            logger.info(f"❌ Failed to pause pod: {res.error}")
            return BasicResult(success=False, error=f"Failed to pause pod: {res.error}")
        except Exception as e:
            logger.info(f"❌ Error pausing pod: {e}")
            return BasicResult(success=False, error=f"Error pausing pod: {e}")

    async def resume_pod(self, pod_id: str) -> BasicResult:
        logger.info(f"▶️ Resuming pod: {pod_id}")
        try:
            res = await self.client.startPod(pod_id)
            if res.success:
                logger.info(f"✅ Successfully resumed pod: {pod_id}")
                return BasicResult(success=True)
            logger.info(f"❌ Failed to resume pod: {res.error}")
            return BasicResult(success=False, error=f"Failed to resume pod: {res.error}")
        except Exception as e:
            logger.info(f"❌ Error resuming pod: {e}")
            return BasicResult(success=False, error=f"Error resuming pod: {e}")

    async def release_pod(self, pod_id: str) -> BasicResult:
        logger.info(f"🗑️ Terminating pod: {pod_id}")
        try:
            wait = await self._wait_for_pod_active(pod_id)
            if not wait["success"]:
                logger.info(f"⚠️ Pod {pod_id} not active, attempting termination anyway: {wait.get('error')}")
            res = await self.client.terminatePod(pod_id)
            if res.success:
                logger.info(f"✅ Successfully terminated pod: {pod_id}")
                return BasicResult(success=True)
            logger.info(f"❌ Failed to terminate pod: {res.error}")
            return BasicResult(success=False, error=f"Failed to terminate pod: {res.error}")
        except Exception as e:
            logger.info(f"❌ Error terminating pod: {e}")
            return BasicResult(success=False, error=f"Error terminating pod: {e}")

    async def wait_for_pod_ready(
        self, pod_id: str, max_attempts: int = 12
    ) -> Dict[str, Any]:
        logger.info(f"⏳ Waiting for pod {pod_id} to be fully loaded and ready...")
        for attempt in range(1, max_attempts + 1):
            try:
                pod_status = await self.get_pod_status(pod_id)
                if pod_status.success and pod_status.data:
                    pod = pod_status.data  # This is a RunPodPod object
                    status = pod.desiredStatus or pod.status
                    last_started_at = pod.lastStartedAt
                    if last_started_at:
                        try:
                            # ISO timestamp → uptime seconds
                            started = time.strptime(last_started_at[:19], "%Y-%m-%dT%H:%M:%S")
                            # We don't have tz; fallback to "recent enough" check below
                            # Simplify: if present, consider uptime > 10s by attempt count heuristic
                            pass
                        except Exception:
                            pass

                    # readiness checks
                    has_public_ip = bool(pod.publicIp)
                    has_ports = bool(pod.portMappings) and len(pod.portMappings) > 0

                    logger.info(
                        f"📊 Pod status (attempt {attempt}/{max_attempts}): "
                        f"{status} (IP: {'Yes' if has_public_ip else 'No'}, Ports: {'Yes' if has_ports else 'No'})"
                    )

                    if status == "RUNNING":
                        # TS code used 10s uptime + IP + ports; we mimic with attempts * 5s >= 10s
                        uptime_ready = (attempt * 5) >= 10
                        # If we have IP and ports, we can proceed even without full uptime
                        if (uptime_ready and has_public_ip and has_ports) or (has_public_ip and has_ports and attempt >= 3):
                            logger.info(f"✅ Pod {pod_id} is fully loaded and ready")
                            try:
                                logger.info("🔧 Automatically exposing port 8188 for ComfyUI...")
                                await self.expose_comfyui_port(pod_id)
                                logger.info("✅ Port 8188 exposed successfully for ComfyUI")
                            except Exception as e:
                                logger.info(f"⚠️ Failed to expose port 8188: {e}")

                            pod_info = PodConnectionInfo(
                                id=pod_id,
                                ip=pod.publicIp or pod.ip or "",
                                port=11434,
                                status=status or "",
                                ready=True,
                            )
                            return {"success": True, "finalStatus": status, "podInfo": pod_info.dict()}
                        else:
                            reason = "Pod is running but not fully ready:"
                            if not uptime_ready:
                                reason += " uptime < 10s"
                            if not has_public_ip:
                                reason += " no public IP"
                            if not has_ports:
                                reason += " no port mappings"
                            logger.info(f"⏳ {reason}")
                    elif status in {"FAILED", "TERMINATED", "EXITED"}:
                        return {"success": False, "error": f"Pod failed to start - status: {status}", "finalStatus": status}
                    elif status in {"STOPPED", "PAUSED"}:
                        logger.info(f"⏸️ Pod is {status}, waiting for it to start...")
                else:
                    logger.info(f"❌ Failed to get pod status (attempt {attempt}): {pod_status.error}")
                await asyncio.sleep(5)
            except Exception as e:
                logger.info(f"❌ Error checking pod status (attempt {attempt}): {e}")
                await asyncio.sleep(5)

        return {"success": False, "error": f"Pod did not become ready within {max_attempts * 5} seconds", "finalStatus": "TIMEOUT"}

    async def _wait_for_pod_active(self, pod_id: str, max_attempts: int = 12) -> Dict[str, Any]:
        logger.info(f"⏳ Waiting for pod {pod_id} to be active before termination...")
        for attempt in range(1, max_attempts + 1):
            try:
                pod_status = await self.get_pod_status(pod_id)
                if pod_status.success and pod_status.data:
                    pod = pod_status.data  # This is a RunPodPod object
                    status = pod.desiredStatus or pod.status
                    logger.info(f"📊 Pod status (attempt {attempt}/{max_attempts}): {status}")
                    if status == "RUNNING":
                        logger.info(f"✅ Pod {pod_id} is active and ready for termination")
                        return {"success": True}
                    elif status in {"FAILED", "TERMINATED", "EXITED"}:
                        return {"success": False, "error": f"Pod is already in {status} state"}
                await asyncio.sleep(5)
            except Exception as e:
                logger.info(f"❌ Error checking pod status (attempt {attempt}): {e}")
                await asyncio.sleep(2)

        return {"success": False, "error": f"Pod did not become active within {max_attempts * 5} seconds"}

    async def get_pod_status(self, pod_id: str) -> ApiResponse:
        return await self.client.getPodById(pod_id)

    async def list_available_gpus(self) -> ApiResponse:
        return await self.client.getGpuTypes()

    async def get_gpu_priority_list(self) -> List[str]:
        return list(GPU_PRIORITY_LIST)

    async def get_available_network_volumes(self) -> ApiResponse:
        logger.info("🔍 Checking available network volumes...")
        return await self.client.getNetworkVolumes()

    async def get_pod_connection_info(self, pod_id: str) -> Dict[str, Any]:
        try:
            # Get pod status directly instead of doing another readiness check
            pod_status = await self.get_pod_status(pod_id)
            if pod_status.success and pod_status.data:
                pod = pod_status.data
                status = pod.desiredStatus or pod.status
                if status == "RUNNING" and pod.publicIp:
                    return {
                        "success": True, 
                        "podInfo": {
                            "id": pod.id,
                            "ip": pod.publicIp or pod.ip or "",
                            "port": "8188",  # ComfyUI port
                            "status": status,
                            "ready": True
                        }
                    }
            return {"success": False, "error": "Pod not ready or no IP available"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def expose_comfyui_port(self, pod_id: str) -> None:
        try:
            pod_res = await self.client.getPodById(pod_id)
            if not pod_res.success or not pod_res.data:
                raise RuntimeError("Failed to get pod configuration")

            current_ports = pod_res.data.portMappings or {}
            ports_array: List[str] = []
            for port in current_ports.keys():
                if port == "22":
                    ports_array.append("22/tcp")
                elif port == "8888":
                    ports_array.append("8888/http")
                else:
                    ports_array.append(f"{port}/tcp")

            if "8188/http" not in ports_array:
                ports_array.append("8188/http")
                update_res = await self.client.updatePod(pod_id, {"ports": ports_array})
                if not update_res.success:
                    raise RuntimeError("Failed to update pod configuration")
                logger.info(f"✅ Port 8188 added to pod {pod_id} configuration")
            else:
                logger.info(f"ℹ️ Port 8188 already exposed on pod {pod_id}")
        except Exception as e:
            logger.error(f"❌ Failed to expose port 8188 on pod {pod_id}: {e}")
            raise

    async def select_network_volume(
        self, config: PodRecruitmentConfig, workflow_name: Optional[str]
    ) -> Optional[str]:
        logger.info("🎯 Selecting network volume for pod creation...")

        if config.networkVolumeId:
            logger.info(f"✅ Using explicitly provided network volume: {config.networkVolumeId}")
            return config.networkVolumeId

        # 2) Look into config.json similar to TS
        config_path = Path.cwd() / "config.json"
        default_volume: Optional[str] = None

        if config_path.exists():
            try:
                cfg_json = json.loads(config_path.read_text(encoding="utf-8"))
                if workflow_name and cfg_json.get("workflow", {}).get(workflow_name, {}).get("network-volume"):
                    default_volume = cfg_json["workflow"][workflow_name]["network-volume"]
                    logger.info(f"📋 Using workflow-specific network volume from config: {default_volume}")
                elif cfg_json.get("podSettings", {}).get("networkVolumeId"):
                    default_volume = cfg_json["podSettings"]["networkVolumeId"]
                    logger.info(f"📋 Using default network volume from config: {default_volume}")
            except Exception as e:
                logger.info(f"⚠️ Failed to read config.json: {e}")

        if default_volume:
            vol_res = await self.client.getNetworkVolumeById(default_volume)
            if vol_res.success and vol_res.data:
                vol = vol_res.data
                logger.info(f"✅ Verified default network volume: {vol.get('name')} ({vol.get('id')})")
                return default_volume
            else:
                logger.info(f"⚠️ Default network volume {default_volume} not found, searching for alternatives...")

        # 4) List and pick the first
        logger.info("🔍 Searching for available network volumes...")
        vols = await self.client.getNetworkVolumes()
        if vols.success and vols.data:
            available: List[NetworkVolume] = vols.data
            logger.info(f"📊 Found {len(available)} available network volumes:")
            for i, v in enumerate(available, start=1):
                logger.info(f"   {i}. {v.get('name')} ({v.get('id')}) - {v.get('size')}GB - {v.get('dataCenterId')}")
            selected = available[0]
            logger.info(f"✅ Selected network volume: {selected.get('name')} ({selected.get('id')})")
            return selected.get("id")
        else:
            logger.info("❌ No network volumes available")
            return None

# --------------------------------------------------------------------
# FastAPI app + routes
# --------------------------------------------------------------------
app = FastAPI(title="Pod Management API", version="1.0.0")

def get_manager(client: RunPodRestClient = Depends(get_client)) -> PodManager:
    return PodManager(client)

@app.post("/pods/recruit", response_model=PodRecruitmentResult)
async def recruit_pod_endpoint(cfg: PodRecruitmentConfig, mgr: PodManager = Depends(get_manager)):
    return await mgr.recruit_pod(cfg)

@app.post("/pods/{pod_id}/pause", response_model=BasicResult)
async def pause_pod_endpoint(pod_id: str, mgr: PodManager = Depends(get_manager)):
    return await mgr.pause_pod(pod_id)

@app.post("/pods/{pod_id}/resume", response_model=BasicResult)
async def resume_pod_endpoint(pod_id: str, mgr: PodManager = Depends(get_manager)):
    return await mgr.resume_pod(pod_id)

@app.delete("/pods/{pod_id}", response_model=BasicResult)
async def release_pod_endpoint(pod_id: str, mgr: PodManager = Depends(get_manager)):
    return await mgr.release_pod(pod_id)

@app.get("/pods/{pod_id}/status")
async def get_status_endpoint(pod_id: str, mgr: PodManager = Depends(get_manager)):
    return await mgr.get_pod_status(pod_id)

@app.get("/gpus")
async def list_gpus_endpoint(mgr: PodManager = Depends(get_manager)):
    return await mgr.list_available_gpus()

@app.get("/gpus/priority", response_model=List[str])
async def gpu_priority_endpoint(mgr: PodManager = Depends(get_manager)):
    return await mgr.get_gpu_priority_list()

@app.get("/network-volumes")
async def list_network_volumes_endpoint(mgr: PodManager = Depends(get_manager)):
    return await mgr.get_available_network_volumes()

@app.get("/pods/{pod_id}/connection")
async def pod_connection_info_endpoint(pod_id: str, mgr: PodManager = Depends(get_manager)):
    return await mgr.get_pod_connection_info(pod_id)

@app.post("/pods/{pod_id}/expose-comfyui", response_model=BasicResult)
async def expose_comfyui_endpoint(pod_id: str, mgr: PodManager = Depends(get_manager)):
    try:
        await mgr.expose_comfyui_port(pod_id)
        return BasicResult(success=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Convenience root
@app.get("/")
def root():
    return {"ok": True, "service": "Pod Management API"}
