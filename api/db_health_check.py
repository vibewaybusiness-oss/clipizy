#!/usr/bin/env python3
"""
Database health check utility
"""
import time
import psycopg2
from sqlalchemy import create_engine
from api.config import settings

def check_database_connection(max_attempts=30, delay=2):
    """
    Check if database is ready and accepting connections
    """
    print("🔍 Checking database connection...")
    
    for attempt in range(max_attempts):
        try:
            # Try direct psycopg2 connection
            conn = psycopg2.connect(
                host="localhost",
                port=5432,
                database="clipizi",
                user="postgres",
                password="postgres"
            )
            conn.close()
            print("✅ Database connection successful!")
            return True
        except psycopg2.OperationalError as e:
            print(f"⏳ Database not ready yet (attempt {attempt + 1}/{max_attempts}): {e}")
            time.sleep(delay)
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            time.sleep(delay)
    
    print("❌ Database connection failed after all attempts")
    return False

def check_database_with_sqlalchemy():
    """
    Check database using SQLAlchemy engine
    """
    try:
        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        print("✅ SQLAlchemy database connection successful!")
        return True
    except Exception as e:
        print(f"❌ SQLAlchemy database connection failed: {e}")
        return False

if __name__ == "__main__":
    if check_database_connection():
        check_database_with_sqlalchemy()
