"""
VIDEOMAKING SERVICES INTEGRATION EXAMPLE

This file demonstrates how to use both the main videomaking service and the helper service
together to create sophisticated video compositions with advanced effects.
"""

import asyncio
from api.services.videomaking_services import VideoMakingService, VideoQuality
from api.services.videomaking_helper_services import (
    VideoHelperService,
    TransitionDirection,
    ChromaKeyType,
    EffectType,
    create_green_screen_video,
    create_fade_transition_video
)

async def create_professional_video_composition():
    """Create a professional video composition using both services"""
    
    # Initialize both services
    # videomaking_service = VideoMakingService(storage, json_store)
    # helper_service = VideoHelperService(storage, json_store)
    
    # STEP 1: Create basic video composition
    basic_composition_data = {
        "videos": [
            {
                "file_path": "https://example.com/background_scene.mp4",
                "start_time": 0,
                "end_time": 60,
                "volume": 0.3
            },
            {
                "file_path": "https://example.com/action_scene.mp4",
                "start_time": 0,
                "end_time": 45,
                "volume": 0.8
            }
        ],
        "audios": [
            {
                "file_path": "https://example.com/music_track.wav",
                "start_time": 0,
                "end_time": 60,
                "volume": 0.7,
                "fade_in": 3.0,
                "fade_out": 5.0
            },
            {
                "file_path": "https://example.com/voiceover.wav",
                "start_time": 10,
                "end_time": 50,
                "volume": 0.9
            }
        ],
        "overlays": [
            {
                "file_path": "https://example.com/logo.png",
                "type": "image",
                "start_time": 0,
                "end_time": 60,
                "x": 50,
                "y": 50,
                "width": 200,
                "height": 100,
                "opacity": 0.9
            }
        ],
        "quality": "high",
        "fps": 30,
        "use_gpu": True,
        "parallel_processing": True
    }
    
    # Create basic composition
    # basic_result = await videomaking_service.create_video_composition(
    #     db, project_id, basic_composition_data, user_id
    # )
    print("Basic composition created")
    
    # STEP 2: Add advanced effects and transitions
    advanced_composition_data = {
        "videos": [
            {
                "file_path": "https://example.com/intro_scene.mp4",
                "start_time": 0,
                "end_time": 15,
                "volume": 1.0
            },
            {
                "file_path": "https://example.com/main_content.mp4",
                "start_time": 0,
                "end_time": 30,
                "volume": 1.0
            },
            {
                "file_path": "https://example.com/outro_scene.mp4",
                "start_time": 0,
                "end_time": 10,
                "volume": 1.0
            }
        ],
        "transitions": [
            {
                "transition_type": "fade",
                "duration": 2.0,
                "start_time": 13.0,
                "end_time": 15.0
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
                "start_time": 38.0,
                "end_time": 40.0
            }
        ],
        "chroma_overlays": [
            {
                "file_path": "https://example.com/presenter_green_screen.mp4",
                "chroma_type": "green",
                "start_time": 5,
                "end_time": 35,
                "x": 100,
                "y": 50,
                "width": 400,
                "height": 500,
                "tolerance": 0.08,
                "smoothness": 0.06,
                "spill": 0.04
            },
            {
                "file_path": "https://example.com/graphics_blue_screen.mp4",
                "chroma_type": "blue",
                "start_time": 20,
                "end_time": 40,
                "x": 50,
                "y": 20,
                "width": 300,
                "height": 200,
                "tolerance": 0.1,
                "smoothness": 0.08
            }
        ],
        "effects": [
            {
                "effect_type": "brightness",
                "intensity": 1.0,
                "start_time": 0,
                "end_time": 15,
                "brightness": 0.2,
                "contrast": 1.1
            },
            {
                "effect_type": "vignette",
                "intensity": 0.6,
                "start_time": 20,
                "end_time": 40
            },
            {
                "effect_type": "grain",
                "intensity": 0.1,
                "start_time": 0,
                "end_time": 55
            },
            {
                "effect_type": "saturation",
                "intensity": 1.2,
                "start_time": 30,
                "end_time": 45
            }
        ]
    }
    
    # Create advanced composition
    # advanced_result = await helper_service.create_advanced_composition(
    #     advanced_composition_data, project_id, user_id
    # )
    print("Advanced composition created")

