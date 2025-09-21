import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from api.models import Project, Track
from api.storage.json_store import JSONStore
from api.storage.metadata import extract_metadata
from api.config.logging import get_project_logger
from typing import Dict, Any, Optional, List
import os

# Initialize logger
logger = get_project_logger()

class ProjectService:
    def __init__(self, json_store: JSONStore):
        logger.info("ProjectService initialized")
        self.json_store = json_store

    def create_project(self, db: Session, user_id: str, project_type: str, name: str = None, description: str = None):
        """Create a new project as soon as user selects type."""
        project_id = str(uuid.uuid4())
        project = Project(
            id=project_id,
            user_id=user_id,
            type=project_type,
            name=name or f"{project_type}-{project_id[:8]}",
            description=description,
            status="draft",
            created_at=datetime.utcnow(),
        )
        db.add(project)
        db.commit()
        db.refresh(project)

        # Initialize empty script.json in storage
        self.json_store.save_json(
            f"users/{user_id}/{project_type}/{project_id}/script.json",
            {"steps": {"music": {}, "analysis": {}, "visuals": {}, "export": {}}}
        )

        return project

    def update_status(self, db: Session, project_id: str, new_status: str):
        """Update project status (draft → in_progress → completed → archived)."""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None
        project.status = new_status
        db.commit()
        db.refresh(project)
        return project

    def get_project(self, db: Session, project_id: str):
        return db.query(Project).filter(Project.id == project_id).first()

    def list_projects(self, db: Session, user_id: str):
        return db.query(Project).filter(Project.user_id == user_id).all()

    def create_music_clip_project(self, db: Session, user_id: str, name: str = None, description: str = None):
        """Create a new music-clip project with proper S3 structure."""
        project_id = str(uuid.uuid4())
        project = Project(
            id=project_id,
            user_id=user_id,
            type="music-clip",
            name=name or f"Music Clip {datetime.now().strftime('%d/%m/%Y')}",
            description=description or "AI-generated music video project",
            status="draft",
            created_at=datetime.utcnow(),
        )
        db.add(project)
        db.commit()
        db.refresh(project)

        # Initialize script.json with music-clip structure
        script_data = {
            "steps": {
                "music": {
                    "tracks": [],
                    "settings": {
                        "videoType": "individual",
                        "budget": [50, 200],
                        "videoStyle": "modern",
                        "animationStyle": "smooth",
                        "createIndividualVideos": True,
                        "createCompilation": False,
                        "useSameVideoForAll": False
                    }
                },
                "analysis": {},
                "visuals": {},
                "export": {}
            }
        }

        try:
            self.json_store.save_json(
                f"users/{user_id}/music-clip/projects/{project_id}/script.json",
                script_data
            )
            logger.info(f"Created script.json for project {project_id}")
        except Exception as e:
            logger.warning(f"Failed to create script.json: {e}")

        return project

    def add_music_track(self, db: Session, project_id: str, user_id: str, file_path: str,
                       file_metadata: Dict[str, Any], ai_generated: bool = False,
                       prompt: Optional[str] = None, genre: Optional[str] = None,
                       instrumental: bool = False, video_description: Optional[str] = None,
                       title: Optional[str] = None):
        """Add a music track to a music-clip project."""
        track_id = str(uuid.uuid4())
        track = Track(
            id=track_id,
            project_id=project_id,
            title=title or f"Track {track_id[:8]}",
            file_path=file_path,
            ai_generated=ai_generated,
            prompt=prompt,
            genre=genre,
            instrumental=instrumental,
            video_description=video_description,
            track_metadata=file_metadata,
            status="uploaded",
            created_at=datetime.utcnow(),
        )
        db.add(track)
        db.commit()
        db.refresh(track)

        # Update script.json with track information
        try:
            script_data = self.json_store.load_json(f"{user_id}/music-clip/projects/{project_id}/script.json")

            track_info = {
                "id": str(track.id),
                "file_path": file_path,
                "ai_generated": ai_generated,
                "prompt": prompt,
                "genre": genre,
                "instrumental": instrumental,
                "video_description": video_description,
                "metadata": file_metadata,
                "status": "uploaded",
                "created_at": track.created_at.isoformat()
            }

            script_data["steps"]["music"]["tracks"].append(track_info)

            self.json_store.save_json(
                f"{user_id}/music-clip/projects/{project_id}/script.json",
                script_data
            )
            logger.info(f"Updated script.json with track {track_id}")
        except Exception as e:
            logger.warning(f"Failed to update script.json: {e}")

        logger.info(f"Added track {track_id} to project {project_id}")
        return track

    def update_project_settings(self, db: Session, project_id: str, user_id: str, settings: Dict[str, Any]):
        """Update project settings in script.json."""
        try:
            script_data = self.json_store.load_json(f"{user_id}/music-clip/projects/{project_id}/script.json")

            # Ensure the settings structure exists
            if "steps" not in script_data:
                script_data["steps"] = {}
            if "music" not in script_data["steps"]:
                script_data["steps"]["music"] = {}
            if "settings" not in script_data["steps"]["music"]:
                script_data["steps"]["music"]["settings"] = {}

            # Update settings
            script_data["steps"]["music"]["settings"].update(settings)

            self.json_store.save_json(
                f"{user_id}/music-clip/projects/{project_id}/script.json",
                script_data
            )
            logger.info(f"Updated settings for project {project_id}")
            return {"message": "Settings updated successfully"}
        except Exception as e:
            logger.warning(f"Failed to update settings: {e}")
            return {"message": "Settings updated but script.json not updated"}

    def get_project_script(self, db: Session, project_id: str, user_id: str):
        """Get the project's script.json."""
        try:
            script_data = self.json_store.load_json(f"{user_id}/music-clip/projects/{project_id}/script.json")
            return script_data
        except Exception as e:
            logger.warning(f"Failed to load script.json: {e}")
            return {"error": "Script not found"}

    def get_project_tracks(self, db: Session, project_id: str):
        """Get all tracks for a project."""
        tracks = db.query(Track).filter(Track.project_id == project_id).all()
        return tracks