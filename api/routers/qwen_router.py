"""
Qwen Image Generation Router - Specialized endpoints for Qwen image generation
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import List, Optional, Dict, Any
from api.models.runpod import WorkflowInput, WorkflowResult, ComfyUIRequest
from api.services.runpod_queue import get_queue_manager

router = APIRouter(prefix="/api/qwen", tags=["comfyui_image_qwen-generation"])


@router.post("/generate", response_model=WorkflowResult)
async def generate_qwen_image(workflow_input: WorkflowInput):
    """Generate a Qwen image with optimized settings"""
    # Set default Qwen-optimized parameters if not provided
    if workflow_input.negative_prompt == "":
        workflow_input.negative_prompt = (
            "blurry, low quality, distorted, ugly, bad anatomy, bad proportions, "
            "extra limbs, missing limbs, mutated hands, poorly drawn hands, "
            "poorly drawn face, mutation, deformed, extra fingers, fewer digits, "
            "cropped, worst quality, low quality, normal quality, jpeg artifacts, "
            "signature, watermark, username, text, error, missing fingers, "
            "missing arms, missing legs, extra digit, fewer digits, cropped, "
            "worst quality, low quality, normal quality, jpeg artifacts, "
            "signature, watermark, username, blurry"
        )
    
    if workflow_input.steps == 4:  # Default value
        workflow_input.steps = 4  # Qwen-optimized for 4 steps
    
    if workflow_input.width == 1328 and workflow_input.height == 1328:  # Default values
        workflow_input.width = 1024  # More common resolution
        workflow_input.height = 1024
    
    queue_manager = get_queue_manager()
    
    # Add request to queue
    request_id = await queue_manager.add_request("comfyui_image_qwen", workflow_input)
    
    # Wait for completion (with timeout)
    import asyncio
    max_wait = 300  # 5 minutes
    start_time = asyncio.get_event_loop().time()
    
    while (asyncio.get_event_loop().time() - start_time) < max_wait:
        request = await queue_manager.get_request_status(request_id)
        
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        if request.status == "completed":
            return request.result or WorkflowResult(success=False, error="No result")
        elif request.status == "failed":
            return WorkflowResult(success=False, error=request.error or "Unknown error")
        
        await asyncio.sleep(2)  # Check every 2 seconds
    
    # Timeout
    return WorkflowResult(success=False, error="Request timeout")


@router.post("/generate-async", response_model=Dict[str, str])
async def generate_qwen_image_async(workflow_input: WorkflowInput):
    """Generate a Qwen image asynchronously"""
    # Apply Qwen optimizations
    if workflow_input.negative_prompt == "":
        workflow_input.negative_prompt = (
            "blurry, low quality, distorted, ugly, bad anatomy, bad proportions, "
            "extra limbs, missing limbs, mutated hands, poorly drawn hands, "
            "poorly drawn face, mutation, deformed, extra fingers, fewer digits, "
            "cropped, worst quality, low quality, normal quality, jpeg artifacts, "
            "signature, watermark, username, text, error, missing fingers, "
            "missing arms, missing legs, extra digit, fewer digits, cropped, "
            "worst quality, low quality, normal quality, jpeg artifacts, "
            "signature, watermark, username, blurry"
        )
    
    queue_manager = get_queue_manager()
    request_id = await queue_manager.add_request("comfyui_image_qwen", workflow_input)
    
    return {
        "request_id": request_id,
        "status": "queued",
        "message": "Qwen image generation started. Use /api/qwen/status/{request_id} to check progress."
    }


@router.get("/status/{request_id}", response_model=ComfyUIRequest)
async def get_qwen_status(request_id: str):
    """Get Qwen image generation status"""
    queue_manager = get_queue_manager()
    request = await queue_manager.get_request_status(request_id)
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return request


@router.post("/batch-generate", response_model=List[Dict[str, str]])
async def batch_generate_qwen_images(
    prompts: List[str],
    width: int = 1024,
    height: int = 1024,
    steps: int = 4,
    negative_prompt: Optional[str] = None
):
    """Generate multiple Qwen images from a list of prompts"""
    if len(prompts) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 prompts allowed per batch")
    
    default_negative = (
        "blurry, low quality, distorted, ugly, bad anatomy, bad proportions, "
        "extra limbs, missing limbs, mutated hands, poorly drawn hands, "
        "poorly drawn face, mutation, deformed, extra fingers, fewer digits, "
        "cropped, worst quality, low quality, normal quality, jpeg artifacts, "
        "signature, watermark, username, text, error, missing fingers, "
        "missing arms, missing legs, extra digit, fewer digits, cropped, "
        "worst quality, low quality, normal quality, jpeg artifacts, "
        "signature, watermark, username, blurry"
    )
    
    queue_manager = get_queue_manager()
    request_ids = []
    
    for i, prompt in enumerate(prompts):
        workflow_input = WorkflowInput(
            prompt=prompt,
            negative_prompt=negative_prompt or default_negative,
            width=width,
            height=height,
            steps=steps,
            seed=-1  # Random seed
        )
        
        request_id = await queue_manager.add_request("comfyui_image_qwen", workflow_input)
        request_ids.append({
            "request_id": request_id,
            "prompt": prompt,
            "status": "queued",
            "index": i
        })
    
    return request_ids


@router.get("/presets")
async def get_qwen_presets():
    """Get Qwen image generation presets"""
    return {
        "resolutions": [
            {"name": "Square 512x512", "width": 512, "height": 512},
            {"name": "Square 1024x1024", "width": 1024, "height": 1024},
            {"name": "Portrait 512x768", "width": 512, "height": 768},
            {"name": "Landscape 1024x512", "width": 1024, "height": 512},
            {"name": "Wide 1536x512", "width": 1536, "height": 512},
            {"name": "Ultra Wide 2048x512", "width": 2048, "height": 512}
        ],
        "steps": [
            {"name": "Fast (4 steps)", "value": 4, "description": "Recommended for Qwen"},
            {"name": "Quality (8 steps)", "value": 8, "description": "Higher quality"},
            {"name": "Ultra (12 steps)", "value": 12, "description": "Maximum quality"}
        ],
        "styles": [
            {"name": "Photorealistic", "prompt_suffix": ", photorealistic, high detail, 8k"},
            {"name": "Digital Art", "prompt_suffix": ", digital art, concept art, detailed"},
            {"name": "Anime", "prompt_suffix": ", anime style, manga, colorful"},
            {"name": "Oil Painting", "prompt_suffix": ", oil painting, artistic, brush strokes"},
            {"name": "Watercolor", "prompt_suffix": ", watercolor painting, soft colors"},
            {"name": "Sketch", "prompt_suffix": ", pencil sketch, line art, monochrome"}
        ],
        "negative_prompts": {
            "default": "blurry, low quality, distorted, ugly, bad anatomy, bad proportions, extra limbs, missing limbs, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, extra fingers, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, text, error, missing fingers, missing arms, missing legs, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
            "minimal": "blurry, low quality, distorted",
            "detailed": "blurry, low quality, distorted, ugly, bad anatomy, bad proportions, extra limbs, missing limbs, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, extra fingers, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, text, error, missing fingers, missing arms, missing legs, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, nsfw, explicit, violence, gore, blood, weapons, disturbing imagery"
        }
    }


@router.get("/examples")
async def get_qwen_examples():
    """Get example prompts for Qwen image generation"""
    return {
        "categories": {
            "landscapes": [
                "A majestic mountain range at sunset with golden light reflecting off snow-capped peaks",
                "A serene lake surrounded by autumn trees with colorful leaves",
                "A vast desert landscape with sand dunes under a starry night sky",
                "A tropical beach with crystal clear turquoise water and palm trees"
            ],
            "portraits": [
                "A professional headshot of a confident businesswoman in a modern office",
                "A portrait of an elderly man with kind eyes and weathered hands",
                "A young artist in their studio surrounded by paintings and brushes",
                "A musician playing a violin in a concert hall"
            ],
            "fantasy": [
                "A dragon soaring through clouds above a medieval castle, fantasy art style",
                "A magical forest with glowing mushrooms and fairy lights",
                "A wizard's tower with floating books and magical orbs",
                "A steampunk city with flying machines and brass architecture"
            ],
            "animals": [
                "A majestic lion with a flowing mane in the African savanna",
                "A colorful parrot perched on a tropical branch",
                "A wolf howling at the moon in a snowy forest",
                "A dolphin leaping out of crystal clear ocean water"
            ],
            "abstract": [
                "An abstract composition with flowing colors and geometric shapes",
                "A digital art piece with neon colors and futuristic elements",
                "A watercolor painting with soft, blended colors",
                "A minimalist design with clean lines and simple forms"
            ]
        },
        "tips": [
            "Be specific about the style you want (photorealistic, digital art, oil painting, etc.)",
            "Include details about lighting (golden hour, dramatic lighting, soft lighting)",
            "Specify the mood or atmosphere (peaceful, dramatic, mysterious, cheerful)",
            "Add quality descriptors (high detail, 8k, professional, artistic)",
            "Use the negative prompt to exclude unwanted elements"
        ]
    }


@router.get("/health")
async def qwen_health_check():
    """Health check for Qwen image generation service"""
    queue_manager = get_queue_manager()
    queue_status = queue_manager.get_queue_status()
    
    return {
        "status": "healthy",
        "service": "comfyui_image_qwen-generation",
        "active_pods": len(queue_status.active_pods),
        "pending_requests": len(queue_status.pending_requests),
        "completed_requests": len(queue_status.completed_requests),
        "failed_requests": len(queue_status.failed_requests)
    }
