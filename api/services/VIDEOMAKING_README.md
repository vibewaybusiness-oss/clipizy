# VIDEOMAKING SERVICE

A high-performance, flexible video composition service built with FFmpeg that can create complex video compositions from JSON input with optimal quality and speed.

## FEATURES

### 🎬 CORE CAPABILITIES
- **Multi-segment video composition** - Combine multiple video clips with precise timing
- **Audio synchronization** - Mix multiple audio tracks with fade in/out effects
- **Overlay support** - Add images, videos, and text overlays with positioning and opacity control
- **Transition effects** - Apply various transitions between video segments
- **Quality presets** - From fast preview to ultra-high quality 4K output
- **GPU acceleration** - Automatic GPU detection and utilization when available

### ⚡ PERFORMANCE OPTIMIZATIONS
- **Parallel processing** - Download and process media files concurrently
- **Intelligent caching** - Cache frequently used media files to reduce processing time
- **Memory optimization** - Efficient memory usage for large compositions
- **Speed vs Quality balance** - Optimize for either speed or quality based on requirements
- **Multi-threading** - Utilize all available CPU cores for faster processing

### 🛡️ RELIABILITY FEATURES
- **Comprehensive validation** - Validate all input data and media files before processing
- **Error handling** - Robust error handling with detailed error messages
- **Progress tracking** - Real-time progress updates for long-running operations
- **File verification** - Verify output files and handle corrupted results
- **Cleanup management** - Automatic cleanup of temporary files

## QUICK START

### Basic Usage

```python
from api.services.videomaking_services import VideoMakingService

# Initialize service
videomaking_service = VideoMakingService(storage, json_store)

# Create a simple video composition
composition_data = {
    "videos": [
        {
            "file_path": "https://example.com/video.mp4",
            "start_time": 0,
            "end_time": 30,
            "volume": 1.0
        }
    ],
    "audios": [
        {
            "file_path": "https://example.com/audio.wav", 
            "start_time": 0,
            "end_time": 30,
            "volume": 1.0
        }
    ],
    "quality": "high",
    "fps": 30
}

# Process composition
result = await videomaking_service.create_video_composition(
    db, project_id, composition_data, user_id
)
```

## COMPOSITION DATA STRUCTURE

### Video Segments
```json
{
    "videos": [
        {
            "file_path": "string",      // URL or storage path
            "start_time": 0.0,          // Start time in seconds
            "end_time": 30.0,           // End time in seconds
            "volume": 1.0,              // Volume level (0.0 to 1.0)
            "effects": {                // Optional video effects
                "brightness": 1.2,
                "contrast": 1.1,
                "saturation": 1.0
            }
        }
    ]
}
```

### Audio Tracks
```json
{
    "audios": [
        {
            "file_path": "string",      // URL or storage path
            "start_time": 0.0,          // Start time in seconds
            "end_time": 30.0,           // End time in seconds
            "volume": 1.0,              // Volume level (0.0 to 1.0)
            "fade_in": 2.0,             // Fade in duration in seconds
            "fade_out": 3.0             // Fade out duration in seconds
        }
    ]
}
```

### Overlays
```json
{
    "overlays": [
        {
            "file_path": "string",      // URL or storage path
            "type": "image|video|text", // Overlay type
            "start_time": 0.0,          // Start time in seconds
            "end_time": 30.0,           // End time in seconds
            "x": 0.0,                   // X position in pixels
            "y": 0.0,                   // Y position in pixels
            "width": 200,               // Width in pixels (optional)
            "height": 100,              // Height in pixels (optional)
            "opacity": 1.0,             // Opacity (0.0 to 1.0)
            "effects": {                // Optional overlay effects
                "blur": 0.5,
                "brightness": 1.1
            }
        }
    ]
}
```

### Transitions
```json
{
    "transitions": [
        {
            "type": "fade|dissolve|wipe|slide|zoom", // Transition type
            "duration": 2.0,            // Transition duration in seconds
            "start_time": 28.0,         // Start time in seconds
            "end_time": 30.0,           // End time in seconds
            "effects": {                // Optional transition effects
                "direction": "left",
                "intensity": 0.8
            }
        }
    ]
}
```

### Global Settings
```json
{
    "quality": "low|medium|high|ultra", // Quality preset
    "resolution": "1920x1080",          // Custom resolution (optional)
    "fps": 30,                          // Frames per second
    "background_color": "black",        // Background color
    "optimize_for_speed": false,        // Prioritize speed over quality
    "use_gpu": true,                    // Use GPU acceleration if available
    "parallel_processing": true         // Enable parallel processing
}
```

## QUALITY PRESETS

| Preset | Resolution | Encoding | Use Case |
|--------|------------|----------|----------|
| `low` | 854x480 | Fast, CRF 28 | Quick previews, testing |
| `medium` | 1280x720 | Medium, CRF 23 | Social media, web |
| `high` | 1920x1080 | Slow, CRF 18 | Professional content |
| `ultra` | 3840x2160 | Very slow, CRF 15 | Cinema quality, 4K |

