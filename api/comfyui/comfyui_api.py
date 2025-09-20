from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
import asyncio

# Import ComfyUI manager and models
from .comfyui_manager import get_comfyui_manager
from .models import (
    WorkflowType, WorkflowRequest, WorkflowResult,
    QwenImageInput, FluxImageInput, WanVideoInput,
    MMAudioInput, VoicemakerInput, UpscalingInput, InterpolationInput
)

app = FastAPI(title="ComfyUI API", description="API for ComfyUI workflow execution")

# Global ComfyUI manager
comfyui_manager = get_comfyui_manager()

# ============================================================================
# VIDEO ENDPOINTS
# ============================================================================

@app.post("/video/wan/text-to-video")
async def generate_video_from_text(
    prompt: str,
    negative_prompt: Optional[str] = None,
    width: int = 832,
    height: int = 480,
    num_frames: int = 121,
    frame_rate: int = 16,
    seed: Optional[str] = None
):
    """Generate video from text prompt using WAN"""
    try:
        inputs = {
            "prompt": prompt,
            "negative_prompt": negative_prompt or "色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 画得不好的手部, 画得不好的脸部, 畸形的, 毁容的, 形态畸形的肢体, 手指融合, 静止不动的画面, 杂乱的背景, 三条腿, 背景人很多, 倒着走",
            "width": width,
            "height": height,
            "num_frames": num_frames,
            "frame_rate": frame_rate,
            "seed": seed
        }
        
        workflow_request = WorkflowRequest(
            workflow_type=WorkflowType.VIDEO_WAN,
            inputs=inputs
        )
        
        result = await comfyui_manager.execute_workflow(workflow_request)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video generation failed: {str(e)}")

@app.post("/video/wan/image-to-video")
async def generate_video_from_image(
    input_image_path: str,
    prompt: str,
    negative_prompt: Optional[str] = None,
    width: int = 1280,
    height: int = 720,
    num_frames: int = 81,
    frame_rate: int = 16,
    seed: Optional[str] = None,
    camera_motions: Optional[List[str]] = None,
    speed: float = 0.2
):
    """Generate video from image using WAN with camera control"""
    try:
        inputs = {
            "input_image_path": input_image_path,
            "prompt": prompt,
            "negative_prompt": negative_prompt or "色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 画得不好的手部, 画得不好的脸部, 畸形的, 毁容的, 形态畸形的肢体, 手指融合, 静止不动的画面, 杂乱的背景, 三条腿, 背景人很多, 倒着走",
            "width": width,
            "height": height,
            "num_frames": num_frames,
            "frame_rate": frame_rate,
            "seed": seed,
            "camera_motions": camera_motions or ["Static"],
            "speed": speed
        }
        
        workflow_request = WorkflowRequest(
            workflow_type=WorkflowType.VIDEO_WAN,
            inputs=inputs
        )
        
        result = await comfyui_manager.execute_workflow(workflow_request)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video generation failed: {str(e)}")

# ============================================================================
# IMAGE ENDPOINTS
# ============================================================================

@app.post("/image/qwen/generate")
async def generate_image_qwen(
    prompt: str,
    reference_image_path: Optional[str] = None,
    width: int = 1328,
    height: int = 1328,
    seed: Optional[str] = None,
    negative_prompt: Optional[str] = None
):
    """Generate or edit image using Qwen"""
    try:
        inputs = {
            "prompt": prompt,
            "reference_image_path": reference_image_path,
            "width": width,
            "height": height,
            "seed": seed,
            "negative_prompt": negative_prompt or ""
        }
        
        workflow_request = WorkflowRequest(
            workflow_type=WorkflowType.IMAGE_QWEN,
            inputs=inputs
        )
        
        result = await comfyui_manager.execute_workflow(workflow_request)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

@app.post("/image/flux/generate")
async def generate_image_flux(
    prompt: str,
    lora: Optional[str] = None,
    steps: int = 30,
    width: int = 1920,
    height: int = 1080,
    seed: Optional[str] = None,
    model: str = "flux1-schnell.safetensors",
    negative_prompt: Optional[str] = None
):
    """Generate image using Flux with optional LoRA"""
    try:
        inputs = {
            "prompt": prompt,
            "lora": lora,
            "steps": steps,
            "width": width,
            "height": height,
            "seed": seed,
            "model": model,
            "negative_prompt": negative_prompt or ""
        }
        
        workflow_request = WorkflowRequest(
            workflow_type=WorkflowType.IMAGE_FLUX,
            inputs=inputs
        )
        
        result = await comfyui_manager.execute_workflow(workflow_request)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

# ============================================================================
# AUDIO ENDPOINTS
# ============================================================================

@app.post("/audio/mmaudio/generate")
async def generate_audio_for_video(
    input_path: str,
    prompt: str,
    negative_prompt: Optional[str] = None,
    steps: int = 25,
    cfg: float = 4.5,
    seed: Optional[str] = None,
    mask_away_clip: bool = False,
    force_offload: bool = True,
    loop_count: int = 0,
    crf: int = 19,
    save_metadata: bool = True,
    trim_to_audio: bool = False
):
    """Generate audio for video using MMAudio"""
    try:
        inputs = {
            "input_path": input_path,
            "prompt": prompt,
            "negative_prompt": negative_prompt or "",
            "steps": steps,
            "cfg": cfg,
            "seed": seed,
            "mask_away_clip": mask_away_clip,
            "force_offload": force_offload,
            "loop_count": loop_count,
            "crf": crf,
            "save_metadata": save_metadata,
            "trim_to_audio": trim_to_audio
        }
        
        workflow_request = WorkflowRequest(
            workflow_type=WorkflowType.AUDIO_MMAUDIO,
            inputs=inputs
        )
        
        result = await comfyui_manager.execute_workflow(workflow_request)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio generation failed: {str(e)}")

