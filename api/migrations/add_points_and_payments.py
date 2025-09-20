"""
Database migration to add points and payments tables
Run this script to add the new tables to your database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from api.db import Base
from api.models.points import PointsTransaction
from api.models.payment import Payment
from api.config.settings import settings

def run_migration():
    """Run the migration to add points and payments tables"""
    try:
        # Create engine
        engine = create_engine(settings.database_url, echo=True)
        
        # Create the new tables
        print("Creating points_transactions table...")
        PointsTransaction.__table__.create(engine, checkfirst=True)
        
        print("Creating payments table...")
        Payment.__table__.create(engine, checkfirst=True)
        
        # Add new columns to users table
        print("Adding points columns to users table...")
        with engine.connect() as conn:
            # Check if columns already exist
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('points_balance', 'total_points_earned', 'total_points_spent')
            """))
            existing_columns = [row[0] for row in result]
            
            if 'points_balance' not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN points_balance INTEGER DEFAULT 0 NOT NULL"))
                print("Added points_balance column")
            
            if 'total_points_earned' not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN total_points_earned INTEGER DEFAULT 0 NOT NULL"))
                print("Added total_points_earned column")
            
            if 'total_points_spent' not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN total_points_spent INTEGER DEFAULT 0 NOT NULL"))
                print("Added total_points_spent column")
            
            conn.commit()
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    run_migration()
