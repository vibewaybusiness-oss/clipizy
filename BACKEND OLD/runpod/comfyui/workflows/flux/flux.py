import os
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
from ...logger import Scripts

class Flux:
    def __init__(self):
        self.server_address = ComfyUIConfig.get_server_address()
        self.package_dir = os.path.dirname(__file__)
        self.comfyui = ComfyUI()
        self.scripts = Scripts("Flux")
        self.logger = self.scripts  # Quiet initialization

    def get_available_loras(self):
        """Get list of available LoRA models from ComfyUI"""
        try:
            models = self.comfyui.get_model_list()
            loras = models.get("loras", [])
            self.scripts.log(f"Found {len(loras)} available LoRA models")
            return loras
        except Exception as e:
            self.scripts.error(f"Error getting LoRA models: {str(e)}")
            return []

    def generate_image_with_lora(self, prompt: str="", lora: str="", steps: int=20, width: int=1920, height: int=1080, seed: str=None, model: str="flux1-schnell.safetensors"):
        """
        Generate image with LoRA using flux_lora.json workflow
        Args:
            prompt (str): Text prompt for image generation
            output_path (str): Path where image will be saved
            lora (str): Name of the LoRA model to use
            steps (int): Number of generation steps
            width (int): Width of output image
            height (int): Height of output image
            seed (str): Unique prefix for this job (from ComfyUIQueue)
        Returns:
            bool: True if prompt was queued successfully, False otherwise
        """

        self.scripts.log(f"🎨 FLUX LoRA IMAGE GENERATION:")
        self.scripts.log(f"   Prompt: '{prompt[:100]}{'...' if len(prompt) > 100 else ''}'")
        self.scripts.log(f"   LoRA Model: {lora}")
        self.scripts.log(f"   Steps: {steps}")
        self.scripts.log(f"   Resolution: {width}x{height}")
        self.scripts.log(f"   Seed: {seed}")
        self.scripts.log(f"   Model: {model}")
        
        flux_lora_workflow = self.comfyui.load_workflow(os.path.join(self.package_dir, "flux_lora.json"))
        
        flux_lora_workflow["6"]["inputs"]["text"] = prompt
        flux_lora_workflow["9"]["inputs"]["filename_prefix"] = f"flux_{seed}"
        flux_lora_workflow["17"]["inputs"]["steps"] = steps
        flux_lora_workflow["12"]["inputs"]["unet_name"] = model
        flux_lora_workflow["25"]["inputs"]["noise_seed"] = int(seed) if seed else random.randint(1, 2**63 - 1)
        flux_lora_workflow["38"]["inputs"]["lora_name"] = lora
        flux_lora_workflow["46"]["inputs"]["batch_size"] = 1
        flux_lora_workflow["46"]["inputs"]["height"] = height
        flux_lora_workflow["46"]["inputs"]["width"] = width

        self.scripts.log(f"🔧 WORKFLOW CONFIGURATION:")
        self.scripts.log(f"   Node 6 (Text): '{flux_lora_workflow['6']['inputs']['text'][:50]}...'")
        self.scripts.log(f"   Node 9 (Filename): {flux_lora_workflow['9']['inputs']['filename_prefix']}")
        self.scripts.log(f"   Node 12 (Model): {flux_lora_workflow['12']['inputs']['unet_name']}")
        self.scripts.log(f"   Node 17 (Steps): {flux_lora_workflow['17']['inputs']['steps']}")
        self.scripts.log(f"   Node 25 (Seed): {flux_lora_workflow['25']['inputs']['noise_seed']}")
        self.scripts.log(f"   Node 38 (LoRA): {flux_lora_workflow['38']['inputs']['lora_name']}")
        self.scripts.log(f"   Node 46 (Resolution): {flux_lora_workflow['46']['inputs']['width']}x{flux_lora_workflow['46']['inputs']['height']}")

        return flux_lora_workflow

    def generate_image_without_lora(self, prompt: str="", steps: int=20, width: int=1920, height: int=1080, seed: str=None, model: str="flux1-schnell.safetensors"):
        """
        Generate image without LoRA using flux.json workflow
        Args:
            prompt (str): Text prompt for image generation
            output_path (str): Path where image will be saved
            steps (int): Number of generation steps
            width (int): Width of output image
            height (int): Height of output image
            seed (str): Unique prefix for this job (from ComfyUIQueue)
        Returns:
            bool: True if prompt was queued successfully, False otherwise
        """

        self.scripts.log(f"🎨 FLUX STANDARD IMAGE GENERATION:")
        self.scripts.log(f"   Prompt: '{prompt[:100]}{'...' if len(prompt) > 100 else ''}'")
        self.scripts.log(f"   Steps: {steps}")
        self.scripts.log(f"   Resolution: {width}x{height}")
        self.scripts.log(f"   Seed: {seed}")
        self.scripts.log(f"   Model: {model}")
        
        flux_workflow = self.comfyui.load_workflow(os.path.join(self.package_dir, "flux.json"))
        flux_workflow["6"]["inputs"]["text"] = prompt
        flux_workflow["9"]["inputs"]["filename_prefix"] = f"flux_{seed}"
        flux_workflow["17"]["inputs"]["steps"] = steps
        flux_workflow["12"]["inputs"]["unet_name"] = model
        flux_workflow["25"]["inputs"]["noise_seed"] = int(seed) if seed else random.randint(1, 2**63 - 1)
        flux_workflow["27"]["inputs"]["batch_size"] = 1
        flux_workflow["27"]["inputs"]["height"] = height
        flux_workflow["27"]["inputs"]["width"] = width

        self.scripts.log(f"🔧 WORKFLOW CONFIGURATION:")
        self.scripts.log(f"   Node 6 (Text): '{flux_workflow['6']['inputs']['text'][:50]}...'")
        self.scripts.log(f"   Node 9 (Filename): {flux_workflow['9']['inputs']['filename_prefix']}")
        self.scripts.log(f"   Node 12 (Model): {flux_workflow['12']['inputs']['unet_name']}")
        self.scripts.log(f"   Node 17 (Steps): {flux_workflow['17']['inputs']['steps']}")
        self.scripts.log(f"   Node 25 (Seed): {flux_workflow['25']['inputs']['noise_seed']}")
        self.scripts.log(f"   Node 27 (Resolution): {flux_workflow['27']['inputs']['width']}x{flux_workflow['27']['inputs']['height']}")
        
        return flux_workflow

    def generate_image(self, prompt: str="", lora: str=None, steps: int=30, width: int=1920, height: int=1080, seed: str=None, model: str="flux1-schnell.safetensors", output_path: str=None):
        """
        Generate image with or without LoRA based on lora parameter
        Args:
            prompt (str): Text prompt for image generation
            output_path (str): Path where image will be saved
            lora (str): Name of the LoRA model to use (None for no LoRA)
            steps (int): Number of generation steps
            width (int): Width of output image
            height (int): Height of output image
            seed (str): Unique prefix for this job (from ComfyUIQueue)
        Returns:
            bool: True if image is generated successfully, False otherwise
        """
        
        # Debug logging to see what's being passed
        self.scripts.log(f"🔍 DEBUG: Flux.generate_image called with:")
        self.scripts.log(f"   - prompt: '{prompt}'")
        self.scripts.log(f"   - lora: '{lora}'")
        self.scripts.log(f"   - steps: {steps}")
        self.scripts.log(f"   - width: {width}")
        self.scripts.log(f"   - height: {height}")
        self.scripts.log(f"   - seed: '{seed}'")
        self.scripts.log(f"   - model: '{model}'")
        
        # Get initial files before queuing the prompt
        output_directory = ComfyUIConfig.get_output_dir()
        existing_files = self.comfyui.get_initial_files(seed, output_directory, ComfyUIConfig.IMAGE_EXTENSIONS)
        self.scripts.log(f"Found {len(existing_files)} existing files before generation")
        
        # Queue the appropriate workflow
        if lora is None or lora == "":
            # Use flux.json workflow without LoRA
            self.scripts.log(f"🔄 Using FLUX STANDARD workflow (no LoRA)")
            workflow = self.generate_image_without_lora(prompt, steps, width, height, seed, model)
        else:
            # Use flux_lora.json workflow with LoRA
            self.scripts.log(f"🔄 Using FLUX LoRA workflow with LoRA: {lora}")
            workflow = self.generate_image_with_lora(prompt, lora, steps, width, height, seed, model)
        
        try:
            result = self.comfyui.process_generated_prompt(
                workflow=workflow,
                output_path=output_path,
                pattern=f"flux_{seed}",
                extensions=ComfyUIConfig.IMAGE_EXTENSIONS,
                timeout=ComfyUIConfig.DEFAULT_TIMEOUT
            )
            
            if result:
                self.scripts.log(f"✅ Flux generation completed successfully")
                return True, result
            else:
                self.scripts.error("❌ Flux generation failed during processing")
                return False, None
                
        except Exception as e:
            self.scripts.error(f"Error in Flux generation: {str(e)}")
            return False, None