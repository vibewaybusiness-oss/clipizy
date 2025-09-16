"""
Project schemas for API requests and responses
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
try:
    from ..models.project import ProjectStatus
except ImportError:
    from models.project import ProjectStatus


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    settings: Optional[Dict[str, Any]] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    settings: Optional[Dict[str, Any]] = None


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    status: ProjectStatus
    audio_file_path: Optional[str]
    video_file_path: Optional[str]
    thumbnail_path: Optional[str]
    music_analysis: Optional[Dict[str, Any]]
    video_analysis: Optional[Dict[str, Any]]
    settings: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool


class ProjectStatusResponse(BaseModel):
    project_id: str
    status: ProjectStatus
    progress: Optional[int] = None
    current_step: Optional[str] = None
    estimated_completion: Optional[datetime] = None
    error_message: Optional[str] = None


class ProjectUploadResponse(BaseModel):
    project_id: str
    upload_url: str
    fields: Dict[str, str]
    expires_in: int
