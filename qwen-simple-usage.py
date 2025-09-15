#!/usr/bin/env python3
"""
Simple Qwen Image Usage Example
Shows the basic usage of Qwen workflow with ComfyUI API
"""

import os
import sys
import random

# Add the backend directory to the Python path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)

from comfyUI.workflows.qwen_image.qwen_image import QwenImage

def main():
    """Simple example of using Qwen Image API"""
    
    print("🎨 Qwen Image Generation Example")
    print("=" * 40)
    
    # Initialize Qwen Image API
    qwen = QwenImage()
    
    # Set up parameters
    prompt = "Queen Elizabeth eating spaghetti, royal dining, elegant, detailed, high quality, photorealistic"
    negative_prompt = "blurry, low quality, distorted, ugly, bad anatomy"
    width = 1328
    height = 1328
    seed = str(random.randint(1, 2**63 - 1))
    output_path = "C:/tmp/queen_elizabeth_spaghetti.png"
    
    print(f"📝 Prompt: {prompt}")
    print(f"📐 Resolution: {width}x{height}")
    print(f"🎲 Seed: {seed}")
    print(f"💾 Output: {output_path}")
    print()
    
    # Generate the image
    print("🔄 Generating image...")
    
    success = qwen.generate_image(
        prompt=prompt,
        width=width,
        height=height,
        seed=seed,
        output_path=output_path,
        negative_prompt=negative_prompt
    )
    
    if success:
        print("✅ Image generated successfully!")
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            print(f"📁 File saved: {output_path} ({file_size} bytes)")
        else:
            print("⚠️  File not found at expected location")
    else:
        print("❌ Image generation failed")

if __name__ == "__main__":
    main()
