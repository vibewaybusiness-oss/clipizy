#!/usr/bin/env python3
"""
Database initialization script for Vibewave
Creates tables and default user
"""
import os
import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from api.db import Base, get_database_url
# Import all models to ensure they're registered with SQLAlchemy
from api.models import *

def init_database():
    """Initialize the database with tables"""
    print("🔄 Initializing Vibewave database...")
    
    try:
        # Create database engine
        database_url = get_database_url()
        engine = create_engine(database_url, echo=False)
        
        # Create all tables
        print("📋 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully")
        
        print("📊 Database initialized successfully")
        print("ℹ️  No default users created - users must register through the application")
        
        return True
            
    except Exception as e:
        print(f"❌ Database initialization failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = init_database()
    if success:
        print("🎉 Database initialization completed successfully!")
        print("\n📝 Next steps:")
        print("1. Start the API server: python scripts/backend/start.py")
        print("2. Start the frontend: npm run dev")
        print("3. Register a new user at http://localhost:3000/auth/register")
        print("4. To create an admin user: python scripts/backend/create_admin_user.py")
    else:
        print("💥 Database initialization failed!")
        sys.exit(1)
