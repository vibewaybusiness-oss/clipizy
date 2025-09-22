"""
Database migration to add credits and payments tables
Run this script to add the new tables to your database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from api.db import Base
from api.models.pricing import CreditsTransaction
from api.models.pricing import Payment
from api.config.settings import settings

def run_migration():
    """Run the migration to add credits and payments tables"""
    try:
        # Create engine
        engine = create_engine(settings.database_url, echo=True)
        
        # Create the new tables
        print("Creating credits_transactions table...")
        CreditsTransaction.__table__.create(engine, checkfirst=True)
        
        print("Creating payments table...")
        Payment.__table__.create(engine, checkfirst=True)
        
        # Add new columns to users table
        print("Adding credits columns to users table...")
        with engine.connect() as conn:
            # Check if columns already exist
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('credits_balance', 'total_credits_earned', 'total_credits_spent')
            """))
            existing_columns = [row[0] for row in result]
            
            if 'credits_balance' not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN credits_balance INTEGER DEFAULT 0 NOT NULL"))
                print("Added credits_balance column")
            
            if 'total_credits_earned' not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN total_credits_earned INTEGER DEFAULT 0 NOT NULL"))
                print("Added total_credits_earned column")
            
            if 'total_credits_spent' not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN total_credits_spent INTEGER DEFAULT 0 NOT NULL"))
                print("Added total_credits_spent column")
            
            conn.commit()
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    run_migration()
