from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from api.db import get_db
from api.schemas import ProjectCreate, ProjectRead, ProjectUpdate, TrackRead
from api.models import Project, Track, User
from api.services import storage_service
from ..auth.auth_router import get_current_user
import os, uuid, datetime

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("/", response_model=ProjectRead)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = Project(
        user_id=str(current_user.id),
        name=project_data.name,
        description=project_data.description,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/", response_model=list[ProjectRead])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Project).filter(Project.user_id == str(current_user.id)).all()

@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == str(current_user.id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.post("/{project_id}/upload", response_model=TrackRead)
def upload_audio_file(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload an audio track and attach it to the project."""
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == str(current_user.id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp3", ".wav", ".flac", ".aac", ".m4a"]:
        raise HTTPException(status_code=400, detail="Invalid file type")

    # Generate S3 path with proper user directory structure
    s3_key = storage_service.generate_music_clip_path(
        user_id=str(current_user.id),
        project_id=project_id,
        file_type="music",
        filename=f"{uuid.uuid4()}{ext}"
    )
    file_url = storage_service.upload_file_object(file.file, s3_key, content_type=file.content_type)

    # Create Track DB entry
    track = Track(
        id=str(uuid.uuid4()),
        project_id=project_id,
        file_path=file_url,
        ai_generated=False,
        title=os.path.splitext(file.filename)[0],
        track_metadata={
            "format": ext.lstrip("."),
            "size_mb": None,  # TODO: compute from file size
            "duration": None,  # TODO: extract with analysis_service
        },
        created_at=datetime.datetime.utcnow(),
    )

    db.add(track)
    db.commit()
    db.refresh(track)

    return track

@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a project and all its associated tracks."""
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == str(current_user.id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete all tracks associated with this project
    tracks = db.query(Track).filter(Track.project_id == project_id).all()
    for track in tracks:
        # Delete the file from storage if it exists
        if track.file_path and track.file_path.startswith("s3://"):
            try:
                storage_service.delete_file(track.file_path)
            except Exception as e:
                # Log error but don't fail the deletion
                print(f"Warning: Could not delete file {track.file_path}: {e}")
        db.delete(track)
    
    # Delete the project
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}
