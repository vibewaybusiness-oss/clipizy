import os
import random
import json
import uuid
from typing import Dict, Any, Optional, Tuple

class QwenImage:
    def __init__(self):
        self.package_dir = os.path.dirname(__file__)
    
    def generate_image_workflow(self, prompt: str="", reference_image_path: str=None, width: int=1328, height: int=1328, seed: str="", negative_prompt: str="") -> Tuple[Dict[str, Any], str, str]:
        """
        Generate Qwen Image workflow configuration
        Args:
            prompt (str): Text prompt for image generation
            reference_image_path (str): Optional reference image for image generation
            width (int): Width of output image
            height (int): Height of output image
            seed (str): Seed for generation
            negative_prompt (str): Negative prompt to avoid certain elements
        Returns:
            Tuple[Dict, str, str]: (qwen_workflow, pattern, download_directory)
        """
        seed = seed or str(random.randint(1, 2**63 - 1))
        if reference_image_path and reference_image_path.strip():
            return self.generate_image_workflow_with_reference(prompt, reference_image_path, width, height, seed, negative_prompt)
        else:
            return self.generate_image_workflow_no_reference(prompt, width, height, seed, negative_prompt)

    def generate_image_workflow_no_reference(self, prompt: str="", width: int=1328, height: int=1328, seed: str="", negative_prompt: str="") -> Tuple[Dict[str, Any], str, str]:
        """
        Generate Qwen Image workflow without reference image
        Args:
            prompt (str): Text prompt for image generation
            width (int): Width of output image
            height (int): Height of output image
            seed (str): Seed for generation
            negative_prompt (str): Negative prompt to avoid certain elements
        Returns:
            Tuple[Dict, str, str]: (qwen_workflow, pattern, download_directory)
        """
        # Load the workflow template
        workflow_path = os.path.join(self.package_dir, "qwen_image_4_steps.json")
        with open(workflow_path, 'r', encoding='utf-8-sig') as file:
            qwen_workflow = json.load(file)

        qwen_workflow["3"]["inputs"]["seed"] = int(seed)
        qwen_workflow["6"]["inputs"]["text"] = prompt
        qwen_workflow["58"]["inputs"]["width"] = width
        qwen_workflow["58"]["inputs"]["height"] = height
        qwen_workflow["58"]["inputs"]["batch_size"] = 1
        qwen_workflow["60"]["inputs"]["filename_prefix"] = f"qwen_{seed}"
        
        pattern = f"qwen_{seed}"
        download_directory = "/workspace/ComfyUI/output/"
        
        return qwen_workflow, pattern, download_directory 
    
    def generate_image_workflow_with_reference(self, prompt: str="", reference_image_path: str=None, width: int=1328, height: int=1328, seed: str="", negative_prompt: str="") -> Tuple[Dict[str, Any], str, str]:
        """
        Generate Qwen Image workflow with reference image
        Args:
            prompt (str): Text prompt for image generation
            reference_image_path (str): Optional reference image for image generation
            width (int): Width of output image
            height (int): Height of output image
            seed (str): Seed for generation
            negative_prompt (str): Negative prompt to avoid certain elements
        Returns:
            Tuple[Dict, str, str]: (qwen_workflow, pattern, download_directory)
        """
        # Load the workflow template
        workflow_path = os.path.join(self.package_dir, "qwen_image_edit_4_steps.json")
        with open(workflow_path, 'r', encoding='utf-8-sig') as file:
            qwen_workflow = json.load(file)
        
        qwen_workflow["3"]["inputs"]["seed"] = int(seed)
        qwen_workflow["76"]["inputs"]["prompt"] = prompt
        
        if negative_prompt:
            qwen_workflow["77"]["inputs"]["prompt"] = negative_prompt
        qwen_workflow["60"]["inputs"]["filename_prefix"] = f"qwen_ref_{seed}"
        qwen_workflow["78"]["inputs"]["image"] = reference_image_path
        
        pattern = f"qwen_ref_{seed}"
        download_directory = "/workspace/ComfyUI/output/"
        
        return qwen_workflow, pattern, download_directory