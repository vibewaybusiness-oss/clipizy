# VIDEOMAKING HELPER SERVICE

Advanced video processing service providing professional-grade transitions, chroma key compositing, and video effects for the Vibewave platform.

## 🎬 FEATURES OVERVIEW

### TRANSITION EFFECTS
- **Fade Transitions** - Smooth fade in/out between videos
- **Dissolve Transitions** - Cross-dissolve blending effects
- **Wipe Transitions** - Directional wipe effects (left, right, up, down)
- **Slide Transitions** - Sliding video transitions
- **Zoom Transitions** - Zoom in/out transition effects
- **Custom Transitions** - Custom FFmpeg filter-based transitions

### CHROMA KEY COMPOSITING
- **Green Screen** - Professional green screen keying
- **Blue Screen** - Blue screen compositing
- **Black Screen** - Black screen for shadow effects
- **White Screen** - White screen keying
- **Custom Color** - Custom chroma key colors
- **Advanced Settings** - Tolerance, smoothness, and spill control

### VIDEO EFFECTS & FILTERS
- **Blur Effects** - Box blur with intensity control
- **Color Correction** - Brightness, contrast, saturation adjustments
- **Vignette** - Dark edge vignetting effects
- **Sepia** - Vintage sepia tone effects
- **Film Grain** - Cinematic grain effects
- **Sharpening** - Video sharpening filters

## 🚀 QUICK START

### Basic Usage

```python
from api.services.videomaking_helper_services import (
    VideoHelperService,
    AdvancedTransitionService,
    ChromaKeyService,
    VideoEffectsService
)

# Initialize services
transition_service = AdvancedTransitionService()
chroma_service = ChromaKeyService()
effects_service = VideoEffectsService()
```

### Simple Green Screen

```python
# Create green screen composite
output = chroma_service.create_green_screen_composite(
    "background.mp4", 
    "person_green_screen.mp4", 
    "composite.mp4",
    tolerance=0.1
)
```

### Fade Transition

```python
# Create fade transition
output = transition_service.create_fade_transition(
    "video1.mp4", 
    "video2.mp4", 
    2.0,  # duration in seconds
    "fade_output.mp4"
)
```

## 🎭 TRANSITION EFFECTS

### Available Transition Types

| Transition | Description | Parameters |
|------------|-------------|------------|
| `fade` | Smooth fade in/out | duration |
| `dissolve` | Cross-dissolve blend | duration |
| `wipe` | Directional wipe | duration, direction |
| `slide` | Sliding transition | duration, direction |
| `zoom` | Zoom in/out | duration, direction |
| `custom` | Custom FFmpeg filter | custom_filter |

### Transition Directions

```python
from api.services.videomaking_helper_services import TransitionDirection

# Available directions
TransitionDirection.LEFT    # Left to right
TransitionDirection.RIGHT   # Right to left  
TransitionDirection.UP      # Bottom to top
TransitionDirection.DOWN    # Top to bottom
TransitionDirection.IN      # Zoom in
TransitionDirection.OUT     # Zoom out
```

### Example: Advanced Transitions

```python
# Wipe transition (left to right)
wipe_output = transition_service.create_wipe_transition(
    "video1.mp4", "video2.mp4", 2.5, 
    TransitionDirection.LEFT, "wipe_output.mp4"
)

# Slide transition (up)
slide_output = transition_service.create_slide_transition(
    "video1.mp4", "video2.mp4", 2.0,
    TransitionDirection.UP, "slide_output.mp4"
)

# Custom transition with FFmpeg filter
custom_filter = "blend=all_mode=multiply:all_opacity=0.5"
custom_output = transition_service.create_custom_transition(
    "video1.mp4", "video2.mp4", custom_filter, 2.0, "custom_output.mp4"
)
```

## 🎨 CHROMA KEY COMPOSITING

### Chroma Key Types

```python
from api.services.videomaking_helper_services import ChromaKeyType

# Available chroma key types
ChromaKeyType.GREEN   # Green screen
ChromaKeyType.BLUE    # Blue screen
ChromaKeyType.BLACK   # Black screen
ChromaKeyType.WHITE   # White screen
ChromaKeyType.CUSTOM  # Custom color
```

### Basic Chroma Key Usage

```python
# Green screen composite
green_output = chroma_service.create_green_screen_composite(
    "background.mp4", 
    "person_green.mp4", 
    "composite.mp4",
    tolerance=0.1,      # Color tolerance (0.0-1.0)
    smoothness=0.1      # Edge smoothness (0.0-1.0)
)

# Blue screen composite
blue_output = chroma_service.create_blue_screen_composite(
    "background.mp4", 
    "person_blue.mp4", 
    "composite.mp4",
    tolerance=0.15
)
```

### Advanced Chroma Key

