import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer, JSON, Text, func
from sqlalchemy.orm import relationship
from api.db import Base, GUID

class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)  # if using local auth
    
    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")
    social_accounts = relationship("SocialAccount", back_populates="user", cascade="all, delete-orphan")
    points_transactions = relationship("PointsTransaction", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")

    # Profile
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    
    # 🔑 Global settings
    settings = Column(JSON, nullable=True)  
    # Example:
    # {
    #   "default_project_type": "music-clip",
    #   "notifications": true,
    #   "preferred_format": "mp4"
    # }

    # 💰 Pricing & usage
    plan = Column(String, default="free")
    billing_id = Column(String, nullable=True)
    total_projects = Column(String(10), default="0", nullable=False)
    storage_used_bytes = Column(String(20), default="0", nullable=False)
    
    # 💎 Points system
    points_balance = Column(Integer, default=0, nullable=False)
    total_points_earned = Column(Integer, default=0, nullable=False)
    total_points_spent = Column(Integer, default=0, nullable=False)
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, username={self.username})>"
