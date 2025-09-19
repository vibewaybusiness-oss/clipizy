from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from api.db import get_db
from api.models import Project, Track, User
from api.services import storage_service, project_service
from api.services.user_safety_service import user_safety_service
from api.storage.metadata import extract_metadata
from api.config.logging import get_project_logger
import os
import uuid
import tempfile
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict, Any, List

# Initialize logger
logger = get_project_logger()

router = APIRouter(prefix="/music-clip", tags=["Music Clip Projects"])

@router.get("/projects/")
def list_music_clip_projects(
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Get all music-clip projects for the user."""
    try:
        # Ensure user exists and create if needed
        user = user_safety_service.ensure_user_exists(db, user_id)
        
        # Ensure project folders exist
        user_safety_service.ensure_project_folders_exist(user_id, "music-clip")
        
        # Get all music-clip projects for the user
        projects = db.query(Project).filter(
            Project.user_id == user_id,
            Project.type == "music-clip"
        ).order_by(Project.created_at.desc()).all()
        
        # Get tracks for each project
        projects_with_tracks = []
        for project in projects:
            tracks = db.query(Track).filter(Track.project_id == str(project.id)).all()
            
            projects_with_tracks.append({
                "project_id": str(project.id),
                "name": project.name,
                "description": project.description,
                "status": project.status,
                "created_at": project.created_at.isoformat(),
                "tracks": [
                    {
                        "id": str(track.id),
                        "name": track.title or "Untitled Track",
                        "duration": track.track_metadata.get('duration', 0) if track.track_metadata else 0,
                        "created_at": track.created_at.isoformat()
                    }
                    for track in tracks
                ]
            })
        
        logger.info(f"Retrieved {len(projects_with_tracks)} music-clip projects for user {user_id}")
        
        return {
            "projects": projects_with_tracks
        }
        
    except Exception as e:
        logger.error(f"Failed to list music-clip projects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list projects: {str(e)}")

@router.post("/projects/", response_model=Dict[str, Any])
def create_music_clip_project(
    name: Optional[str] = None,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Create a new music-clip project."""
    try:
        # Ensure user exists and create if needed
        user = user_safety_service.ensure_user_exists(db, user_id)
        
        # Ensure project folders exist
        user_safety_service.ensure_project_folders_exist(user_id, "music-clip")
        
        project = project_service.create_music_clip_project(
            db=db,
            user_id=user_id,
            name=name,
            description=description
        )
        
        logger.info(f"Created music-clip project {project.id} for user {user_id}")
        
        return {
            "project_id": str(project.id),
            "name": project.name,
            "description": project.description,
            "status": project.status,
            "created_at": project.created_at.isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to create music-clip project: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

@router.post("/projects/{project_id}/upload-track")
def upload_music_track(
    project_id: str,
    file: UploadFile = File(...),
    ai_generated: bool = Form(False),
    prompt: Optional[str] = Form(None),
    genre: Optional[str] = Form(None),
    instrumental: bool = Form(False),
    video_description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Upload a music track to a music-clip project."""
    try:
        # Ensure user exists and create if needed
        user = user_safety_service.ensure_user_exists(db, user_id)
        
        # Ensure project folders exist
        user_safety_service.ensure_project_folders_exist(user_id, "music-clip")
        
        # Verify project exists and belongs to user
        project = db.query(Project).filter(
            Project.id == project_id, 
            Project.user_id == user_id,
            Project.type == "music-clip"
        ).first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Validate file type
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".mp3", ".wav", ".flac", ".aac", ".m4a"]:
            raise HTTPException(status_code=400, detail="Invalid file type. Only audio files are allowed.")
        
        # Upload to S3 using the music-clip structure
        filename = f"{uuid.uuid4()}{ext}"
        
        # Reset file pointer and upload to S3
        file.file.seek(0)
        try:
            file_url = storage_service.upload_music_track(
                file=file,
                user_id=user_id,
                project_id=project_id,
                filename=filename
            )
            logger.info(f"Uploaded track to S3: {file_url}")
        except Exception as e:
            logger.warning(f"S3 upload failed, falling back to local storage: {e}")
            # Fallback to local storage for development
            local_storage_dir = f"storage/projects/{project_id}/music"
            os.makedirs(local_storage_dir, exist_ok=True)
            local_file_path = os.path.join(local_storage_dir, filename)
            
            file.file.seek(0)
            content = file.file.read()
            with open(local_file_path, "wb") as f:
                f.write(content)
            file_url = f"file://{os.path.abspath(local_file_path)}"
        
        # Extract metadata
        try:
            # For S3 files, we need to download temporarily for metadata extraction
            if file_url.startswith("file://"):
                file_metadata = extract_metadata(file_url.replace("file://", ""), "audio")
            else:
                # For S3 files, create a temporary local copy for metadata extraction
                temp_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
                file.file.seek(0)
                temp_file.write(file.file.read())
                temp_file.close()
                file_metadata = extract_metadata(temp_file.name, "audio")
                os.unlink(temp_file.name)
        except Exception as e:
            logger.warning(f"Failed to extract metadata: {e}")
            file_metadata = {
                "duration": 0,
                "format": ext.lstrip("."),
                "size_mb": 0
            }
        
        # Add track to project
        track = project_service.add_music_track(
            db=db,
            project_id=project_id,
            user_id=user_id,
            file_path=file_url,
            file_metadata=file_metadata,
            ai_generated=ai_generated,
            prompt=prompt,
            genre=genre,
            instrumental=instrumental,
            video_description=video_description,
            title=file.filename
        )
        
        logger.info(f"Uploaded track {track.id} to project {project_id}")
        
        return {
            "track_id": str(track.id),
            "file_path": file_url,
            "metadata": file_metadata,
            "ai_generated": ai_generated,
            "prompt": prompt,
            "genre": genre,
            "instrumental": instrumental,
            "video_description": video_description
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload track: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload track: {str(e)}")

def process_single_file(file: UploadFile, project_id: str, user_id: str, db: Session, 
                       ai_generated: bool = False, prompt: Optional[str] = None, 
                       genre: Optional[str] = None, instrumental: bool = False, 
                       video_description: Optional[str] = None) -> Dict[str, Any]:
    """Process a single file upload - designed to be run in parallel."""
    try:
        # Validate file type
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".mp3", ".wav", ".flac", ".aac", ".m4a"]:
            return {
                "success": False,
                "filename": file.filename,
                "error": "Invalid file type. Only audio files are allowed."
            }
        
        # Upload to S3 using the music-clip structure
        filename = f"{uuid.uuid4()}{ext}"
        
        # Reset file pointer and upload to S3
        file.file.seek(0)
        try:
            file_url = storage_service.upload_music_track(
                file=file,
                user_id=user_id,
                project_id=project_id,
                filename=filename
            )
            logger.info(f"Uploaded track to S3: {file_url}")
        except Exception as e:
            logger.warning(f"S3 upload failed for {file.filename}, falling back to local storage: {e}")
            # Fallback to local storage for development
            local_storage_dir = f"storage/projects/{project_id}/music"
            os.makedirs(local_storage_dir, exist_ok=True)
            local_file_path = os.path.join(local_storage_dir, filename)
            
            file.file.seek(0)
            content = file.file.read()
            with open(local_file_path, "wb") as f:
                f.write(content)
            file_url = f"file://{os.path.abspath(local_file_path)}"
        
        # Extract metadata
        try:
            # For S3 files, we need to download temporarily for metadata extraction
            if file_url.startswith("file://"):
                file_metadata = extract_metadata(file_url.replace("file://", ""), "audio")
            else:
                # For S3 files, create a temporary local copy for metadata extraction
                temp_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
                file.file.seek(0)
                temp_file.write(file.file.read())
                temp_file.close()
                file_metadata = extract_metadata(temp_file.name, "audio")
                os.unlink(temp_file.name)
        except Exception as e:
            logger.warning(f"Failed to extract metadata for {file.filename}: {e}")
            file_metadata = {
                "duration": 0,
                "format": ext.lstrip("."),
                "size_mb": 0
            }
        
        # Add track to project
        track = project_service.add_music_track(
            db=db,
            project_id=project_id,
            user_id=user_id,
            file_path=file_url,
            file_metadata=file_metadata,
            ai_generated=ai_generated,
            prompt=prompt,
            genre=genre,
            instrumental=instrumental,
            video_description=video_description,
            title=file.filename
        )
        
        logger.info(f"Uploaded track {track.id} to project {project_id}")
        
        return {
            "success": True,
            "filename": file.filename,
            "track_id": str(track.id),
            "file_path": file_url,
            "metadata": file_metadata,
            "ai_generated": ai_generated,
            "prompt": prompt,
            "genre": genre,
            "instrumental": instrumental,
            "video_description": video_description
        }
        
    except Exception as e:
        logger.error(f"Failed to process file {file.filename}: {str(e)}")
        return {
            "success": False,
            "filename": file.filename,
            "error": str(e)
        }

@router.post("/projects/{project_id}/upload-tracks-batch")
def upload_music_tracks_batch(
    project_id: str,
    files: List[UploadFile] = File(...),
    ai_generated: bool = Form(False),
    prompt: Optional[str] = Form(None),
    genre: Optional[str] = Form(None),
    instrumental: bool = Form(False),
    video_description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Upload multiple music tracks to a music-clip project in parallel."""
    try:
        # Ensure user exists and create if needed
        user = user_safety_service.ensure_user_exists(db, user_id)
        
        # Ensure project folders exist
        user_safety_service.ensure_project_folders_exist(user_id, "music-clip")
        
        # Verify project exists and belongs to user
        project = db.query(Project).filter(
            Project.id == project_id, 
            Project.user_id == user_id,
            Project.type == "music-clip"
        ).first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        logger.info(f"Starting parallel upload of {len(files)} files to project {project_id}")
        import time
        start_time = time.time()
        
        # Process files in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=min(len(files), 5)) as executor:
            # Submit all file processing tasks
            future_to_file = {
                executor.submit(
                    process_single_file, 
                    file, 
                    project_id, 
                    user_id, 
                    db,
                    ai_generated,
                    prompt,
                    genre,
                    instrumental,
                    video_description
                ): file for file in files
            }
            
            # Collect results as they complete
            results = []
            for future in future_to_file:
                try:
                    result = future.result(timeout=300)  # 5 minute timeout per file
                    results.append(result)
                except Exception as e:
                    file = future_to_file[future]
                    logger.error(f"Failed to process file {file.filename}: {str(e)}")
                    results.append({
                        "success": False,
                        "filename": file.filename,
                        "error": str(e)
                    })
        
        # Calculate timing
        end_time = time.time()
        total_time = end_time - start_time
        
        # Analyze results
        successful_uploads = [r for r in results if r.get("success", False)]
        failed_uploads = [r for r in results if not r.get("success", False)]
        
        logger.info(f"Parallel upload completed in {total_time:.2f}s - {len(successful_uploads)} successful, {len(failed_uploads)} failed")
        
        return {
            "total_files": len(files),
            "successful_uploads": len(successful_uploads),
            "failed_uploads": len(failed_uploads),
            "processing_time_seconds": total_time,
            "results": results,
            "successful_tracks": successful_uploads,
            "failed_tracks": failed_uploads
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload tracks batch: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload tracks batch: {str(e)}")

@router.post("/projects/{project_id}/settings")
def update_project_settings(
    project_id: str,
    settings: Dict[str, Any],
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Update music-clip project settings."""
    try:
        # Ensure user exists and create if needed
        user = user_safety_service.ensure_user_exists(db, user_id)
        
        # Ensure project folders exist
        user_safety_service.ensure_project_folders_exist(user_id, "music-clip")
        
        # Verify project exists and belongs to user
        project = db.query(Project).filter(
            Project.id == project_id, 
            Project.user_id == user_id,
            Project.type == "music-clip"
        ).first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Update settings in script.json
        updated_settings = project_service.update_project_settings(
            db=db,
            project_id=project_id,
            user_id=user_id,
            settings=settings
        )
        
        logger.info(f"Updated settings for project {project_id}")
        
        return {
            "project_id": project_id,
            "settings": updated_settings
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update project settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update settings")

@router.get("/projects/{project_id}/script")
def get_project_script(
    project_id: str,
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Get project script data."""
    try:
        # Ensure user exists and create if needed
        user = user_safety_service.ensure_user_exists(db, user_id)
        
        # Ensure project folders exist
        user_safety_service.ensure_project_folders_exist(user_id, "music-clip")
        
        # Verify project exists and belongs to user
        project = db.query(Project).filter(
            Project.id == project_id, 
            Project.user_id == user_id,
            Project.type == "music-clip"
        ).first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get script data
        script_data = project_service.get_project_script(
            db=db,
            project_id=project_id,
            user_id=user_id
        )
        
        return script_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project script: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get project script")

@router.get("/projects/{project_id}/tracks")
def get_project_tracks(
    project_id: str,
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Get all tracks for a music-clip project."""
    try:
        # Ensure user exists and create if needed
        user = user_safety_service.ensure_user_exists(db, user_id)
        
        # Ensure project folders exist
        user_safety_service.ensure_project_folders_exist(user_id, "music-clip")
        
        # Verify project exists and belongs to user
        project = db.query(Project).filter(
            Project.id == project_id, 
            Project.user_id == user_id,
            Project.type == "music-clip"
        ).first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get tracks from database
        tracks = project_service.get_project_tracks(db=db, project_id=project_id)
        
        return {
            "project_id": project_id,
            "tracks": [
                {
                    "id": str(track.id),
                    "title": track.title,
                    "file_path": track.file_path,
                    "ai_generated": track.ai_generated,
                    "prompt": track.prompt,
                    "genre": track.genre,
                    "instrumental": track.instrumental,
                    "video_description": track.video_description,
                    "description": track.description,
                    "vibe": track.vibe,
                    "status": track.status,
                    "metadata": track.track_metadata or {},
                    "created_at": track.created_at.isoformat()
                }
                for track in tracks
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get project tracks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get project tracks")

@router.patch("/projects/{project_id}/tracks/{track_id}")
def update_track(
    project_id: str,
    track_id: str,
    updates: Dict[str, Any],
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Update a track's metadata."""
    try:
        # Ensure user exists and create if needed
        user = user_safety_service.ensure_user_exists(db, user_id)
        
        # Ensure project folders exist
        user_safety_service.ensure_project_folders_exist(user_id, "music-clip")
        
        # Verify project exists and belongs to user
        project = db.query(Project).filter(
            Project.id == project_id, 
            Project.user_id == user_id,
            Project.type == "music-clip"
        ).first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get the track
        track = db.query(Track).filter(
            Track.id == track_id,
            Track.project_id == project_id
        ).first()
        
        if not track:
            raise HTTPException(status_code=404, detail="Track not found")
        
        # Update track fields
        if "video_description" in updates:
            track.video_description = updates["video_description"]
        if "genre" in updates:
            track.genre = updates["genre"]
        if "prompt" in updates:
            track.prompt = updates["prompt"]
        if "instrumental" in updates:
            track.instrumental = updates["instrumental"]
        
        db.commit()
        db.refresh(track)
        
        logger.info(f"Updated track {track_id} in project {project_id}")
        
        return {
            "track_id": str(track.id),
            "video_description": track.video_description,
            "genre": track.genre,
            "prompt": track.prompt,
            "instrumental": track.instrumental
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update track: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update track")

@router.get("/projects/{project_id}/tracks/{track_id}/url")
def get_track_url(
    project_id: str,
    track_id: str,
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Get a presigned URL for a track file."""
    try:
        # Ensure user exists and create if needed
        user = user_safety_service.ensure_user_exists(db, user_id)
        
        # Ensure project folders exist
        user_safety_service.ensure_project_folders_exist(user_id, "music-clip")
        
        # Verify project exists and belongs to user
        project = db.query(Project).filter(
            Project.id == project_id, 
            Project.user_id == user_id,
            Project.type == "music-clip"
        ).first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get the track
        track = db.query(Track).filter(
            Track.id == track_id,
            Track.project_id == project_id
        ).first()
        
        if not track:
            raise HTTPException(status_code=404, detail="Track not found")
        
        # Generate presigned URL for the track file
        try:
            # Extract the S3 key from the file path
            if track.file_path.startswith("file://"):
                # For local files, return the file path directly
                url = track.file_path.replace("file://", "")
            elif track.file_path.startswith("http://") or track.file_path.startswith("https://"):
                # For files that already have URLs, return them directly
                url = track.file_path
            else:
                # For S3 files, generate a presigned URL
                # The file_path should contain the S3 key
                url = storage_service.get_presigned_url(track.file_path, expiration=3600)
            
            logger.info(f"Generated URL for track {track_id}: {url}")
            
            return {
                "url": url
            }
            
        except Exception as e:
            logger.error(f"Failed to generate URL for track {track_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to generate track URL")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get track URL: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get track URL")

@router.delete("/projects/{project_id}")
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Delete a specific music-clip project."""
    try:
        # Ensure user exists and create if needed
        user = user_safety_service.ensure_user_exists(db, user_id)
        
        # Verify project exists and belongs to user
        project = db.query(Project).filter(
            Project.id == project_id, 
            Project.user_id == user_id,
            Project.type == "music-clip"
        ).first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Delete associated tracks
        tracks_deleted = db.query(Track).filter(Track.project_id == project_id).delete()
        
        # Delete the project
        db.delete(project)
        db.commit()
        
        logger.info(f"Deleted project {project_id} and {tracks_deleted} associated tracks for user {user_id}")
        
        return {
            "message": f"Successfully deleted project '{project.name}'",
            "project_id": project_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete project {project_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")

@router.delete("/projects/reset")
def reset_user_projects(
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Reset all projects for the user - clears backend memory."""
    try:
        # Ensure user exists and create if needed
        user = user_safety_service.ensure_user_exists(db, user_id)
        
        # Delete all music-clip projects for the user
        projects_to_delete = db.query(Project).filter(
            Project.user_id == user_id,
            Project.type == "music-clip"
        ).all()
        
        deleted_count = 0
        for project in projects_to_delete:
            # Delete associated tracks
            db.query(Track).filter(Track.project_id == str(project.id)).delete()
            # Delete the project
            db.delete(project)
            deleted_count += 1
        
        db.commit()
        
        logger.info(f"Reset completed: deleted {deleted_count} projects for user {user_id}")
        
        return {
            "message": f"Successfully reset {deleted_count} projects",
            "deleted_count": deleted_count,
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Failed to reset projects: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reset projects: {str(e)}")
