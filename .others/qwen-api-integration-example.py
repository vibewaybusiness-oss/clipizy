#!/usr/bin/env python3
"""
Qwen Image API Integration Example
Shows how to use the Qwen workflow with the existing ComfyUI API functions
"""

import os
import sys
import time
import random
from pathlib import Path

# Add the backend directory to the Python path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)

from comfyUI.workflows.qwen_image.qwen_image import QwenImage
from comfyUI.workflows.config import ComfyUIConfig
from comfyUI.workflows.comfyui import ComfyUI

def test_qwen_image_generation():
    """Test Qwen image generation using the API"""
    
    print("🎨 Qwen Image API Integration Test")
    print("=" * 50)
    
    # Initialize Qwen Image API
    qwen = QwenImage()
    
    # Test parameters
    prompt = "Queen Elizabeth eating spaghetti, royal dining, elegant, detailed, high quality, photorealistic"
    negative_prompt = "blurry, low quality, distorted, ugly, bad anatomy, deformed"
    width = 1328
    height = 1328
    seed = str(random.randint(1, 2**63 - 1))
    output_path = "/tmp/qwen_queen_test.png"
    
    print(f"📝 Prompt: {prompt}")
    print(f"🚫 Negative: {negative_prompt}")
    print(f"📐 Resolution: {width}x{height}")
    print(f"🎲 Seed: {seed}")
    print(f"💾 Output: {output_path}")
    print()
    
    # Test 1: Generate image without reference
    print("🔄 Test 1: Generating image without reference...")
    start_time = time.time()
    
    success = qwen.generate_image(
        prompt=prompt,
        width=width,
        height=height,
        seed=seed,
        output_path=output_path,
        negative_prompt=negative_prompt
    )
    
    generation_time = time.time() - start_time
    
    if success:
        print(f"✅ Image generated successfully in {generation_time:.2f} seconds")
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            print(f"📁 File saved: {output_path} ({file_size} bytes)")
        else:
            print("⚠️  File not found at expected location")
    else:
        print("❌ Image generation failed")
    
    print()
    
    # Test 2: Generate image with reference (if you have a reference image)
    print("🔄 Test 2: Generating image with reference...")
    reference_image = "/tmp/reference_image.png"  # Replace with actual reference image path
    
    if os.path.exists(reference_image):
        success_ref = qwen.generate_image(
            prompt=prompt,
            reference_image_path=reference_image,
            width=width,
            height=height,
            seed=seed + "1",  # Different seed
            output_path="/tmp/qwen_queen_ref_test.png",
            negative_prompt=negative_prompt
        )
        
        if success_ref:
            print("✅ Reference image generation completed")
        else:
            print("❌ Reference image generation failed")
    else:
        print("⚠️  Reference image not found, skipping reference test")
    
    print()
    
    # Test 3: Direct ComfyUI API usage
    print("🔄 Test 3: Direct ComfyUI API usage...")
    
    comfyui = ComfyUI()
    
    # Load the Qwen workflow directly
    workflow_path = os.path.join(backend_path, "comfyUI", "workflows", "qwen_image", "qwen-image-8steps.json")
    
    if os.path.exists(workflow_path):
        workflow = comfyui.load_workflow(workflow_path)
        
        # Modify the workflow
        workflow["6"]["inputs"]["text"] = prompt
        workflow["7"]["inputs"]["text"] = negative_prompt
        workflow["58"]["inputs"]["width"] = width
        workflow["58"]["inputs"]["height"] = height
        workflow["3"]["inputs"]["seed"] = int(seed)
        workflow["60"]["inputs"]["filename_prefix"] = "qwen_direct_api"
        
        print("📤 Submitting workflow directly to ComfyUI...")
        
        # Queue the prompt
        response = comfyui.queue_prompt(workflow)
        print(f"📋 Queue response: {response}")
        
        if "prompt_id" in response:
            prompt_id = response["prompt_id"]
            print(f"🆔 Prompt ID: {prompt_id}")
            
            # Wait for completion
            print("⏳ Waiting for completion...")
            if comfyui.get_state(prompt_id):
                print("✅ Direct API workflow completed successfully")
            else:
                print("❌ Direct API workflow failed or timed out")
        else:
            print("❌ Failed to get prompt ID from ComfyUI")
    else:
        print(f"❌ Workflow file not found: {workflow_path}")
    
    print()
    print("🎉 Qwen API integration test completed!")

def test_comfyui_server_status():
    """Test ComfyUI server status and configuration"""
    
    print("🔍 ComfyUI Server Status Check")
    print("=" * 40)
    
    # Check server configuration
    config = ComfyUIConfig()
    print(f"🌐 Server URL: {config.get_server_url()}")
    print(f"📁 Output Directory: {config.get_output_dir()}")
    print(f"📁 Input Directory: {config.get_input_dir()}")
    print(f"⏱️  Default Timeout: {config.DEFAULT_TIMEOUT}s")
    print(f"🖼️  Image Extensions: {config.IMAGE_EXTENSIONS}")
    print()
    
    # Check if server is running
    comfyui = ComfyUI()
    if comfyui.is_server_running():
        print("✅ ComfyUI server is running")
    else:
        print("❌ ComfyUI server is not running")
        print("🚀 Attempting to start server...")
        if comfyui.start_server():
            print("✅ Server started successfully")
        else:
            print("❌ Failed to start server")
    
    print()

def show_workflow_structure():
    """Show the structure of the Qwen workflow"""
    
    print("📋 Qwen Workflow Structure")
    print("=" * 30)
    
    workflow_path = os.path.join(backend_path, "comfyUI", "workflows", "qwen_image", "qwen-image-8steps.json")
    
    if os.path.exists(workflow_path):
        import json
        with open(workflow_path, 'r') as f:
            workflow = json.load(f)
        
        print(f"📊 Total nodes: {len(workflow)}")
        print()
        
        for node_id, node_data in workflow.items():
            if isinstance(node_data, dict) and "class_type" in node_data:
                print(f"Node {node_id}: {node_data['class_type']}")
                if "inputs" in node_data:
                    inputs = node_data["inputs"]
                    for input_name, input_value in inputs.items():
                        if isinstance(input_value, str) and len(input_value) > 50:
                            display_value = input_value[:50] + "..."
                        else:
                            display_value = input_value
                        print(f"  - {input_name}: {display_value}")
                print()
    else:
        print(f"❌ Workflow file not found: {workflow_path}")

if __name__ == "__main__":
    print("🚀 Starting Qwen Image API Integration Tests")
    print()
    
    # Test 1: Server status
    test_comfyui_server_status()
    
    # Test 2: Workflow structure
    show_workflow_structure()
    
    # Test 3: Image generation
    test_qwen_image_generation()
    
    print("✨ All tests completed!")
