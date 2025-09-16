#!/usr/bin/env python3
"""
Test script to verify all imports work correctly after fixes
"""
try:
    print("Testing imports...")
    
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
    from schemas import ProjectCreate, UserCreate, JobCreate
    print("✅ Schemas imported successfully")
    
    # Test services
    from services import storage_service, analysis_service, runpod_service, auth_service
    print("✅ Services imported successfully")
    
    # Test main app
    from main import app
    print("✅ FastAPI app imported successfully")
    
    print("\n🎉 All imports successful! The API structure is correct.")
    print("You can now run: python start.py")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please check the file structure and imports.")
except Exception as e:
    print(f"❌ Error: {e}")
