#!/usr/bin/env python3
"""
clipizi Backend Startup Script
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

def create_database_tables():
    """
    Create database tables if they don't exist
    """
    try:
        # Check if we're using SQLite or PostgreSQL
        db_url = os.environ.get("DATABASE_URL", "sqlite:///./vibewave_fresh.db")
        if db_url.startswith("sqlite"):
            from api.fallback_db import create_fallback_engine
            from api.db import Base
            engine = create_fallback_engine()
            Base.metadata.create_all(bind=engine)
            print("✅ SQLite database tables created/verified")
        else:
            from api.db import create_tables
            create_tables()
            print("✅ Database tables created/verified")
        return True
    except Exception as e:
        print(f"❌ Failed to create database tables: {e}")
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
    # Only set default if not already set by the calling script
    if "DATABASE_URL" not in os.environ:
        os.environ.setdefault("DATABASE_URL", "sqlite:///./vibewave_fresh.db")
    os.environ.setdefault("BACKEND_URL", "http://localhost:8000")
    # Set uvicorn configuration for large request bodies
    os.environ.setdefault("UVICORN_LIMIT_MAX_REQUESTS", "1000")
    os.environ.setdefault("UVICORN_LIMIT_CONCURRENCY", "1000")
    os.environ.setdefault("UVICORN_TIMEOUT_KEEP_ALIVE", "30")

    print("🔍 Checking database health before starting FastAPI...")
    print(f"🗄️  Using database URL: {os.environ.get('DATABASE_URL', 'Not set')}")

    # Check if we're using SQLite (default) or PostgreSQL
    db_url = os.environ.get('DATABASE_URL', 'sqlite:///./vibewave_fresh.db')
    if db_url.startswith('sqlite://'):
        print("✅ Using SQLite database (no health check needed)")
        if not setup_fallback_database():
            print("❌ Failed to setup SQLite database. Exiting.")
            sys.exit(1)
    else:
        if not check_database_health():
            print("⚠️  PostgreSQL is not available. Trying fallback SQLite database...")
            if not setup_fallback_database():
                print("❌ Failed to setup any database. Exiting.")
                sys.exit(1)
            print("✅ Using SQLite fallback database.")
        else:
            print("✅ PostgreSQL database is ready.")

    # Create database tables
    print("🔧 Creating/verifying database tables...")
    if not create_database_tables():
        print("❌ Failed to create database tables. Exiting.")
        sys.exit(1)

    print("🚀 Starting FastAPI server...")

    # Start the FastAPI server
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        limit_max_requests=1000,
        limit_concurrency=1000,
        timeout_keep_alive=300,  # 5 minutes for large file uploads
        timeout_graceful_shutdown=30
    )
