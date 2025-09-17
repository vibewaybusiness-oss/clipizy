import os
import random
from pathlib import Path
import json
import time
from PIL import Image
import shutil

from ..comfyui import ComfyUI
from ..config import ComfyUIConfig
from ...logger import Scripts

class MMAudio:
    def __init__(self):
        self.server_address = ComfyUIConfig.get_server_address()
        self.package_dir = os.path.dirname(__file__)
        self.comfyui = ComfyUI()
        self.scripts = Scripts("MMAudio")
        self.logger = self.scripts  # Quiet initialization

    def generate_audio_for_video(self, 
                                input_path: str,
                                output_path: str,
                                prompt: str = "",
                                negative_prompt: str = "",
                                steps: int = 25,
                                cfg: float = 4.5,
                                seed: int = None,
                                mask_away_clip: bool = False,
                                force_offload: bool = True,
                                loop_count: int = 0,
                                crf: int = 19,
                                save_metadata: bool = True,
                                trim_to_audio: bool = False):
        """
        Generate audio for input video using MMAudio model and combine them
        
        Args:
            input_path (str): Path to the input video
            output_path (str): Path where the output video with audio will be saved
            prompt (str): Positive prompt for audio generation
            negative_prompt (str): Negative prompt for audio generation
            steps (int): Number of sampling steps (default: 25)
            cfg (float): CFG scale (default: 4.5)
            seed (int): Random seed (default: random)
            mask_away_clip (bool): Whether to mask away clip (default: False)
            force_offload (bool): Force model offloading (default: True)
            frame_rate (float): Output frame rate (default: use input video frame rate)
            loop_count (int): Number of loops (default: 0)
            crf (int): Video compression quality (default: 19)
            save_metadata (bool): Save metadata (default: True)
            trim_to_audio (bool): Trim video to audio length (default: False)
            
        Returns:
            bool: True if audio generation and video combination is successful, False otherwise
        """
        
        try:
            self.scripts.log(f"Starting MMAudio generation for video: {input_path}")
            
            # Validate input video exists
            if not os.path.exists(input_path):
                self.scripts.error(f"Input video does not exist: {input_path}")
                return False
            
            # Load workflow
            workflow_path = os.path.join(self.package_dir, "mmAudio.json")
            mmaudio_workflow = self.comfyui.load_workflow(workflow_path)

            # Generate unique filename prefix
            filename_prefix = f"MMaudio_{seed}"
            comfyui_input_dir = ComfyUIConfig.get_input_dir()
            os.makedirs(comfyui_input_dir, exist_ok=True)
            
            # Add .mp4 extension to the filename
            comfyui_video_path = self.comfyui.load_input(input_path, f"{filename_prefix}.mp4")

            # Update workflow parameters
            mmaudio_workflow["91"]["inputs"]["video"] = f"{filename_prefix}.mp4" #DO NOT USE THE FULL PATH HERE
            mmaudio_workflow["92"]["inputs"]["steps"] = steps
            mmaudio_workflow["92"]["inputs"]["cfg"] = cfg
            mmaudio_workflow["92"]["inputs"]["seed"] = int(seed)
            mmaudio_workflow["92"]["inputs"]["prompt"] = prompt
            mmaudio_workflow["92"]["inputs"]["negative_prompt"] = negative_prompt
            mmaudio_workflow["92"]["inputs"]["mask_away_clip"] = mask_away_clip
            mmaudio_workflow["92"]["inputs"]["force_offload"] = force_offload
            mmaudio_workflow["97"]["inputs"]["loop_count"] = loop_count
            mmaudio_workflow["97"]["inputs"]["filename_prefix"] = filename_prefix
            mmaudio_workflow["97"]["inputs"]["crf"] = crf
            mmaudio_workflow["97"]["inputs"]["save_metadata"] = save_metadata
            mmaudio_workflow["97"]["inputs"]["trim_to_audio"] = trim_to_audio
            
                
            # Add debugging to see what files are generated
            self.scripts.log(f"🔍 Starting MMAudio workflow with pattern: {filename_prefix}")
            self.scripts.log(f"🔍 Expected output path: {output_path}")
            
            result = self.comfyui.process_generated_prompt(
                workflow=mmaudio_workflow,
                output_path=output_path,
                pattern=filename_prefix,
                extensions=ComfyUIConfig.VIDEO_EXTENSIONS,
                timeout=ComfyUIConfig.DEFAULT_TIMEOUT
            )
            
            # Check what files were actually generated
            comfyui_output_dir = ComfyUIConfig.get_output_dir()
            if os.path.exists(comfyui_output_dir):
                all_files = os.listdir(comfyui_output_dir)
                mp4_files = [f for f in all_files if f.lower().endswith('.mp4')]
                self.scripts.log(f"🔍 Files in ComfyUI output directory: {mp4_files}")
                if filename_prefix:
                    matching_files = [f for f in mp4_files if filename_prefix.lower() in f.lower()]
                    self.scripts.log(f"🔍 Files matching pattern '{filename_prefix}': {matching_files}")
            
            return result

            if result:
                self.scripts.log(f"✅ MMAudio generation completed successfully")
                return True
            else:
                self.scripts.error("❌ MMAudio generation failed during processing")
                return False
        
        except Exception as e:
            self.scripts.error(f"Error in MMAudio generation: {str(e)}")
            return False