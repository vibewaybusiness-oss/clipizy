"""
Centralized configuration for ComfyUI workflows
"""
import os

class ComfyUIConfig:
    """Centralized configuration for ComfyUI server and paths"""
    
    # Server configuration
    SERVER_ADDRESS = "127.0.0.1:8188"
    SERVER_URL = f"http://{SERVER_ADDRESS}"
    WEBSOCKET_URL = f"ws://{SERVER_ADDRESS}/ws"
    
    # Directory paths (Windows compatible)
    COMFYUI_ROOT = "//wsl.localhost/Ubuntu/home/unix/code/ComfyUI/"  # Adjust this to your ComfyUI installation path
    OUTPUT_DIR = f"{COMFYUI_ROOT}/output"
    INPUT_DIR = f"{COMFYUI_ROOT}/input"
    TEMP_DIR = f"{COMFYUI_ROOT}/temp"
    
    # Timeout settings
    DEFAULT_TIMEOUT = 300
    LONG_TIMEOUT = 1800
    VERY_LONG_TIMEOUT = 3600
    
    # File extensions
    IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"]
    VIDEO_EXTENSIONS = ["mp4", "avi", "mov", "mkv"]
    AUDIO_EXTENSIONS = ["mp3", "wav", "flac", "aac"]
    
    @classmethod
    def get_server_address(cls):
        """Get the ComfyUI server address"""
        return cls.SERVER_ADDRESS
    
    @classmethod
    def get_server_url(cls):
        """Get the ComfyUI server URL"""
        return cls.SERVER_URL
    
    @classmethod
    def get_websocket_url(cls):
        """Get the ComfyUI WebSocket URL"""
        return cls.WEBSOCKET_URL
    
    @classmethod
    def get_output_dir(cls):
        """Get the ComfyUI output directory"""
        return cls.OUTPUT_DIR
    
    @classmethod
    def get_input_dir(cls):
        """Get the ComfyUI input directory"""
        return cls.INPUT_DIR
    
    @classmethod
    def get_temp_dir(cls):
        """Get the temporary directory"""
        return cls.TEMP_DIR
