"""
Job schemas for API requests and responses
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from models.job import JobType, JobStatus


class JobCreate(BaseModel):
    project_id: str
    job_type: JobType
    config: Optional[Dict[str, Any]] = None
    priority: int = Field(default=0, ge=0, le=10)


class JobResponse(BaseModel):
    id: str
    project_id: str
    job_type: JobType
    status: JobStatus
    config: Optional[Dict[str, Any]]
    priority: int
    runpod_pod_id: Optional[str]
    runpod_job_id: Optional[str]
    worker_node: Optional[str]
    output_paths: Optional[Dict[str, str]]
    logs: Optional[str]
    error_message: Optional[str]
    progress_percentage: int
    estimated_completion: Optional[datetime]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress_percentage: int
    current_step: Optional[str] = None
    estimated_completion: Optional[datetime] = None
    error_message: Optional[str] = None


class JobListResponse(BaseModel):
    jobs: List[JobResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool
