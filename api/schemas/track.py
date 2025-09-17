from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

class TrackBase(BaseModel):
    prompt: Optional[str] = None
    title: Optional[str] = None
    ai_generated: bool = False
    description: Optional[str] = None

class TrackCreate(TrackBase):
    pass

class TrackRead(TrackBase):
    id: UUID
    project_id: UUID
    user_id: UUID
    file_path: str
    duration: Optional[float] = None
    format: Optional[str] = None
    size_mb: Optional[float] = None
    created_at: datetime

    class Config:
        orm_mode = True