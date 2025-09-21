#!/usr/bin/env python3
"""
Database and MinIO initialization script
Run this from WSL to set up the database and storage
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.db import create_tables, get_db
from api.models import User
from api.services.user_safety_service import user_safety_service
from api.services.storage_service import storage_service
import uuid
from datetime import datetime

def initialize_database():
    """Initialize database and MinIO storage"""
    print("🚀 Initializing clipizi database and storage...")
    
    try:
        # Create database tables
        print("📊 Creating database tables...")
        create_tables()
        print("✅ Database tables created/verified")
        
        # Get database session
        db = next(get_db())
        
        # Create default user if it doesn't exist
        default_user_id = "00000000-0000-0000-0000-000000000001"
        print(f"👤 Ensuring default user exists: {default_user_id}")
        try:
            user = user_safety_service.ensure_user_exists(db, default_user_id)
            print(f"✅ Default user ensured: {user.email}")
        except Exception as user_error:
            print(f"⚠️ User creation failed: {user_error}")
        
        # Initialize storage buckets
        print("🗄️ Ensuring MinIO bucket exists...")
        try:
            storage_service.ensure_bucket_exists("clipizi")
            print("✅ Storage bucket 'clipizi' ensured")
        except Exception as storage_error:
            print(f"⚠️ Storage bucket creation failed: {storage_error}")
            
        # Ensure project folders exist for default user
        print("📁 Creating project folders...")
        try:
            user_safety_service.ensure_project_folders_exist(default_user_id, "music-clip")
            print("✅ Project folders ensured for default user")
        except Exception as folder_error:
            print(f"⚠️ Project folder creation failed: {folder_error}")
            
        db.close()
        print("🎉 Database and storage initialization completed!")
        
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = initialize_database()
    if success:
        print("\n✅ Ready to start the server!")
        print("Run: python api/main.py")
    else:
        print("\n❌ Initialization failed!")
        sys.exit(1)
