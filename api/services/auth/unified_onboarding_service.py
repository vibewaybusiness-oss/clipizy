"""
Unified Onboarding Service - Handles both email and OAuth user creation with consistent process
"""
import os
import uuid
import json
from pathlib import Path
from typing import Optional, Dict, Any, Union
from sqlalchemy.orm import Session
from api.models import User
from api.schemas import UserCreate
from api.services.auth.auth_service import auth_service
from api.config.logging import get_project_logger

logger = get_project_logger()

class UnifiedOnboardingService:
    def __init__(self):
        logger.info("UnifiedOnboardingService initialized")
        self.base_users_dir = Path("users")
        self.base_users_dir.mkdir(exist_ok=True)

    def generate_email_based_uuid(self, email: str) -> str:
        """Generate a deterministic UUID based on email address"""
        namespace = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')  # DNS namespace
        return str(uuid.uuid5(namespace, email.lower().strip()))

    def onboard_user(
        self, 
        db: Session, 
        email: str, 
        name: Optional[str] = None,
        password: Optional[str] = None,
        oauth_provider: Optional[str] = None,
        oauth_data: Optional[Dict[str, Any]] = None
    ) -> User:
        """
        Unified onboarding process for both email and OAuth users
        
        Args:
            db: Database session
            email: User's email address
            name: User's display name
            password: User's password (for email users)
            oauth_provider: OAuth provider name (google, github, etc.)
            oauth_data: Additional OAuth data (avatar, provider_id, etc.)
        
        Returns:
            User: Created or updated user
        """
        logger.info(f"Starting unified onboarding for: {email}")
        
        try:
            # 1. Check if user already exists
            existing_user = db.query(User).filter(User.email == email).first()
            
            if existing_user:
                logger.info(f"User already exists, updating info: {email}")
                return self._update_existing_user(db, existing_user, name, oauth_provider, oauth_data)
            
            # 2. Generate email-based UUID
            user_id = self.generate_email_based_uuid(email)
            logger.info(f"Generated email-based UUID: {user_id}")
            
            # 3. Create user in database
            user = self._create_database_user(db, email, name, password, oauth_provider, oauth_data, user_id)
            if not user:
                raise Exception("Failed to create database user")
            
            # 4. Complete user setup
            self._complete_user_setup(db, user, oauth_data)
            
            logger.info(f"✅ Unified onboarding successful for: {user.email} (ID: {user.id})")
            return user
            
        except Exception as e:
            logger.error(f"❌ Unified onboarding failed for {email}: {str(e)}")
            db.rollback()
            raise

    def _update_existing_user(
        self, 
        db: Session, 
        user: User, 
        name: Optional[str], 
        oauth_provider: Optional[str], 
        oauth_data: Optional[Dict[str, Any]]
    ) -> User:
        """Update existing user with new information"""
        try:
            updated = False
            
            # Update name if provided and not set
            if name and not user.username:
                user.username = name
                updated = True
            
            # Update OAuth provider info
            if oauth_provider:
                if not user.settings:
                    user.settings = {}
                
                user.settings["oauth_provider"] = oauth_provider
                user.settings["created_via"] = "oauth"
                updated = True
                
                # Store provider-specific data
                if oauth_data:
                    if oauth_provider == "google" and oauth_data.get("google_id"):
                        user.settings["google_id"] = oauth_data["google_id"]
                    elif oauth_provider == "github" and oauth_data.get("github_id"):
                        user.settings["github_id"] = oauth_data["github_id"]
                    
                    # Update avatar if provided
                    if oauth_data.get("picture") and not user.avatar_url:
                        user.avatar_url = oauth_data["picture"]
                        updated = True
            
            if updated:
                db.commit()
                logger.info(f"Updated existing user: {user.email}")
            
            return user
            
        except Exception as e:
            logger.error(f"Failed to update existing user {user.email}: {str(e)}")
            db.rollback()
            raise

    def _create_database_user(
        self, 
        db: Session, 
        email: str, 
        name: Optional[str], 
        password: Optional[str], 
        oauth_provider: Optional[str], 
        oauth_data: Optional[Dict[str, Any]], 
        user_id: str
    ) -> Optional[User]:
        """Create user in database"""
        try:
            # Hash password if provided
            hashed_password = None
            if password:
                hashed_password = auth_service.get_password_hash(password)
            
            # Build user settings
            settings = {
                "created_via": "oauth" if oauth_provider else "email",
                "preferences": {
                    "theme": "system",
                    "notifications": True,
                    "language": "en"
                }
            }
            
            if oauth_provider:
                settings["oauth_provider"] = oauth_provider
                
                # Store provider-specific data
                if oauth_data:
                    if oauth_provider == "google" and oauth_data.get("google_id"):
                        settings["google_id"] = oauth_data["google_id"]
                    elif oauth_provider == "github" and oauth_data.get("github_id"):
                        settings["github_id"] = oauth_data["github_id"]
            
            # Create user
            db_user = User(
                id=user_id,
                email=email,
                hashed_password=hashed_password,
                username=name,
                is_active=True,
                is_verified=oauth_provider is not None,  # OAuth users are pre-verified
                avatar_url=oauth_data.get("picture") if oauth_data else None,
                settings=settings
            )
            
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            logger.info(f"Database user created: {email} (ID: {db_user.id})")
            return db_user
            
        except Exception as e:
            logger.error(f"Database user creation failed: {str(e)}")
            db.rollback()
            return None

    def _complete_user_setup(self, db: Session, user: User, oauth_data: Optional[Dict[str, Any]]):
        """Complete user setup with directory structure and storage"""
        try:
            user_id = str(user.id)
            
            # 1. Create user directory structure
            self._create_user_directory_structure(user_id)
            
            # 2. Initialize user profile files
            self._initialize_user_profile(user_id, user)
            
            # 3. Create user-specific storage structure
            self._create_user_storage_structure(user_id)
            
            # 4. Initialize user settings in database
            self._initialize_user_settings(db, user)
            
            logger.info(f"User setup completed for: {user.email}")
            
        except Exception as e:
            logger.error(f"Failed to complete user setup for {user.email}: {str(e)}")
            raise

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
                "notifications"
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

    def _initialize_user_profile(self, user_id: str, user: User):
        """Initialize user profile files"""
        try:
            user_dir = self.base_users_dir / user_id
            
            # Create profile.json
            profile_data = {
                "user_id": user_id,
                "email": user.email,
                "username": user.username,
                "created_at": str(uuid.uuid4()),  # Will be replaced with actual timestamp
                "profile": {
                    "display_name": user.username,
                    "bio": "",
                    "avatar_url": user.avatar_url or "",
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
                user.settings = {}
            
            # Ensure all required settings are present
            default_settings = {
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
            
            # Merge with existing settings
            for key, value in default_settings.items():
                if key not in user.settings:
                    user.settings[key] = value
                elif isinstance(value, dict) and isinstance(user.settings[key], dict):
                    # Merge nested dictionaries
                    for sub_key, sub_value in value.items():
                        if sub_key not in user.settings[key]:
                            user.settings[key][sub_key] = sub_value
            
            db.commit()
            logger.info(f"User settings initialized for: {user.email}")
            
        except Exception as e:
            logger.error(f"Failed to initialize user settings: {str(e)}")
            # Don't raise as this is not critical

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
unified_onboarding_service = UnifiedOnboardingService()
