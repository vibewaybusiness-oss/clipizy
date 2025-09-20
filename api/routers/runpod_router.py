"""
RunPod API Router - Python FastAPI implementation
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional, Dict, Any
from api.models.runpod import (
    WorkflowInput, WorkflowResult, ComfyUIRequest, QueueStatus,
    RestPodConfig, RunPodPod, RunPodUser, GpuType, CloudType, NetworkVolume
)
from api.services.runpod_client import get_graphql_client, get_rest_client
from api.services.runpod_queue import get_queue_manager, start_queue_manager, stop_queue_manager

router = APIRouter(prefix="/api/runpod", tags=["runpod"])


@router.on_event("startup")
async def startup_event():
    """Start the queue manager on startup"""
    await start_queue_manager()


@router.on_event("shutdown")
async def shutdown_event():
    """Stop the queue manager on shutdown"""
    await stop_queue_manager()


# Account Management
@router.get("/account", response_model=RunPodUser)
async def get_account_info():
    """Get RunPod account information"""
    client = get_graphql_client()
    result = await client.get_account_info()
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    return result.data


# Pod Management
@router.get("/pods", response_model=List[RunPodPod])
async def get_pods():
    """Get all pods"""
    client = get_rest_client()
    result = await client.get_pods()
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    return result.data or []


@router.get("/pods/{pod_id}", response_model=RunPodPod)
async def get_pod_by_id(pod_id: str):
    """Get pod by ID"""
    client = get_graphql_client()
    result = await client.get_pod_by_id(pod_id)
    
    if not result.success:
        raise HTTPException(status_code=404, detail=result.error)
    
    return result.data


@router.post("/pods", response_model=RunPodPod)
async def create_pod(pod_config: RestPodConfig):
    """Create a new pod"""
    client = get_graphql_client()
    result = await client.create_pod(pod_config)
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    return result.data


@router.post("/pods/{pod_id}/start", response_model=Dict[str, bool])
async def start_pod(pod_id: str):
    """Start a pod"""
    client = get_graphql_client()
    result = await client.start_pod(pod_id)
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    return result.data


@router.post("/pods/{pod_id}/stop", response_model=Dict[str, bool])
async def stop_pod(pod_id: str):
    """Stop a pod"""
    client = get_graphql_client()
    result = await client.stop_pod(pod_id)
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    return result.data


@router.post("/pods/{pod_id}/restart", response_model=Dict[str, bool])
async def restart_pod(pod_id: str):
    """Restart a pod"""
    client = get_rest_client()
    result = await client.restart_pod(pod_id)
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    return result.data


@router.post("/pods/{pod_id}/terminate", response_model=Dict[str, bool])
async def terminate_pod(pod_id: str):
    """Terminate a pod"""
    client = get_graphql_client()
    result = await client.terminate_pod(pod_id)
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    return result.data


# GPU and Cloud Types
@router.get("/gpu-types", response_model=List[GpuType])
async def get_gpu_types():
    """Get available GPU types"""
    client = get_graphql_client()
    result = await client.get_gpu_types()
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    return result.data or []


@router.get("/cloud-types", response_model=List[CloudType])
async def get_cloud_types():
    """Get available cloud types"""
    client = get_graphql_client()
    result = await client.get_cloud_types()
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    return result.data or []


# Network Volumes
@router.get("/network-volumes", response_model=List[NetworkVolume])
async def get_network_volumes():
    """Get network volumes"""
    client = get_rest_client()
    result = await client.get_network_volumes()
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    return result.data or []


@router.get("/network-volumes/{volume_id}", response_model=NetworkVolume)
async def get_network_volume_by_id(volume_id: str):
    """Get network volume by ID"""
    client = get_rest_client()
    result = await client.get_network_volume_by_id(volume_id)
    
    if not result.success:
        raise HTTPException(status_code=404, detail=result.error)
    
    return result.data


# Templates
@router.get("/templates")
async def get_templates(
    include_public: bool = False,
    include_runpod: bool = False,
    include_endpoint_bound: bool = False
):
    """Get templates"""
    client = get_rest_client()
    result = await client.get_templates(include_public, include_runpod, include_endpoint_bound)
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    return result.data or []


# Workflow Management
@router.post("/workflows/queue", response_model=Dict[str, str])
async def queue_workflow(workflow_input: WorkflowInput):
    """Queue a workflow for execution"""
    queue_manager = get_queue_manager()
    request_id = await queue_manager.add_request("comfyui_image_qwen", workflow_input)
    
    return {"request_id": request_id, "status": "queued"}


@router.get("/workflows/status/{request_id}", response_model=ComfyUIRequest)
async def get_workflow_status(request_id: str):
    """Get workflow execution status"""
    queue_manager = get_queue_manager()
    request = await queue_manager.get_request_status(request_id)
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return request


@router.get("/workflows/queue/status", response_model=QueueStatus)
async def get_queue_status():
    """Get current queue status"""
    queue_manager = get_queue_manager()
    return queue_manager.get_queue_status()


# Image Generation (ComfyUI)
@router.post("/generate-image", response_model=WorkflowResult)
async def generate_image(workflow_input: WorkflowInput):
    """Generate an image using ComfyUI workflow"""
    queue_manager = get_queue_manager()
    
    # Add request to queue
    request_id = await queue_manager.add_request("comfyui_image_qwen", workflow_input)
    
    # Wait for completion (with timeout)
    import asyncio
    max_wait = 300  # 5 minutes
    start_time = asyncio.get_event_loop().time()
    
    while (asyncio.get_event_loop().time() - start_time) < max_wait:
        request = await queue_manager.get_request_status(request_id)
        
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        if request.status == "completed":
            return request.result or WorkflowResult(success=False, error="No result")
        elif request.status == "failed":
            return WorkflowResult(success=False, error=request.error or "Unknown error")
        
        await asyncio.sleep(2)  # Check every 2 seconds
    
    # Timeout
    return WorkflowResult(success=False, error="Request timeout")


@router.post("/generate-image-async", response_model=Dict[str, str])
async def generate_image_async(workflow_input: WorkflowInput):
    """Generate an image asynchronously (returns request ID immediately)"""
    queue_manager = get_queue_manager()
    
    # Add request to queue
    request_id = await queue_manager.add_request("comfyui_image_qwen", workflow_input)
    
    return {
        "request_id": request_id,
        "status": "queued",
        "message": "Image generation started. Use /workflows/status/{request_id} to check progress."
    }


@router.post("/generate-multiple-images", response_model=List[Dict[str, str]])
async def generate_multiple_images(workflow_inputs: List[WorkflowInput]):
    """Generate multiple images asynchronously"""
    queue_manager = get_queue_manager()
    
    request_ids = []
    for workflow_input in workflow_inputs:
        request_id = await queue_manager.add_request("comfyui_image_qwen", workflow_input)
        request_ids.append({
            "request_id": request_id,
            "status": "queued",
            "prompt": workflow_input.prompt
        })
    
    return request_ids


# Health Check
@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "runpod-api"}


# Utility endpoints
@router.get("/pods/{pod_id}/ip")
async def get_pod_ip(pod_id: str):
    """Get pod IP address"""
    queue_manager = get_queue_manager()
    result = await queue_manager.get_pod_with_ip(pod_id)
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return {"pod_id": pod_id, "ip": result["pod"]["ip"]}


@router.get("/workflows/history")
async def get_workflow_history(limit: int = 50, status: Optional[str] = None):
    """Get workflow execution history"""
    queue_manager = get_queue_manager()
    queue_status = queue_manager.get_queue_status()
    
    all_requests = (
        queue_status.completed_requests + 
        queue_status.failed_requests + 
        queue_status.pending_requests
    )
    
    # Filter by status if provided
    if status:
        all_requests = [req for req in all_requests if req.status == status]
    
    # Sort by creation time (newest first)
    all_requests.sort(key=lambda x: x.created_at, reverse=True)
    
    # Limit results
    return all_requests[:limit]


@router.delete("/workflows/{request_id}")
async def cancel_workflow(request_id: str):
    """Cancel a workflow request"""
    queue_manager = get_queue_manager()
    request = await queue_manager.get_request_status(request_id)
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.status in ["completed", "failed"]:
        raise HTTPException(status_code=400, detail="Cannot cancel completed or failed request")
    
    # Mark as failed with cancellation message
    request.status = "failed"
    request.error = "Cancelled by user"
    
    return {"message": "Request cancelled successfully"}


@router.get("/stats")
async def get_runpod_stats():
    """Get RunPod usage statistics"""
    queue_manager = get_queue_manager()
    queue_status = queue_manager.get_queue_status()
    
    return {
        "active_pods": len(queue_status.active_pods),
        "pending_requests": len(queue_status.pending_requests),
        "completed_requests": len(queue_status.completed_requests),
        "failed_requests": len(queue_status.failed_requests),
        "total_requests": (
            len(queue_status.pending_requests) + 
            len(queue_status.completed_requests) + 
            len(queue_status.failed_requests)
        )
    }


@router.post("/pods/{pod_id}/logs")
async def get_pod_logs(pod_id: str, lines: int = 100):
    """Get pod logs (placeholder - would need SSH access)"""
    # This would require SSH access to the pod
    # For now, return a placeholder response
    return {
        "pod_id": pod_id,
        "message": "Pod logs not available via API. Use SSH to access pod directly.",
        "suggested_command": f"ssh root@{pod_id}.runpod.io"
    }