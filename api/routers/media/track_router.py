from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from api.db import get_db
from api.schemas import TrackCreate, TrackRead
from api.services import media_service

router = APIRouter(prefix="/tracks", tags=["Tracks"])


@router.post("/", response_model=TrackRead)
def create_track(payload: TrackCreate, db: Session = Depends(get_db), user_id: str = "demo-user"):
    # AI-generated track
    return media_service.handle_music(db, payload.project_id, payload.dict(), user_id)


@router.post("/upload", response_model=TrackRead)
def upload_track(project_id: str, file: UploadFile = File(...), db: Session = Depends(get_db), user_id: str = "demo-user"):
    # Upload audio file
    return media_service.handle_music(db, project_id, {}, user_id, file=file)