## TRANSITION TYPES

- **`cut`** - Instant cut between segments
- **`fade`** - Fade in/out transition
- **`dissolve`** - Cross-dissolve between segments
- **`wipe`** - Wipe transition with direction
- **`slide`** - Slide transition effect
- **`zoom`** - Zoom transition effect

## OVERLAY TYPES

- **`image`** - Static image overlay (PNG, JPG, etc.)
- **`video`** - Video overlay with timing
- **`text`** - Text overlay (requires subtitle file)

## PERFORMANCE OPTIMIZATION

### Speed Optimizations
- Set `optimize_for_speed: true` for faster processing
- Use `quality: "low"` for previews
- Enable `parallel_processing: true` for concurrent downloads
- Use `use_gpu: true` when GPU is available

### Quality Optimizations
- Use `quality: "ultra"` for maximum quality
- Set `optimize_for_speed: false` for best quality
- Use appropriate resolution for your content
- Enable GPU acceleration for faster high-quality encoding

### Memory Management
- The service automatically manages memory usage
- Large compositions are processed in chunks
- Temporary files are cleaned up automatically
- Caching reduces repeated downloads

## ERROR HANDLING

The service provides comprehensive error handling:

```python
try:
    result = await videomaking_service.create_video_composition(
        db, project_id, composition_data, user_id
    )
    
    if result["success"]:
        print(f"Video created: {result['output_url']}")
    else:
        print(f"Error: {result['error']}")
        
except Exception as e:
    print(f"Service error: {str(e)}")
```

## COMMON USE CASES

### 1. Music Video Creation
```python
composition_data = {
    "videos": [{"file_path": "background.mp4", "start_time": 0, "end_time": 180, "volume": 0.3}],
    "audios": [{"file_path": "song.wav", "start_time": 0, "end_time": 180, "volume": 1.0}],
    "quality": "high"
}
```

### 2. Social Media Content
```python
composition_data = {
    "videos": [{"file_path": "content.mp4", "start_time": 0, "end_time": 30, "volume": 0.8}],
    "overlays": [{"file_path": "logo.png", "type": "image", "start_time": 0, "end_time": 30, "x": 10, "y": 10}],
    "quality": "medium",
    "resolution": "1080x1920"  # Vertical for mobile
}
```

### 3. Multi-Segment Presentation
```python
composition_data = {
    "videos": [
        {"file_path": "intro.mp4", "start_time": 0, "end_time": 10},
        {"file_path": "main.mp4", "start_time": 0, "end_time": 60},
        {"file_path": "outro.mp4", "start_time": 0, "end_time": 5}
    ],
    "transitions": [
        {"type": "fade", "duration": 1.0, "start_time": 9.0, "end_time": 10.0},
        {"type": "dissolve", "duration": 2.0, "start_time": 69.0, "end_time": 71.0}
    ],
    "quality": "high"
}
```

## API INTEGRATION

The service integrates with the existing Vibewave API:

```python
# In your router
@router.post("/compositions")
async def create_composition(
    composition_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await videomaking_service.create_video_composition(
        db, project_id, composition_data, current_user.id
    )
    return result
```

## MONITORING AND LOGGING

The service provides detailed logging for monitoring:

- **Processing progress** - Real-time progress updates
- **Performance metrics** - Processing time and resource usage
- **Error tracking** - Detailed error logs with context
- **File operations** - Download, upload, and cleanup operations

## DEPENDENCIES

Required packages (already in requirements.txt):
- `ffmpeg-python==0.2.0` - FFmpeg Python bindings
- `aiohttp==3.9.1` - Async HTTP client for downloads
- `pydantic==2.5.0` - Data validation
- `asyncio` - Async processing support

## SYSTEM REQUIREMENTS

- **FFmpeg** - Must be installed and available in PATH
- **Python 3.8+** - For async/await support
- **Memory** - Minimum 2GB RAM, 4GB+ recommended for 4K
- **Storage** - Temporary space for processing (automatically managed)
- **GPU** - Optional but recommended for faster encoding

## TROUBLESHOOTING

### Common Issues

1. **FFmpeg not found**
   - Install FFmpeg and ensure it's in PATH
   - Check with `ffmpeg -version`

2. **Out of memory**
   - Reduce video resolution or duration
   - Enable `optimize_for_speed: true`
   - Process shorter segments

3. **Slow processing**
   - Enable GPU acceleration if available
   - Use parallel processing
   - Choose appropriate quality preset

4. **File access errors**
   - Verify file URLs are accessible
   - Check storage permissions
   - Ensure files exist and are not corrupted

### Performance Tips

- Use appropriate quality settings for your use case
- Enable caching for frequently used files
- Use parallel processing for multiple files
- Consider GPU acceleration for large compositions
- Monitor memory usage for very large projects

## EXAMPLES

See `videomaking_example.py` for comprehensive usage examples covering:
- Simple video creation
- Multi-segment compositions
- Overlay effects
- Transition effects
- Batch processing
- Error handling
- Social media optimization
