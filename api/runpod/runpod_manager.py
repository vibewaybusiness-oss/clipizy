# queue_manager.py
# FastAPI-ready port of your TypeScript WorkflowQueueManager
# ----------------------------------------------------------
from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from pydantic import BaseModel, Field

# --- env + config ------------------------------------------------------------

CWD = Path(os.getcwd())
load_dotenv(CWD / ".env")
load_dotenv(CWD / ".env.local", override=True)

CONFIG_PATH = CWD / "config.json"
if not CONFIG_PATH.exists():
    raise RuntimeError(f"Missing config file at {CONFIG_PATH}")

with CONFIG_PATH.open("r", encoding="utf-8") as f:
    CONFIG: Dict[str, Any] = json.load(f)

# --- external deps: use runpod_core for all pod operations ---------------
from .runpod_core import PodManager, PodRecruitmentConfig, get_client

# --- types -------------------------------------------------------------------

StatusReq = Literal["pending", "processing", "completed", "failed"]
StatusPod = Literal["running", "paused", "terminated"]

@dataclass
class WorkflowRequest:
    id: str
    workflowName: str
    requestData: Any
    timestamp: int
    status: StatusReq
    podId: Optional[str] = None
    result: Optional[Any] = None
    error: Optional[str] = None


@dataclass
class ActivePod:
    id: str
    workflowName: str
    createdAt: int
    lastUsedAt: int
    pauseTimeoutAt: int
    terminateTimeoutAt: int
    status: StatusPod
    requestQueue: List[WorkflowRequest] = field(default_factory=list)
    pausedAt: Optional[int] = None


class QueueStatus(BaseModel):
    activePods: List[Dict[str, Any]]
    pendingRequests: Dict[str, List[Dict[str, Any]]]
    isRunning: bool


class AddWorkflowBody(BaseModel):
    workflowName: str = Field(..., description="Name of the workflow")
    requestData: Any = Field(..., description="Arbitrary request payload")


class MarkBody(BaseModel):
    result: Optional[Any] = None
    error: Optional[str] = None


# --- manager -----------------------------------------------------------------