async def create_social_media_content():
    """Create engaging social media content with effects"""
    
    # Social media optimized composition
    social_media_data = {
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
            },
            {
                "file_path": "https://example.com/call_to_action_blue.mp4",
                "chroma_type": "blue",
                "start_time": 20,
                "end_time": 30,
                "x": 50,
                "y": 400,
                "width": 200,
                "height": 100,
                "tolerance": 0.1
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
            },
            {
                "effect_type": "brightness",
                "intensity": 1.0,
                "start_time": 0,
                "end_time": 30,
                "brightness": 0.1,
                "contrast": 1.2
            }
        ]
    }
    
    print("Social media content composition created")

async def create_cinematic_sequence():
    """Create a cinematic video sequence with professional effects"""
    
    cinematic_data = {
        "videos": [
            {
                "file_path": "https://example.com/establishing_shot.mp4",
                "start_time": 0,
                "end_time": 20,
                "volume": 0.5
            },
            {
                "file_path": "https://example.com/action_sequence.mp4",
                "start_time": 0,
                "end_time": 30,
                "volume": 0.8
            },
            {
                "file_path": "https://example.com/climax_scene.mp4",
                "start_time": 0,
                "end_time": 15,
                "volume": 1.0
            }
        ],
        "transitions": [
            {
                "transition_type": "dissolve",
                "duration": 3.0,
                "start_time": 17.0,
                "end_time": 20.0
            },
            {
                "transition_type": "fade",
                "duration": 2.0,
                "start_time": 28.0,
                "end_time": 30.0
            }
        ],
        "chroma_overlays": [
            {
                "file_path": "https://example.com/actor_green_screen.mp4",
                "chroma_type": "green",
                "start_time": 10,
                "end_time": 40,
                "x": 150,
                "y": 100,
                "width": 500,
                "height": 600,
                "tolerance": 0.06,
                "smoothness": 0.04,
                "spill": 0.03
            },
            {
                "file_path": "https://example.com/special_effects_blue.mp4",
                "chroma_type": "blue",
                "start_time": 25,
                "end_time": 45,
                "x": 0,
                "y": 0,
                "width": 1920,
                "height": 1080,
                "tolerance": 0.08
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
                "end_time": 65
            },
            {
                "effect_type": "vignette",
                "intensity": 0.8,
                "start_time": 0,
                "end_time": 65
            },
            {
                "effect_type": "brightness",
                "intensity": 1.0,
                "start_time": 20,
                "end_time": 50,
                "brightness": -0.1,
                "contrast": 1.3
            },
            {
                "effect_type": "saturation",
                "intensity": 1.4,
                "start_time": 30,
                "end_time": 45
            }
        ]
    }
    
    print("Cinematic sequence composition created")

async def create_educational_content():
    """Create educational content with presenter and graphics"""
    
    educational_data = {
        "videos": [
            {
                "file_path": "https://example.com/classroom_background.mp4",
                "start_time": 0,
                "end_time": 45,
                "volume": 0.2
            }
        ],
        "chroma_overlays": [
            {
                "file_path": "https://example.com/teacher_green_screen.mp4",
                "chroma_type": "green",
                "start_time": 0,
                "end_time": 45,
                "x": 200,
                "y": 100,
                "width": 600,
                "height": 700,
                "tolerance": 0.1,
                "smoothness": 0.08
            },
            {
                "file_path": "https://example.com/presentation_slides_blue.mp4",
                "chroma_type": "blue",
                "start_time": 5,
                "end_time": 40,
                "x": 50,
                "y": 50,
                "width": 800,
                "height": 600,
                "tolerance": 0.12
            },
            {
                "file_path": "https://example.com/equations_white.mp4",
                "chroma_type": "white",
                "start_time": 15,
                "end_time": 30,
                "x": 100,
                "y": 200,
                "width": 400,
                "height": 300,
                "tolerance": 0.15
            }
        ],
        "effects": [
            {
                "effect_type": "brightness",
                "intensity": 1.0,
                "start_time": 0,
                "end_time": 45,
                "brightness": 0.3,
                "contrast": 1.2
            },
            {
                "effect_type": "saturation",
                "intensity": 1.1,
                "start_time": 0,
                "end_time": 45
            }
        ]
    }
    
    print("Educational content composition created")

