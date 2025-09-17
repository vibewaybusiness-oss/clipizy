from fastapi import APIRouter, Depends, HTTPException
from api.services import runpod_service
from api.models import User
from .auth_router import get_current_user

router = APIRouter(prefix="/runpod", tags=["RunPod"])

@router.post("/pods")
async def create_pod(job_type: str, config: dict, current_user: User = Depends(get_current_user)):
    try:
        return await runpod_service.create_pod(job_id="temp_job", job_type=job_type, config=config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create RunPod: {e}")

@router.get("/pods/{pod_id}")
async def get_pod(pod_id: str, current_user: User = Depends(get_current_user)):
    try:
        return await runpod_service.get_pod_status(pod_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get RunPod status: {e}")
