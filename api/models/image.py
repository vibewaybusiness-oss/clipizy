import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from api.db import GUID
from sqlalchemy.orm import relationship
from api.db import Base

class Image(Base):
    __tablename__ = "images"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    file_path = Column(String, nullable=False)   # e.g. image/image1.png
    type = Column(String, nullable=False)        # cover | thumbnail | frame

    # 📊 Metadata
    format = Column(String, nullable=True)       # png | jpg | webp
    resolution = Column(String, nullable=True)   # e.g. "1920x1080"
    size_mb = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="images")