async def create_marketing_video():
    """Create a marketing video with product showcases"""
    
    marketing_data = {
        "videos": [
            {
                "file_path": "https://example.com/product_showcase.mp4",
                "start_time": 0,
                "end_time": 30,
                "volume": 0.6
            }
        ],
        "transitions": [
            {
                "transition_type": "zoom",
                "duration": 2.0,
                "direction": "in",
                "start_time": 0.0,
                "end_time": 2.0
            },
            {
                "transition_type": "zoom",
                "duration": 2.0,
                "direction": "out",
                "start_time": 28.0,
                "end_time": 30.0
            }
        ],
        "chroma_overlays": [
            {
                "file_path": "https://example.com/spokesperson_green.mp4",
                "chroma_type": "green",
                "start_time": 5,
                "end_time": 25,
                "x": 100,
                "y": 150,
                "width": 400,
                "height": 500,
                "tolerance": 0.08
            },
            {
                "file_path": "https://example.com/product_logo_blue.mp4",
                "chroma_type": "blue",
                "start_time": 0,
                "end_time": 30,
                "x": 50,
                "y": 50,
                "width": 150,
                "height": 75,
                "tolerance": 0.1
            },
            {
                "file_path": "https://example.com/price_tag_white.mp4",
                "chroma_type": "white",
                "start_time": 20,
                "end_time": 30,
                "x": 300,
                "y": 400,
                "width": 200,
                "height": 100,
                "tolerance": 0.12
            }
        ],
        "effects": [
            {
                "effect_type": "saturation",
                "intensity": 1.4,
                "start_time": 0,
                "end_time": 30
            },
            {
                "effect_type": "brightness",
                "intensity": 1.0,
                "start_time": 0,
                "end_time": 30,
                "brightness": 0.2,
                "contrast": 1.3
            },
            {
                "effect_type": "vignette",
                "intensity": 0.3,
                "start_time": 0,
                "end_time": 30
            }
        ]
    }
    
    print("Marketing video composition created")

async def demonstrate_convenience_functions():
    """Demonstrate the convenience functions for quick operations"""
    
    # Quick green screen composite
    green_output = create_green_screen_video(
        "background.mp4", 
        "person_green.mp4", 
        "quick_green_composite.mp4",
        tolerance=0.1
    )
    print("Quick green screen composite created")
    
    # Quick fade transition
    fade_output = create_fade_transition_video(
        "video1.mp4", 
        "video2.mp4", 
        "quick_fade.mp4",
        duration=2.0
    )
    print("Quick fade transition created")
    
    # Quick blue screen
    blue_output = create_blue_screen_video(
        "background.mp4", 
        "person_blue.mp4", 
        "quick_blue_composite.mp4",
        tolerance=0.12
    )
    print("Quick blue screen composite created")

async def demonstrate_error_handling():
    """Demonstrate proper error handling for both services"""
    
    try:
        # This would be called with actual service instances
        # result = await videomaking_service.create_video_composition(...)
        print("Video composition created successfully")
        
    except ValueError as e:
        print(f"Validation error: {str(e)}")
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr.decode()}")
    except FileNotFoundError as e:
        print(f"File not found: {str(e)}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
    
    try:
        # This would be called with actual service instances
        # result = await helper_service.create_advanced_composition(...)
        print("Advanced composition created successfully")
        
    except ValueError as e:
        print(f"Validation error: {str(e)}")
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr.decode()}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")

# MAIN FUNCTION TO RUN ALL EXAMPLES
async def main():
    """Run all integration examples"""
    print("=== VIDEOMAKING SERVICES INTEGRATION EXAMPLES ===\n")
    
    await create_professional_video_composition()
    await create_social_media_content()
    await create_cinematic_sequence()
    await create_educational_content()
    await create_marketing_video()
    await demonstrate_convenience_functions()
    await demonstrate_error_handling()
    
    print("\n=== ALL INTEGRATION EXAMPLES COMPLETED ===")

if __name__ == "__main__":
    asyncio.run(main())
