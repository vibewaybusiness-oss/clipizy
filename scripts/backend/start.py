#!/usr/bin/env python3
"""
clipizy Backend Startup Script
"""
import uvicorn
import os
import sys
import time
from pathlib import Path

# Add the project root to the Python path so we can import the api module
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

def check_database_health():
    """
    Check if database is ready before starting FastAPI
    """
    try:
        from sqlalchemy import create_engine, text
        import time
        
        database_url = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/clipizy")
        
        # If using SQLite, no health check needed
        if database_url.startswith("sqlite://"):
            return True
            
        # For PostgreSQL, check connection
        for attempt in range(15):
            try:
                engine = create_engine(database_url)
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                print(f"✅ Database connection successful (attempt {attempt + 1})")
                return True
            except Exception as e:
                print(f"⚠️ Database connection attempt {attempt + 1} failed: {e}")
                if attempt < 14:
                    time.sleep(2)
                else:
                    print(f"❌ Database connection failed after 15 attempts")
                    return False
        return False
    except Exception as e:
        print(f"❌ Database health check failed: {e}")
        return False

def create_database_tables():
    """
    Create database tables if they don't exist
    """
    try:
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
        # Create SQLite database as fallback
        from sqlalchemy import create_engine
        from api.db import Base
        
        fallback_url = "sqlite:///./vibewave_fallback.db"
        engine = create_engine(fallback_url, echo=False)
        Base.metadata.create_all(bind=engine)
        print("✅ SQLite fallback database setup successful")
        return True
    except Exception as e:
        print(f"❌ Failed to setup fallback database: {e}")
        return False

if __name__ == "__main__":
    # Set environment variables
    # Only set default if not already set by the calling script
    if "DATABASE_URL" not in os.environ:
        os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/clipizy")
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
