#!/usr/bin/env python3
"""
Fallback database configuration for when PostgreSQL is not available
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

def get_fallback_database_url():
    """
    Get SQLite database URL as fallback
    """
    db_path = os.path.join(os.path.dirname(__file__), "..", "clipizi_fallback.db")
    return f"sqlite:///{db_path}"

def create_fallback_engine():
    """
    Create SQLAlchemy engine for SQLite fallback
    """
    database_url = get_fallback_database_url()
    engine = create_engine(
        database_url,
        echo=False,
        pool_pre_ping=True,
        connect_args={"check_same_thread": False}  # SQLite specific
    )
    return engine

def setup_fallback_database():
    """
    Set up fallback SQLite database
    """
    print("🔄 Setting up fallback SQLite database...")
    
    # Set environment variable to use SQLite
    os.environ["DATABASE_URL"] = get_fallback_database_url()
    
    print("✅ Fallback SQLite database ready!")
    return True

if __name__ == "__main__":
    setup_fallback_database()
