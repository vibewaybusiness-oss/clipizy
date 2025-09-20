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

    def generate_voiceover_function(self, text: str="", audio_input: str="", model: str="VibeVoice-1.5B", diffusion_steps: int=20, seed: int=42, cfg_scale: float=1.3, temperature: float=0.95, top_p: float=0.95, use_sampling: bool=False, attention_type: str="auto", free_memory_after_generate: bool=True):
        """
        Generate voiceover using text2audio_1_speaker.json workflow
        Args:
            text (str): Text to convert to speech
            audio_input (str): Path to reference audio file for voice cloning
            model (str): VibeVoice model to use
            diffusion_steps (int): Number of diffusion steps
            seed (int): Random seed for generation
            cfg_scale (float): Classifier-free guidance scale
            temperature (float): Sampling temperature
            top_p (float): Top-p sampling parameter
            use_sampling (bool): Whether to use sampling
            attention_type (str): Attention mechanism type
            free_memory_after_generate (bool): Whether to free memory after generation
        Returns:
            dict: Configured workflow for voiceover generation
        """

        self.scripts.log(f"🎤 VIBEVOICE VOICEOVER GENERATION:")
        self.scripts.log(f"   Text: '{text[:100]}{'...' if len(text) > 100 else ''}'")
        self.scripts.log(f"   Audio Input: {audio_input}")
        self.scripts.log(f"   Model: {model}")
        self.scripts.log(f"   Diffusion Steps: {diffusion_steps}")
        self.scripts.log(f"   Seed: {seed}")
        self.scripts.log(f"   CFG Scale: {cfg_scale}")
        self.scripts.log(f"   Temperature: {temperature}")
        self.scripts.log(f"   Top-p: {top_p}")
        
        voiceover_workflow = self.comfyui.load_workflow(os.path.join(self.package_dir, "text2audio_1_speaker.json"))
        
        voiceover_workflow["15"]["inputs"]["audio"] = audio_input
        voiceover_workflow["36"]["inputs"]["text"] = text
        voiceover_workflow["36"]["inputs"]["model"] = model
        voiceover_workflow["36"]["inputs"]["attention_type"] = attention_type
        voiceover_workflow["36"]["inputs"]["free_memory_after_generate"] = free_memory_after_generate
        voiceover_workflow["36"]["inputs"]["diffusion_steps"] = diffusion_steps
        voiceover_workflow["36"]["inputs"]["seed"] = seed
        voiceover_workflow["36"]["inputs"]["cfg_scale"] = cfg_scale
        voiceover_workflow["36"]["inputs"]["use_sampling"] = use_sampling
        voiceover_workflow["36"]["inputs"]["temperature"] = temperature
        voiceover_workflow["36"]["inputs"]["top_p"] = top_p

        self.scripts.log(f"🔧 WORKFLOW CONFIGURATION:")
        self.scripts.log(f"   Node 15 (LoadAudio): {voiceover_workflow['15']['inputs']['audio']}")
        self.scripts.log(f"   Node 36 (VibeVoice): '{voiceover_workflow['36']['inputs']['text'][:50]}...'")
        self.scripts.log(f"   Node 36 (Model): {voiceover_workflow['36']['inputs']['model']}")
        self.scripts.log(f"   Node 36 (Steps): {voiceover_workflow['36']['inputs']['diffusion_steps']}")
        self.scripts.log(f"   Node 36 (Seed): {voiceover_workflow['36']['inputs']['seed']}")
        self.scripts.log(f"   Node 36 (CFG Scale): {voiceover_workflow['36']['inputs']['cfg_scale']}")

        return voiceover_workflow
