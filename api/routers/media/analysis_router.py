from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.db import get_db
from api.models import Track, Video, Image, User, Project
from api.schemas import AnalysisResponse
from api.services import analysis_service, storage_service
from ..auth.auth_router import get_current_user
import os, uuid, datetime
from urllib.parse import urlparse

router = APIRouter(tags=["Analysis"])


@router.post("/music/{track_id}", response_model=AnalysisResponse)
async def analyze_music(track_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Analyze an uploaded or generated music track."""
    track = db.query(Track).join(Track.project).filter(Track.id == track_id, Project.user_id == str(current_user.id)).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    # Build a safe temporary path (strip query strings; keep only extension)
    try:
        if isinstance(track.file_path, str) and track.file_path.startswith(("http://", "https://")):
            parsed = urlparse(track.file_path)
            base_name = os.path.basename(parsed.path)
        else:
            base_name = os.path.basename(track.file_path)
        _, ext = os.path.splitext(base_name)
    except Exception:
        ext = ""
    local_path = f"/tmp/{uuid.uuid4()}{ext}"
    try:
        # Use the storage service helper to handle different file path formats
        storage_service.download_file_from_path(track.file_path, local_path)
        
        analysis_result = analysis_service.analyze_music(local_path)
        description = analysis_service.generate_music_description(analysis_result)

        track.analysis = {
            "raw": analysis_result,
            "description": description,
            "analyzed_at": datetime.datetime.utcnow().isoformat(),
        }
        db.commit()
        db.refresh(track)

        return {"track_id": str(track.id), "analysis": analysis_result, "description": description}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)


@router.post("/video/{video_id}", response_model=AnalysisResponse)
async def analyze_video(video_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Analyze a video for scenes, objects, or metadata."""
    video = db.query(Video).join(Video.project).filter(Video.id == video_id, Project.user_id == str(current_user.id)).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Build a safe temporary path (strip query strings; keep only extension)
    try:
        if isinstance(video.file_path, str) and video.file_path.startswith(("http://", "https://")):
            parsed = urlparse(video.file_path)
            base_name = os.path.basename(parsed.path)
        else:
            base_name = os.path.basename(video.file_path)
        _, ext = os.path.splitext(base_name)
    except Exception:
        ext = ""
    local_path = f"/tmp/{uuid.uuid4()}{ext}"
    try:
        # Use the storage service helper to handle different file path formats
        storage_service.download_file_from_path(video.file_path, local_path)
        
        analysis_result = analysis_service.analyze_video(local_path)

        video.analysis = {
            "raw": analysis_result,
            "analyzed_at": datetime.datetime.utcnow().isoformat(),
        }
        db.commit()
        db.refresh(video)

        return {"video_id": str(video.id), "analysis": analysis_result, "description": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)


@router.post("/image/{image_id}", response_model=AnalysisResponse)
async def analyze_image(image_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Analyze an image for objects, faces, or style."""
    image = db.query(Image).join(Image.project).filter(Image.id == image_id, Project.user_id == str(current_user.id)).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Build a safe temporary path (strip query strings; keep only extension)
    try:
        if isinstance(image.file_path, str) and image.file_path.startswith(("http://", "https://")):
            parsed = urlparse(image.file_path)
            base_name = os.path.basename(parsed.path)
        else:
            base_name = os.path.basename(image.file_path)
        _, ext = os.path.splitext(base_name)
    except Exception:
        ext = ""
    local_path = f"/tmp/{uuid.uuid4()}{ext}"
    try:
        # Use the storage service helper to handle different file path formats
        storage_service.download_file_from_path(image.file_path, local_path)
        
        analysis_result = analysis_service.analyze_image(local_path)

        image.analysis = {
            "raw": analysis_result,
            "analyzed_at": datetime.datetime.utcnow().isoformat(),
        }
        db.commit()
        db.refresh(image)

        return {"image_id": str(image.id), "analysis": analysis_result, "description": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)
