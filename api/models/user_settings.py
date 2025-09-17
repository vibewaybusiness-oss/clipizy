class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # music-clip | video-clip | short-clip | global
    settings = Column(JSON, nullable=True)  
    # Example:
    # { "default_duration": 30, "resolution": "1080p", "thumbnail_style": "neon" }