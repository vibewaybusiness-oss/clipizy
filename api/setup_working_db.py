#!/usr/bin/env python3
"""
Set up a working SQLite database in a different location
"""
import os
import sys
import uuid
from pathlib import Path

# Set environment variable to force SQLite usage
os.environ["DATABASE_URL"] = "sqlite:///C:/temp/vibewave_working.db"

# Add the parent directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from api.db import Base
from api.models import User
from api.services.auth_service import auth_service

def setup_working_database():
    """Set up a working SQLite database in a different location"""
    
    # Create temp directory if it doesn't exist
    temp_dir = "C:/temp"
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    
    # Set up SQLite database URL in temp directory
    db_path = os.path.join(temp_dir, "vibewave_working.db")
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
        print(f"   Database: {db_path}")
        
        # Test query
        user = db.query(User).filter(User.id == uuid.UUID("00000000-0000-0000-0000-000000000001")).first()
        if user:
            print(f"✅ User query successful: {user.username}")
        else:
            print("❌ User query failed")
        
        return default_user
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    setup_working_database()
