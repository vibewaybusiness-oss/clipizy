import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from api.db import Base

class Track(Base):
    __tablename__ = "tracks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)   # e.g. music/track1.wav
    ai_generated = Column(Boolean, default=False)
    description = Column(String, nullable=True)
    vibe = Column(String, nullable=True)         # mood / genre tag
    lyrics = Column(String, nullable=True)       # optional lyrics text
    version = Column(Integer, default=1)

    # 📊 Metadata
    duration = Column(Integer, nullable=True)        # seconds
    format = Column(String, nullable=True)           # wav | mp3 | flac
    sample_rate = Column(Integer, nullable=True)     # e.g. 44100 Hz
    channels = Column(Integer, nullable=True)        # 1 (mono) | 2 (stereo)
    bitrate = Column(Integer, nullable=True)         # kbps
    size_mb = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)