class WorkflowQueueManager:
    def __init__(self) -> None:
        self.activePods: Dict[str, ActivePod] = {}
        self.pendingRequests: Dict[str, List[WorkflowRequest]] = {}
        self.isRunning: bool = False
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        self._pod_manager: Optional[PodManager] = None

        qs = CONFIG.get("queueSettings", {})
        self.check_interval_ms: int = int(qs.get("checkInterval", 2000))

        ps = CONFIG.get("podSettings", {})
        self.default_image = ps.get("defaultImage")
        self.default_gpu = ps.get("defaultGpuCount", 1)
        self.default_mem_gb = ps.get("defaultMemoryInGb", 8)
        self.default_vcpu = ps.get("defaultVcpuCount", 4)
        self.default_disk_gb = ps.get("defaultDiskInGb", 20)
        self.support_public_ip = bool(ps.get("supportPublicIp", True))
        self.default_ports = ps.get("defaultPorts", [])

    # --- pod manager ----------------------------------------------------------

    def _get_pod_manager(self) -> PodManager:
        if self._pod_manager is None:
            client = get_client()
            self._pod_manager = PodManager(client)
        return self._pod_manager

    # --- lifecycle ------------------------------------------------------------

    async def start(self) -> None:
        async with self._lock:
            if self.isRunning:
                return
            self.isRunning = True
            self._task = asyncio.create_task(self._loop(), name="workflow-queue-loop")

    async def stop(self) -> None:
        async with self._lock:
            if not self.isRunning:
                return
            self.isRunning = False

        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

        # pause all running pods
        pod_manager = self._get_pod_manager()
        for pod_id, pod in list(self.activePods.items()):
            if pod.status == "running":
                try:
                    await pod_manager.pause_pod(pod_id)
                except Exception:
                    pass

    async def cleanup(self) -> None:
        # terminate all pods
        pod_manager = self._get_pod_manager()
        for pod_id in list(self.activePods.keys()):
            try:
                await pod_manager.release_pod(pod_id)
            except Exception:
                pass
        self.activePods.clear()
        self.pendingRequests.clear()

    # --- public API -----------------------------------------------------------

    async def add_workflow_request(self, workflow_name: str, request_data: Any) -> str:
        import time, random, string

        workflow_name = workflow_name.lower()
        rid = f"req_{int(time.time()*1000)}_" + "".join(
            random.choices(string.ascii_lowercase + string.digits, k=9)
        )
        req = WorkflowRequest(
            id=rid,
            workflowName=workflow_name,
            requestData=request_data,
            timestamp=int(time.time() * 1000),
            status="pending",
        )
        async with self._lock:
            self.pendingRequests.setdefault(workflow_name, []).append(req)
        # nudge the loop without waiting for the next tick
        asyncio.create_task(self._process_queue_once())
        return rid

    def get_queue_status(self) -> QueueStatus:
        pending: Dict[str, List[Dict[str, Any]]] = {}
        for name, reqs in self.pendingRequests.items():
            pending[name] = [asdict(r) for r in reqs if r.status == "pending"]

        return QueueStatus(
            activePods=[asdict(p) for p in self.activePods.values()],
            pendingRequests=pending,
            isRunning=self.isRunning,
        )

    def get_pod_for_workflow(self, workflow_name: str) -> Optional[ActivePod]:
        return self._find_available_pod(workflow_name.lower())

    def get_pod_by_id(self, pod_id: str) -> Optional[ActivePod]:
        return self.activePods.get(pod_id)

    async def get_pod_with_ip(self, pod_id: str, max_attempts: int = 12) -> Dict[str, Any]:
        # Check if pod is already ready in our active pods
        pod = self.activePods.get(pod_id)
        if pod and pod.status == "running":
            # Pod is already ready, get connection info directly
            print(f"✅ Pod {pod_id} is already ready, getting connection info directly")
            return await self._get_pod_public_ip(pod_id)
        
        # Pod is not ready, wait for it
        print(f"⏳ Pod {pod_id} is not ready (status: {pod.status if pod else 'not found'}), waiting for it")
        return await self._wait_for_pod_with_ip(pod_id, max_attempts)

    def mark_request_completed(self, request_id: str, result: Any = None) -> bool:
        for pod in self.activePods.values():
            for req in pod.requestQueue:
                if req.id == request_id:
                    req.status = "completed"
                    req.result = result
                    return True
        return False

    def mark_request_failed(self, request_id: str, error: Optional[str] = None) -> bool:
        for pod in self.activePods.values():
            for req in pod.requestQueue:
                if req.id == request_id:
                    req.status = "failed"
                    req.error = error
                    return True
        return False

    # --- internal loop --------------------------------------------------------

    async def _loop(self) -> None:
        try:
            while self.isRunning:
                await self._process_queue_once()
                await asyncio.sleep(self.check_interval_ms / 1000.0)
        except asyncio.CancelledError:
            pass

    async def _process_queue_once(self) -> None:
        if not self.isRunning:
            return

        async with self._lock:
            workflow_items = list(self.pendingRequests.items())

        # process each workflow type
        for workflow_name, requests in workflow_items:
            if not requests:
                continue

            pod = self._find_available_pod(workflow_name)
            if not pod:
                # check if we can create more pods for this workflow
                current_pod_count = self._get_workflow_pod_count(workflow_name)
                max_pods = self._get_max_pods_per_workflow(workflow_name)
                
                if current_pod_count >= max_pods:
                    continue  # Skip if we've reached the limit
                
                # check if one exists/being created - use lock to prevent race conditions
                async with self._lock:
                    creating = next(
                        (p for p in self.activePods.values() if p.workflowName == workflow_name),
                        None,
                    )
                    if creating:
                        continue
                    # Create pod while holding the lock to prevent multiple creations
                    pod = await self._create_pod_for_workflow(workflow_name)

            if pod:
                await self._process_pod_requests(pod)

        await self._check_pod_timeouts()

    # --- helpers --------------------------------------------------------------

    def _find_available_pod(self, workflow_name: str) -> Optional[ActivePod]:
        for pod in self.activePods.values():
            if (
                pod.workflowName == workflow_name
                and pod.status == "running"  # Only return fully ready pods
                and len(pod.requestQueue) < 3  # max 3 concurrent requests
            ):
                return pod
        return None

    def _get_workflow_pod_count(self, workflow_name: str) -> int:
        """Get the number of active pods for a specific workflow"""
        return sum(1 for pod in self.activePods.values() if pod.workflowName == workflow_name)

    def _get_max_pods_per_workflow(self, workflow_name: str) -> int:
        """Get the maximum number of pods allowed per workflow"""
        wf = CONFIG.get("workflow", {})
        wfc = wf.get(workflow_name, wf.get("default", {}))
        return int(wfc.get("maxPods", 1))  # Default to 1 pod per workflow

    def _get_workflow_timeouts(self, workflow_name: str) -> Tuple[int, int]:
        wf = CONFIG.get("workflow", {})
        wfc = wf.get(workflow_name, wf.get("default", {}))
        to = wfc.get("timeouts", {})
        return int(to.get("pause", 60)), int(to.get("terminate", 300))

    def _get_workflow_network_volume(self, workflow_name: str) -> Optional[str]:
        wf = CONFIG.get("workflow", {})
        wfc = wf.get(workflow_name, wf.get("default", {}))
        return wfc.get("network-volume")
    
    def _get_workflow_template(self, workflow_name: str) -> Optional[str]:
        """Get the template ID for a specific workflow"""
        wf = CONFIG.get("workflow", {})
        wfc = wf.get(workflow_name, wf.get("default", {}))
        return wfc.get("template")

    async def _check_network_volume_availability(self) -> bool:
        try:
            from .client import get_runpod_rest_client
            client = get_runpod_rest_client()
            res = await client.getNetworkVolumes()
            return bool(res.success and res.data)
        except Exception:
            return False

    async def _create_pod_for_workflow(self, workflow_name: str) -> Optional[ActivePod]:
        import time

        pod_manager = self._get_pod_manager()
        
        # Get workflow-specific template
        template_id = self._get_workflow_template(workflow_name)
        if template_id:
            print(f"🎯 Using template {template_id} for workflow {workflow_name}")
        else:
            print(f"⚠️ No template configured for workflow {workflow_name}, using default settings")
        
        # Create pod recruitment config
        pod_config = PodRecruitmentConfig(
            name=f"{workflow_name}-pod-{int(time.time()*1000)}",
            imageName=self.default_image,
            cloudType="SECURE",
            networkVolumeId=self._get_workflow_network_volume(workflow_name),
            maxRetries=2,
            retryDelay=3000,
            gpuCount=self.default_gpu,
            minMemoryInGb=self.default_mem_gb,
            countryCode="SE",
            supportPublicIp=self.support_public_ip,
            containerDiskInGb=self.default_disk_gb,
            minVcpuCount=self.default_vcpu,
            ports=",".join(self.default_ports) if isinstance(self.default_ports, list) else self.default_ports,
            templateId=template_id,
            workflowName=workflow_name
        )

        # Use PodManager to recruit the pod
        result = await pod_manager.recruit_pod(pod_config)
        if result.success and result.pod:
            now = int(time.time() * 1000)
            pause_s, term_s = self._get_workflow_timeouts(workflow_name)
            active = ActivePod(
                id=result.pod["id"],
                workflowName=workflow_name,
                createdAt=now,
                lastUsedAt=now,
                pauseTimeoutAt=now + pause_s * 1000,
                terminateTimeoutAt=now + term_s * 1000,
                status="running",  # Pod is already ready from recruit_pod
            )
            self.activePods[active.id] = active
            print(f"✅ Pod {active.id} is ready and available for {workflow_name}")
            
            return active
        return None

    async def _process_pod_requests(self, pod: ActivePod) -> None:
        import time

        # Only process pods that are fully ready
        if pod.status != "running":
            print(f"❌ Pod {pod.id} is not fully ready, status: {pod.status}")
            return

        # move up to 3 - current queued
        capacity = 3 - len(pod.requestQueue)
        if capacity <= 0:
            print(f"❌ Pod {pod.id} has no capacity for {pod.workflowName}")
            return

        async with self._lock:
            pending = self.pendingRequests.get(pod.workflowName, [])
            to_process = pending[:capacity]
            self.pendingRequests[pod.workflowName] = pending[capacity:]

        print(f"🔍 Pod {pod.id}: Pending requests: {[req.id for req in pending]}")
        print(f"🔍 Pod {pod.id}: To process: {[req.id for req in to_process]}")
        print(f"🔍 Pod {pod.id}: Pending requests after processing: {[req.id for req in self.pendingRequests.get(pod.workflowName, [])]}")

        if not to_process:
            print(f"❌ Pod {pod.id} has no pending requests to process")
            return

        # mark + assign
        for req in to_process:
            req.status = "processing"
            req.podId = pod.id
        pod.requestQueue.extend(to_process)

        # Requests are now assigned to the pod and ready for processing
        print(f"✅ Assigned {len(to_process)} requests to pod {pod.id}")

        # update timers
        now = int(time.time() * 1000)
        pod.lastUsedAt = now
        pause_s, term_s = self._get_workflow_timeouts(pod.workflowName)
        pod.pauseTimeoutAt = now + pause_s * 1000
        pod.terminateTimeoutAt = now + term_s * 1000

        # resume if paused
        if pod.status == "paused":
            try:
                pod_manager = self._get_pod_manager()
                r = await pod_manager.resume_pod(pod.id)
                if r.success:
                    pod.status = "running"
                    pod.pausedAt = None
                else:
                    print(f"❌ Failed to resume pod {pod.id} for {pod.workflowName}")
                    return
            except Exception:
                print(f"❌ Failed to resume pod {pod.id} for {pod.workflowName}")
                return

    async def _wait_for_pod_with_ip(self, pod_id: str, max_attempts: int = 12) -> Dict[str, Any]:
        pod_manager = self._get_pod_manager()
        return await pod_manager.wait_for_pod_ready(pod_id, max_attempts)


    async def _get_pod_public_ip(self, pod_id: str) -> Dict[str, Any]:
        pod_manager = self._get_pod_manager()
        result = await pod_manager.get_pod_connection_info(pod_id)
        if result.get("success") and result.get("podInfo"):
            return {
                "success": True,
                "pod": {
                    "ip": result["podInfo"].get("ip", ""),
                    "port": result["podInfo"].get("port", 11434),
                    "status": result["podInfo"].get("status", ""),
                    "ready": result["podInfo"].get("ready", False)
                }
            }
        return result

    async def _check_pod_timeouts(self) -> None:
        import time

        pod_manager = self._get_pod_manager()
        now = int(time.time() * 1000)
        for pod_id, pod in list(self.activePods.items()):
            if pod.status == "running" and len(pod.requestQueue) == 0 and now > pod.pauseTimeoutAt:
                # pause
                pod.status = "paused"
                pod.pausedAt = now
                try:
                    await pod_manager.pause_pod(pod_id)
                except Exception:
                    pass
            elif pod.status == "paused" and pod.pausedAt and now > pod.terminateTimeoutAt:
                # terminate
                pod.status = "terminated"
                try:
                    await pod_manager.release_pod(pod_id)
                except Exception:
                    pass
                self.activePods.pop(pod_id, None)


