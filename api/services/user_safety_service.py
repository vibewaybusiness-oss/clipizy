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
        """Ensure a user exists, return None if not found (no auto-creation)"""
        try:
            # Try to find existing user
            user = db.query(User).filter(User.id == user_id).first()

            if user:
                logger.debug(f"User {user_id} found")
                return user

            # User not found - return None instead of creating
            logger.warning(f"User {user_id} not found")
            return None

        except Exception as e:
            logger.error(f"Error finding user: {str(e)}")
            return None

    def ensure_project_folders_exist(self, user_id: str, project_type: str = "music-clip"):
        """Ensure project folders exist in S3 storage"""
        try:
            # Import S3Storage here to avoid circular imports
            from api.storage.s3 import S3Storage
            from api.config.settings import settings

            # Initialize S3 storage
            s3_storage = S3Storage(
                bucket=settings.s3_bucket,
                endpoint_url=settings.s3_endpoint_url,
                access_key=settings.s3_access_key,
                secret_key=settings.s3_secret_key
            )

            # Define the S3 folder structure
            base_path = f"users/{user_id}/{project_type}"

            # Create folders in S3 if they don't exist
            folders_to_create = [
                f"{base_path}/",
                f"{base_path}/projects/",
                f"{base_path}/temp/",
                f"{base_path}/exports/"
            ]

            for folder in folders_to_create:
                # Create empty object to represent folder in S3
                try:
                    s3_storage.s3.put_object(
                        Bucket=settings.s3_bucket,
                        Key=folder,
                        Body=b''
                    )
                    logger.info(f"Created S3 folder: {folder}")
                except Exception as folder_error:
                    # Folder might already exist, which is fine
                    logger.debug(f"S3 folder {folder} already exists or creation failed: {folder_error}")

            logger.info(f"Ensured S3 project folders exist for user {user_id}")

        except Exception as e:
            logger.error(f"Error creating S3 project folders: {str(e)}")
            # Don't raise the exception as this is not critical for functionality
            logger.warning("Continuing without S3 folder creation - folders will be created on first file upload")

# Create a default instance
user_safety_service = UserSafetyService()
