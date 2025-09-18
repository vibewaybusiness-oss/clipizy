from fastapi import APIRouter, Query
from typing import List, Optional
from api.services.prompt_service import PromptService
from api.config.logging import get_prompt_logger

logger = get_prompt_logger()

router = APIRouter(prefix="/prompts", tags=["Prompts"])

@router.get("/random")
def get_random_prompt(
    prompt_type: str = Query(..., regex="^(music|image|video|looped_video|image_prompts|video_prompts)$"),
    categories: Optional[List[str]] = Query(None),
    source: str = Query("json", regex="^(json|gemini|runpod)$"),
    style: Optional[str] = None,
    instrumental: str = Query("false", description="Whether the music should be instrumental"),
):
    """Fetch a random prompt from JSON, Gemini, or RunPod"""
    # Convert string to boolean
    instrumental_bool = instrumental.lower() in ['true', '1', 'yes', 'on']
    logger.info(f"DEBUG: Received instrumental parameter: {instrumental} (type: {type(instrumental)}) -> converted to: {instrumental_bool}")
    logger.info(f"DEBUG: All parameters - prompt_type: {prompt_type}, categories: {categories}, source: {source}, style: {style}, instrumental: {instrumental_bool}")
    return PromptService.get_random_prompt(prompt_type, categories, source, style, instrumental_bool)