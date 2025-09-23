"""
Social Media Automation Router
REST API endcredits for social media account management and automated publishing
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from ..auth.auth_router import get_current_user
from api.db import get_db
from api.services.functionalities.social_media_service import SocialMediaService
from api.services import json_store
from api.schemas.auth.social_account import SocialAccountCreate, SocialAccountRead
from api.models import SocialAccount, Export, User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/social-media", tags=["social-media"])

# Initialize services
social_media_service = SocialMediaService(json_store)

@router.post("/connect/{platform}")
async def connect_account(
    platform: str,
    auth_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Connect a social media account via OAuth"""
    if platform not in ["youtube", "tiktok", "instagram"]:
        raise HTTPException(status_code=400, detail="Unsupported platform")

    user_id = str(current_user.id)

    try:
        social_account = await social_media_service.connect_account(
            db, user_id, platform, auth_data
        )
        return {
            "success": True,
            "account": {
                "id": str(social_account.id),
                "platform": social_account.platform,
                "account_name": social_account.account_name,
                "connected": True
            }
        }
    except Exception as e:
        logger.error(f"Failed to connect {platform} account: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/accounts")
async def get_connected_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all connected social media accounts for a user"""
    user_id = str(current_user.id)
    
    accounts = db.query(SocialAccount).filter(
        SocialAccount.user_id == user_id
    ).all()

    return {
        "accounts": [
            {
                "id": str(account.id),
                "platform": account.platform,
                "account_name": account.account_name,
                "connected": True,
                "created_at": account.created_at.isoformat()
            }
            for account in accounts
        ]
    }

@router.delete("/accounts/{account_id}")
async def disconnect_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect a social media account"""
    user_id = str(current_user.id)
    
    account = db.query(SocialAccount).filter(
        SocialAccount.id == account_id,
        SocialAccount.user_id == user_id
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    db.delete(account)
    db.commit()

    return {"success": True, "message": "Account disconnected"}

@router.post("/publish/{export_id}")
async def publish_video(
    export_id: str,
    platforms: List[str],
    publish_options: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Publish a video to one or more social media platforms"""
    user_id = str(current_user.id)
    
    # Get the export
    export = db.query(Export).filter(
        Export.id == export_id,
        Export.user_id == user_id
    ).first()

    if not export:
        raise HTTPException(status_code=404, detail="Export not found")

    # Validate platforms
    valid_platforms = ["youtube", "tiktok", "instagram"]
    invalid_platforms = [p for p in platforms if p not in valid_platforms]
    if invalid_platforms:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported platforms: {invalid_platforms}"
        )

    try:
        if len(platforms) == 1:
            # Single platform publish
            result = await social_media_service.publish_video(
                db, export, platforms[0], user_id, publish_options
            )
        else:
            # Multi-platform publish
            result = await social_media_service.batch_publish(
                db, export, platforms, user_id, publish_options
            )

        return result
    except Exception as e:
        logger.error(f"Failed to publish video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/{stats_id}")
async def get_video_analytics(
    stats_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current analytics for a published video"""
    try:
        analytics = await social_media_service.get_analytics(db, stats_id)
        return {
            "success": True,
            "analytics": analytics,
            "fetched_at": analytics.get("fetched_at")
        }
    except Exception as e:
        logger.error(f"Failed to get analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/publish/batch")
async def batch_publish_multiple_exports(
    export_ids: List[str],
    platforms: List[str],
    publish_options: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Publish multiple videos to multiple platforms"""
    results = []

    for export_id in export_ids:
        export = db.query(Export).filter(
            Export.id == export_id,
            Export.user_id == user_id
        ).first()

        if not export:
            results.append({
                "export_id": export_id,
                "success": False,
                "error": "Export not found"
            })
            continue

        try:
            result = await social_media_service.batch_publish(
                db, export, platforms, user_id, publish_options
            )
            result["export_id"] = export_id
            results.append(result)
        except Exception as e:
            results.append({
                "export_id": export_id,
                "success": False,
                "error": str(e)
            })

    return {
        "total_exports": len(export_ids),
        "results": results
    }

@router.get("/platforms")
async def get_supported_platforms():
    """Get list of supported social media platforms"""
    return {
        "platforms": [
            {
                "id": "youtube",
                "name": "YouTube",
                "description": "Upload videos to YouTube",
                "features": ["video_upload", "analytics", "monetization"]
            },
            {
                "id": "tiktok",
                "name": "TikTok",
                "description": "Upload videos to TikTok",
                "features": ["video_upload", "analytics", "trending"]
            },
            {
                "id": "instagram",
                "name": "Instagram",
                "description": "Upload videos to Instagram",
                "features": ["video_upload", "analytics", "stories", "reels"]
            }
        ]
    }

@router.post("/test-connection/{platform}")
async def test_platform_connection(
    platform: str,
    access_token: str,
    current_user: User = Depends(get_current_user)
):
    user_id = str(current_user.id)

    """Test connection to a social media platform without saving"""
    if platform not in ["youtube", "tiktok", "instagram"]:
        raise HTTPException(status_code=400, detail="Unsupported platform")

    try:
        api = social_media_service.platform_apis[platform]
        account_info = await api.get_account_info(access_token)

        return {
            "success": True,
            "platform": platform,
            "account_info": account_info
        }
    except Exception as e:
        logger.error(f"Failed to test {platform} connection: {e}")
        return {
            "success": False,
            "platform": platform,
            "error": str(e)
        }
