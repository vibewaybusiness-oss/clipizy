"""
VIDEOMAKING HELPER SERVICE EXAMPLES

This file demonstrates advanced video processing capabilities including:
- Advanced transition effects
- Chroma key (green/blue/black screen) compositing
- Video effects and filters
- Color correction and enhancement
"""

import asyncio
from api.services.videomaking.videomaking_helper_services import (
    VideoHelperService, 
    AdvancedTransitionService,
    ChromaKeyService,
    VideoEffectsService,
    TransitionDirection,
    ChromaKeyType,
    EffectType,
    create_green_screen_video,
    create_blue_screen_video,
    create_fade_transition_video,
    apply_video_effect
)

# EXAMPLE 1: ADVANCED TRANSITION EFFECTS
async def create_advanced_transitions():
    """Demonstrate various transition effects"""
    
    transition_service = AdvancedTransitionService()
    
    # Fade transition
    fade_output = transition_service.create_fade_transition(
        "video1.mp4", "video2.mp4", 2.0, "fade_output.mp4"
    )
    print("Fade transition created")
    
    # Dissolve transition
    dissolve_output = transition_service.create_dissolve_transition(
        "video1.mp4", "video2.mp4", 3.0, "dissolve_output.mp4"
    )
    print("Dissolve transition created")
    
    # Wipe transition (left to right)
    wipe_output = transition_service.create_wipe_transition(
        "video1.mp4", "video2.mp4", 2.5, 
        TransitionDirection.LEFT, "wipe_output.mp4"
    )
    print("Wipe transition created")
    
    # Slide transition (up)
    slide_output = transition_service.create_slide_transition(
        "video1.mp4", "video2.mp4", 2.0,
        TransitionDirection.UP, "slide_output.mp4"
    )
    print("Slide transition created")
    
    # Zoom transition (zoom in)
    zoom_output = transition_service.create_zoom_transition(
        "video1.mp4", "video2.mp4", 2.0,
        TransitionDirection.IN, "zoom_output.mp4"
    )
    print("Zoom transition created")
    
    # Custom transition with FFmpeg filter
    custom_filter = "blend=all_mode=multiply:all_opacity=0.5"
    custom_output = transition_service.create_custom_transition(
        "video1.mp4", "video2.mp4", custom_filter, 2.0, "custom_output.mp4"
    )
    print("Custom transition created")

# EXAMPLE 2: CHROMA KEY COMPOSITING
async def create_chroma_key_composites():
    """Demonstrate chroma key compositing"""
    
    chroma_service = ChromaKeyService()
    
    # Green screen composite
    green_output = chroma_service.create_green_screen_composite(
        "background.mp4", "green_screen_person.mp4", 
        "green_composite.mp4", tolerance=0.1
    )
    print("Green screen composite created")
    
    # Blue screen composite
    blue_output = chroma_service.create_blue_screen_composite(
        "background.mp4", "blue_screen_person.mp4",
        "blue_composite.mp4", tolerance=0.15
    )
    print("Blue screen composite created")
    
    # Black screen composite (for shadows)
    black_output = chroma_service.create_black_screen_composite(
        "background.mp4", "shadow_video.mp4",
        "black_composite.mp4", tolerance=0.2
    )
    print("Black screen composite created")
    
    # Advanced chroma key with custom settings
    from api.services.videomaking.videomaking_helper_services import ChromaKeyOverlay
    
    chroma_key = ChromaKeyOverlay(
        file_path="custom_chroma_video.mp4",
        chroma_type=ChromaKeyType.CUSTOM,
        start_time=0,
        end_time=10,
        x=100,
        y=50,
        width=400,
        height=300,
        tolerance=0.12,
        smoothness=0.08,
        spill=0.05,
        custom_color="0xFF00FF"  # Magenta
    )
    
    advanced_output = chroma_service.apply_chroma_key(
        "background.mp4", "custom_chroma_video.mp4", 
        chroma_key, "advanced_chroma.mp4"
    )
    print("Advanced chroma key composite created")

# EXAMPLE 3: VIDEO EFFECTS AND FILTERS
async def create_video_effects():
    """Demonstrate various video effects"""
    
    effects_service = VideoEffectsService()
    
    # Blur effect
    blur_output = effects_service.apply_blur_effect(
        "input_video.mp4", "blurred_video.mp4", 
        intensity=2.0, start_time=5, end_time=15
    )
    print("Blur effect applied")
    
    # Brightness and contrast adjustment
    brightness_output = effects_service.apply_brightness_contrast(
        "input_video.mp4", "brightened_video.mp4",
        brightness=0.3, contrast=1.2, start_time=0, end_time=20
    )
    print("Brightness/contrast adjusted")
    
    # Saturation boost
    saturation_output = effects_service.apply_saturation_effect(
        "input_video.mp4", "saturated_video.mp4",
        saturation=1.5, start_time=10, end_time=25
    )
    print("Saturation effect applied")
    
    # Vignette effect
    vignette_output = effects_service.apply_vignette_effect(
        "input_video.mp4", "vignette_video.mp4",
        intensity=0.7, start_time=0, end_time=30
    )
    print("Vignette effect applied")
    
    # Sepia effect
    sepia_output = effects_service.apply_sepia_effect(
        "input_video.mp4", "sepia_video.mp4",
        intensity=1.0, start_time=0, end_time=30
    )
    print("Sepia effect applied")
    
    # Film grain effect
    grain_output = effects_service.apply_grain_effect(
        "input_video.mp4", "grainy_video.mp4",
        intensity=0.15, start_time=0, end_time=30
    )
    print("Grain effect applied")

