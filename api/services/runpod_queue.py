"""
RunPod Queue Manager - Python implementation
"""
import asyncio
import uuid
import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from api.models.runpod import ComfyUIRequest, QueueStatus, WorkflowInput, WorkflowResult
from api.services.runpod_client import get_graphql_client, get_rest_client


class WorkflowQueueManager:
    """Manages RunPod workflow queue and pod allocation"""
    
    def __init__(self):
        self.active_pods: Dict[str, Dict[str, Any]] = {}
        self.pending_requests: List[ComfyUIRequest] = []
        self.completed_requests: List[ComfyUIRequest] = []
        self.failed_requests: List[ComfyUIRequest] = []
        self._lock = asyncio.Lock()
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start the queue manager"""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._process_queue())
    
    async def stop(self):
        """Stop the queue manager"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
    
    async def _process_queue(self):
        """Process the queue continuously"""
        while self._running:
            try:
                await self._process_pending_requests()
                await self._check_pod_status()
                await asyncio.sleep(5)  # Check every 5 seconds
            except Exception as e:
                print(f"Error in queue processing: {e}")
                await asyncio.sleep(10)  # Wait longer on error
    
    async def _process_pending_requests(self):
        """Process pending requests"""
        async with self._lock:
            if not self.pending_requests:
                return
            
            # Find available pods
            available_pods = [
                pod for pod in self.active_pods.values()
                if pod.get("status") == "running" and pod.get("workflow_name") == "qwen-image"
            ]
            
            if not available_pods:
                # Try to create a new pod
                await self._create_image_pod()
                return
            
            # Process requests with available pods
            for pod in available_pods:
                if not self.pending_requests:
                    break
                
                request = self.pending_requests.pop(0)
                await self._execute_request(request, pod)
    
    async def _create_image_pod(self):
        """Create a new image generation pod"""
        try:
            client = get_graphql_client()
            
            # Check if we already have a pod being created
            creating_pods = [
                pod for pod in self.active_pods.values()
                if pod.get("status") in ["creating", "starting"]
            ]
            
            if creating_pods:
                return  # Already creating a pod
            
            # Create pod configuration
            from api.models.runpod import RestPodConfig
            pod_config = RestPodConfig(
                gpu_type_ids=["NVIDIA GeForce RTX 4090"],  # Default GPU type
                image_name="runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04",
                name=f"qwen-image-{uuid.uuid4().hex[:8]}",
                container_disk_in_gb=50,
                gpu_count=1,
                support_public_ip=True
            )
            
            result = await client.create_pod(pod_config)
            
            if result.success and result.data:
                pod_id = result.data.id
                self.active_pods[pod_id] = {
                    "id": pod_id,
                    "name": result.data.name,
                    "status": "creating",
                    "workflow_name": "qwen-image",
                    "created_at": datetime.now(),
                    "ip": None
                }
                print(f"Created new pod: {pod_id}")
            
        except Exception as e:
            print(f"Error creating pod: {e}")
    
    async def _check_pod_status(self):
        """Check status of active pods"""
        client = get_graphql_client()
        
        for pod_id in list(self.active_pods.keys()):
            try:
                result = await client.get_pod_by_id(pod_id)
                
                if result.success and result.data:
                    pod_data = result.data
                    self.active_pods[pod_id].update({
                        "status": pod_data.status or pod_data.desired_status,
                        "ip": pod_data.ip,
                        "public_ip": pod_data.public_ip
                    })
                    
                    # Remove terminated pods
                    if pod_data.status in ["terminated", "failed"]:
                        del self.active_pods[pod_id]
                        print(f"Removed terminated pod: {pod_id}")
                
            except Exception as e:
                print(f"Error checking pod {pod_id}: {e}")
    
    async def _execute_request(self, request: ComfyUIRequest, pod: Dict[str, Any]):
        """Execute a request on a pod"""
        try:
            request.status = "processing"
            request.pod_id = pod["id"]
            
            # Execute the workflow
            result = await self._execute_comfyui_workflow(pod["ip"], request.inputs)
            
            if result.success:
                request.status = "completed"
                request.result = result
                self.completed_requests.append(request)
                print(f"Completed request {request.id} on pod {pod['id']}")
            else:
                request.status = "failed"
                request.error = result.error
                self.failed_requests.append(request)
                print(f"Failed request {request.id}: {result.error}")
        
        except Exception as e:
            request.status = "failed"
            request.error = str(e)
            self.failed_requests.append(request)
            print(f"Error executing request {request.id}: {e}")
    
    async def _execute_comfyui_workflow(self, pod_ip: str, inputs: WorkflowInput) -> WorkflowResult:
        """Execute ComfyUI workflow on a pod"""
        try:
            comfyui_url = f"http://{pod_ip}:8188"
            
            # Load Qwen workflow template
            import json
            import os
            
            # Try to load the Qwen workflow file
            workflow_path = os.path.join(
                os.path.dirname(__file__), 
                "..", "..", "BACKEND OLD", "runpod", "comfyui", "workflows", 
                "qwen_image", "qwen-image-8steps.json"
            )
            
            if os.path.exists(workflow_path):
                with open(workflow_path, 'r') as f:
                    workflow = json.load(f)
            else:
                # Fallback to basic workflow
                workflow = self._create_basic_qwen_workflow(inputs)
            
            # Update workflow with input parameters
            workflow = self._update_workflow_with_inputs(workflow, inputs)
            
            # Queue the prompt
            queue_payload = {
                "prompt": workflow,
                "client_id": f"vibewave-queue-{uuid.uuid4().hex[:8]}"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Queue the prompt
                queue_response = await client.post(f"{comfyui_url}/prompt", json=queue_payload)
                queue_response.raise_for_status()
                
                queue_result = queue_response.json()
                prompt_id = queue_result.get("prompt_id")
                
                if not prompt_id:
                    return WorkflowResult(
                        success=False,
                        error="Failed to queue prompt"
                    )
                
                # Wait for completion
                max_attempts = 60  # 5 minutes max
                for attempt in range(max_attempts):
                    await asyncio.sleep(5)
                    
                    # Check status
                    status_response = await client.get(f"{comfyui_url}/history/{prompt_id}")
                    if status_response.status_code == 404:
                        continue  # Not ready yet
                    
                    status_response.raise_for_status()
                    history = status_response.json()
                    
                    if prompt_id in history:
                        prompt_history = history[prompt_id]
                        if prompt_history.get("status"):
                            status = prompt_history["status"]
                            
                            if status.get("status") == "success":
                                # Get output files
                                outputs = status.get("outputs", {})
                                files = []
                                
                                for node_id, node_output in outputs.items():
                                    if "images" in node_output:
                                        for image in node_output["images"]:
                                            if "filename" in image:
                                                files.append(image["filename"])
                                
                                return WorkflowResult(
                                    success=True,
                                    files=files,
                                    request_id=prompt_id
                                )
                            
                            elif status.get("status") == "error":
                                return WorkflowResult(
                                    success=False,
                                    error=status.get("error", "Unknown error")
                                )
                
                return WorkflowResult(
                    success=False,
                    error="Workflow execution timeout"
                )
        
        except Exception as e:
            return WorkflowResult(
                success=False,
                error=f"Workflow execution failed: {str(e)}"
            )
    
    def _create_basic_qwen_workflow(self, inputs: WorkflowInput) -> Dict[str, Any]:
        """Create a basic Qwen workflow template"""
        return {
            "3": {
                "inputs": {
                    "seed": inputs.seed if inputs.seed != -1 else 12345,
                    "steps": inputs.steps,
                    "cfg": 1,
                    "sampler_name": "res_multistep",
                    "scheduler": "simple",
                    "denoise": 1,
                    "model": ["66", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["58", 0]
                },
                "class_type": "KSampler"
            },
            "6": {
                "inputs": {
                    "text": inputs.prompt,
                    "clip": ["38", 0]
                },
                "class_type": "CLIPTextEncode"
            },
            "7": {
                "inputs": {
                    "text": inputs.negative_prompt or "blurry, low quality, distorted",
                    "clip": ["38", 0]
                },
                "class_type": "CLIPTextEncode"
            },
            "8": {
                "inputs": {
                    "samples": ["3", 0],
                    "vae": ["39", 0]
                },
                "class_type": "VAEDecode"
            },
            "37": {
                "inputs": {
                    "unet_name": "qwen_image_fp8_e4m3fn.safetensors",
                    "weight_dtype": "default"
                },
                "class_type": "UNETLoader"
            },
            "38": {
                "inputs": {
                    "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
                    "type": "qwen_image",
                    "device": "default"
                },
                "class_type": "CLIPLoader"
            },
            "39": {
                "inputs": {
                    "vae_name": "qwen_image_vae.safetensors"
                },
                "class_type": "VAELoader"
            },
            "58": {
                "inputs": {
                    "width": inputs.width,
                    "height": inputs.height,
                    "batch_size": 1
                },
                "class_type": "EmptySD3LatentImage"
            },
            "60": {
                "inputs": {
                    "filename_prefix": f"qwen_{inputs.seed if inputs.seed != -1 else 12345}",
                    "images": ["8", 0]
                },
                "class_type": "SaveImage"
            },
            "66": {
                "inputs": {
                    "shift": 3,
                    "model": ["75", 0]
                },
                "class_type": "ModelSamplingAuraFlow"
            },
            "75": {
                "inputs": {
                    "lora_name": "Qwen-Image-Lightning-4steps-V1.0-bf16.safetensors",
                    "strength_model": 1,
                    "model": ["37", 0]
                },
                "class_type": "LoraLoaderModelOnly"
            }
        }
    
    def _update_workflow_with_inputs(self, workflow: Dict[str, Any], inputs: WorkflowInput) -> Dict[str, Any]:
        """Update workflow with input parameters"""
        # Update prompt
        if "6" in workflow and "inputs" in workflow["6"]:
            workflow["6"]["inputs"]["text"] = inputs.prompt
        
        # Update negative prompt
        if "7" in workflow and "inputs" in workflow["7"]:
            workflow["7"]["inputs"]["text"] = inputs.negative_prompt or "blurry, low quality, distorted"
        
        # Update dimensions
        if "58" in workflow and "inputs" in workflow["58"]:
            workflow["58"]["inputs"]["width"] = inputs.width
            workflow["58"]["inputs"]["height"] = inputs.height
            workflow["58"]["inputs"]["batch_size"] = 1
        
        # Update sampler parameters
        if "3" in workflow and "inputs" in workflow["3"]:
            workflow["3"]["inputs"]["seed"] = inputs.seed if inputs.seed != -1 else 12345
            workflow["3"]["inputs"]["steps"] = inputs.steps
        
        # Update filename prefix
        if "60" in workflow and "inputs" in workflow["60"]:
            seed = inputs.seed if inputs.seed != -1 else 12345
            workflow["60"]["inputs"]["filename_prefix"] = f"qwen_{seed}"
        
        return workflow
    
    async def add_request(self, workflow_name: str, inputs: WorkflowInput) -> str:
        """Add a new request to the queue"""
        request_id = str(uuid.uuid4())
        
        request = ComfyUIRequest(
            id=request_id,
            workflow_name=workflow_name,
            inputs=inputs,
            status="pending"
        )
        
        async with self._lock:
            self.pending_requests.append(request)
        
        return request_id
    
    async def get_request_status(self, request_id: str) -> Optional[ComfyUIRequest]:
        """Get request status by ID"""
        async with self._lock:
            # Check all lists
            for request in self.pending_requests + self.completed_requests + self.failed_requests:
                if request.id == request_id:
                    return request
            return None
    
    def get_queue_status(self) -> QueueStatus:
        """Get current queue status"""
        return QueueStatus(
            active_pods=list(self.active_pods.values()),
            pending_requests=self.pending_requests.copy(),
            completed_requests=self.completed_requests.copy(),
            failed_requests=self.failed_requests.copy()
        )
    
    async def get_pod_with_ip(self, pod_id: str) -> Dict[str, Any]:
        """Get pod with IP address"""
        pod = self.active_pods.get(pod_id)
        if pod and pod.get("ip"):
            return {"success": True, "pod": pod}
        else:
            return {"success": False, "error": "Pod not found or no IP address"}


# Global queue manager instance
_queue_manager: Optional[WorkflowQueueManager] = None


def get_queue_manager() -> WorkflowQueueManager:
    """Get or create queue manager instance"""
    global _queue_manager
    if _queue_manager is None:
        _queue_manager = WorkflowQueueManager()
    return _queue_manager


async def start_queue_manager():
    """Start the queue manager"""
    manager = get_queue_manager()
    await manager.start()


async def stop_queue_manager():
    """Stop the queue manager"""
    global _queue_manager
    if _queue_manager:
        await _queue_manager.stop()
        _queue_manager = None