```python
from api.services.videomaking_helper_services import ChromaKeyOverlay

# Advanced chroma key with custom settings
chroma_key = ChromaKeyOverlay(
    file_path="person_video.mp4",
    chroma_type=ChromaKeyType.GREEN,
    start_time=0,
    end_time=10,
    x=100,              # X position
    y=50,               # Y position
    width=400,          # Width
    height=300,         # Height
    tolerance=0.12,     # Color tolerance
    smoothness=0.08,    # Edge smoothness
    spill=0.05,         # Spill suppression
    custom_color="0xFF00FF"  # Custom color (hex)
)

# Apply advanced chroma key
output = chroma_service.apply_chroma_key(
    "background.mp4", 
    "person_video.mp4", 
    chroma_key, 
    "advanced_composite.mp4"
)
```

### Chroma Key Parameters

| Parameter | Description | Range | Default |
|-----------|-------------|-------|---------|
| `tolerance` | Color matching tolerance | 0.0-1.0 | 0.1 |
| `smoothness` | Edge smoothness | 0.0-1.0 | 0.1 |
| `spill` | Spill suppression | 0.0-1.0 | 0.1 |
| `custom_color` | Custom chroma color | Hex string | None |

## 🎨 VIDEO EFFECTS

### Available Effects

```python
from api.services.videomaking_helper_services import EffectType

# Available effect types
EffectType.BLUR         # Blur effect
EffectType.SHARPEN      # Sharpening
EffectType.BRIGHTNESS   # Brightness adjustment
EffectType.CONTRAST     # Contrast adjustment
EffectType.SATURATION   # Saturation adjustment
EffectType.HUE          # Hue adjustment
EffectType.GAMMA        # Gamma correction
EffectType.VIGNETTE     # Vignette effect
EffectType.GRAIN        # Film grain
EffectType.SEPIA        # Sepia tone
EffectType.NEGATIVE     # Negative effect
```

### Basic Effects Usage

```python
# Blur effect
blur_output = effects_service.apply_blur_effect(
    "input.mp4", "blurred.mp4", 
    intensity=2.0,           # Blur intensity
    start_time=5,            # Start time (seconds)
    end_time=15              # End time (seconds)
)

# Brightness and contrast
brightness_output = effects_service.apply_brightness_contrast(
    "input.mp4", "brightened.mp4",
    brightness=0.3,          # Brightness (-1.0 to 1.0)
    contrast=1.2,            # Contrast (0.0 to 2.0)
    start_time=0,
    end_time=20
)

# Saturation boost
saturation_output = effects_service.apply_saturation_effect(
    "input.mp4", "saturated.mp4",
    saturation=1.5,          # Saturation multiplier
    start_time=10,
    end_time=25
)
```

### Advanced Effects

```python
# Vignette effect
vignette_output = effects_service.apply_vignette_effect(
    "input.mp4", "vignette.mp4",
    intensity=0.7,           # Vignette strength
    start_time=0,
    end_time=30
)

# Sepia effect
sepia_output = effects_service.apply_sepia_effect(
    "input.mp4", "sepia.mp4",
    intensity=1.0,           # Sepia strength
    start_time=0,
    end_time=30
)

# Film grain
grain_output = effects_service.apply_grain_effect(
    "input.mp4", "grainy.mp4",
    intensity=0.15,          # Grain intensity
    start_time=0,
    end_time=30
)
```

## 🎬 COMPLEX COMPOSITIONS

### Advanced Composition with All Features

```python
# Initialize main helper service
videomaking_helper = VideoHelperService(storage, json_store)

# Complex composition data
composition_data = {
    "videos": [
        {
            "file_path": "https://example.com/intro.mp4",
            "start_time": 0,
            "end_time": 10,
            "volume": 1.0
        },
        {
            "file_path": "https://example.com/main.mp4",
            "start_time": 0,
            "end_time": 30,
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
        }
    ],
    "chroma_overlays": [
        {
            "file_path": "https://example.com/person_green.mp4",
            "chroma_type": "green",
            "start_time": 5,
            "end_time": 25,
            "x": 100,
            "y": 50,
            "width": 300,
            "height": 400,
            "tolerance": 0.1,
            "smoothness": 0.08
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
        }
    ]
}

# Create advanced composition
result = await videomaking_helper.create_advanced_composition(
    composition_data, project_id, user_id
)
```

## 🛠️ CONVENIENCE FUNCTIONS

### Quick Green Screen

```python
from api.services.videomaking_helper_services import create_green_screen_video

# Simple green screen composite
output = create_green_screen_video(
    "background.mp4", 
    "person_green.mp4", 
    "composite.mp4",
    tolerance=0.1
)
```

### Quick Blue Screen

```python
from api.services.videomaking_helper_services import create_blue_screen_video

# Simple blue screen composite
output = create_blue_screen_video(
    "background.mp4", 
    "person_blue.mp4", 
    "composite.mp4",
    tolerance=0.1
)
```

