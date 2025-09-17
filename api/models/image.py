import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from api.db import Base

class Image(Base):
    __tablename__ = "images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    file_path = Column(String, nullable=False)   # e.g. image/image1.png
    type = Column(String, nullable=False)        # cover | thumbnail | frame

    # 📊 Metadata
    format = Column(String, nullable=True)       # png | jpg | webp
    resolution = Column(String, nullable=True)   # e.g. "1920x1080"
    size_mb = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)