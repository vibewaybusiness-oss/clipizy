#!/usr/bin/env python3
"""
Minimal database setup script that creates tables directly
"""
import os
import sys
import uuid
from pathlib import Path

# Add the parent directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text, Column, String, Boolean, Integer, DateTime, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.sqlite import CHAR
from sqlalchemy.types import TypeDecorator
import uuid

class GUID(TypeDecorator):
    """Platform-independent GUID type."""
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(value))
            else:
                return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            else:
                return value

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    last_login = Column(DateTime)
    avatar_url = Column(String(500))
    bio = Column(Text)
    settings = Column(Text)
    plan = Column(String(50), default="free")
    billing_id = Column(String(255))
    total_projects = Column(Integer, default=0)
    storage_used_bytes = Column(Integer, default=0)
    points_balance = Column(Integer, default=0)
    total_points_earned = Column(Integer, default=0)
    total_points_spent = Column(Integer, default=0)

def setup_database():
    """Set up SQLite database and create default user"""
    
    # Set up SQLite database URL with a fresh name
    db_path = os.path.join(os.path.dirname(__file__), "..", "vibewave_minimal.db")
    database_url = f"sqlite:///{db_path}"
    
    # Remove existing database file if it exists
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print(f"✅ Removed existing database: {db_path}")
        except Exception as e:
            print(f"⚠️  Could not remove existing database: {e}")
    
    # Create engine
    engine = create_engine(
        database_url,
        echo=False,
        pool_pre_ping=True,
        connect_args={"check_same_thread": False}
    )
    
    # Create all tables
    print("🔧 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        from datetime import datetime
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.id == uuid.UUID("00000000-0000-0000-0000-000000000001")).first()
        if existing_user:
            print("✅ Default user already exists")
            return existing_user
        
        # Create the default user
        now = datetime.utcnow()
        default_user = User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            email="demo@clipizi.com",
            username="Demo User",
            hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/9.8Q8K2",  # demo123
            is_active=True,
            is_verified=True,
            plan="free",
            created_at=now,
            updated_at=now,
            points_balance=1000
        )
        
        db.add(default_user)
        db.commit()
        db.refresh(default_user)
        
        print("✅ Default user created successfully")
        print(f"   Email: demo@clipizi.com")
        print(f"   Password: demo123")
        print(f"   User ID: {default_user.id}")
        print(f"   Database: {db_path}")
        
        return default_user
        
    except Exception as e:
        print(f"❌ Error creating default user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    setup_database()
