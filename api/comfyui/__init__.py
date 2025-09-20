"""
ComfyUI package for Vibewave
"""

# Import only when needed to avoid dependency issues
def get_comfyui_service():
    from .comfyui_service import ComfyUIService
    return ComfyUIService

def get_comfyui_manager():
    from .comfyui_manager import ComfyUIManager
    return ComfyUIManager

__all__ = ["get_comfyui_service", "get_comfyui_manager"]
