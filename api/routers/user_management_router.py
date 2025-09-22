"""
User Management Router - Handle user directory and profile operations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from api.db import get_db
from api.models import User
from api.routers.auth_router import get_current_user
from api.services.user_creation_service import user_creation_service
from typing import Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user-management", tags=["User Management"])

@router.get("/directory-structure")
def get_user_directory_structure(
    current_user: User = Depends(get_current_user)
):
    """Get the complete directory structure for the current user"""
    try:
        structure = user_creation_service.get_user_directory_structure(str(current_user.id))
        return {
            "success": True,
            "user_id": str(current_user.id),
            "structure": structure
        }
    except Exception as e:
        logger.error(f"Error getting user directory structure: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get user directory structure"
        )

@router.post("/recreate-directory-structure")
def recreate_user_directory_structure(
    current_user: User = Depends(get_current_user)
):
    """Recreate the directory structure for the current user"""
    try:
        # Recreate directory structure
        user_creation_service._create_user_directory_structure(str(current_user.id))
        
        # Recreate storage structure
        user_creation_service._create_user_storage_structure(str(current_user.id))
        
        return {
            "success": True,
            "message": "User directory structure recreated successfully",
            "user_id": str(current_user.id)
        }
    except Exception as e:
        logger.error(f"Error recreating user directory structure: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to recreate user directory structure"
        )

@router.get("/profile-info")
def get_user_profile_info(
    current_user: User = Depends(get_current_user)
):
    """Get user profile information from files"""
    try:
        import json
        from pathlib import Path
        
        user_dir = Path("users") / str(current_user.id)
        profile_file = user_dir / "profile" / "profile.json"
        
        if profile_file.exists():
            with open(profile_file, 'r') as f:
                profile_data = json.load(f)
            return {
                "success": True,
                "profile": profile_data
            }
        else:
            return {
                "success": False,
                "message": "Profile file not found",
                "profile": None
            }
    except Exception as e:
        logger.error(f"Error getting user profile info: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get user profile information"
        )

@router.put("/profile-info")
def update_user_profile_info(
    profile_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Update user profile information in files"""
    try:
        import json
        from pathlib import Path
        
        user_dir = Path("users") / str(current_user.id)
        profile_file = user_dir / "profile" / "profile.json"
        
        # Ensure directory exists
        profile_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Update profile data
        if profile_file.exists():
            with open(profile_file, 'r') as f:
                existing_data = json.load(f)
        else:
            existing_data = {"user_id": str(current_user.id)}
        
        # Merge new data
        existing_data.update(profile_data)
        
        # Save updated profile
        with open(profile_file, 'w') as f:
            json.dump(existing_data, f, indent=2)
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "profile": existing_data
        }
    except Exception as e:
        logger.error(f"Error updating user profile info: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to update user profile information"
        )

