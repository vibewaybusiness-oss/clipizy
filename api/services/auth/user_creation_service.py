"""
User Creation Service - Comprehensive user setup with directory structure
"""
import os
import uuid
import json
from pathlib import Path
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from api.models import User
from api.schemas import UserCreate
from api.services.auth.auth_service import auth_service
from api.config.logging import get_project_logger

logger = get_project_logger()

class UserCreationService:
    def __init__(self):
        logger.info("UserCreationService initialized")
        self.base_users_dir = Path("users")
        self.base_users_dir.mkdir(exist_ok=True)

    def create_user_complete(self, db: Session, user_data: UserCreate, oauth_provider: Optional[str] = None, custom_user_id: Optional[str] = None) -> User:
        """
        Create a complete user with database record and directory structure
        """
        logger.info(f"Creating complete user setup for: {user_data.email}")
        
        try:
            # 1. Create user in database
            user = self._create_database_user(db, user_data, oauth_provider, custom_user_id)
            if not user:
                raise Exception("Failed to create database user")
            
            # 2. Create user directory structure
            self._create_user_directory_structure(str(user.id))
            
            # 3. Initialize user settings and profile
            self._initialize_user_profile(str(user.id), user_data)
            
            # 4. Create user-specific storage buckets/folders
            self._create_user_storage_structure(str(user.id))
            
            # 5. Initialize user preferences and settings
            self._initialize_user_settings(db, user)
            
            logger.info(f"Complete user setup successful for: {user.email} (ID: {user.id})")
            return user
            
        except Exception as e:
            logger.error(f"Complete user creation failed for {user_data.email}: {str(e)}")
            # Cleanup on failure
            self._cleanup_user_data(db, user_data.email)
            raise

    def _create_database_user(self, db: Session, user_data: UserCreate, oauth_provider: Optional[str] = None, custom_user_id: Optional[str] = None) -> Optional[User]:
        """Create user in database"""
        try:
            # Check if user already exists (additional safety check)
            existing_user = db.query(User).filter(User.email == user_data.email).first()
            if existing_user:
                logger.warning(f"User with email {user_data.email} already exists")
                raise ValueError(f"User with email {user_data.email} already exists")
            
            # Use existing auth service for database user creation
            if oauth_provider:
                # For OAuth users, password might be empty
                hashed_password = auth_service.get_password_hash(user_data.password) if user_data.password else None
            else:
                hashed_password = auth_service.get_password_hash(user_data.password)
            
            # Create user with custom ID if provided (for OAuth users with email-based UUID)
            user_kwargs = {
                "email": user_data.email,
                "hashed_password": hashed_password,
                "username": user_data.name,
                "is_active": True,
                "is_verified": oauth_provider is not None,  # OAuth users are pre-verified
                "settings": {
                    "oauth_provider": oauth_provider,
                    "created_via": "oauth" if oauth_provider else "email",
                    "preferences": {
                        "theme": "system",
                        "notifications": True,
                        "language": "en"
                    }
                }
            }
            
            # If custom_user_id is provided, use it instead of auto-generated UUID
            if custom_user_id:
                user_kwargs["id"] = custom_user_id
            
            db_user = User(**user_kwargs)
            
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            logger.info(f"Database user created: {user_data.email} (ID: {db_user.id})")
            return db_user
            
        except ValueError as e:
            # Re-raise ValueError (email already exists)
            logger.error(f"User creation validation failed: {str(e)}")
            db.rollback()
            raise
        except Exception as e:
            logger.error(f"Database user creation failed: {str(e)}")
            db.rollback()
            return None

    def _create_user_directory_structure(self, user_id: str):
        """Create comprehensive user directory structure"""
        try:
            user_dir = self.base_users_dir / user_id
            
            # Main user directories
            directories = [
                "projects",           # User's projects
                "social-media",       # Social media accounts and content
                "profile",           # User profile and settings
                "exports",           # Exported content
                "temp",              # Temporary files
                "uploads",           # User uploads
                "backups",           # User data backups
                "logs",              # User-specific logs
            ]
            
            # Project-specific subdirectories
            project_subdirs = [
                "music-clip",
                "video-creation", 
                "social-content",
                "automation",
                "templates"
            ]
            
            # Social media subdirectories
            social_subdirs = [
                "accounts",
                "content",
                "schedules",
                "analytics",
                "templates"
            ]
            
            # Profile subdirectories
            profile_subdirs = [
                "settings",
                "billing",
                "security",
                "preferences",
                "notifications",
                "avatars"
            ]
            
            # Create main directories
            for directory in directories:
                dir_path = user_dir / directory
                dir_path.mkdir(parents=True, exist_ok=True)
                logger.debug(f"Created directory: {dir_path}")
            
            # Create project subdirectories
            for subdir in project_subdirs:
                project_dir = user_dir / "projects" / subdir
                project_dir.mkdir(parents=True, exist_ok=True)
                logger.debug(f"Created project subdirectory: {project_dir}")
            
            # Create social media subdirectories
            for subdir in social_subdirs:
                social_dir = user_dir / "social-media" / subdir
                social_dir.mkdir(parents=True, exist_ok=True)
                logger.debug(f"Created social media subdirectory: {social_dir}")
            
            # Create profile subdirectories
            for subdir in profile_subdirs:
                profile_dir = user_dir / "profile" / subdir
                profile_dir.mkdir(parents=True, exist_ok=True)
                logger.debug(f"Created profile subdirectory: {profile_dir}")
            
            logger.info(f"User directory structure created for user: {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to create user directory structure: {str(e)}")
            raise

    def _initialize_user_profile(self, user_id: str, user_data: UserCreate):
        """Initialize user profile files"""
        try:
            user_dir = self.base_users_dir / user_id
            
            # Create profile.json
            profile_data = {
                "user_id": user_id,
                "email": user_data.email,
                "username": user_data.name,
                "created_at": str(uuid.uuid4()),  # Will be replaced with actual timestamp
                "profile": {
                    "display_name": user_data.name,
                    "bio": "",
                    "avatar_url": "",
                    "website": "",
                    "location": "",
                    "timezone": "UTC"
                },
                "preferences": {
                    "theme": "system",
                    "language": "en",
                    "notifications": {
                        "email": True,
                        "push": True,
                        "marketing": False
                    },
                    "privacy": {
                        "profile_public": False,
                        "show_activity": True
                    }
                },
                "billing": {
                    "plan": "free",
                    "payment_method": None,
                    "billing_address": None,
                    "invoices": []
                },
                "security": {
                    "two_factor_enabled": False,
                    "login_history": [],
                    "api_keys": []
                }
            }
            
            profile_file = user_dir / "profile" / "profile.json"
            with open(profile_file, 'w') as f:
                json.dump(profile_data, f, indent=2)
            
            # Create settings.json
            settings_data = {
                "user_id": user_id,
                "app_settings": {
                    "default_project_type": "music-clip",
                    "auto_save": True,
                    "export_quality": "high",
                    "watermark_enabled": False
                },
                "editor_settings": {
                    "theme": "dark",
                    "font_size": 14,
                    "auto_complete": True
                },
                "notification_settings": {
                    "project_complete": True,
                    "export_ready": True,
                    "system_updates": True,
                    "marketing": False
                }
            }
            
            settings_file = user_dir / "profile" / "settings" / "settings.json"
            with open(settings_file, 'w') as f:
                json.dump(settings_data, f, indent=2)
            
            # Create billing.json
            billing_data = {
                "user_id": user_id,
                "current_plan": "free",
                "billing_info": {
                    "payment_methods": [],
                    "billing_address": None,
                    "tax_id": None
                },
                "subscription": {
                    "status": "active",
                    "next_billing_date": None,
                    "cancel_at_period_end": False
                },
                "usage": {
                    "projects_created": 0,
                    "storage_used_mb": 0,
                    "api_calls_made": 0
                }
            }
            
            billing_file = user_dir / "profile" / "billing" / "billing.json"
            with open(billing_file, 'w') as f:
                json.dump(billing_data, f, indent=2)
            
            logger.info(f"User profile files initialized for user: {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to initialize user profile: {str(e)}")
            raise

    def _create_user_storage_structure(self, user_id: str):
        """Create user-specific storage structure in S3/local storage"""
        try:
            # Import storage service here to avoid circular imports
            from api.services.storage.storage_service import storage_service
            
            # Define S3 folder structure
            base_path = f"users/{user_id}"
            
            # Create main folders in S3
            folders_to_create = [
                f"{base_path}/",
                f"{base_path}/projects/",
                f"{base_path}/projects/music-clip/",
                f"{base_path}/projects/video-creation/",
                f"{base_path}/projects/social-content/",
                f"{base_path}/projects/automation/",
                f"{base_path}/projects/templates/",
                f"{base_path}/social-media/",
                f"{base_path}/social-media/accounts/",
                f"{base_path}/social-media/content/",
                f"{base_path}/social-media/schedules/",
                f"{base_path}/social-media/analytics/",
                f"{base_path}/exports/",
                f"{base_path}/temp/",
                f"{base_path}/uploads/",
                f"{base_path}/backups/"
            ]
            
            for folder in folders_to_create:
                try:
                    storage_service.ensure_folder_exists(folder)
                    logger.debug(f"Created storage folder: {folder}")
                except Exception as folder_error:
                    logger.debug(f"Storage folder {folder} creation: {folder_error}")
            
            logger.info(f"User storage structure created for user: {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to create user storage structure: {str(e)}")
            # Don't raise as this is not critical for basic functionality
            logger.warning("Continuing without storage structure creation")

    def _initialize_user_settings(self, db: Session, user: User):
        """Initialize user settings in database"""
        try:
            # Update user with default settings if not already set
            if not user.settings:
                user.settings = {
                    "notifications": {
                        "email": True,
                        "push": True,
                        "marketing": False,
                        "weekly_digest": True,
                        "project_updates": True
                    },
                    "privacy": {
                        "profile_public": False,
                        "show_email": False,
                        "allow_comments": True,
                        "data_sharing": False,
                        "analytics_tracking": True,
                        "marketing_emails": False,
                        "profile_discovery": False,
                        "activity_visibility": "followers"
                    },
                    "security": {
                        "two_factor_enabled": False,
                        "login_notifications": True,
                        "session_timeout": 30,
                        "api_access": False,
                        "data_export": True,
                        "account_deletion": False
                    },
                    "preferences": {
                        "theme": "system",
                        "language": "en",
                        "timezone": "UTC",
                        "auto_save": True,
                        "high_quality": True
                    },
                    "billing": {
                        "plan": "free",
                        "payment_method": None
                    }
                }
                db.commit()
                logger.info(f"User settings initialized for: {user.email}")
            
        except Exception as e:
            logger.error(f"Failed to initialize user settings: {str(e)}")
            # Don't raise as this is not critical

    def _cleanup_user_data(self, db: Session, email: str):
        """Cleanup user data on creation failure"""
        try:
            # Remove user from database if created
            user = db.query(User).filter(User.email == email).first()
            if user:
                db.delete(user)
                db.commit()
                logger.info(f"Cleaned up database user: {email}")
            
            # Note: Directory cleanup could be added here if needed
            
        except Exception as e:
            logger.error(f"Cleanup failed for user {email}: {str(e)}")

    def get_user_directory_structure(self, user_id: str) -> Dict[str, Any]:
        """Get the complete user directory structure"""
        try:
            user_dir = self.base_users_dir / user_id
            
            if not user_dir.exists():
                return {"error": "User directory not found"}
            
            structure = {
                "user_id": user_id,
                "base_path": str(user_dir),
                "directories": {}
            }
            
            # Scan all directories
            for item in user_dir.iterdir():
                if item.is_dir():
                    structure["directories"][item.name] = self._scan_directory(item)
            
            return structure
            
        except Exception as e:
            logger.error(f"Failed to get user directory structure: {str(e)}")
            return {"error": str(e)}

    def _scan_directory(self, directory: Path) -> Dict[str, Any]:
        """Recursively scan directory structure"""
        result = {
            "path": str(directory),
            "files": [],
            "subdirectories": {}
        }
        
        try:
            for item in directory.iterdir():
                if item.is_file():
                    result["files"].append({
                        "name": item.name,
                        "size": item.stat().st_size,
                        "modified": item.stat().st_mtime
                    })
                elif item.is_dir():
                    result["subdirectories"][item.name] = self._scan_directory(item)
        except Exception as e:
            logger.error(f"Error scanning directory {directory}: {str(e)}")
        
        return result

# Create service instance
user_creation_service = UserCreationService()
