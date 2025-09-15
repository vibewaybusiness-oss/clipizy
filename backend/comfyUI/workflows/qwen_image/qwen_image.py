import os
import shutil
import random
from pathlib import Path
import argparse
import json
import time
from PIL import Image
import urllib.request
import re

from ..comfyui import ComfyUI
from ..config import ComfyUIConfig
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from logger.logger import Scripts

class QwenImage:
    def __init__(self):
        self.server_address = ComfyUIConfig.get_server_address()
        self.package_dir = os.path.dirname(__file__)
        self.comfyui = ComfyUI()
        self.scripts = Scripts("QwenImage")
        self.logger = self.scripts

    def generate_image(self, prompt: str="", reference_image_path: str=None, width: int=1328, height: int=1328, seed: str=None, output_path: str=None, negative_prompt: str="", *args, **kwargs):
        """
        Generate image using Qwen Image workflow
        Args:
            prompt (str): Text prompt for image generation
            reference_image_path (str): Optionnal reference image for image generation
            steps (int): Number of generation steps
            width (int): Width of output image
            height (int): Height of output image
            seed (str): Seed for generation
            output_path (str): Path where image will be saved
            negative_prompt (str): Negative prompt to avoid certain elements
        Returns:
            bool: True if image is generated successfully, False otherwise
        """

        if reference_image_path and reference_image_path.strip():
            return self.generate_image_with_reference_api(prompt, reference_image_path, width, height, seed, output_path, negative_prompt)
        else:
            return self.generate_image_no_reference(prompt, width, height, seed, output_path, negative_prompt)

    def generate_image_no_reference(self, prompt: str="", width: int=1328, height: int=1328, seed: str=None, output_path: str=None, negative_prompt: str=""):
        """
        Generate image using Qwen Image workflow
        Args:
            prompt (str): Text prompt for image generation
            width (int): Width of output image
            height (int): Height of output image
            seed (str): Seed for generation
            output_path (str): Path where image will be saved
            negative_prompt (str): Negative prompt to avoid certain elements
        Returns:
            bool: True if image is generated successfully, False otherwise
        """


        self.scripts.log(f"🎨 QWEN IMAGE GENERATION:")
        self.scripts.log(f"   Prompt: '{prompt[:100]}{'...' if len(prompt) > 100 else ''}'")
        if negative_prompt:
            self.scripts.log(f"   Negative: '{negative_prompt[:100]}{'...' if len(negative_prompt) > 100 else ''}'")
        
        # Get initial files before queuing the prompt
        output_directory = ComfyUIConfig.get_output_dir()
        existing_files = self.comfyui.get_initial_files(seed, output_directory, ComfyUIConfig.IMAGE_EXTENSIONS)
        self.scripts.log(f"Found {len(existing_files)} existing files before generation")
        
        qwen_workflow = self.comfyui.load_workflow(self, os.path.join(self.package_dir, "qwen-image-8steps.json"))
        
        qwen_workflow["3"]["inputs"]["seed"] = int(seed) if seed else random.randint(1, 2**63 - 1)
        
        qwen_workflow["6"]["inputs"]["text"] = prompt
        if negative_prompt:
            qwen_workflow["7"]["inputs"]["text"] = negative_prompt
        qwen_workflow["58"]["inputs"]["width"] = width
        qwen_workflow["58"]["inputs"]["height"] = height
        qwen_workflow["58"]["inputs"]["batch_size"] = 1
        
        qwen_workflow["60"]["inputs"]["filename_prefix"] = f"qwen_{seed}"

        self.scripts.log(f"🔧 WORKFLOW CONFIGURATION:")
        self.scripts.log(f"   Node 3 (KSampler): seed={qwen_workflow['3']['inputs']['seed']}, steps={qwen_workflow['3']['inputs']['steps']}, cfg={qwen_workflow['3']['inputs']['cfg']}")
        self.scripts.log(f"   Node 6 (Positive): '{qwen_workflow['6']['inputs']['text'][:50]}...'")
        self.scripts.log(f"   Node 7 (Negative): '{qwen_workflow['7']['inputs']['text'][:50]}...'")
        self.scripts.log(f"   Node 58 (Resolution): {qwen_workflow['58']['inputs']['width']}x{qwen_workflow['58']['inputs']['height']}")
        self.scripts.log(f"   Node 60 (Filename): {qwen_workflow['60']['inputs']['filename_prefix']}")

        try:
            result = self.comfyui.process_generated_prompt(
                workflow=qwen_workflow,
                output_path=output_path,
                pattern=f"qwen_{seed}",
                extensions=ComfyUIConfig.IMAGE_EXTENSIONS,
                timeout=ComfyUIConfig.DEFAULT_TIMEOUT,
                download_directory=ComfyUIConfig.get_output_dir()
            )
            
            if result:
                self.scripts.log(f"✅ QwenImage generation completed successfully")
                return True
            else:
                self.scripts.error("❌ QwenImage generation failed during processing")
                return False
                
        except Exception as e:
            self.scripts.error(f"Error in QwenImage generation: {str(e)}")
            return 
    
    def generate_image_with_reference_api(self, prompt: str="", reference_image_path: str=None, width: int=1328, height: int=1328, seed: str=None, output_path: str=None, negative_prompt: str=""):
        """
        Generate image using Qwen Image workflow
        Args:
            prompt (str): Text prompt for image generation
            reference_image_path (str): Optionnal reference image for image generation
            width (int): Width of output image
            height (int): Height of output image
            seed (str): Seed for generation
            output_path (str): Path where image will be saved
            negative_prompt (str): Negative prompt to avoid certain elements
        Returns:
            bool: True if image is generated successfully, False otherwise
        """


        self.scripts.log(f"🎨 QWEN IMAGE GENERATION:")
        self.scripts.log(f"   Prompt: '{prompt[:100]}{'...' if len(prompt) > 100 else ''}'")
        if negative_prompt:
            self.scripts.log(f"   Negative: '{negative_prompt[:100]}{'...' if len(negative_prompt) > 100 else ''}'")
        self.scripts.log(f"   Resolution: {width}x{height}")
        self.scripts.log(f"   Seed: {seed}")
        
        # Convert Windows path to WSL path if needed
        wsl_reference_path = reference_image_path
        if reference_image_path and reference_image_path.strip():
            try:
                wsl_reference_path = self.comfyui.windows_to_wsl_path(reference_image_path)
                if wsl_reference_path:
                    self.scripts.log(f"✅ Converted reference path to WSL: {wsl_reference_path}")
                else:
                    self.scripts.error(f"❌ Failed to convert reference path to WSL: {reference_image_path}")
                    return False
            except Exception as e:
                self.scripts.error(f"❌ Error converting reference path: {str(e)}")
                return False
        
        # Get initial files before queuing the prompt
        output_directory = ComfyUIConfig.get_output_dir()
        existing_files = self.comfyui.get_initial_files(seed, output_directory, ComfyUIConfig.IMAGE_EXTENSIONS)
        self.scripts.log(f"Found {len(existing_files)} existing files before generation")
        
        qwen_workflow = self.comfyui.load_workflow(self, os.path.join(self.package_dir, "qwen_image_edit_8steps.json"))
        
        qwen_workflow["3"]["inputs"]["seed"] = int(seed) if seed else random.randint(1, 2**63 - 1)
        qwen_workflow["76"]["inputs"]["prompt"] = prompt
        if negative_prompt:
            qwen_workflow["77"]["inputs"]["prompt"] = negative_prompt
        qwen_workflow["60"]["inputs"]["filename_prefix"] = f"qwen_ref_{seed}" if seed else "qwen_ref"
        
        if wsl_reference_path:
            qwen_workflow["78"]["inputs"]["image"] = wsl_reference_path

        self.scripts.log(f"🔧 WORKFLOW CONFIGURATION:")
        self.scripts.log(f"   Node 3 (KSampler): seed={qwen_workflow['3']['inputs']['seed']}, steps={qwen_workflow['3']['inputs']['steps']}, cfg={qwen_workflow['3']['inputs']['cfg']}")
        self.scripts.log(f"   Node 76 (Positive): '{qwen_workflow['76']['inputs']['prompt'][:50]}...'")
        self.scripts.log(f"   Node 77 (Negative): '{qwen_workflow['77']['inputs']['prompt'][:50]}...'")
        if wsl_reference_path:
            self.scripts.log(f"   Node 78 (Reference): {wsl_reference_path}")

        try:
            result = self.comfyui.process_generated_prompt(
                workflow=qwen_workflow,
                output_path=output_path,
                pattern=f"qwen_ref_{seed}" if seed else "qwen_ref",
                download_directory=ComfyUIConfig.get_output_dir(),
                extensions=ComfyUIConfig.IMAGE_EXTENSIONS,
                timeout=ComfyUIConfig.DEFAULT_TIMEOUT
            )
            
            if result:
                self.scripts.log(f"✅ QwenImage generation completed successfully")
                return True
            else:
                self.scripts.error("❌ QwenImage generation failed during processing")
                return False
                
        except Exception as e:
            self.scripts.error(f"Error in QwenImage generation: {str(e)}")
            return False