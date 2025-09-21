#!/usr/bin/env python3
"""
Script to create a default user for development
"""
import uuid
import sys
from pathlib import Path

# Add the parent directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.db import get_db, create_tables
from api.models import User
from api.services.auth_service import auth_service
from api.fallback_db import setup_fallback_database

def create_default_user():
    """Create a default user with the hardcoded ID used in music-clip router"""
    # Set up fallback database first
    setup_fallback_database()
    
    # Create tables using SQLite engine directly
    from api.fallback_db import create_fallback_engine
    from api.db import Base
    engine = create_fallback_engine()
    Base.metadata.create_all(bind=engine)
    
    # Create session using SQLite engine
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.id == uuid.UUID("00000000-0000-0000-0000-000000000001")).first()
        if existing_user:
            print("✅ Default user already exists")
            return existing_user
        
        # Create the default user
        default_user = User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            email="demo@clipizi.com",
            username="Demo User",
            hashed_password=auth_service.get_password_hash("demo123"),
            is_active=True,
            is_verified=True,
            plan="free"
        )
        
        db.add(default_user)
        db.commit()
        db.refresh(default_user)
        
        print("✅ Default user created successfully")
        print(f"   Email: demo@clipizi.com")
        print(f"   Password: demo123")
        print(f"   User ID: {default_user.id}")
        
        return default_user
        
    except Exception as e:
        print(f"❌ Error creating default user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_default_user()
