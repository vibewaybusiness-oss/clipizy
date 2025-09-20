# comfyui_manager.py
import asyncio
import random
import string
import time
import json
import os
from typing import Dict, Optional, List, Any
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException

# Import actual implementations
from api.runpod.runpod_manager import get_queue_manager
from .comfyui_service import ComfyUIService
from .models import (
    WorkflowType, WorkflowRequest, WorkflowResult,
    QwenImageInput, FluxImageInput, WanVideoInput,
    MMAudioInput, VoicemakerInput, UpscalingInput, InterpolationInput
)
from .workflows.qwen_image.qwen_image import QwenImage
from .workflows.flux.flux import Flux
from .workflows.wan.wan import Wan
from .workflows.mmAudio.mmAudio import MMAudio
from .workflows.voicemaker.voicemaker import Voicemaker
from .workflows.upscaler.video_upscaler import VideoUpscaler
from .workflows.interpolator.rife_interpolator import RifeInterpolator


class ComfyUIManager:
    def __init__(self):
        self.queue_manager = get_queue_manager()
        self.active_services: Dict[str, ComfyUIService] = {}
        self.requests: Dict[str, WorkflowRequest] = {}
        self.workflow_instances = {
            WorkflowType.IMAGE_QWEN: QwenImage(),
            WorkflowType.IMAGE_FLUX: Flux(),
            WorkflowType.VIDEO_WAN: Wan(),
            WorkflowType.AUDIO_MMAUDIO: MMAudio(),
            WorkflowType.VOICE_VOICEMAKER: Voicemaker(),
            WorkflowType.UPSCALING: VideoUpscaler(),
            WorkflowType.INTERPOLATION: RifeInterpolator()
        }
        self.config = self.load_config()
        self._initialized = False
    
    async def ensure_initialized(self):
        """Ensure the manager is initialized"""
        if not self._initialized:
            await self.initialize_queue_manager()
            self._initialized = True
    
    def load_config(self) -> Dict[str, Any]:
        """Load ComfyUI configuration"""
        config_path = os.path.join(os.path.dirname(__file__), "config.json")
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except Exception:
            return {"workflows": {}, "defaults": {}}

    async def initialize_queue_manager(self):
        status = self.queue_manager.get_queue_status()
        if not status.isRunning:
            await self.queue_manager.start()
            print("🚀 ComfyUI Manager: Queue manager started")

    async def execute_workflow(self, workflow_request: WorkflowRequest) -> WorkflowRequest:
        # Ensure manager is initialized
        await self.ensure_initialized()
        
        request_id = f"comfyui_{int(time.time() * 1000)}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=9))}"
        workflow_request.id = request_id
        workflow_request.status = "pending"
        self.requests[request_id] = workflow_request

        print(f"🚀 Starting workflow execution for {workflow_request.workflow_type.value}")

        try:
            # Check queue capacity for this workflow type
            workflow_config = self.config.get("workflows", {}).get(workflow_request.workflow_type.value, {})
            max_queue_size = workflow_config.get("maxQueueSize", self.config.get("defaults", {}).get("maxQueueSize", 3))
            
            # Check if we need a new pod
            pod = self.queue_manager.get_pod_for_workflow(workflow_request.workflow_type.value)
            
            if not pod or len(pod.requestQueue) >= max_queue_size:
                # Add request to queue for pod allocation
                print("📝 No pod available, queuing request...")
                queue_request_id = await self.queue_manager.add_workflow_request(
                    workflow_request.workflow_type.value, 
                    workflow_request.inputs
                )
                
                # Wait for pod allocation and execution
                print("⏳ Waiting for pod allocation and execution...")
                return await self._wait_for_workflow_execution(workflow_request, queue_request_id)

            # Get pod connection info directly since pod should be ready
            pod_info = await self.queue_manager._get_pod_public_ip(pod.id)
            if not pod_info.get("success") or not pod_info.get("pod", {}).get("ip"):
                workflow_request.error = "Pod is not ready yet, waiting for initialization"
                return workflow_request

            workflow_request.pod_id = pod.id
            workflow_request.pod_ip = pod_info["pod"]["ip"]
            workflow_request.status = "processing"

            # Get/create service
            service = self.active_services.get(pod.id)
            if not service:
                service = ComfyUIService(workflow_request.pod_ip, pod_id=pod.id)
                self.active_services[pod.id] = service

            # Test connection with retries
            print("🔌 Connecting to ComfyUI...")
            is_connected = False
            health_status = None
            
            for attempt in range(20):
                health_status = await service.health_check()
                is_connected = health_status.get("is_running", False)
                if is_connected:
                    break
                await asyncio.sleep(10)

            if not is_connected:
                error_msg = f"ComfyUI not ready on pod {pod.id} after 20 attempts"
                if health_status and health_status.get("error"):
                    error_msg += f" - Last error: {health_status['error']}"
                workflow_request.error = error_msg
                workflow_request.status = "failed"
                return workflow_request

            # Generate workflow using the appropriate workflow instance
            workflow_instance = self.workflow_instances.get(workflow_request.workflow_type)
            if not workflow_instance:
                workflow_request.status = "failed"
                workflow_request.error = f"Unknown workflow type: {workflow_request.workflow_type}"
                return workflow_request

            # Generate workflow configuration
            workflow_data, pattern, download_directory = await self.generate_workflow(
                workflow_request.workflow_type, workflow_request.inputs
            )

            # Execute workflow
            result = await service.execute_workflow_data(workflow_data, pattern, download_directory)
            
            if result.get("success", False):
                workflow_request.prompt_id = result.get("prompt_id")
                workflow_request.status = "processing"
                asyncio.create_task(self.monitor_workflow_completion(workflow_request, service))
            else:
                workflow_request.status = "failed"
                workflow_request.error = result.get("error", "Unknown error")

            return workflow_request

        except Exception as e:
            workflow_request.status = "failed"
            workflow_request.error = str(e)
            return workflow_request

    async def generate_workflow(self, workflow_type: WorkflowType, inputs: Dict[str, Any]) -> tuple:
        """Generate workflow configuration based on type and inputs"""
        workflow_instance = self.workflow_instances.get(workflow_type)
        if not workflow_instance:
            raise ValueError(f"Unknown workflow type: {workflow_type}")

        if workflow_type == WorkflowType.IMAGE_QWEN:
            qwen_input = QwenImageInput(**inputs)
            return workflow_instance.generate_image_workflow(
                prompt=qwen_input.prompt,
                reference_image_path=qwen_input.reference_image_path,
                width=qwen_input.width,
                height=qwen_input.height,
                seed=qwen_input.seed,
                negative_prompt=qwen_input.negative_prompt
            )
        elif workflow_type == WorkflowType.IMAGE_FLUX:
            flux_input = FluxImageInput(**inputs)
            return workflow_instance.generate_image_workflow(
                prompt=flux_input.prompt,
                lora=flux_input.lora,
                steps=flux_input.steps,
                width=flux_input.width,
                height=flux_input.height,
                seed=flux_input.seed,
                model=flux_input.model,
                negative_prompt=flux_input.negative_prompt
            )
        elif workflow_type == WorkflowType.VIDEO_WAN:
            wan_input = WanVideoInput(**inputs)
            if wan_input.input_image_path:
                return workflow_instance.generate_video_from_image_camera_control_workflow(
                    input_image_path=wan_input.input_image_path,
                    prompt=wan_input.prompt,
                    negative_prompt=wan_input.negative_prompt,
                    width=wan_input.width,
                    height=wan_input.height,
                    num_frames=wan_input.num_frames,
                    frame_rate=wan_input.frame_rate,
                    seed=wan_input.seed,
                    camera_motions=wan_input.camera_motions,
                    speed=wan_input.speed
                )
            else:
                return workflow_instance.generate_video_from_text_workflow(
                    prompt=wan_input.prompt,
                    negative_prompt=wan_input.negative_prompt,
                    width=wan_input.width,
                    height=wan_input.height,
                    num_frames=wan_input.num_frames,
                    frame_rate=wan_input.frame_rate,
                    seed=wan_input.seed
                )
        elif workflow_type == WorkflowType.AUDIO_MMAUDIO:
            mmaudio_input = MMAudioInput(**inputs)
            return workflow_instance.generate_audio_for_video_workflow(
                input_path=mmaudio_input.input_path,
                prompt=mmaudio_input.prompt,
                negative_prompt=mmaudio_input.negative_prompt,
                steps=mmaudio_input.steps,
                cfg=mmaudio_input.cfg,
                seed=mmaudio_input.seed,
                mask_away_clip=mmaudio_input.mask_away_clip,
                force_offload=mmaudio_input.force_offload,
                loop_count=mmaudio_input.loop_count,
                crf=mmaudio_input.crf,
                save_metadata=mmaudio_input.save_metadata,
                trim_to_audio=mmaudio_input.trim_to_audio
            )
        elif workflow_type == WorkflowType.VOICE_VOICEMAKER:
            voice_input = VoicemakerInput(**inputs)
            return workflow_instance.generate_voiceover_workflow(
                text=voice_input.text,
                audio_input=voice_input.audio_input,
                model=voice_input.model,
                diffusion_steps=voice_input.diffusion_steps,
                seed=voice_input.seed,
                cfg_scale=voice_input.cfg_scale,
                temperature=voice_input.temperature,
                top_p=voice_input.top_p,
                use_sampling=voice_input.use_sampling,
                attention_type=voice_input.attention_type,
                free_memory_after_generate=voice_input.free_memory_after_generate
            )
        elif workflow_type == WorkflowType.UPSCALING:
            upscaling_input = UpscalingInput(**inputs)
            return workflow_instance.upscale_video_workflow(
                input_path=upscaling_input.input_path,
                frame_rate=upscaling_input.frame_rate,
                seed=upscaling_input.seed
            )
        elif workflow_type == WorkflowType.INTERPOLATION:
            interpolation_input = InterpolationInput(**inputs)
            return workflow_instance.interpolate_video_workflow(
                input_path=interpolation_input.input_path,
                multiplier=interpolation_input.multiplier,
                target_fps=interpolation_input.target_fps,
                ckpt_name=interpolation_input.ckpt_name,
                fast_mode=interpolation_input.fast_mode,
                ensemble=interpolation_input.ensemble,
                clear_cache_after_n_frames=interpolation_input.clear_cache_after_n_frames,
                seed=interpolation_input.seed
            )
        else:
            raise ValueError(f"Unsupported workflow type: {workflow_type}")

    async def _wait_for_workflow_execution(self, workflow_request: WorkflowRequest, queue_request_id: str) -> WorkflowRequest:
        """Wait for pod allocation and execute workflow"""
        max_wait_attempts = 60  # 5 minutes max
        for attempt in range(max_wait_attempts):
            await asyncio.sleep(5)
            
            # Check if we have a pod assigned
            pod = self.queue_manager.get_pod_for_workflow(workflow_request.workflow_type.value)
            if pod and pod.id:
                print("✅ Pod is available, executing workflow...")
                
                # Get pod connection info
                pod_info = await self.queue_manager._get_pod_public_ip(pod.id)
                if not pod_info.get("success") or not pod_info.get("pod", {}).get("ip"):
                    continue
                
                workflow_request.pod_id = pod.id
                workflow_request.pod_ip = pod_info["pod"]["ip"]
                workflow_request.status = "processing"
                
                # Execute the workflow
                return await self._execute_workflow_on_pod(workflow_request, pod.id)
        
        # Timeout
        workflow_request.status = "failed"
        workflow_request.error = "Pod allocation timed out"
        return workflow_request

    async def _execute_workflow_on_pod(self, workflow_request: WorkflowRequest, pod_id: str) -> WorkflowRequest:
        """Execute workflow on a specific pod"""
        try:
            # Get/create service
            service = self.active_services.get(pod_id)
            if not service:
                service = ComfyUIService(workflow_request.pod_ip, pod_id=pod_id)
                self.active_services[pod_id] = service

            # Test connection with retries
            print("🔌 Connecting to ComfyUI...")
            is_connected = False
            health_status = None
            
            for attempt in range(20):
                health_status = await service.health_check()
                is_connected = health_status.get("is_running", False)
                if is_connected:
                    break
                await asyncio.sleep(10)

            if not is_connected:
                error_msg = f"ComfyUI not ready on pod {pod_id} after 20 attempts"
                if health_status and health_status.get("error"):
                    error_msg += f" - Last error: {health_status['error']}"
                workflow_request.error = error_msg
                workflow_request.status = "failed"
                return workflow_request

            # Generate workflow using the appropriate workflow instance
            workflow_instance = self.workflow_instances.get(workflow_request.workflow_type)
            if not workflow_instance:
                workflow_request.status = "failed"
                workflow_request.error = f"Unknown workflow type: {workflow_request.workflow_type}"
                return workflow_request

            # Generate workflow configuration
            workflow_data, pattern, download_directory = await self.generate_workflow(
                workflow_request.workflow_type, workflow_request.inputs
            )

            # Execute workflow
            result = await service.execute_workflow_data(workflow_data, pattern, download_directory)
            
            if result.get("success", False):
                workflow_request.prompt_id = result.get("prompt_id")
                workflow_request.status = "processing"
                asyncio.create_task(self.monitor_workflow_completion(workflow_request, service))
            else:
                workflow_request.status = "failed"
                workflow_request.error = result.get("error", "Unknown error")

            return workflow_request

        except Exception as e:
            workflow_request.status = "failed"
            workflow_request.error = str(e)
            return workflow_request

    async def monitor_workflow_completion(self, request: WorkflowRequest, service: ComfyUIService):
        if not request.prompt_id or not request.pod_id:
            return

        for attempt in range(60):  # 5 min with 5s intervals
            try:
                history = await service.get_history(request.prompt_id)
                prompt_data = history.get(request.prompt_id)

                if prompt_data:
                    status = prompt_data["status"]
                    if status["completed"]:
                        images = []
                        for node_id, output in prompt_data["outputs"].items():
                            if "images" in output:
                                for image in output["images"]:
                                    images.append({
                                        **image,
                                        "url": f"{service.base_url}/view?filename={image['filename']}&subfolder={image['subfolder']}&type={image['type']}"
                                    })
                        from datetime import datetime
                        request.status = "completed"
                        request.completed_at = datetime.fromtimestamp(time.time())
                        request.result = WorkflowResult(
                            success=True,
                            files=[img.get("filename", "") for img in images],
                            images=images,
                            request_id=request.id,
                            pod_id=request.pod_id,
                            pod_ip=request.pod_ip,
                            prompt_id=request.prompt_id,
                            status="completed"
                        )
                        self.queue_manager.mark_request_completed(request.id, request.result)
                        return
                    elif status["status_str"] == "error":
                        from datetime import datetime
                        request.status = "failed"
                        request.error = ",".join(status["messages"])
                        request.completed_at = datetime.fromtimestamp(time.time())
                        self.queue_manager.mark_request_failed(request.id, request.error)
                        return
                await asyncio.sleep(5)
            except Exception as e:
                if attempt == 59:
                    from datetime import datetime
                    request.status = "failed"
                    request.error = str(e)
                    request.completed_at = datetime.fromtimestamp(time.time())
                    self.queue_manager.mark_request_failed(request.id, request.error)
                    return

        from datetime import datetime
        request.status = "failed"
        request.error = "Workflow did not complete within timeout"
        request.completed_at = datetime.fromtimestamp(time.time())
        self.queue_manager.mark_request_failed(request.id, request.error)

    def get_request(self, request_id: str) -> Optional[WorkflowRequest]:
        return self.requests.get(request_id)

    def get_all_requests(self) -> List[WorkflowRequest]:
        return list(self.requests.values())

    def get_active_requests(self) -> List[WorkflowRequest]:
        return [r for r in self.requests.values() if r.status in ("pending", "processing")]

    def get_completed_requests(self) -> List[WorkflowRequest]:
        return [r for r in self.requests.values() if r.status in ("completed", "failed")]

    def get_queue_status(self):
        queue_status = self.queue_manager.get_queue_status()
        return {
            "isRunning": queue_status.isRunning,
            "activePods": queue_status.activePods,
            "pendingRequests": queue_status.pendingRequests,
            "comfyuiRequests": {
                "total": len(self.requests),
                "active": len(self.get_active_requests()),
                "completed": len(self.get_completed_requests()),
                "pending": len(self.requests) - len(self.get_active_requests()) - len(self.get_completed_requests())
            }
        }

    async def cleanup(self):
        print("🧹 Cleaning up...")
        self.requests.clear()
        self.active_services.clear()
        await self.queue_manager.stop()
        print("✅ Cleanup completed")


# ---- Singleton helper ----
comfyui_manager_instance: Optional[ComfyUIManager] = None

def get_comfyui_manager() -> ComfyUIManager:
    global comfyui_manager_instance
    if comfyui_manager_instance is None:
        comfyui_manager_instance = ComfyUIManager()
    return comfyui_manager_instance


# ---- FastAPI integration ----
def create_app() -> FastAPI:
    """Create FastAPI app with routes"""
    app = FastAPI()
    
    @app.post("/execute")
    async def execute(workflow_request: WorkflowRequest):
        manager = get_comfyui_manager()
        request = await manager.execute_workflow(workflow_request)
        return request

    @app.get("/request/{request_id}")
    async def get_request(request_id: str):
        manager = get_comfyui_manager()
        req = manager.get_request(request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        return req

    @app.get("/status")
    async def status():
        manager = get_comfyui_manager()
        return manager.get_queue_status()

    @app.get("/workflows")
    async def get_available_workflows():
        """Get available workflow types and their configurations"""
        manager = get_comfyui_manager()
        return {
            "workflows": manager.config.get("workflows", {}),
            "defaults": manager.config.get("defaults", {})
        }
    
    return app

# Create app instance
app = create_app()
