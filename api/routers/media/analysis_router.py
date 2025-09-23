from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.db import get_db
from api.models import Track, Video, Image, User
from api.schemas import AnalysisResponse
from api.services import analysis_service, storage_service
from ..auth.auth_router import get_current_user
import os, uuid, datetime

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.post("/music/{track_id}", response_model=AnalysisResponse)
async def analyze_music(track_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Analyze an uploaded or generated music track."""
    track = db.query(Track).filter(Track.id == track_id, Track.user_id == str(current_user.id)).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    local_path = f"/tmp/{uuid.uuid4()}_{os.path.basename(track.file_path)}"
    try:
        storage_service.download_file(track.file_path, local_path)
        analysis_result = analysis_service.analyze_music(local_path)
        description = analysis_service.generate_music_description(analysis_result)

        track.analysis = {
            "raw": analysis_result,
            "description": description,
            "analyzed_at": datetime.datetime.utcnow().isoformat(),
        }
        db.commit()
        db.refresh(track)

        return {"track_id": track.id, "analysis": analysis_result, "description": description}
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)


@router.post("/video/{video_id}", response_model=AnalysisResponse)
async def analyze_video(video_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Analyze a video for scenes, objects, or metadata."""
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == str(current_user.id)).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    local_path = f"/tmp/{uuid.uuid4()}_{os.path.basename(video.file_path)}"
    try:
        storage_service.download_file(video.file_path, local_path)
        analysis_result = analysis_service.analyze_video(local_path)

        video.analysis = {
            "raw": analysis_result,
            "analyzed_at": datetime.datetime.utcnow().isoformat(),
        }
        db.commit()
        db.refresh(video)

        return {"video_id": video.id, "analysis": analysis_result, "description": None}
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)


@router.post("/image/{image_id}", response_model=AnalysisResponse)
async def analyze_image(image_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Analyze an image for objects, faces, or style."""
    image = db.query(Image).filter(Image.id == image_id, Image.user_id == str(current_user.id)).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    local_path = f"/tmp/{uuid.uuid4()}_{os.path.basename(image.file_path)}"
    try:
        storage_service.download_file(image.file_path, local_path)
        analysis_result = analysis_service.analyze_image(local_path)

        image.analysis = {
            "raw": analysis_result,
            "analyzed_at": datetime.datetime.utcnow().isoformat(),
        }
        db.commit()
        db.refresh(image)

        return {"image_id": image.id, "analysis": analysis_result, "description": None}
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)
