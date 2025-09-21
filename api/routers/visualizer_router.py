from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import uuid
import tempfile
from pathlib import Path

from ..workflows.generator.unified_visualizers import (
    UnifiedVisualizerService, 
    VisualizerConfig, 
    VisualizerType
)

router = APIRouter(prefix="/api/visualizers", tags=["visualizers"])

class VisualizerRequest(BaseModel):
    visualizer_type: str
    width: int = 1920
    height: int = 1080
    fps: int = 30
    n_segments: int = 60
    fadein: float = 3.0
    fadeout: float = 3.0
    delay_outro: float = 0.0
    duration_intro: float = 0.0
    time_in: float = 0.0
    height_percent: int = 10
    width_percent: int = 90
    bar_thickness: Optional[int] = None
    bar_count: Optional[int] = None
    mirror_right: bool = False
    bar_height_min: int = 10
    bar_height_max: int = 35
    smoothness: int = 0
    x_position: int = 50
    y_position: int = 50
    color: List[int] = [255, 50, 100]
    dot_size: Optional[int] = None
    dot_filled: bool = True
    transparency: bool = True
    top_active: bool = True
    bottom_active: bool = True
    fill_alpha: float = 0.5
    border_alpha: float = 1.0
    smooth_arcs: bool = False
    enhanced_mode: Optional[Dict[str, Any]] = None

class VisualizerResponse(BaseModel):
    job_id: str
    status: str
    message: str
    output_path: Optional[str] = None

class VisualizerStatus(BaseModel):
    job_id: str
    status: str
    progress: Optional[int] = None
    output_path: Optional[str] = None
    error: Optional[str] = None

# In-memory job tracking (in production, use Redis or database)
job_status = {}

visualizer_service = UnifiedVisualizerService()

@router.get("/types")
async def get_visualizer_types():
    """Get available visualizer types"""
    return {
        "visualizers": visualizer_service.get_available_visualizers(),
        "config_schema": visualizer_service.get_visualizer_config_schema()
    }

