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

def create_default_user():
    """Create a default user with the hardcoded ID used in music-clip router"""
    # Create tables first
    create_tables()
    
    # Get database session
    db = next(get_db())
    
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
