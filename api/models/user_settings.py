import uuid
from sqlalchemy import Column, String, ForeignKey, JSON
from api.db import GUID
from api.db import Base

class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # music-clip | video-clip | short-clip | global
    settings = Column(JSON, nullable=True)  
    # Example:
    # { "default_duration": 30, "resolution": "1080p", "thumbnail_style": "neon" }