# --- singleton accessor -------------------------------------------------------

_manager_instance: Optional[WorkflowQueueManager] = None

def get_queue_manager() -> WorkflowQueueManager:
    global _manager_instance
    if _manager_instance is None:
        _manager_instance = WorkflowQueueManager()
    return _manager_instance


# --- FastAPI router -----------------------------------------------------------

router = APIRouter(prefix="/queue", tags=["queue"])

@router.post("/start")
async def start_queue():
    mgr = get_queue_manager()
    await mgr.start()
    return {"ok": True}

@router.post("/stop")
async def stop_queue():
    mgr = get_queue_manager()
    await mgr.stop()
    return {"ok": True}

@router.post("/request")
async def add_request(body: AddWorkflowBody):
    mgr = get_queue_manager()
    rid = await mgr.add_workflow_request(body.workflowName, body.requestData)
    return {"ok": True, "requestId": rid}

@router.get("/status", response_model=QueueStatus)
async def status():
    return get_queue_manager().get_queue_status()

@router.get("/pods/{pod_id}")
async def get_pod(pod_id: str):
    pod = get_queue_manager().get_pod_by_id(pod_id)
    if not pod:
        raise HTTPException(404, "Pod not found")
    return asdict(pod)

@router.get("/pods/{pod_id}/ip")
async def wait_for_ip(pod_id: str, max_attempts: int = 12):
    res = await get_queue_manager().get_pod_with_ip(pod_id, max_attempts=max_attempts)
    if not res.get("success"):
        raise HTTPException(400, res.get("error", "Failed"))
    return res

@router.post("/requests/{request_id}/complete")
async def mark_complete(request_id: str, body: MarkBody):
    ok = get_queue_manager().mark_request_completed(request_id, result=body.result)
    if not ok:
        raise HTTPException(404, "Request not found")
    return {"ok": True}

@router.post("/requests/{request_id}/fail")
async def mark_fail(request_id: str, body: MarkBody):
    ok = get_queue_manager().mark_request_failed(request_id, error=body.error)
    if not ok:
        raise HTTPException(404, "Request not found")
    return {"ok": True}

@router.post("/cleanup")
async def cleanup():
    await get_queue_manager().cleanup()
    return {"ok": True}

# Optional: mount directly if you want a self-contained app file.
def create_app() -> FastAPI:
    app = FastAPI(title="Workflow Queue Manager")
    app.include_router(router)
    return app

app = create_app()