@router.get("/settings")
def get_user_settings(
    current_user: User = Depends(get_current_user)
):
    """Get user settings from database and files"""
    try:
        import json
        from pathlib import Path
        from api.schemas.settings import DefaultSettings
        
        # Get settings from database first
        db_settings = current_user.settings or {}
        
        # Get additional settings from files
        user_dir = Path("users") / str(current_user.id)
        settings_file = user_dir / "profile" / "settings" / "settings.json"
        
        file_settings = {}
        if settings_file.exists():
            with open(settings_file, 'r') as f:
                file_settings = json.load(f)
        
        # Merge database and file settings
        merged_settings = {
            "profile": {
                "name": current_user.username or "",
                "email": current_user.email,
                "bio": current_user.bio or "",
                "website": "",
                "location": ""
            },
            "notifications": {
                "emailNotifications": db_settings.get("notifications", {}).get("email", True),
                "pushNotifications": db_settings.get("notifications", {}).get("push", True),
                "marketingEmails": db_settings.get("notifications", {}).get("marketing", False),
                "weeklyDigest": db_settings.get("notifications", {}).get("weekly_digest", True),
                "projectUpdates": db_settings.get("notifications", {}).get("project_updates", True)
            },
            "privacy": {
                "profileVisibility": db_settings.get("privacy", {}).get("profile_public", False) and "public" or "private",
                "showEmail": db_settings.get("privacy", {}).get("show_email", False),
                "allowComments": db_settings.get("privacy", {}).get("allow_comments", True),
                "dataSharing": db_settings.get("privacy", {}).get("data_sharing", False),
                "analyticsTracking": db_settings.get("privacy", {}).get("analytics_tracking", True),
                "marketingEmails": db_settings.get("privacy", {}).get("marketing_emails", False),
                "profileDiscovery": db_settings.get("privacy", {}).get("profile_discovery", False),
                "activityVisibility": db_settings.get("privacy", {}).get("activity_visibility", "followers"),
            },
            "security": {
                "twoFactorEnabled": db_settings.get("security", {}).get("two_factor_enabled", False),
                "loginNotifications": db_settings.get("security", {}).get("login_notifications", True),
                "sessionTimeout": db_settings.get("security", {}).get("session_timeout", 30),
                "apiAccess": db_settings.get("security", {}).get("api_access", False),
                "dataExport": db_settings.get("security", {}).get("data_export", True),
                "accountDeletion": db_settings.get("security", {}).get("account_deletion", False)
            },
            "preferences": {
                "theme": db_settings.get("preferences", {}).get("theme", "system"),
                "language": db_settings.get("preferences", {}).get("language", "en"),
                "timezone": db_settings.get("preferences", {}).get("timezone", "UTC"),
                "autoSave": db_settings.get("preferences", {}).get("auto_save", True),
                "highQuality": db_settings.get("preferences", {}).get("high_quality", True)
            },
            "billing": {
                "plan": current_user.plan or "free",
                "payment_methods": [],
                "billing_address": None,
                "next_billing_date": None,
                "subscription_status": "active"
            }
        }
        
        # Merge with file settings if they exist
        if file_settings:
            merged_settings.update(file_settings)
        
        return {
            "success": True,
            "settings": merged_settings
        }
    except Exception as e:
        logger.error(f"Error getting user settings: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get user settings"
        )

