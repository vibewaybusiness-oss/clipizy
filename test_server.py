#!/usr/bin/env python3
"""
Simple test script to start the server and see error messages
"""
import os
import sys
import traceback

# Set environment variables
os.environ["DATABASE_URL"] = "sqlite:///./clipizy.db"
os.environ["DEBUG"] = "true"

try:
    print("🚀 Starting server...")
    from api.main import app
    print("✅ App imported successfully")
    
    import uvicorn
    print("🚀 Starting uvicorn server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
    
except Exception as e:
    print(f"❌ Error starting server: {e}")
    print(f"❌ Traceback: {traceback.format_exc()}")
    sys.exit(1)