#!/usr/bin/env python3
"""
Vibewave Backend Startup Script
"""
import uvicorn
import os
import sys
import time
from pathlib import Path

# Add the parent directory to the Python path so we can import the api module
sys.path.insert(0, str(Path(__file__).parent.parent))

def check_database_health():
    """
    Check if database is ready before starting FastAPI
    """
    try:
        from api.db_health_check import check_database_connection
        return check_database_connection(max_attempts=15, delay=2)
    except Exception as e:
        print(f"❌ Database health check failed: {e}")
        return False

def setup_fallback_database():
    """
    Set up SQLite fallback database if PostgreSQL is not available
    """
    try:
        from api.fallback_db import setup_fallback_database
        setup_fallback_database()
        return True
    except Exception as e:
        print(f"❌ Failed to setup fallback database: {e}")
        return False

if __name__ == "__main__":
    # Set environment variables
    os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/vibewave")
    os.environ.setdefault("BACKEND_URL", "http://localhost:8000")
    
    print("🔍 Checking database health before starting FastAPI...")
    if not check_database_health():
        print("⚠️  PostgreSQL is not available. Trying fallback SQLite database...")
        if not setup_fallback_database():
            print("❌ Failed to setup any database. Exiting.")
            sys.exit(1)
        print("✅ Using SQLite fallback database.")
    else:
        print("✅ PostgreSQL database is ready.")
    
    print("🚀 Starting FastAPI server...")
    
    # Start the FastAPI server
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
