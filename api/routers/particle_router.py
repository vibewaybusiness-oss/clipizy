from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import os
import uuid
from datetime import datetime

from ..workflows.generator.particles.unified_particle_system import (
    UnifiedParticleSystem,
    ParticleType,
    ParticleConfig,
    create_particle_system,
    get_particle_type_list
)

router = APIRouter(prefix="/particles", tags=["particles"])

# In-memory storage for active particle systems (in production, use Redis or database)
active_systems: Dict[str, UnifiedParticleSystem] = {}
render_jobs: Dict[str, Dict[str, Any]] = {}


class ParticleSystemRequest(BaseModel):
    particle_type: str
    config: Optional[Dict[str, Any]] = None


class ParticleSystemUpdate(BaseModel):
    config: Dict[str, Any]


class RenderRequest(BaseModel):
    system_id: str
    output_path: Optional[str] = None
    audio_path: Optional[str] = None


class ParticleSystemResponse(BaseModel):
    system_id: str
    particle_type: str
    status: Dict[str, Any]
    created_at: datetime


@router.post("/create", response_model=ParticleSystemResponse)
async def create_particle_system_endpoint(request: ParticleSystemRequest):
    """Create a new particle system"""
    try:
        system = create_particle_system(request.particle_type, request.config)
        system_id = str(uuid.uuid4())
        active_systems[system_id] = system

        return ParticleSystemResponse(
            system_id=system_id,
            particle_type=request.particle_type,
            status=system.get_status(),
            created_at=datetime.now()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create particle system: {str(e)}")


@router.get("/types", response_model=List[Dict[str, Any]])
async def get_particle_types():
    """Get list of available particle types"""
    return get_particle_type_list()


@router.get("/systems", response_model=List[ParticleSystemResponse])
async def list_particle_systems():
    """List all active particle systems"""
    return [
        ParticleSystemResponse(
            system_id=system_id,
            particle_type=system.particle_type.value,
            status=system.get_status(),
            created_at=datetime.now()  # In production, store creation time
        )
        for system_id, system in active_systems.items()
    ]


@router.get("/systems/{system_id}", response_model=ParticleSystemResponse)
async def get_particle_system(system_id: str):
    """Get specific particle system status"""
    if system_id not in active_systems:
        raise HTTPException(status_code=404, detail="Particle system not found")

    system = active_systems[system_id]
    return ParticleSystemResponse(
        system_id=system_id,
        particle_type=system.particle_type.value,
        status=system.get_status(),
        created_at=datetime.now()
    )


@router.put("/systems/{system_id}/config")
async def update_particle_system_config(system_id: str, request: ParticleSystemUpdate):
    """Update particle system configuration"""
    if system_id not in active_systems:
        raise HTTPException(status_code=404, detail="Particle system not found")

    try:
        system = active_systems[system_id]
        system.update_config(request.config)
        return {"message": "Configuration updated successfully", "status": system.get_status()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update configuration: {str(e)}")


@router.put("/systems/{system_id}/type/{particle_type}")
async def change_particle_type(system_id: str, particle_type: str):
    """Change particle system type"""
    if system_id not in active_systems:
        raise HTTPException(status_code=404, detail="Particle system not found")

    try:
        pt = ParticleType(particle_type)
        system = active_systems[system_id]
        system.change_particle_type(pt)
        return {"message": f"Particle type changed to {particle_type}", "status": system.get_status()}
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid particle type: {particle_type}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to change particle type: {str(e)}")


@router.post("/systems/{system_id}/load-audio")
async def load_audio(system_id: str, audio_path: str):
    """Load audio file for particle system"""
    if system_id not in active_systems:
        raise HTTPException(status_code=404, detail="Particle system not found")

    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    try:
        system = active_systems[system_id]
        system.load_audio(audio_path)
        return {"message": "Audio loaded successfully", "status": system.get_status()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load audio: {str(e)}")


@router.post("/systems/{system_id}/render")
async def render_particles(system_id: str, background_tasks: BackgroundTasks, request: RenderRequest):
    """Start particle rendering job"""
    if system_id not in active_systems:
        raise HTTPException(status_code=404, detail="Particle system not found")

    system = active_systems[system_id]

    # Generate output path if not provided
    if not request.output_path:
        output_dir = "api/storage/renders"
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        request.output_path = f"{output_dir}/particles_{system_id}_{timestamp}.mp4"

    # Validate audio path if provided
    if request.audio_path and not os.path.exists(request.audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    # Create job entry
    job_id = str(uuid.uuid4())
    render_jobs[job_id] = {
        "system_id": system_id,
        "output_path": request.output_path,
        "audio_path": request.audio_path,
        "status": "queued",
        "created_at": datetime.now(),
        "progress": 0
    }

    # Start background rendering
    background_tasks.add_task(
        render_particles_background,
        job_id,
        system_id,
        request.output_path,
        request.audio_path
    )

    return {
        "job_id": job_id,
        "message": "Rendering started",
        "output_path": request.output_path
    }


async def render_particles_background(job_id: str, system_id: str, output_path: str, audio_path: Optional[str]):
    """Background task for rendering particles"""
    try:
        render_jobs[job_id]["status"] = "rendering"
        render_jobs[job_id]["progress"] = 10

        system = active_systems[system_id]
        system.render_particles(output_path, audio_path)

        render_jobs[job_id]["status"] = "completed"
        render_jobs[job_id]["progress"] = 100
        render_jobs[job_id]["completed_at"] = datetime.now()

    except Exception as e:
        render_jobs[job_id]["status"] = "failed"
        render_jobs[job_id]["error"] = str(e)
        render_jobs[job_id]["failed_at"] = datetime.now()


@router.get("/jobs/{job_id}")
async def get_render_job_status(job_id: str):
    """Get render job status"""
    if job_id not in render_jobs:
        raise HTTPException(status_code=404, detail="Render job not found")

    job = render_jobs[job_id]
    response = {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "created_at": job["created_at"]
    }

    if job["status"] == "completed":
        response["output_path"] = job["output_path"]
        response["completed_at"] = job.get("completed_at")
    elif job["status"] == "failed":
        response["error"] = job.get("error")
        response["failed_at"] = job.get("failed_at")

    return response


@router.get("/jobs")
async def list_render_jobs():
    """List all render jobs"""
    return [
        {
            "job_id": job_id,
            "system_id": job["system_id"],
            "status": job["status"],
            "progress": job["progress"],
            "created_at": job["created_at"],
            "output_path": job.get("output_path")
        }
        for job_id, job in render_jobs.items()
    ]


@router.get("/download/{job_id}")
async def download_render(job_id: str):
    """Download rendered video file"""
    if job_id not in render_jobs:
        raise HTTPException(status_code=404, detail="Render job not found")

    job = render_jobs[job_id]
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Render job not completed")

    output_path = job["output_path"]
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Output file not found")

    return FileResponse(
        path=output_path,
        filename=os.path.basename(output_path),
        media_type="video/mp4"
    )


@router.delete("/systems/{system_id}")
async def delete_particle_system(system_id: str):
    """Delete particle system"""
    if system_id not in active_systems:
        raise HTTPException(status_code=404, detail="Particle system not found")

    del active_systems[system_id]
    return {"message": "Particle system deleted successfully"}


@router.delete("/jobs/{job_id}")
async def delete_render_job(job_id: str):
    """Delete render job and its output file"""
    if job_id not in render_jobs:
        raise HTTPException(status_code=404, detail="Render job not found")

    job = render_jobs[job_id]

    # Delete output file if it exists
    if job.get("output_path") and os.path.exists(job["output_path"]):
        try:
            os.remove(job["output_path"])
        except Exception:
            pass  # Ignore file deletion errors

    del render_jobs[job_id]
    return {"message": "Render job deleted successfully"}


@router.get("/systems/{system_id}/preview")
async def get_system_preview(system_id: str, duration: float = 2.0):
    """Generate a quick preview of the particle system"""
    if system_id not in active_systems:
        raise HTTPException(status_code=404, detail="Particle system not found")

    system = active_systems[system_id]

    # Create a temporary system for preview
    preview_config = ParticleConfig(
        width=640,
        height=360,
        fps=15,
        duration=duration,
        particle_count=min(50, system.particle_count)
    )

    preview_system = UnifiedParticleSystem(
        particle_type=system.particle_type,
        config=preview_config
    )

    # Generate preview
    preview_path = f"api/storage/previews/preview_{system_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
    os.makedirs(os.path.dirname(preview_path), exist_ok=True)

    try:
        preview_system.render_particles(preview_path)
        return FileResponse(
            path=preview_path,
            filename=f"preview_{system_id}.mp4",
            media_type="video/mp4"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")


# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check for particle system service"""
    return {
        "status": "healthy",
        "active_systems": len(active_systems),
        "active_jobs": len([job for job in render_jobs.values() if job["status"] == "rendering"]),
        "available_types": len(ParticleType)
    }
