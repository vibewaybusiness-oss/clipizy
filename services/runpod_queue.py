# RunPod queue service for ComfyUI integration
from api.runpod.runpod_manager import get_queue_manager

# Re-export the queue manager for backward compatibility
__all__ = ['get_queue_manager']