@router.post("/create", response_model=VisualizerResponse)
async def create_visualizer(
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = File(...),
    visualizer_type: str = "linear_bars",
    width: int = 1920,
    height: int = 1080,
    fps: int = 30,
    n_segments: int = 60,
    fadein: float = 3.0,
    fadeout: float = 3.0,
    delay_outro: float = 0.0,
    duration_intro: float = 0.0,
    time_in: float = 0.0,
    height_percent: int = 10,
    width_percent: int = 90,
    bar_thickness: Optional[int] = None,
    bar_count: Optional[int] = None,
    mirror_right: bool = False,
    bar_height_min: int = 10,
    bar_height_max: int = 35,
    smoothness: int = 0,
    x_position: int = 50,
    y_position: int = 50,
    color: str = "255,50,100",
    dot_size: Optional[int] = None,
    dot_filled: bool = True,
    transparency: bool = True,
    top_active: bool = True,
    bottom_active: bool = True,
    fill_alpha: float = 0.5,
    border_alpha: float = 1.0,
    smooth_arcs: bool = False,
    enhanced_mode: Optional[str] = None
):
    """Create a visualizer video from audio file"""
    
    # Validate visualizer type
    try:
        vis_type = VisualizerType(visualizer_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid visualizer type: {visualizer_type}")
    
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Parse color
    try:
        color_tuple = tuple(map(int, color.split(',')))
        if len(color_tuple) != 3:
            raise ValueError("Color must have 3 values")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid color format. Use 'R,G,B' format")
    
    # Parse enhanced mode
    enhanced_mode_dict = None
    if enhanced_mode:
        try:
            import json
            enhanced_mode_dict = json.loads(enhanced_mode)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid enhanced_mode JSON format")
    
    # Create config
    config = VisualizerConfig(
        visualizer_type=vis_type,
        width=width,
        height=height,
        fps=fps,
        n_segments=n_segments,
        fadein=fadein,
        fadeout=fadeout,
        delay_outro=delay_outro,
        duration_intro=duration_intro,
        time_in=time_in,
        height_percent=height_percent,
        width_percent=width_percent,
        bar_thickness=bar_thickness,
        bar_count=bar_count,
        mirror_right=mirror_right,
        bar_height_min=bar_height_min,
        bar_height_max=bar_height_max,
        smoothness=smoothness,
        x_position=x_position,
        y_position=y_position,
        color=color_tuple,
        dot_size=dot_size,
        dot_filled=dot_filled,
        transparency=transparency,
        top_active=top_active,
        bottom_active=bottom_active,
        fill_alpha=fill_alpha,
        border_alpha=border_alpha,
        smooth_arcs=smooth_arcs,
        enhanced_mode=enhanced_mode_dict
    )
    
    # Initialize job status
    job_status[job_id] = {
        "status": "processing",
        "progress": 0,
        "output_path": None,
        "error": None
    }
    
    # Start background task
    background_tasks.add_task(
        process_visualizer,
        job_id,
        audio_file,
        config
    )
    
    return VisualizerResponse(
        job_id=job_id,
        status="processing",
        message="Visualizer job started"
    )

@router.post("/create-from-request", response_model=VisualizerResponse)
async def create_visualizer_from_request(
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = File(...),
    request: VisualizerRequest = None
):
    """Create a visualizer video from a detailed request object"""
    
    if not request:
        raise HTTPException(status_code=400, detail="Request body is required")
    
    # Validate visualizer type
    try:
        vis_type = VisualizerType(request.visualizer_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid visualizer type: {request.visualizer_type}")
    
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Create config
    config = VisualizerConfig(
        visualizer_type=vis_type,
        width=request.width,
        height=request.height,
        fps=request.fps,
        n_segments=request.n_segments,
        fadein=request.fadein,
        fadeout=request.fadeout,
        delay_outro=request.delay_outro,
        duration_intro=request.duration_intro,
        time_in=request.time_in,
        height_percent=request.height_percent,
        width_percent=request.width_percent,
        bar_thickness=request.bar_thickness,
        bar_count=request.bar_count,
        mirror_right=request.mirror_right,
        bar_height_min=request.bar_height_min,
        bar_height_max=request.bar_height_max,
        smoothness=request.smoothness,
        x_position=request.x_position,
        y_position=request.y_position,
        color=tuple(request.color),
        dot_size=request.dot_size,
        dot_filled=request.dot_filled,
        transparency=request.transparency,
        top_active=request.top_active,
        bottom_active=request.bottom_active,
        fill_alpha=request.fill_alpha,
        border_alpha=request.border_alpha,
        smooth_arcs=request.smooth_arcs,
        enhanced_mode=request.enhanced_mode
    )
    
    # Initialize job status
    job_status[job_id] = {
        "status": "processing",
        "progress": 0,
        "output_path": None,
        "error": None
    }
    
    # Start background task
    background_tasks.add_task(
        process_visualizer,
        job_id,
        audio_file,
        config
    )
    
    return VisualizerResponse(
        job_id=job_id,
        status="processing",
        message="Visualizer job started"
    )

@router.get("/status/{job_id}", response_model=VisualizerStatus)
async def get_visualizer_status(job_id: str):
    """Get the status of a visualizer job"""
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return VisualizerStatus(**job_status[job_id])

@router.get("/download/{job_id}")
async def download_visualizer(job_id: str):
    """Download the completed visualizer video"""
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = job_status[job_id]
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not completed yet")
    
    if not job["output_path"] or not os.path.exists(job["output_path"]):
        raise HTTPException(status_code=404, detail="Output file not found")
    
    return FileResponse(
        job["output_path"],
        media_type="video/mp4",
        filename=f"visualizer_{job_id}.mp4"
    )

@router.delete("/job/{job_id}")
async def delete_visualizer_job(job_id: str):
    """Delete a visualizer job and its output file"""
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = job_status[job_id]
    
    # Delete output file if it exists
    if job["output_path"] and os.path.exists(job["output_path"]):
        try:
            os.remove(job["output_path"])
        except OSError:
            pass  # File might already be deleted
    
    # Remove job from tracking
    del job_status[job_id]
    
    return {"message": "Job deleted successfully"}

@router.get("/jobs")
async def list_visualizer_jobs():
    """List all visualizer jobs"""
    return {
        "jobs": [
            {
                "job_id": job_id,
                "status": job["status"],
                "progress": job["progress"],
                "has_output": job["output_path"] is not None and os.path.exists(job["output_path"])
            }
            for job_id, job in job_status.items()
        ]
    }

async def process_visualizer(job_id: str, audio_file: UploadFile, config: VisualizerConfig):
    """Background task to process visualizer"""
    try:
        # Update job status
        job_status[job_id]["status"] = "processing"
        job_status[job_id]["progress"] = 10
        
        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save uploaded audio file
            audio_path = os.path.join(temp_dir, f"audio_{job_id}.{audio_file.filename.split('.')[-1]}")
            with open(audio_path, "wb") as f:
                content = await audio_file.read()
                f.write(content)
            
            job_status[job_id]["progress"] = 20
            
            # Create output path
            output_dir = os.path.join(temp_dir, "output")
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, f"visualizer_{job_id}.mp4")
            
            job_status[job_id]["progress"] = 30
            
            # Process visualizer
            result_path = visualizer_service.render_visualizer(
                audio_path=audio_path,
                output_path=output_path,
                config=config
            )
            
            job_status[job_id]["progress"] = 90
            
            # Move to permanent storage
            permanent_dir = os.path.join("storage", "visualizers")
            os.makedirs(permanent_dir, exist_ok=True)
            permanent_path = os.path.join(permanent_dir, f"visualizer_{job_id}.mp4")
            
            import shutil
            shutil.move(result_path, permanent_path)
            
            # Update job status
            job_status[job_id]["status"] = "completed"
            job_status[job_id]["progress"] = 100
            job_status[job_id]["output_path"] = permanent_path
            
    except Exception as e:
        # Update job status with error
        job_status[job_id]["status"] = "failed"
        job_status[job_id]["error"] = str(e)
        job_status[job_id]["progress"] = 0