# EXAMPLE 4: COMPLEX COMPOSITION WITH ALL FEATURES
async def create_complex_advanced_composition():
    """Create a complex video with all advanced features"""
    
    # This would be called with actual service instance
    # videomaking_helper = VideoHelperService(storage, json_store)
    
    composition_data = {
        "videos": [
            {
                "file_path": "https://example.com/intro.mp4",
                "start_time": 0,
                "end_time": 10,
                "volume": 1.0
            },
            {
                "file_path": "https://example.com/main_content.mp4",
                "start_time": 0,
                "end_time": 30,
                "volume": 1.0
            },
            {
                "file_path": "https://example.com/outro.mp4",
                "start_time": 0,
                "end_time": 8,
                "volume": 1.0
            }
        ],
        "transitions": [
            {
                "transition_type": "fade",
                "duration": 2.0,
                "start_time": 8.0,
                "end_time": 10.0
            },
            {
                "transition_type": "slide",
                "duration": 1.5,
                "direction": "left",
                "start_time": 28.0,
                "end_time": 29.5
            },
            {
                "transition_type": "zoom",
                "duration": 2.0,
                "direction": "out",
                "start_time": 36.0,
                "end_time": 38.0
            }
        ],
        "chroma_overlays": [
            {
                "file_path": "https://example.com/person_green_screen.mp4",
                "chroma_type": "green",
                "start_time": 5,
                "end_time": 25,
                "x": 100,
                "y": 50,
                "width": 300,
                "height": 400,
                "tolerance": 0.1,
                "smoothness": 0.08,
                "spill": 0.05
            },
            {
                "file_path": "https://example.com/logo_blue_screen.mp4",
                "chroma_type": "blue",
                "start_time": 15,
                "end_time": 35,
                "x": 50,
                "y": 20,
                "width": 150,
                "height": 75,
                "tolerance": 0.12,
                "smoothness": 0.1,
                "spill": 0.08
            }
        ],
        "effects": [
            {
                "effect_type": "brightness",
                "intensity": 1.0,
                "start_time": 0,
                "end_time": 10,
                "brightness": 0.2,
                "contrast": 1.1
            },
            {
                "effect_type": "vignette",
                "intensity": 0.6,
                "start_time": 20,
                "end_time": 30
            },
            {
                "effect_type": "grain",
                "intensity": 0.1,
                "start_time": 0,
                "end_time": 40
            }
        ]
    }
    
    # result = await videomaking_helper.create_advanced_composition(
    #     composition_data, project_id, user_id
    # )
    print("Complex advanced composition created")

# EXAMPLE 5: SOCIAL MEDIA CONTENT WITH EFFECTS
async def create_social_media_content():
    """Create engaging social media content with effects"""
    
    composition_data = {
        "videos": [
            {
                "file_path": "https://example.com/vertical_content.mp4",
                "start_time": 0,
                "end_time": 30,
                "volume": 0.8
            }
        ],
        "transitions": [
            {
                "transition_type": "zoom",
                "duration": 1.0,
                "direction": "in",
                "start_time": 5.0,
                "end_time": 6.0
            },
            {
                "transition_type": "zoom",
                "duration": 1.0,
                "direction": "out",
                "start_time": 24.0,
                "end_time": 25.0
            }
        ],
        "chroma_overlays": [
            {
                "file_path": "https://example.com/brand_logo_green.mp4",
                "chroma_type": "green",
                "start_time": 0,
                "end_time": 30,
                "x": 20,
                "y": 20,
                "width": 100,
                "height": 50,
                "tolerance": 0.08
            }
        ],
        "effects": [
            {
                "effect_type": "saturation",
                "intensity": 1.3,
                "start_time": 0,
                "end_time": 30
            },
            {
                "effect_type": "vignette",
                "intensity": 0.4,
                "start_time": 0,
                "end_time": 30
            }
        ]
    }
    
    print("Social media content composition created")

