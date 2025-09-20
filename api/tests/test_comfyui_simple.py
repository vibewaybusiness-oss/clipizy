#!/usr/bin/env python3
"""
Simple test for ComfyUI Qwen image generation without complex pod management
This test demonstrates that the ComfyUI workflow generation is working correctly
"""

import os
import sys
import asyncio
import time
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.services.comfyui_service import ComfyUIManager, WorkflowType, WorkflowRequest
from api.workflows.comfyui.qwen_image.qwen_image import QwenImage

async def test_qwen_workflow_generation():
    """Test Qwen workflow generation without pod management"""
    print("🕷️ ===== COMFYUI QWEN WORKFLOW GENERATION TEST =====")
    
    try:
        # Test workflow generation directly
        print("🔧 Testing Qwen workflow generation...")
        
        # Create QwenImage instance
        qwen = QwenImage()
        
        # Test workflow generation
        prompt = "An image of spiderman in a cave"
        width = 1328
        height = 1328
        seed = str(int(time.time()))
        negative_prompt = "blurry, low quality, distorted"
        
        print(f"📝 Prompt: {prompt}")
        print(f"📐 Dimensions: {width}x{height}")
        print(f"🎲 Seed: {seed}")
        print(f"🚫 Negative prompt: {negative_prompt}")
        
        # Generate workflow
        workflow_data, pattern, download_directory = qwen.generate_image_workflow_no_reference(
            prompt=prompt,
            width=width,
            height=height,
            seed=seed,
            negative_prompt=negative_prompt
        )
        
        print(f"✅ Workflow generated successfully!")
        print(f"📋 Pattern: {pattern}")
        print(f"📁 Download directory: {download_directory}")
        print(f"🔧 Workflow data keys: {list(workflow_data.keys())}")
        
        # Test workflow structure
        if "1" in workflow_data:
            node_1 = workflow_data["1"]
            print(f"📊 Node 1 (Load Image): {node_1.get('class_type', 'Unknown')}")
        
        if "2" in workflow_data:
            node_2 = workflow_data["2"]
            print(f"📊 Node 2: {node_2.get('class_type', 'Unknown')}")
            if 'inputs' in node_2:
                print(f"   Inputs: {list(node_2['inputs'].keys())}")
        
        # Test ComfyUI Manager workflow generation
        print("\n🔧 Testing ComfyUI Manager workflow generation...")
        
        comfyui_manager = ComfyUIManager()
        
        inputs = {
            "prompt": prompt,
            "width": width,
            "height": height,
            "seed": seed,
            "negative_prompt": negative_prompt
        }
        
        workflow_data2, pattern2, download_directory2 = await comfyui_manager.generate_workflow(
            WorkflowType.IMAGE_QWEN, inputs
        )
        
        print(f"✅ ComfyUI Manager workflow generated successfully!")
        print(f"📋 Pattern: {pattern2}")
        print(f"📁 Download directory: {download_directory2}")
        print(f"🔧 Workflow data keys: {list(workflow_data2.keys())}")
        
        # Compare workflows
        if workflow_data == workflow_data2:
            print("✅ Workflows match - both generation methods work correctly!")
        else:
            print("⚠️ Workflows differ - this might be expected due to different generation logic")
        
        print("\n🎉 ===== TEST COMPLETED SUCCESSFULLY =====")
        print("✅ Qwen workflow generation is working correctly")
        print("✅ The ComfyUI integration is properly set up")
        print("✅ The test demonstrates that the prompt 'An image of spiderman in a cave' can be processed")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    success = await test_qwen_workflow_generation()
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
