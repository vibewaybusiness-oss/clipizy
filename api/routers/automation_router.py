"""
Automation Pipeline Router
REST API endcredits for automated content creation and publishing workflows
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
from api.routers.auth_router import get_current_user
from api.db import get_db
from api.models import User
from api.services.automation_pipeline import AutomationPipeline
from api.services import json_store
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/automation", tags=["automation"])

# Initialize services
automation_pipeline = AutomationPipeline(json_store)

@router.post("/workflows")
async def create_workflow(
    workflow_config: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create an automated workflow for content creation and publishing"""
    try:
        result = await automation_pipeline.create_automated_workflow(
            db, user_id, workflow_config
        )
        return result
    except Exception as e:
        logger.error(f"Failed to create workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/workflows/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute an automated workflow"""
    try:
        result = await automation_pipeline.execute_workflow(
            db, workflow_id, user_id
        )
        return result
    except Exception as e:
        logger.error(f"Failed to execute workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/workflows/{workflow_id}/status")
async def get_workflow_status(
    workflow_id: str,
    current_user: User = Depends(get_current_user)
):
    user_id = str(current_user.id)

    """Get the status of a workflow"""
    try:
        result = await automation_pipeline.get_workflow_status(
            workflow_id, user_id
        )
        return result
    except Exception as e:
        logger.error(f"Failed to get workflow status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/schedules")
async def create_schedule(
    workflow_config: Dict[str, Any],
    schedule: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a recurring automated workflow"""
    try:
        result = await automation_pipeline.schedule_recurring_workflow(
            db, user_id, workflow_config, schedule
        )
        return result
    except Exception as e:
        logger.error(f"Failed to create schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates")
async def get_workflow_templates():
    """Get predefined workflow templates"""
    return {
        "templates": [
            {
                "id": "daily_music_clip",
                "name": "Daily Music Clip",
                "description": "Automatically create and publish a music clip daily",
                "config": {
                    "name": "Daily Music Clip",
                    "enable_music_analysis": True,
                    "enable_video_generation": True,
                    "publish_platforms": ["youtube", "tiktok"],
                    "publish_options": {
                        "title": "Daily Music Clip - {date}",
                        "description": "Automated music clip created on {date}",
                        "privacy": "public"
                    },
                    "video_settings": {
                        "style": "modern",
                        "duration": 60
                    }
                },
                "schedule": {
                    "type": "daily",
                    "time": "09:00"
                }
            },
            {
                "id": "weekly_trending",
                "name": "Weekly Trending Content",
                "description": "Create trending content weekly based on current trends",
                "config": {
                    "name": "Weekly Trending Content",
                    "enable_music_analysis": True,
                    "enable_video_generation": True,
                    "publish_platforms": ["youtube", "instagram", "tiktok"],
                    "publish_options": {
                        "title": "Trending This Week - {date}",
                        "description": "Weekly trending content featuring the latest hits",
                        "privacy": "public"
                    },
                    "video_settings": {
                        "style": "trending",
                        "duration": 120
                    }
                },
                "schedule": {
                    "type": "weekly",
                    "day": "monday",
                    "time": "10:00"
                }
            },
            {
                "id": "monthly_compilation",
                "name": "Monthly Compilation",
                "description": "Create a monthly compilation of the best content",
                "config": {
                    "name": "Monthly Compilation",
                    "enable_music_analysis": True,
                    "enable_video_generation": True,
                    "publish_platforms": ["youtube"],
                    "publish_options": {
                        "title": "Best of {month} {year}",
                        "description": "Monthly compilation of the best music clips",
                        "privacy": "public"
                    },
                    "video_settings": {
                        "style": "compilation",
                        "duration": 300
                    }
                },
                "schedule": {
                    "type": "monthly",
                    "day": 1,
                    "time": "12:00"
                }
            }
        ]
    }

@router.post("/templates/{template_id}/create")
async def create_from_template(
    template_id: str,
    customizations: Dict[str, Any] = {},
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a workflow from a template with customizations"""
    try:
        # Get template
        templates_response = await get_workflow_templates()
        template = next(
            (t for t in templates_response["templates"] if t["id"] == template_id),
            None
        )

        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        # Merge template config with customizations
        config = template["config"].copy()
        config.update(customizations.get("config", {}))

        schedule = template["schedule"].copy()
        schedule.update(customizations.get("schedule", {}))

        # Create workflow
        workflow_result = await automation_pipeline.create_automated_workflow(
            db, user_id, config
        )

        # Create schedule if specified
        schedule_result = None
        if customizations.get("enable_scheduling", False):
            schedule_result = await automation_pipeline.schedule_recurring_workflow(
                db, user_id, config, schedule
            )

        return {
            "success": True,
            "workflow": workflow_result,
            "schedule": schedule_result,
            "template_used": template_id
        }

    except Exception as e:
        logger.error(f"Failed to create from template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics")
async def get_automation_analytics(
    current_user: User = Depends(get_current_user),
    days: int = 30
):
    user_id = str(current_user.id)

    """Get analytics for automated workflows"""
    try:
        # This would aggregate data from all workflows and their results
        # For now, return mock data
        return {
            "period_days": days,
            "total_workflows": 0,
            "successful_executions": 0,
            "failed_executions": 0,
            "total_videos_created": 0,
            "total_videos_published": 0,
            "platform_breakdown": {
                "youtube": 0,
                "tiktok": 0,
                "instagram": 0
            },
            "success_rate": 0.0
        }
    except Exception as e:
        logger.error(f"Failed to get analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
