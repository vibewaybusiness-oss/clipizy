"""
User Safety Service - Ensures users and folders exist when needed
"""
import uuid
import os
from sqlalchemy.orm import Session
from api.models import User
from api.services.auth_service import auth_service
from api.config.logging import get_project_logger

logger = get_project_logger()

class UserSafetyService:
    def __init__(self):
        logger.info("UserSafetyService initialized")
    
    def ensure_user_exists(self, db: Session, user_id: str) -> User:
        """Ensure a user exists, create if not found"""
        try:
            # Try to find existing user
            user = db.query(User).filter(User.id == user_id).first()
            
            if user:
                logger.debug(f"User {user_id} already exists")
                return user
            
            # Create new user if not found
            logger.info(f"User {user_id} not found, creating new user")
            
            # Generate a unique email and username
            user_uuid = str(uuid.uuid4())[:8]
            email = f"user_{user_uuid}@vibewave.com"
            username = f"User_{user_uuid}"
            
            new_user = User(
                id=uuid.UUID(user_id),
                email=email,
                username=username,
                hashed_password=auth_service.get_password_hash("default123"),
                is_active=True,
                is_verified=True,
                plan="free"
            )
            
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            logger.info(f"Created new user: {email} (ID: {user_id})")
            return new_user
            
        except Exception as e:
            logger.error(f"Error ensuring user exists: {str(e)}")
            db.rollback()
            raise
    
    def ensure_project_folders_exist(self, user_id: str, project_type: str = "music-clip"):
        """Ensure project folders exist in storage"""
        try:
            # Define the folder structure
            base_path = f"users/{user_id}/{project_type}"
            
            # Create folders if they don't exist
            folders_to_create = [
                base_path,
                f"{base_path}/projects",
                f"{base_path}/temp",
                f"{base_path}/exports"
            ]
            
            for folder in folders_to_create:
                if not os.path.exists(folder):
                    os.makedirs(folder, exist_ok=True)
                    logger.info(f"Created folder: {folder}")
                else:
                    logger.debug(f"Folder already exists: {folder}")
            
            logger.info(f"Ensured project folders exist for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error creating project folders: {str(e)}")
            raise

# Create a default instance
user_safety_service = UserSafetyService()
