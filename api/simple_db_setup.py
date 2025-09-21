#!/usr/bin/env python3
"""
Simple database setup script that bypasses storage services
"""
import os
import sys
import uuid
from pathlib import Path

# Add the parent directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from api.db import Base
from api.models import User

def setup_database():
    """Set up SQLite database and create default user"""
    
    # Set up SQLite database URL
    db_path = os.path.join(os.path.dirname(__file__), "..", "clipizi_fallback.db")
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
            hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/9.8Q8K2",  # demo123
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
    setup_database()
