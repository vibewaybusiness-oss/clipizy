import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    DateTime,
    Integer,
    ForeignKey,
    Enum,
    JSON,
    Float,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from api.db import Base
import enum


class JobType(str, enum.Enum):
    MUSIC_GENERATION = "music_generation"
    ANALYSIS = "analysis"
    IMAGE_GEN = "image_gen"
    VIDEO_GEN = "video_gen"
    AUDIO_GEN = "audio_gen"
    EXPORT = "export"


class JobStatus(str, enum.Enum):
    CREATED = "created"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Relations
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Job definition
    job_type = Column(Enum(JobType), nullable=False)
    step = Column(String, nullable=True)  # pipeline stage: music, analysis, visuals, export
    config = Column(JSON, nullable=True)
    priority = Column(Integer, default=0)

    # Execution tracking
    status = Column(Enum(JobStatus), default=JobStatus.CREATED, nullable=False)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=1)

    # External execution info (RunPod / GPU)
    runpod_pod_id = Column(String, nullable=True)
    runpod_job_id = Column(String, nullable=True)
    worker_node = Column(String, nullable=True)

    # Outputs
    output_paths = Column(JSON, nullable=True)  # raw paths in S3
    artifacts = Column(JSON, nullable=True)  # structured references to Tracks/Videos/etc.

    # Logs
    logs = Column(String, nullable=True)
    error_message = Column(String, nullable=True)

    # Progress
    progress_percentage = Column(Integer, default=0)
    current_step = Column(String, nullable=True)
    estimated_completion = Column(DateTime, nullable=True)

    # Resource usage
    credits_spent = Column(Integer, nullable=True)
    gpu_hours = Column(Float, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="jobs")
    user = relationship("User", back_populates="jobs")
