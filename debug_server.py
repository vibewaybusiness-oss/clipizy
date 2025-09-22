#!/usr/bin/env python3
import os
import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Set environment variables
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/clipizy"

print("🔍 Testing imports...")

try:
    print("📦 Importing FastAPI...")
    from fastapi import FastAPI
    print("✅ FastAPI imported")
    
    print("📦 Importing api.main...")
    from api.main import app
    print("✅ api.main imported")
    
    print("📦 Testing database connection...")
    from api.db import create_tables
    create_tables()
    print("✅ Database tables created")
    
    print("🚀 Starting server...")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