# EXAMPLE 6: CINEMATIC EFFECTS
async def create_cinematic_effects():
    """Create cinematic-style video effects"""
    
    composition_data = {
        "videos": [
            {
                "file_path": "https://example.com/cinematic_scene.mp4",
                "start_time": 0,
                "end_time": 60,
                "volume": 1.0
            }
        ],
        "transitions": [
            {
                "transition_type": "dissolve",
                "duration": 3.0,
                "start_time": 20.0,
                "end_time": 23.0
            }
        ],
        "effects": [
            {
                "effect_type": "sepia",
                "intensity": 0.8,
                "start_time": 0,
                "end_time": 20
            },
            {
                "effect_type": "grain",
                "intensity": 0.2,
                "start_time": 0,
                "end_time": 60
            },
            {
                "effect_type": "vignette",
                "intensity": 0.8,
                "start_time": 0,
                "end_time": 60
            }
        ]
    }
    
    print("Cinematic effects composition created")

# EXAMPLE 7: BATCH PROCESSING WITH EFFECTS
async def create_batch_processed_videos():
    """Process multiple videos with different effects"""
    
    video_templates = [
        {
            "name": "bright_video",
            "video": "video1.mp4",
            "effects": [
                {"effect_type": "brightness", "brightness": 0.3, "contrast": 1.2},
                {"effect_type": "saturation", "saturation": 1.4}
            ]
        },
        {
            "name": "moody_video",
            "video": "video2.mp4", 
            "effects": [
                {"effect_type": "brightness", "brightness": -0.2, "contrast": 1.3},
                {"effect_type": "vignette", "intensity": 0.7},
                {"effect_type": "grain", "intensity": 0.15}
            ]
        },
        {
            "name": "vintage_video",
            "video": "video3.mp4",
            "effects": [
                {"effect_type": "sepia", "intensity": 1.0},
                {"effect_type": "grain", "intensity": 0.25},
                {"effect_type": "vignette", "intensity": 0.6}
            ]
        }
    ]
    
    for template in video_templates:
        # Apply effects to each video
        current_video = template["video"]
        
        for effect in template["effects"]:
            output_path = f"{template['name']}_{effect['effect_type']}.mp4"
            
            if effect["effect_type"] == "brightness":
                effects_service = VideoEffectsService()
                current_video = effects_service.apply_brightness_contrast(
                    current_video, output_path,
                    effect.get("brightness", 0.0),
                    effect.get("contrast", 1.0)
                )
            elif effect["effect_type"] == "saturation":
                effects_service = VideoEffectsService()
                current_video = effects_service.apply_saturation_effect(
                    current_video, output_path,
                    effect.get("saturation", 1.0)
                )
            # ... other effects
        
        print(f"Processed {template['name']} with effects")

# EXAMPLE 8: CONVENIENCE FUNCTIONS
async def use_convenience_functions():
    """Demonstrate convenience functions for common operations"""
    
    # Simple green screen
    green_output = create_green_screen_video(
        "background.mp4", "person_green.mp4", "simple_green.mp4"
    )
    print("Simple green screen created")
    
    # Simple blue screen
    blue_output = create_blue_screen_video(
        "background.mp4", "person_blue.mp4", "simple_blue.mp4"
    )
    print("Simple blue screen created")
    
    # Simple fade transition
    fade_output = create_fade_transition_video(
        "video1.mp4", "video2.mp4", "simple_fade.mp4", 2.0
    )
    print("Simple fade transition created")
    
    # Apply single effect
    blur_output = apply_video_effect(
        "input.mp4", EffectType.BLUR, "blurred.mp4", 1.5
    )
    print("Blur effect applied")
    
    sepia_output = apply_video_effect(
        "input.mp4", EffectType.SEPIA, "sepia.mp4", 1.0
    )
    print("Sepia effect applied")

# EXAMPLE 9: ERROR HANDLING
async def demonstrate_error_handling():
    """Demonstrate proper error handling"""
    
    try:
        # This will fail due to invalid file
        transition_service = AdvancedTransitionService()
        result = transition_service.create_fade_transition(
            "nonexistent_video.mp4", "another_video.mp4", 2.0, "output.mp4"
        )
        
    except subprocess.CalledProcessError as e:
        print(f"Transition failed: {e.stderr.decode()}")
    except FileNotFoundError as e:
        print(f"File not found: {str(e)}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
    
    try:
        # This will fail due to invalid chroma key settings
        chroma_service = ChromaKeyService()
        result = chroma_service.create_green_screen_composite(
            "background.mp4", "invalid_green.mp4", "output.mp4", tolerance=2.0  # Invalid tolerance
        )
        
    except subprocess.CalledProcessError as e:
        print(f"Chroma key failed: {e.stderr.decode()}")
    except Exception as e:
        print(f"Chroma key error: {str(e)}")

# MAIN FUNCTION TO RUN EXAMPLES
async def main():
    """Run all helper service examples"""
    print("=== VIDEOMAKING HELPER SERVICE EXAMPLES ===\n")
    
    await create_advanced_transitions()
    await create_chroma_key_composites()
    await create_video_effects()
    await create_complex_advanced_composition()
    await create_social_media_content()
    await create_cinematic_effects()
    await create_batch_processed_videos()
    await use_convenience_functions()
    await demonstrate_error_handling()
    
    print("\n=== ALL HELPER EXAMPLES COMPLETED ===")

if __name__ == "__main__":
    asyncio.run(main())