### Quick Fade Transition

```python
from api.services.videomaking_helper_services import create_fade_transition_video

# Simple fade transition
output = create_fade_transition_video(
    "video1.mp4", 
    "video2.mp4", 
    "fade_output.mp4",
    duration=2.0
)
```

### Quick Video Effect

```python
from api.services.videomaking_helper_services import apply_video_effect, EffectType

# Apply single effect
blur_output = apply_video_effect(
    "input.mp4", 
    EffectType.BLUR, 
    "blurred.mp4", 
    intensity=1.5
)

sepia_output = apply_video_effect(
    "input.mp4", 
    EffectType.SEPIA, 
    "sepia.mp4", 
    intensity=1.0
)
```

## 🎯 USE CASES

### 1. Social Media Content
```python
# Create engaging vertical content
composition_data = {
    "videos": [{"file_path": "vertical_content.mp4", "start_time": 0, "end_time": 30}],
    "transitions": [{"transition_type": "zoom", "duration": 1.0, "direction": "in"}],
    "chroma_overlays": [{"file_path": "logo_green.mp4", "chroma_type": "green"}],
    "effects": [{"effect_type": "saturation", "intensity": 1.3}]
}
```

### 2. Cinematic Effects
```python
# Create cinematic-style video
composition_data = {
    "videos": [{"file_path": "cinematic_scene.mp4", "start_time": 0, "end_time": 60}],
    "effects": [
        {"effect_type": "sepia", "intensity": 0.8},
        {"effect_type": "grain", "intensity": 0.2},
        {"effect_type": "vignette", "intensity": 0.8}
    ]
}
```

### 3. Professional Presentations
```python
# Create presentation with green screen speaker
composition_data = {
    "videos": [{"file_path": "presentation_bg.mp4", "start_time": 0, "end_time": 45}],
    "chroma_overlays": [{
        "file_path": "speaker_green.mp4",
        "chroma_type": "green",
        "x": 100, "y": 50,
        "tolerance": 0.08
    }],
    "effects": [{"effect_type": "brightness", "brightness": 0.1}]
}
```

## ⚡ PERFORMANCE OPTIMIZATION

### Best Practices

1. **Use appropriate quality settings** for your use case
2. **Enable GPU acceleration** when available
3. **Process in parallel** for multiple effects
4. **Cache frequently used files** to reduce processing time
5. **Use lower resolution** for previews and testing

### Memory Management

- The service automatically manages memory usage
- Large compositions are processed in chunks
- Temporary files are cleaned up automatically
- Use appropriate video resolutions for your hardware

## 🛡️ ERROR HANDLING

### Common Errors and Solutions

```python
try:
    # Your video processing code
    result = transition_service.create_fade_transition(
        "video1.mp4", "video2.mp4", 2.0, "output.mp4"
    )
    
except subprocess.CalledProcessError as e:
    print(f"FFmpeg error: {e.stderr.decode()}")
    
except FileNotFoundError as e:
    print(f"File not found: {str(e)}")
    
except Exception as e:
    print(f"Unexpected error: {str(e)}")
```

### Validation

- All input files are validated before processing
- Chroma key parameters are checked for valid ranges
- Transition durations are validated
- Effect intensities are clamped to safe ranges

## 📊 MONITORING AND LOGGING

The service provides detailed logging for:
- Processing progress and status
- Performance metrics and timing
- Error tracking with context
- File operations and cleanup

## 🔧 INTEGRATION

### With Main Videomaking Service

```python
from api.services.videomaking_services import VideoMakingService
from api.services.videomaking_helper_services import VideoHelperService

# Use both services together
main_service = VideoMakingService(storage, json_store)
helper_service = VideoHelperService(storage, json_store)

# Create basic composition
basic_result = await main_service.create_video_composition(
    db, project_id, basic_data, user_id
)

# Add advanced effects
advanced_result = await helper_service.create_advanced_composition(
    advanced_data, project_id, user_id
)
```

### API Integration

```python
# In your FastAPI router
@router.post("/advanced-composition")
async def create_advanced_composition(
    composition_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    helper_service = VideoHelperService(storage, json_store)
    result = await helper_service.create_advanced_composition(
        composition_data, project_id, current_user.id
    )
    return result
```

## 📚 EXAMPLES

See `videomaking_helper_examples.py` for comprehensive examples covering:
- All transition types
- Chroma key compositing
- Video effects and filters
- Complex compositions
- Error handling
- Performance optimization

## 🎬 CONCLUSION

The Videomaking Helper Service provides professional-grade video processing capabilities that complement the main videomaking service. With advanced transitions, chroma key compositing, and video effects, you can create sophisticated video content for any use case.

The service is designed for both simple operations (using convenience functions) and complex compositions (using the full API), making it suitable for developers of all skill levels.
