"""
Job models for Vibewave Backend
"""
from sqlalchemy import Column, String, DateTime, Text, JSON, ForeignKey, Enum, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
try:
    from ..db import Base
except ImportError:
    from db import Base


class JobType(str, enum.Enum):
    MUSIC_ANALYSIS = "music_analysis"
    VIDEO_GENERATION = "video_generation"
    AUDIO_PROCESSING = "audio_processing"
    RENDER = "render"


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    job_type = Column(Enum(JobType), nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    
    # Job configuration
    config = Column(JSON, nullable=True)
    priority = Column(Integer, default=0, nullable=False)
    
    # Execution details
    runpod_pod_id = Column(String(255), nullable=True)
    runpod_job_id = Column(String(255), nullable=True)
    worker_node = Column(String(255), nullable=True)
    
    # Results
    output_paths = Column(JSON, nullable=True)
    logs = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Progress tracking
    progress_percentage = Column(Integer, default=0, nullable=False)
    estimated_completion = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    project = relationship("Project", back_populates="jobs")
    
    def __repr__(self):
        return f"<Job(id={self.id}, type={self.job_type}, status={self.status})>"
