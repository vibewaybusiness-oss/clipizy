"""
EXAMPLE USAGE OF VIDEOMAKING SERVICE

This file demonstrates how to use the VideoMakingService to create various types of video compositions.
"""

import asyncio
from api.services.videomaking_services import VideoMakingService, VideoQuality, OverlayType, TransitionType

# EXAMPLE 1: SIMPLE VIDEO WITH AUDIO
async def create_simple_music_video():
    """Create a simple music video with background video and audio track"""
    
    composition_data = {
        "videos": [
            {
                "file_path": "https://example.com/background_video.mp4",
                "start_time": 0,
                "end_time": 30,
                "volume": 0.3  # Lower volume for background
            }
        ],
        "audios": [
            {
                "file_path": "https://example.com/music_track.wav",
                "start_time": 0,
                "end_time": 30,
                "volume": 1.0,
                "fade_in": 2.0,  # 2 second fade in
                "fade_out": 3.0  # 3 second fade out
            }
        ],
        "quality": "high",
        "fps": 30,
        "resolution": "1920x1080"
    }
    
    # This would be called with actual service instance
    # result = await videomaking_service.create_video_composition(
    #     db, project_id, composition_data, user_id
    # )
    print("Simple music video composition created")

# EXAMPLE 2: MULTI-SEGMENT VIDEO WITH TRANSITIONS
async def create_multi_segment_video():
    """Create a video with multiple segments and transitions"""
    
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
                "end_time": 20,
                "volume": 1.0
            },
            {
                "file_path": "https://example.com/outro.mp4",
                "start_time": 0,
                "end_time": 5,
                "volume": 1.0
            }
        ],
        "transitions": [
            {
                "type": "fade",
                "duration": 1.0,
                "start_time": 9.0,
                "end_time": 10.0
            },
            {
                "type": "dissolve", 
                "duration": 2.0,
                "start_time": 29.0,
                "end_time": 31.0
            }
        ],
        "quality": "high",
        "fps": 30
    }
    
    print("Multi-segment video with transitions created")

# EXAMPLE 3: VIDEO WITH OVERLAYS
async def create_video_with_overlays():
    """Create a video with image and video overlays"""
    
    composition_data = {
        "videos": [
            {
                "file_path": "https://example.com/main_video.mp4",
                "start_time": 0,
                "end_time": 60,
                "volume": 1.0
            }
        ],
        "overlays": [
            {
                "file_path": "https://example.com/logo.png",
                "type": "image",
                "start_time": 0,
                "end_time": 60,
                "x": 50,  # Position from left
                "y": 50,  # Position from top
                "width": 200,
                "height": 100,
                "opacity": 0.8
            },
            {
                "file_path": "https://example.com/watermark.mp4",
                "type": "video", 
                "start_time": 10,
                "end_time": 20,
                "x": 100,
                "y": 100,
                "width": 300,
                "height": 200,
                "opacity": 0.6
            }
        ],
        "quality": "high",
        "fps": 30
    }
    
    print("Video with overlays created")

# EXAMPLE 4: COMPLEX COMPOSITION WITH ALL FEATURES
async def create_complex_composition():
    """Create a complex video composition with all features"""
    
    composition_data = {
        "videos": [
            {
                "file_path": "https://example.com/intro.mp4",
                "start_time": 0,
                "end_time": 15,
                "volume": 0.8,
                "effects": {
                    "brightness": 1.2,
                    "contrast": 1.1
                }
            },
            {
                "file_path": "https://example.com/main.mp4",
                "start_time": 0,
                "end_time": 45,
                "volume": 1.0
            }
        ],
        "audios": [
            {
                "file_path": "https://example.com/music.wav",
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
                "volume": 0.9,
                "fade_in": 1.0,
                "fade_out": 2.0
            }
        ],
        "overlays": [
            {
                "file_path": "https://example.com/logo.png",
                "type": "image",
                "start_time": 0,
                "end_time": 60,
                "x": 20,
                "y": 20,
                "width": 150,
                "height": 75,
                "opacity": 0.9
            },
            {
                "file_path": "https://example.com/subtitle_overlay.srt",
                "type": "text",
                "start_time": 5,
                "end_time": 55,
                "x": 50,
                "y": 500,
                "opacity": 1.0
            }
        ],
        "transitions": [
            {
                "type": "fade",
                "duration": 2.0,
                "start_time": 13,
                "end_time": 15
            },
            {
                "type": "zoom",
                "duration": 1.5,
                "start_time": 43,
                "end_time": 44.5
            }
        ],
        "quality": "ultra",
        "fps": 60,
        "resolution": "3840x2160",
        "background_color": "black",
        "optimize_for_speed": False,
        "use_gpu": True,
        "parallel_processing": True
    }
    
    print("Complex composition with all features created")

