import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from api.models import Project
from api.storage.json_store import JSONStore

class ProjectService:
    def __init__(self, json_store: JSONStore):
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