"""
Migration to add analysis field to projects table
Run this script to add the analysis column to your database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from api.config.settings import settings

def run_migration():
    """Run the migration to add analysis column to projects table"""
    try:
        # Create engine
        engine = create_engine(settings.database_url, echo=True)

        print("Adding analysis column to projects table...")
        with engine.connect() as conn:
            # Check if column already exists
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'projects'
                AND column_name = 'analysis'
            """))
            existing_columns = [row[0] for row in result]

            if 'analysis' not in existing_columns:
                conn.execute(text("ALTER TABLE projects ADD COLUMN analysis JSON"))
                print("Added analysis column to projects table")
            else:
                print("Analysis column already exists")

            conn.commit()

        print("Migration completed successfully!")

    except Exception as e:
        print(f"Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    run_migration()