# EXAMPLE 5: FAST RENDERING FOR PREVIEW
async def create_fast_preview():
    """Create a fast, low-quality preview for testing"""
    
    composition_data = {
        "videos": [
            {
                "file_path": "https://example.com/video.mp4",
                "start_time": 0,
                "end_time": 10,  # Short preview
                "volume": 1.0
            }
        ],
        "audios": [
            {
                "file_path": "https://example.com/audio.wav",
                "start_time": 0,
                "end_time": 10,
                "volume": 1.0
            }
        ],
        "quality": "low",  # Fast rendering
        "fps": 24,  # Lower FPS for speed
        "optimize_for_speed": True,
        "use_gpu": True,
        "parallel_processing": True
    }
    
    print("Fast preview composition created")

# EXAMPLE 6: SOCIAL MEDIA OPTIMIZED
async def create_social_media_video():
    """Create a video optimized for social media platforms"""
    
    composition_data = {
        "videos": [
            {
                "file_path": "https://example.com/content.mp4",
                "start_time": 0,
                "end_time": 30,  # Short for social media
                "volume": 0.8
            }
        ],
        "audios": [
            {
                "file_path": "https://example.com/music.mp3",
                "start_time": 0,
                "end_time": 30,
                "volume": 0.6
            }
        ],
        "overlays": [
            {
                "file_path": "https://example.com/brand_logo.png",
                "type": "image",
                "start_time": 0,
                "end_time": 30,
                "x": 10,
                "y": 10,
                "width": 100,
                "height": 50,
                "opacity": 0.9
            }
        ],
        "quality": "medium",  # Balanced quality/speed
        "fps": 30,
        "resolution": "1080x1920",  # Vertical for mobile
        "optimize_for_speed": True
    }
    
    print("Social media optimized video created")

# EXAMPLE 7: BATCH PROCESSING
async def create_batch_videos():
    """Create multiple videos in batch"""
    
    video_templates = [
        {
            "name": "intro_video",
            "videos": [{"file_path": "intro.mp4", "start_time": 0, "end_time": 10, "volume": 1.0}],
            "audios": [{"file_path": "intro_music.wav", "start_time": 0, "end_time": 10, "volume": 1.0}]
        },
        {
            "name": "main_video", 
            "videos": [{"file_path": "main.mp4", "start_time": 0, "end_time": 30, "volume": 1.0}],
            "audios": [{"file_path": "main_music.wav", "start_time": 0, "end_time": 30, "volume": 1.0}]
        },
        {
            "name": "outro_video",
            "videos": [{"file_path": "outro.mp4", "start_time": 0, "end_time": 5, "volume": 1.0}],
            "audios": [{"file_path": "outro_music.wav", "start_time": 0, "end_time": 5, "volume": 1.0}]
        }
    ]
    
    # Process each template
    for template in video_templates:
        composition_data = {
            "videos": template["videos"],
            "audios": template["audios"],
            "quality": "high",
            "fps": 30
        }
        
        # This would be called for each template
        # result = await videomaking_service.create_video_composition(...)
        print(f"Batch video '{template['name']}' created")

# EXAMPLE 8: ERROR HANDLING
async def create_video_with_error_handling():
    """Example of proper error handling"""
    
    try:
        composition_data = {
            "videos": [
                {
                    "file_path": "https://invalid-url.com/video.mp4",  # This will fail
                    "start_time": 0,
                    "end_time": 10,
                    "volume": 1.0
                }
            ],
            "quality": "high"
        }
        
        # This would be called with proper error handling
        # result = await videomaking_service.create_video_composition(
        #     db, project_id, composition_data, user_id
        # )
        
        # if not result["success"]:
        #     print(f"Video creation failed: {result['error']}")
        #     return None
        
        print("Video created successfully")
        
    except Exception as e:
        print(f"Error creating video: {str(e)}")
        return None

# MAIN FUNCTION TO RUN EXAMPLES
async def main():
    """Run all examples"""
    print("=== VIDEOMAKING SERVICE EXAMPLES ===\n")
    
    await create_simple_music_video()
    await create_multi_segment_video()
    await create_video_with_overlays()
    await create_complex_composition()
    await create_fast_preview()
    await create_social_media_video()
    await create_batch_videos()
    await create_video_with_error_handling()
    
    print("\n=== ALL EXAMPLES COMPLETED ===")

if __name__ == "__main__":
    asyncio.run(main())
