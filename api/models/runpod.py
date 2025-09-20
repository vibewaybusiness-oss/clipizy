"""
RunPod API Models - Python equivalent of TypeScript types
"""
from typing import Optional, List, Dict, Any, Union, Generic, TypeVar
from pydantic import BaseModel, Field
from datetime import datetime

T = TypeVar('T')


class RunPodUser(BaseModel):
    id: str
    email: str
    min_balance: float = Field(alias="minBalance")


class RunPodPod(BaseModel):
    id: str
    name: str
    image_name: str = Field(alias="imageName")
    uptime_seconds: int = Field(alias="uptimeSeconds", default=0)
    cost_per_hr: float = Field(alias="costPerHr", default=0.0)
    created_at: str = Field(alias="createdAt")
    status: Optional[str] = None
    desired_status: Optional[str] = Field(alias="desiredStatus", default=None)
    ip: Optional[str] = None
    public_ip: Optional[str] = Field(alias="publicIp", default=None)
    machine_id: Optional[str] = Field(alias="machineId", default=None)
    gpu_count: Optional[int] = Field(alias="gpuCount", default=None)
    memory_in_gb: Optional[float] = Field(alias="memoryInGb", default=None)
    vcpu_count: Optional[int] = Field(alias="vcpuCount", default=None)
    last_started_at: Optional[str] = Field(alias="lastStartedAt", default=None)
    port_mappings: Optional[Dict[str, int]] = Field(alias="portMappings", default=None)
    network_volume_id: Optional[str] = Field(alias="networkVolumeId", default=None)
    volume_in_gb: Optional[float] = Field(alias="volumeInGb", default=None)
    volume_mount_path: Optional[str] = Field(alias="volumeMountPath", default=None)


class RunPodApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None


class RestPodConfig(BaseModel):
    gpu_type_ids: List[str] = Field(alias="gpuTypeIds")
    image_name: str = Field(alias="imageName")
    name: str
    env: Optional[Dict[str, str]] = None
    container_disk_in_gb: int = Field(alias="containerDiskInGb")
    volume_in_gb: Optional[float] = Field(alias="volumeInGb", default=None)
    volume_mount_path: Optional[str] = Field(alias="volumeMountPath", default=None)
    network_volume_id: Optional[str] = Field(alias="networkVolumeId", default=None)
    gpu_count: Optional[int] = Field(alias="gpuCount", default=1)
    min_memory_in_gb: Optional[float] = Field(alias="minMemoryInGb", default=None)
    country_code: Optional[str] = Field(alias="countryCode", default=None)
    support_public_ip: Optional[bool] = Field(alias="supportPublicIp", default=None)
    min_vcpu_count: Optional[int] = Field(alias="minVcpuCount", default=None)
    ports: Optional[str] = None
    docker_args: Optional[str] = Field(alias="dockerArgs", default=None)


class NetworkVolume(BaseModel):
    id: str
    name: str
    size: float
    data_center_id: str = Field(alias="dataCenterId")


class GpuType(BaseModel):
    id: str
    display_name: str = Field(alias="displayName")
    memory_in_gb: float = Field(alias="memoryInGb")
    secure_cloud: bool = Field(alias="secureCloud")
    community_cloud: bool = Field(alias="communityCloud")
    lowest_price: Optional[float] = Field(alias="lowestPrice", default=None)


class CloudType(BaseModel):
    id: str
    name: str


class WorkflowInput(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = Field(alias="negativePrompt", default="")
    width: int = 1328
    height: int = 1328
    seed: int = -1
    steps: int = 4
    cfg: Optional[float] = Field(default=1.0)
    sampler: Optional[str] = Field(default="euler")
    scheduler: Optional[str] = Field(default="simple")


class WorkflowResult(BaseModel):
    success: bool
    files: Optional[List[str]] = None
    images: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
    request_id: Optional[str] = Field(alias="requestId", default=None)
    pod_id: Optional[str] = Field(alias="podId", default=None)
    pod_ip: Optional[str] = Field(alias="podIp", default=None)
    prompt_id: Optional[str] = Field(alias="promptId", default=None)
    status: Optional[str] = None


class ComfyUIRequest(BaseModel):
    id: str
    workflow_name: str = Field(alias="workflowName")
    inputs: WorkflowInput
    status: str = "pending"  # pending, processing, completed, failed
    pod_id: Optional[str] = Field(alias="podId", default=None)
    pod_ip: Optional[str] = Field(alias="podIp", default=None)
    prompt_id: Optional[str] = Field(alias="promptId", default=None)
    created_at: datetime = Field(alias="createdAt", default_factory=datetime.now)
    updated_at: datetime = Field(alias="updatedAt", default_factory=datetime.now)
    completed_at: Optional[datetime] = Field(alias="completedAt", default=None)
    result: Optional[WorkflowResult] = None
    error: Optional[str] = None


class QueueStatus(BaseModel):
    active_pods: List[Dict[str, Any]] = Field(alias="activePods", default_factory=list)
    pending_requests: List[ComfyUIRequest] = Field(alias="pendingRequests", default_factory=list)
    completed_requests: List[ComfyUIRequest] = Field(alias="completedRequests", default_factory=list)
    failed_requests: List[ComfyUIRequest] = Field(alias="failedRequests", default_factory=list)
