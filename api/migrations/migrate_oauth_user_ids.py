"""
Migration script to convert OAuth users from provider IDs to email-based UUIDs
"""
import os
import sys
import uuid
import logging
from pathlib import Path

# Add the parent directory to the path so we can import our modules
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy.orm import Session
from api.db import SessionLocal
from api.models import User
from api.services.auth.oauth_service import OAuthService

logger = logging.getLogger(__name__)

def generate_email_based_uuid(email: str) -> str:
    """Generate a deterministic UUID based on email address"""
    namespace = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')  # DNS namespace
    return str(uuid.uuid5(namespace, email.lower().strip()))

def migrate_oauth_user_ids():
    """Migrate OAuth users from provider IDs to email-based UUIDs"""
    db = SessionLocal()
    
    try:
        # Find users that might have provider IDs (numeric strings)
        users_to_migrate = []
        
        # Get all users
        all_users = db.query(User).all()
        
        for user in all_users:
            user_id_str = str(user.id)
            
            # Check if the user ID looks like a provider ID (numeric and long)
            if user_id_str.isdigit() and len(user_id_str) > 10:
                users_to_migrate.append(user)
                logger.info(f"Found user to migrate: {user.email} (ID: {user.id})")
        
        if not users_to_migrate:
            logger.info("No OAuth users found that need migration")
            return
        
        logger.info(f"Found {len(users_to_migrate)} users to migrate")
        
        # Migrate each user
        for user in users_to_migrate:
            try:
                old_id = str(user.id)
                new_id = generate_email_based_uuid(user.email)
                
                logger.info(f"Migrating user {user.email}: {old_id} -> {new_id}")
                
                # Check if a user with the new ID already exists
                existing_user = db.query(User).filter(User.id == new_id).first()
                if existing_user:
                    logger.warning(f"User with new ID {new_id} already exists for {user.email}")
                    continue
                
                # Update the user ID
                user.id = new_id
                
                # Update any references in settings
                if user.settings and isinstance(user.settings, dict):
                    # Store the old provider ID for reference
                    if 'google_id' not in user.settings and 'github_id' not in user.settings:
                        # Try to determine provider from old ID format
                        if len(old_id) > 15:  # Google IDs are typically longer
                            user.settings['google_id'] = old_id
                        else:
                            user.settings['github_id'] = old_id
                
                db.commit()
                logger.info(f"✅ Successfully migrated user {user.email}")
                
            except Exception as e:
                logger.error(f"❌ Failed to migrate user {user.email}: {str(e)}")
                db.rollback()
                continue
        
        logger.info("Migration completed")
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔄 Starting OAuth User ID Migration")
    print("This will convert OAuth users from provider IDs to email-based UUIDs")
    
    # Ask for confirmation
    response = input("Do you want to proceed? (y/N): ").strip().lower()
    if response != 'y':
        print("Migration cancelled")
        sys.exit(0)
    
    migrate_oauth_user_ids()
    print("✅ Migration completed")
