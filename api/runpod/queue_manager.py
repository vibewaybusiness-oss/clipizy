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

# --- external deps: adapt these imports to your project ----------------------
# Expect these async helpers to exist in your codebase.
# They should mirror your Node functions' behavior.
#
# recruitPod(pod_config) -> dict {success: bool, pod?: {id: str}, error?: str}
# pausePod(pod_id) -> dict {success: bool, error?: str}
# resumePod(pod_id) -> dict {success: bool, error?: str}
# releasePod(pod_id) -> dict {success: bool, error?: str}
# getPodStatus(pod_id) -> dict {success: bool, data?: {...}, error?: str}
# getRunpodGraphQLClient() -> object with:
#   - getPodById(pod_id) -> {success: bool, data?: {...}, error?: str}
#   - getNetworkVolumes() -> {success: bool, data?: [ {...} ], error?: str}

from client import get_runpod_graphql_client, get_runpod_rest_client

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
        self._client = None

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

    # --- client ---------------------------------------------------------------

    def _get_client(self):
        if self._client is None:
            self._client = get_runpod_graphql_client()
        return self._client

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
        for pod_id, pod in list(self.activePods.items()):
            if pod.status == "running":
                try:
                    client = get_runpod_rest_client()
                    await client.pause_pod(pod_id)
                except Exception:
                    pass

    async def cleanup(self) -> None:
        # terminate all pods
        for pod_id in list(self.activePods.keys()):
            try:
                client = get_runpod_rest_client()
                await client.terminate_pod(pod_id)
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
                # check if one exists/being created
                creating = next(
                    (p for p in self.activePods.values() if p.workflowName == workflow_name),
                    None,
                )
                if creating:
                    continue
                pod = await self._create_pod_for_workflow(workflow_name)

            if pod:
                await self._process_pod_requests(pod)

        await self._check_pod_timeouts()

    # --- helpers --------------------------------------------------------------

    def _find_available_pod(self, workflow_name: str) -> Optional[ActivePod]:
        for pod in self.activePods.values():
            if (
                pod.workflowName == workflow_name
                and pod.status in ("running", "paused")
                and len(pod.requestQueue) < 3  # max 3 concurrent requests
            ):
                return pod
        return None

    def _get_workflow_timeouts(self, workflow_name: str) -> Tuple[int, int]:
        wf = CONFIG.get("workflow", {})
        wfc = wf.get(workflow_name, wf.get("default", {}))
        to = wfc.get("timeouts", {})
        return int(to.get("pause", 60)), int(to.get("terminate", 300))

    def _get_workflow_network_volume(self, workflow_name: str) -> Optional[str]:
        wf = CONFIG.get("workflow", {})
        wfc = wf.get(workflow_name, wf.get("default", {}))
        return wfc.get("network-volume")

    async def _check_network_volume_availability(self) -> bool:
        try:
            client = get_runpod_rest_client()
            res = await client.getNetworkVolumes()
            return bool(res.success and res.data)
        except Exception:
            return False

    async def _create_pod_for_workflow(self, workflow_name: str) -> Optional[ActivePod]:
        import time

        # network volume check (non-fatal)
        has_net_vol = await self._check_network_volume_availability()

        pod_config = {
            "name": f"{workflow_name}-pod-{int(time.time()*1000)}",
            "imageName": self.default_image,
            "cloudType": "SECURE",  # to match TS
            "gpuCount": self.default_gpu,
            "minMemoryInGb": self.default_mem_gb,
            "countryCode": "SE",
            "supportPublicIp": self.support_public_ip,
            "containerDiskInGb": self.default_disk_gb,
            "minVcpuCount": self.default_vcpu,
            "ports": self.default_ports,
            "dockerArgs": "",
            "maxRetries": 2,
            "retryDelay": 3000,
            "workflowName": workflow_name,
            "hasNetworkVolumes": has_net_vol,
        }

        client = get_runpod_rest_client()
        result = await client.createPod(pod_config)
        if result.get("success") and result.get("pod"):
            now = int(time.time() * 1000)
            pause_s, term_s = self._get_workflow_timeouts(workflow_name)
            active = ActivePod(
                id=result["pod"]["id"],
                workflowName=workflow_name,
                createdAt=now,
                lastUsedAt=now,
                pauseTimeoutAt=now + pause_s * 1000,
                terminateTimeoutAt=now + term_s * 1000,
                status="running",
            )
            self.activePods[active.id] = active
            return active
        return None

    async def _process_pod_requests(self, pod: ActivePod) -> None:
        import time

        # move up to 3 - current queued
        capacity = 3 - len(pod.requestQueue)
        if capacity <= 0:
            return

        async with self._lock:
            pending = self.pendingRequests.get(pod.workflowName, [])
            to_process = pending[:capacity]
            self.pendingRequests[pod.workflowName] = pending[capacity:]

        if not to_process:
            return

        # mark + assign
        for req in to_process:
            req.status = "processing"
            req.podId = pod.id
        pod.requestQueue.extend(to_process)

        # update timers
        now = int(time.time() * 1000)
        pod.lastUsedAt = now
        pause_s, term_s = self._get_workflow_timeouts(pod.workflowName)
        pod.pauseTimeoutAt = now + pause_s * 1000
        pod.terminateTimeoutAt = now + term_s * 1000

        # resume if paused
        if pod.status == "paused":
            try:
                client = get_runpod_rest_client()
                r = await client.startPod(pod.id)
                if r.get("success"):
                    pod.status = "running"
                    pod.pausedAt = None
                else:
                    # cannot process if can't resume
                    return
            except Exception:
                return

    async def _wait_for_pod_with_ip(self, pod_id: str, max_attempts: int = 12) -> Dict[str, Any]:
        for attempt in range(1, max_attempts + 1):
            try:
                client = get_runpod_rest_client()
                status = await client.getPodById(pod_id)
                if status.get("success") and status.get("data"):
                    pod_data = status["data"]
                    pod_state = pod_data.get("desiredStatus") or pod_data.get("status")
                    if pod_state == "RUNNING":
                        got = await self._get_pod_public_ip(pod_id)
                        if got.get("success") and got.get("pod", {}).get("ip"):
                            return got
                # FAILED / TERMINATED / EXITED
                if status.get("data", {}).get("status") in {"FAILED", "TERMINATED", "EXITED"}:
                    return {"success": False, "error": f"Pod failed with status: {status['data']['status']}"}
            except Exception:
                pass
            await asyncio.sleep(10)
        return {"success": False, "error": f"Pod did not become ready with IP within {max_attempts * 10} seconds"}

    async def _get_pod_public_ip(self, pod_id: str) -> Dict[str, Any]:
        try:
            client = get_runpod_rest_client()
            res = await client.getPodById(pod_id)
            if res.get("success") and res.get("data"):
                pod = res["data"]
                ip = pod.get("publicIp")
                if ip:
                    pod_copy = dict(pod)
                    pod_copy["ip"] = ip
                    return {"success": True, "pod": pod_copy}
                return {"success": False, "error": "Pod does not have a public IP address yet"}
            return {"success": False, "error": res.get("error") or "Failed to get pod details"}
        except Exception as e:
            return {"success": False, "error": str(e) or "Unknown error getting pod IP"}

    async def _check_pod_timeouts(self) -> None:
        import time

        now = int(time.time() * 1000)
        for pod_id, pod in list(self.activePods.items()):
            if pod.status == "running" and len(pod.requestQueue) == 0 and now > pod.pauseTimeoutAt:
                # pause
                pod.status = "paused"
                pod.pausedAt = now
                try:
                    await pausePod(pod_id)
                except Exception:
                    pass
            elif pod.status == "paused" and pod.pausedAt and now > pod.terminateTimeoutAt:
                # terminate
                pod.status = "terminated"
                try:
                    await releasePod(pod_id)
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