@router.put("/settings")
def update_user_settings(
    settings_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user settings in database and files"""
    try:
        import json
        from pathlib import Path
        from datetime import datetime
        
        # Update database settings
        if current_user.settings is None:
            current_user.settings = {}
        
        # Update profile information in database
        if "profile" in settings_data:
            profile = settings_data["profile"]
            if "name" in profile:
                current_user.username = profile["name"]
            if "bio" in profile:
                current_user.bio = profile["bio"]
        
        # Update settings in database
        db_settings = current_user.settings.copy()
        
        # Map frontend settings to database format
        if "notifications" in settings_data:
            db_settings["notifications"] = {
                "email": settings_data["notifications"].get("emailNotifications", True),
                "push": settings_data["notifications"].get("pushNotifications", True),
                "marketing": settings_data["notifications"].get("marketingEmails", False),
                "weekly_digest": settings_data["notifications"].get("weeklyDigest", True),
                "project_updates": settings_data["notifications"].get("projectUpdates", True)
            }
        
        if "privacy" in settings_data:
            db_settings["privacy"] = {
                "profile_public": settings_data["privacy"].get("profileVisibility") == "public",
                "show_email": settings_data["privacy"].get("showEmail", False),
                "allow_comments": settings_data["privacy"].get("allowComments", True),
                "data_sharing": settings_data["privacy"].get("dataSharing", False),
                "analytics_tracking": settings_data["privacy"].get("analyticsTracking", True),
                "marketing_emails": settings_data["privacy"].get("marketingEmails", False),
                "profile_discovery": settings_data["privacy"].get("profileDiscovery", False),
                "activity_visibility": settings_data["privacy"].get("activityVisibility", "followers")
            }
        
        if "security" in settings_data:
            db_settings["security"] = {
                "two_factor_enabled": settings_data["security"].get("twoFactorEnabled", False),
                "login_notifications": settings_data["security"].get("loginNotifications", True),
                "session_timeout": settings_data["security"].get("sessionTimeout", 30),
                "api_access": settings_data["security"].get("apiAccess", False),
                "data_export": settings_data["security"].get("dataExport", True),
                "account_deletion": settings_data["security"].get("accountDeletion", False)
            }
        
        if "preferences" in settings_data:
            db_settings["preferences"] = {
                "theme": settings_data["preferences"].get("theme", "system"),
                "language": settings_data["preferences"].get("language", "en"),
                "timezone": settings_data["preferences"].get("timezone", "UTC"),
                "auto_save": settings_data["preferences"].get("autoSave", True),
                "high_quality": settings_data["preferences"].get("highQuality", True)
            }
        
        # Update database
        current_user.settings = db_settings
        current_user.updated_at = datetime.utcnow()
        db.commit()
        
        # Also save to files for backup
        user_dir = Path("users") / str(current_user.id)
        settings_file = user_dir / "profile" / "settings" / "settings.json"
        
        # Ensure directory exists
        settings_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Save complete settings to file
        file_settings = {
            "user_id": str(current_user.id),
            "updated_at": datetime.utcnow().isoformat(),
            **settings_data
        }
        
        with open(settings_file, 'w') as f:
            json.dump(file_settings, f, indent=2)
        
        return {
            "success": True,
            "message": "Settings updated successfully",
            "settings": settings_data
        }
    except Exception as e:
        logger.error(f"Error updating user settings: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail="Failed to update user settings"
        )

@router.get("/billing-info")
def get_user_billing_info(
    current_user: User = Depends(get_current_user)
):
    """Get user billing information from files"""
    try:
        import json
        from pathlib import Path
        
        user_dir = Path("users") / str(current_user.id)
        billing_file = user_dir / "profile" / "billing" / "billing.json"
        
        if billing_file.exists():
            with open(billing_file, 'r') as f:
                billing_data = json.load(f)
            return {
                "success": True,
                "billing": billing_data
            }
        else:
            return {
                "success": False,
                "message": "Billing file not found",
                "billing": None
            }
    except Exception as e:
        logger.error(f"Error getting user billing info: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get user billing information"
        )

@router.put("/billing-info")
def update_user_billing_info(
    billing_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Update user billing information in files"""
    try:
        import json
        from pathlib import Path
        
        user_dir = Path("users") / str(current_user.id)
        billing_file = user_dir / "profile" / "billing" / "billing.json"
        
        # Ensure directory exists
        billing_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Update billing data
        if billing_file.exists():
            with open(billing_file, 'r') as f:
                existing_data = json.load(f)
        else:
            existing_data = {"user_id": str(current_user.id)}
        
        # Merge new data
        existing_data.update(billing_data)
        
        # Save updated billing
        with open(billing_file, 'w') as f:
            json.dump(existing_data, f, indent=2)
        
        return {
            "success": True,
            "message": "Billing information updated successfully",
            "billing": existing_data
        }
    except Exception as e:
        logger.error(f"Error updating user billing info: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to update user billing information"
        )

@router.get("/storage-usage")
def get_user_storage_usage(
    current_user: User = Depends(get_current_user)
):
    """Get user storage usage information"""
    try:
        from pathlib import Path
        
        user_dir = Path("users") / str(current_user.id)
        
        if not user_dir.exists():
            return {
                "success": False,
                "message": "User directory not found",
                "usage": None
            }
        
        # Calculate directory size
        total_size = 0
        file_count = 0
        
        for file_path in user_dir.rglob('*'):
            if file_path.is_file():
                total_size += file_path.stat().st_size
                file_count += 1
        
        return {
            "success": True,
            "usage": {
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "file_count": file_count,
                "directory_path": str(user_dir)
            }
        }
    except Exception as e:
        logger.error(f"Error getting user storage usage: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get user storage usage"
        )

@router.delete("/delete-account")
def delete_user_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user account and all associated data"""
    try:
        from pathlib import Path
        import shutil
        
        user_id = str(current_user.id)
        
        # Delete user directory
        user_dir = Path("users") / user_id
        if user_dir.exists():
            shutil.rmtree(user_dir)
            logger.info(f"Deleted user directory: {user_dir}")
        
        # Delete user from database (this will cascade delete related records)
        db.delete(current_user)
        db.commit()
        
        logger.info(f"Deleted user account: {current_user.email}")
        
        return {
            "success": True,
            "message": "Account deleted successfully"
        }
    except Exception as e:
        logger.error(f"Error deleting user account: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail="Failed to delete account"
        )

@router.get("/app-settings")
def get_app_settings(
    current_user: User = Depends(get_current_user)
):
    """Get application settings for the user"""
    try:
        db_settings = current_user.settings or {}
        
        app_settings = {
            "theme": db_settings.get("preferences", {}).get("theme", "system"),
            "language": db_settings.get("preferences", {}).get("language", "en"),
            "timezone": db_settings.get("preferences", {}).get("timezone", "UTC"),
            "soundEnabled": db_settings.get("preferences", {}).get("sound_enabled", True),
            "soundVolume": db_settings.get("preferences", {}).get("sound_volume", 70),
            "animationsEnabled": db_settings.get("preferences", {}).get("animations_enabled", True),
            "reducedMotion": db_settings.get("preferences", {}).get("reduced_motion", False),
            "autoPlay": db_settings.get("preferences", {}).get("auto_play", False),
            "quality": db_settings.get("preferences", {}).get("quality", "1080p"),
            "maxVideoLength": db_settings.get("preferences", {}).get("max_video_length", 10),
            "moderateLyrics": db_settings.get("preferences", {}).get("moderate_lyrics", False),
            "dataSaving": db_settings.get("preferences", {}).get("data_saving", False),
            "developerMode": db_settings.get("preferences", {}).get("developer_mode", False)
        }
        
        return {
            "success": True,
            "settings": app_settings
        }
    except Exception as e:
        logger.error(f"Error getting app settings: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get app settings"
        )

@router.put("/app-settings")
def update_app_settings(
    settings_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update application settings for the user"""
    try:
        if current_user.settings is None:
            current_user.settings = {}
        
        db_settings = current_user.settings.copy()
        
        # Update preferences in database
        if "preferences" not in db_settings:
            db_settings["preferences"] = {}
        
        db_settings["preferences"].update({
            "theme": settings_data.get("theme", "system"),
            "language": settings_data.get("language", "en"),
            "timezone": settings_data.get("timezone", "UTC"),
            "sound_enabled": settings_data.get("soundEnabled", True),
            "sound_volume": settings_data.get("soundVolume", 70),
            "animations_enabled": settings_data.get("animationsEnabled", True),
            "reduced_motion": settings_data.get("reducedMotion", False),
            "auto_play": settings_data.get("autoPlay", False),
            "quality": settings_data.get("quality", "1080p"),
            "max_video_length": settings_data.get("maxVideoLength", 10),
            "moderate_lyrics": settings_data.get("moderateLyrics", False),
            "data_saving": settings_data.get("dataSaving", False),
            "developer_mode": settings_data.get("developerMode", False)
        })
        
        current_user.settings = db_settings
        current_user.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "success": True,
            "message": "App settings updated successfully"
        }
    except Exception as e:
        logger.error(f"Error updating app settings: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail="Failed to update app settings"
        )

