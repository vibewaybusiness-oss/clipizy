import os
import random
from pathlib import Path
import json
import time
import shutil

from ..comfyui import ComfyUI
from ..config import ComfyUIConfig
from ...logger import Scripts

class RifeInterpolator:
    def __init__(self):
        self.server_address = ComfyUIConfig.get_server_address()
        self.package_dir = os.path.dirname(__file__)
        self.comfyui = ComfyUI()
        self.scripts = Scripts("RIFE Interpolator")
        self.logger = self.scripts.log("Initializing RIFE Video Interpolator")

    def interpolate_video(self, 
                         output_path = None,
                         input_path: str = None,
                         multiplier: int = 4,
                         target_fps: float = 24.0,
                         ckpt_name: str = "rife47.pth",
                         fast_mode: bool = True,
                         ensemble: bool = True,
                         clear_cache_after_n_frames: int = 10,
                         seed = None):
        """
        Interpolate video frames using RIFE (Real-Time Intermediate Flow Estimation)
        
        Args:
            input_path (str): Path to the input video (new parameter)
            multiplier (int): Frame interpolation multiplier (default: 4)
            target_fps (float): Target frame rate for output (new parameter)
            ckpt_name (str): RIFE checkpoint model name (default: "rife47.pth")
            fast_mode (bool): Enable fast mode (default: True)
            ensemble (bool): Enable ensemble mode (default: True)
            timeout (int): Timeout in seconds for the entire operation (default: 1800)
            
        Returns:
            bool: True if prompt was queued successfully, False otherwise
        """
        try:
            self.scripts.log(f"Starting RIFE interpolation for video Using seed: {seed} (type: {type(seed)})")
            
            # Load workflow
            workflow_path = os.path.join(self.package_dir, "rifeInterpolator.json")
            rife_workflow = self.comfyui.load_workflow(workflow_path)
            
            # Copy video to ComfyUI input directory
            video_filename = f"rife_input_{seed}.mp4"
            comfyui_video_path = self.comfyui.load_input(input_path, video_filename)
            rife_workflow["4"]["inputs"]["filename_prefix"] = f"rife_{seed}"
            rife_workflow["4"]["inputs"]["frame_rate"] = target_fps
            rife_workflow["6"]["inputs"]["ckpt_name"] = ckpt_name
            rife_workflow["6"]["inputs"]["clear_cache_after_n_frames"] = clear_cache_after_n_frames
            rife_workflow["6"]["inputs"]["multiplier"] = multiplier
            rife_workflow["6"]["inputs"]["fast_mode"] = fast_mode
            rife_workflow["6"]["inputs"]["ensemble"] = ensemble
            rife_workflow["8"]["inputs"]["video"] = comfyui_video_path
            
            self.scripts.log(f"RIFE workflow configured with parameters:")
            self.scripts.log(f"  - Video file: {comfyui_video_path}")
            self.scripts.log(f"  - Source path: {input_path}")
            self.scripts.log(f"  - Multiplier: {multiplier}x")
            self.scripts.log(f"  - Frame rate: {target_fps} fps")
            self.scripts.log(f"  - Model: {ckpt_name}")
            self.scripts.log(f"  - Fast mode: {fast_mode}")
            self.scripts.log(f"  - Ensemble: {ensemble}")


            self.scripts.log(f"🔍 DEBUG: About to queue Rife Interpolator workflow...")
    
            # Process the generated prompt
            result = self.comfyui.process_generated_prompt(
                workflow=rife_workflow,
                output_path=output_path,
                pattern=f"rife_{seed}",
                extensions=ComfyUIConfig.VIDEO_EXTENSIONS,
                timeout=ComfyUIConfig.LONG_TIMEOUT
            )
            
            if result:
                self.scripts.log(f"✅ RIFE interpolation completed successfully")
                return True, result
            else:
                self.scripts.error("❌ RIFE interpolation failed during processing")
                return False, None
            
        except Exception as e:
            self.scripts.error(f"Error in RIFE interpolation: {str(e)}")
            return False, None
                    

    def get_available_models(self):
        """Get list of available RIFE models"""
        try:
            # Common RIFE model checkpoints
            rife_models = [
                "rife47.pth",
                "rife49.pth", 
                "rife40.pth",
                "rife46.pth"
            ]
            self.scripts.log(f"Available RIFE models: {rife_models}")
            return rife_models
        except Exception as e:
            self.scripts.error(f"Error getting RIFE models: {str(e)}")
            return []