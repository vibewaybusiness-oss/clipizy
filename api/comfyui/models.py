from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum

class WorkflowType(str, Enum):
    IMAGE_QWEN = "comfyui_image_qwen"
    IMAGE_FLUX = "comfyui_image_flux"
    VIDEO_WAN = "comfyui_video_wan"
    AUDIO_MMAUDIO = "comfyui_audio_mmaudio"
    VOICE_VOICEMAKER = "comfyui_voice_voicemaker"
    UPSCALING = "comfyui_upscaling"
    INTERPOLATION = "comfyui_interpolation"

# Base workflow input
class BaseWorkflowInput(BaseModel):
    seed: Optional[str] = None
    negative_prompt: Optional[str] = None

# Image workflow inputs
class QwenImageInput(BaseWorkflowInput):
    prompt: str = Field(..., description="Text prompt for image generation")
    reference_image_path: Optional[str] = Field(None, description="Path to reference image for editing")
    width: int = Field(1328, description="Image width")
    height: int = Field(1328, description="Image height")

class FluxImageInput(BaseWorkflowInput):
    prompt: str = Field(..., description="Text prompt for image generation")
    lora: Optional[str] = Field(None, description="LoRA model name")
    steps: int = Field(30, description="Number of generation steps")
    width: int = Field(1920, description="Image width")
    height: int = Field(1080, description="Image height")
    model: str = Field("flux1-schnell.safetensors", description="Model name")

# Video workflow inputs
class WanVideoInput(BaseWorkflowInput):
    prompt: str = Field(..., description="Text prompt for video generation")
    input_image_path: Optional[str] = Field(None, description="Path to input image for image-to-video")
    width: int = Field(832, description="Video width")
    height: int = Field(480, description="Video height")
    num_frames: int = Field(121, description="Number of frames")
    frame_rate: int = Field(16, description="Frames per second")
    camera_motions: Optional[List[str]] = Field(None, description="List of camera motion types")
    speed: float = Field(0.2, description="Camera motion speed")

# Audio workflow inputs
class MMAudioInput(BaseWorkflowInput):
    input_path: str = Field(..., description="Path to input video")
    prompt: str = Field(..., description="Audio generation prompt")
    steps: int = Field(25, description="Number of sampling steps")
    cfg: float = Field(4.5, description="CFG scale")
    mask_away_clip: bool = Field(False, description="Whether to mask away clip")
    force_offload: bool = Field(True, description="Force model offloading")
    loop_count: int = Field(0, description="Number of loops")
    crf: int = Field(19, description="Video compression quality")
    save_metadata: bool = Field(True, description="Save metadata")
    trim_to_audio: bool = Field(False, description="Trim video to audio length")

# Voice workflow inputs
class VoicemakerInput(BaseWorkflowInput):
    text: str = Field(..., description="Text to convert to speech")
    audio_input: str = Field(..., description="Path to reference audio file for voice cloning")
    model: str = Field("VibeVoice-1.5B", description="VibeVoice model to use")
    diffusion_steps: int = Field(20, description="Number of diffusion steps")
    cfg_scale: float = Field(1.3, description="Classifier-free guidance scale")
    temperature: float = Field(0.95, description="Sampling temperature")
    top_p: float = Field(0.95, description="Top-p sampling parameter")
    use_sampling: bool = Field(False, description="Whether to use sampling")
    attention_type: str = Field("auto", description="Attention mechanism type")
    free_memory_after_generate: bool = Field(True, description="Whether to free memory after generation")

# Upscaling workflow inputs
class UpscalingInput(BaseWorkflowInput):
    input_path: str = Field(..., description="Path to input video")
    frame_rate: float = Field(25.0, description="Output frame rate")

# Interpolation workflow inputs
class InterpolationInput(BaseWorkflowInput):
    input_path: str = Field(..., description="Path to input video")
    multiplier: int = Field(4, description="Frame interpolation multiplier")
    target_fps: float = Field(24.0, description="Target frame rate")
    ckpt_name: str = Field("rife47.pth", description="RIFE checkpoint model name")
    fast_mode: bool = Field(True, description="Enable fast mode")
    ensemble: bool = Field(True, description="Enable ensemble mode")
    clear_cache_after_n_frames: int = Field(10, description="Clear cache after N frames")

# Workflow result
class WorkflowResult(BaseModel):
    success: bool
    request_id: str
    prompt_id: Optional[str] = None
    pod_id: Optional[str] = None
    pod_ip: Optional[str] = None
    files: List[str] = Field(default_factory=list)
    images: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[str] = None
    status: str = "pending"

# Workflow request
class WorkflowRequest(BaseModel):
    id: Optional[str] = Field(None, description="Unique request identifier")
    workflow_type: WorkflowType = Field(..., description="Type of workflow to execute")
    inputs: Dict[str, Any] = Field(..., description="Workflow-specific inputs")
    output_path: Optional[str] = Field(None, description="Output path for generated files")
    status: str = Field("pending", description="Request status")
    pod_id: Optional[str] = Field(None, description="Pod ID assigned to this request")
    pod_ip: Optional[str] = Field(None, description="Pod IP address")
    prompt_id: Optional[str] = Field(None, description="ComfyUI prompt ID")
    error: Optional[str] = Field(None, description="Error message if failed")
    result: Optional[WorkflowResult] = Field(None, description="Workflow result")
