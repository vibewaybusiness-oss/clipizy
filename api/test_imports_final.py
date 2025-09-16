#!/usr/bin/env python3
"""
Final test to verify all imports work correctly
"""
try:
    print("Testing all imports...")
    
    # Test config
    from config import settings
    print("✅ Config imported successfully")
    
    # Test database
    from db import get_db, create_tables
    print("✅ Database imported successfully")
    
    # Test models
    from models import Project, User, Job
    print("✅ Models imported successfully")
    
    # Test schemas
    from schemas import (
        ProjectCreate, ProjectResponse, ProjectListResponse, ProjectStatusResponse,
        UserCreate, UserResponse, UserLogin, Token, TokenData,
        JobCreate, JobResponse, JobStatusResponse, JobListResponse
    )
    print("✅ All schemas imported successfully")
    
    # Test services
    from services import storage_service, analysis_service, runpod_service, auth_service
    print("✅ All services imported successfully")
    
    # Test main app
    from main import app
    print("✅ FastAPI app imported successfully")
    
    print("\n🎉 ALL IMPORTS SUCCESSFUL! 🎉")
    print("You can now run: python start.py")
    print("API will be available at: http://localhost:8000")
    print("API docs will be at: http://localhost:8000/docs")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