@router.get("/social-settings")
def get_social_settings(
    current_user: User = Depends(get_current_user)
):
    """Get social media settings for the user"""
    try:
        db_settings = current_user.settings or {}
        
        social_settings = {
            "autoTagClipizi": db_settings.get("social", {}).get("auto_tag_clipizi", True),
            "includeWatermark": db_settings.get("social", {}).get("include_watermark", True),
            "autoPost": db_settings.get("social", {}).get("auto_post", False),
            "postDelay": db_settings.get("social", {}).get("post_delay", 5),
            "includeHashtags": db_settings.get("social", {}).get("include_hashtags", True),
            "customHashtags": db_settings.get("social", {}).get("custom_hashtags", "#music #vibewave #ai"),
            "tagFriends": db_settings.get("social", {}).get("tag_friends", False),
            "crossPost": db_settings.get("social", {}).get("cross_post", False)
        }
        
        return {
            "success": True,
            "settings": social_settings
        }
    except Exception as e:
        logger.error(f"Error getting social settings: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get social settings"
        )

@router.put("/social-settings")
def update_social_settings(
    settings_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update social media settings for the user"""
    try:
        if current_user.settings is None:
            current_user.settings = {}
        
        db_settings = current_user.settings.copy()
        
        # Update social settings in database
        if "social" not in db_settings:
            db_settings["social"] = {}
        
        db_settings["social"].update({
            "auto_tag_clipizi": settings_data.get("autoTagClipizi", True),
            "include_watermark": settings_data.get("includeWatermark", True),
            "auto_post": settings_data.get("autoPost", False),
            "post_delay": settings_data.get("postDelay", 5),
            "include_hashtags": settings_data.get("includeHashtags", True),
            "custom_hashtags": settings_data.get("customHashtags", "#music #vibewave #ai"),
            "tag_friends": settings_data.get("tagFriends", False),
            "cross_post": settings_data.get("crossPost", False)
        })
        
        current_user.settings = db_settings
        current_user.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "success": True,
            "message": "Social settings updated successfully"
        }
    except Exception as e:
        logger.error(f"Error updating social settings: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail="Failed to update social settings"
        )

@router.get("/subscription")
def get_user_subscription(
    current_user: User = Depends(get_current_user)
):
    """Get user subscription information"""
    try:
        subscription_info = {
            "tier": current_user.plan or "free",
            "status": "active",
            "renewsAt": None,
            "billingCycle": None,
            "price": 0,
            "currency": "USD"
        }
        
        # Add pricing based on tier
        if current_user.plan == "plus":
            subscription_info["price"] = 6
            subscription_info["billingCycle"] = "monthly"
        elif current_user.plan == "pro":
            subscription_info["price"] = 18
            subscription_info["billingCycle"] = "monthly"
        elif current_user.plan == "enterprise":
            subscription_info["price"] = 48
            subscription_info["billingCycle"] = "monthly"
        
        return {
            "success": True,
            "subscription": subscription_info
        }
    except Exception as e:
        logger.error(f"Error getting subscription info: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get subscription information"
        )

@router.get("/export-data")
def export_user_data(
    current_user: User = Depends(get_current_user)
):
    """Export user data as JSON"""
    try:
        from pathlib import Path
        import json
        
        user_id = str(current_user.id)
        user_dir = Path("users") / user_id
        
        export_data = {
            "user_id": user_id,
            "email": current_user.email,
            "username": current_user.username,
            "bio": current_user.bio,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
            "last_login": current_user.last_login.isoformat() if current_user.last_login else None,
            "settings": current_user.settings or {},
            "exported_at": datetime.utcnow().isoformat()
        }
        
        # Add any additional data from user directory
        if user_dir.exists():
            export_data["user_directory"] = {
                "exists": True,
                "path": str(user_dir)
            }
        
        return Response(
            content=json.dumps(export_data, indent=2),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=clipizi-data-export-{user_id}.json"
            }
        )
    except Exception as e:
        logger.error(f"Error exporting user data: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to export user data"
        )
