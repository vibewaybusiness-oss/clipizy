#!/usr/bin/env python3
"""
Quick test to identify missing imports
"""
try:
    print("Testing individual imports...")
    
    # Test config
    from config import settings
    print("✅ Config imported successfully")
    
    # Test database
    from db import get_db, create_tables
    print("✅ Database imported successfully")
    
    # Test models one by one
    from models.project import Project, ProjectStatus
    print("✅ Project model imported successfully")
    
    from models.user import User
    print("✅ User model imported successfully")
    
    from models.job import Job, JobStatus, JobType
    print("✅ Job model imported successfully")
    
    # Test schemas one by one
    from schemas.project import ProjectCreate, ProjectResponse
    print("✅ Project schemas imported successfully")
    
    from schemas.user import UserCreate, UserResponse, Token
    print("✅ User schemas imported successfully")
    
    from schemas.job import JobCreate, JobResponse
    print("✅ Job schemas imported successfully")
    
    # Test services one by one
    from services.storage import storage_service
    print("✅ Storage service imported successfully")
    
    from services.analysis import analysis_service
    print("✅ Analysis service imported successfully")
    
    from services.runpod import runpod_service
    print("✅ RunPod service imported successfully")
    
    from services.auth import auth_service
    print("✅ Auth service imported successfully")
    
    print("\n🎉 All individual imports successful!")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
