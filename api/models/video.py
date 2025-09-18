import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from api.db import Base

class Video(Base):
    __tablename__ = "videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    file_path = Column(String, nullable=False)   # e.g. video/video1.mp4
    type = Column(String, default="draft")       # draft | final
    status = Column(String, default="pending")   # pending | processing | complete
    prompts = Column(Text, nullable=True)        # JSON string with generation metadata

    # 📊 Metadata
    duration = Column(Integer, nullable=True)    # in seconds
    format = Column(String, nullable=True)       # mp4 | mov | avi
    resolution = Column(String, nullable=True)   # 720p | 1080p | 4k
    aspect_ratio = Column(String, nullable=True) # 16:9 | 9:16 | 1:1
    size_mb = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="videos")