# ============================================================================
# VOICE ENDPOINTS
# ============================================================================

@app.post("/voice/voicemaker/generate")
async def generate_voiceover(
    text: str,
    audio_input: str,
    model: str = "VibeVoice-1.5B",
    diffusion_steps: int = 20,
    seed: Optional[str] = None,
    cfg_scale: float = 1.3,
    temperature: float = 0.95,
    top_p: float = 0.95,
    use_sampling: bool = False,
    attention_type: str = "auto",
    free_memory_after_generate: bool = True
):
    """Generate voiceover using Voicemaker"""
    try:
        inputs = {
            "text": text,
            "audio_input": audio_input,
            "model": model,
            "diffusion_steps": diffusion_steps,
            "seed": seed,
            "cfg_scale": cfg_scale,
            "temperature": temperature,
            "top_p": top_p,
            "use_sampling": use_sampling,
            "attention_type": attention_type,
            "free_memory_after_generate": free_memory_after_generate
        }
        
        workflow_request = WorkflowRequest(
            workflow_type=WorkflowType.VOICE_VOICEMAKER,
            inputs=inputs
        )
        
        result = await comfyui_manager.execute_workflow(workflow_request)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice generation failed: {str(e)}")

# ============================================================================
# PROCESSING ENDPOINTS
# ============================================================================

@app.post("/processing/upscale")
async def upscale_video(
    input_path: str,
    frame_rate: float = 25.0,
    seed: Optional[str] = None
):
    """Upscale video"""
    try:
        inputs = {
            "input_path": input_path,
            "frame_rate": frame_rate,
            "seed": seed
        }
        
        workflow_request = WorkflowRequest(
            workflow_type=WorkflowType.UPSCALING,
            inputs=inputs
        )
        
        result = await comfyui_manager.execute_workflow(workflow_request)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video upscaling failed: {str(e)}")

@app.post("/processing/interpolate")
async def interpolate_video(
    input_path: str,
    multiplier: int = 4,
    target_fps: float = 24.0,
    ckpt_name: str = "rife47.pth",
    fast_mode: bool = True,
    ensemble: bool = True,
    clear_cache_after_n_frames: int = 10,
    seed: Optional[str] = None
):
    """Interpolate video frames"""
    try:
        inputs = {
            "input_path": input_path,
            "multiplier": multiplier,
            "target_fps": target_fps,
            "ckpt_name": ckpt_name,
            "fast_mode": fast_mode,
            "ensemble": ensemble,
            "clear_cache_after_n_frames": clear_cache_after_n_frames,
            "seed": seed
        }
        
        workflow_request = WorkflowRequest(
            workflow_type=WorkflowType.INTERPOLATION,
            inputs=inputs
        )
        
        result = await comfyui_manager.execute_workflow(workflow_request)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video interpolation failed: {str(e)}")

# ============================================================================
# MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/status")
async def get_status():
    """Get ComfyUI manager status"""
    try:
        return comfyui_manager.get_queue_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@app.get("/request/{request_id}")
async def get_request_status(request_id: str):
    """Get status of a specific request"""
    try:
        request = comfyui_manager.get_request(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        return request
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request status check failed: {str(e)}")

@app.get("/requests")
async def get_all_requests():
    """Get all requests"""
    try:
        return comfyui_manager.get_all_requests()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get requests: {str(e)}")

@app.get("/requests/active")
async def get_active_requests():
    """Get active requests"""
    try:
        return comfyui_manager.get_active_requests()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get active requests: {str(e)}")

@app.get("/requests/completed")
async def get_completed_requests():
    """Get completed requests"""
    try:
        return comfyui_manager.get_completed_requests()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get completed requests: {str(e)}")

@app.get("/workflows")
async def get_available_workflows():
    """Get available workflow types and configurations"""
    try:
        return {
            "workflows": comfyui_manager.config.get("workflows", {}),
            "defaults": comfyui_manager.config.get("defaults", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workflows: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ComfyUI API"}

@app.get("/health/pod/{pod_id}")
async def check_pod_health(pod_id: str):
    """Check health of a specific pod's ComfyUI instance"""
    try:
        # Get pod connection info
        from api.runpod.runpod_manager import get_queue_manager
        queue_manager = get_queue_manager()
        pod_info = await queue_manager._get_pod_public_ip(pod_id)
        
        if not pod_info.get("success"):
            return {"error": "Pod not found or not ready", "pod_id": pod_id}
        
        pod_ip = pod_info["pod"]["ip"]
        if not pod_ip:
            return {"error": "Pod has no IP address", "pod_id": pod_id}
        
        # Test ComfyUI connection
        from .comfyui_service import ComfyUIService
        async with ComfyUIService(pod_ip, pod_id=pod_id) as service:
            health_status = await service.health_check()
            return {
                "pod_id": pod_id,
                "pod_ip": pod_ip,
                "comfyui_url": service.base_url,
                "comfyui_health": health_status
            }
    except Exception as e:
        return {"error": str(e), "pod_id": pod_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)