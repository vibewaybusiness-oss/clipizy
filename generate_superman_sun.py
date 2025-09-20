#!/usr/bin/env python3
"""
Generate Superman on the Sun - New Workflow
"""
import asyncio
import sys
import os
from pathlib import Path

# Add the api directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))

async def generate_superman_on_sun():
    """Generate Superman on the Sun using ComfyUI"""
    print("☀️ SUPERMAN ON THE SUN - IMAGE GENERATION")
    print("=" * 60)
    
    try:
        from api.comfyui.comfyui_manager import get_comfyui_manager
        from api.comfyui.models import WorkflowType, WorkflowRequest, QwenImageInput
        
        # Initialize ComfyUI manager
        comfyui_manager = get_comfyui_manager()
        await comfyui_manager.ensure_initialized()
        
        print("🚀 Starting Superman on the Sun generation...")
        
        # Create workflow request for Qwen image generation
        qwen_input = QwenImageInput(
            prompt="Superman standing on the surface of the Sun, solar flares in background, cosmic energy radiating from his body, dramatic space lighting, photorealistic, high quality, detailed, heroic pose, space suit with Superman logo, Earth visible in distance, epic cosmic scene",
            width=1024,
            height=1024,
                seed="42",
            negative_prompt="blurry, low quality, distorted, cartoon, anime, dark, gloomy, low resolution, unrealistic, impossible physics"
        )
        
        workflow_request = WorkflowRequest(
            workflow_type=WorkflowType.IMAGE_QWEN,
            inputs=qwen_input.model_dump()
        )
        
        print(f"📋 Prompt: {qwen_input.prompt}")
        print(f"📐 Dimensions: {qwen_input.width}x{qwen_input.height}")
        print(f"🎲 Seed: {qwen_input.seed}")
        
        # Execute the workflow
        print("\n🎨 Executing ComfyUI workflow...")
        result = await comfyui_manager.execute_workflow(workflow_request)
        
        if result.error:
            print(f"❌ Error: {result.error}")
            return False
        
        if result.prompt_id:
            print("⏳ Workflow is processing...")
            
            # Monitor the workflow completion
            max_attempts = 60  # 5 minutes max
            for attempt in range(max_attempts):
                await asyncio.sleep(5)
                
                # Get updated request status
                updated_request = comfyui_manager.get_request(result.id)
                if updated_request:
                    if updated_request.status == "completed":
                        print("✅ Workflow completed successfully!")
                        if updated_request.result and updated_request.result.images:
                            print(f"🖼️ Generated {len(updated_request.result.images)} image(s)")
                            for i, image in enumerate(updated_request.result.images):
                                print(f"   Image {i+1}: {image.get('url', 'No URL available')}")
                        return True
                    elif updated_request.status == "failed":
                        print(f"❌ Workflow failed: {updated_request.error}")
                        return False
            
            print("⏰ Workflow timed out")
            return False
        else:
            print("❌ No prompt ID received")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main function"""
    print("☀️ SUPERMAN ON THE SUN - DETAILED IMAGE GENERATION")
    print("=" * 60)
    
    success = await generate_superman_on_sun()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 SUPERMAN ON THE SUN GENERATION COMPLETED!")
        print("☀️ The Man of Steel has successfully landed on the Sun! 🔥")
    else:
        print("❌ Superman on the Sun generation failed or was incomplete")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
