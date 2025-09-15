# Qwen Image API Integration Guide

This guide shows how to use the Qwen Image workflow with your existing ComfyUI API functions.

## 🏗️ Architecture Overview

```
backend/comfyUI/workflows/qwen_image/
├── qwen_image.py              # Main Qwen Image API class
├── qwen-image-8steps.json     # 8-step Qwen workflow
└── qwen_image_edit_8steps.json # 8-step Qwen workflow with reference image
```

## 🚀 Quick Start

### 1. Basic Image Generation

```python
from comfyUI.workflows.qwen_image.qwen_image import QwenImage

# Initialize Qwen Image API
qwen = QwenImage()

# Generate image
success = qwen.generate_image(
    prompt="Queen Elizabeth eating spaghetti, royal dining, elegant, detailed, high quality, photorealistic",
    width=1328,
    height=1328,
    seed="12345",
    output_path="/tmp/queen_spaghetti.png",
    negative_prompt="blurry, low quality, distorted, ugly, bad anatomy"
)
```

### 2. Image Generation with Reference

```python
# Generate image with reference image
success = qwen.generate_image(
    prompt="Transform this image into a royal dining scene",
    reference_image_path="/path/to/reference/image.png",
    width=1328,
    height=1328,
    seed="12346",
    output_path="/tmp/queen_royal_dining.png",
    negative_prompt="blurry, low quality, distorted, ugly, bad anatomy"
)
```

## 🔧 API Methods

### QwenImage Class

#### `generate_image(prompt, reference_image_path=None, width=1328, height=1328, seed=None, output_path=None, negative_prompt="")`

**Parameters:**
- `prompt` (str): Text prompt for image generation
- `reference_image_path` (str, optional): Path to reference image
- `width` (int): Image width (default: 1328)
- `height` (int): Image height (default: 1328)
- `seed` (str): Random seed for generation
- `output_path` (str): Where to save the generated image
- `negative_prompt` (str): What to avoid in the image

**Returns:**
- `bool`: True if successful, False otherwise

#### Internal Methods

- `generate_image_no_reference()`: Generate without reference image
- `generate_image_with_reference_api()`: Generate with reference image

## 🎛️ Workflow Configuration

The Qwen workflow uses these key nodes:

| Node ID | Type | Purpose | Key Inputs |
|---------|------|---------|------------|
| 3 | KSampler | Main sampling | seed, steps, cfg, model, positive, negative |
| 6 | CLIPTextEncode | Positive prompt | text, clip |
| 7 | CLIPTextEncode | Negative prompt | text, clip |
| 37 | UNETLoader | Load Qwen model | unet_name, weight_dtype |
| 38 | CLIPLoader | Load CLIP | clip_name, type, device |
| 39 | VAELoader | Load VAE | vae_name |
| 58 | EmptySD3LatentImage | Create latent | width, height, batch_size |
| 60 | SaveImage | Save output | images, filename_prefix |
| 66 | ModelSamplingAuraFlow | Model sampling | model, shift |
| 75 | LoraLoaderModelOnly | Load LoRA | model, lora_name, strength_model |

## 🔄 Integration with ComfyUI API

### Using ComfyUI Class Directly

```python
from comfyUI.workflows.comfyui import ComfyUI
from comfyUI.workflows.config import ComfyUIConfig

# Initialize ComfyUI
comfyui = ComfyUI()

# Load Qwen workflow
workflow_path = "backend/comfyUI/workflows/qwen_image/qwen-image-8steps.json"
workflow = comfyui.load_workflow(workflow_path)

# Modify workflow parameters
workflow["6"]["inputs"]["text"] = "Your prompt here"
workflow["7"]["inputs"]["text"] = "Your negative prompt here"
workflow["58"]["inputs"]["width"] = 1328
workflow["58"]["inputs"]["height"] = 1328
workflow["3"]["inputs"]["seed"] = 12345

# Queue the prompt
response = comfyui.queue_prompt(workflow)

# Wait for completion
if comfyui.get_state(response["prompt_id"]):
    print("Generation completed!")
```

### Using process_generated_prompt

```python
# Process with automatic file handling
result = comfyui.process_generated_prompt(
    workflow=workflow,
    output_path="/tmp/generated_image.png",
    pattern="qwen_12345",
    extensions=["png", "jpg", "jpeg"],
    timeout=300
)
```

## 📁 File Management

### Input Files
- Reference images go to: `ComfyUIConfig.get_input_dir()`
- Default: `/workspace/ComfyUI/input/`

### Output Files
- Generated images go to: `ComfyUIConfig.get_output_dir()`
- Default: `/workspace/ComfyUI/output/`

### File Patterns
- No reference: `qwen_{seed}`
- With reference: `qwen_ref_{seed}`

## ⚙️ Configuration

### ComfyUIConfig Settings

```python
from comfyUI.workflows.config import ComfyUIConfig

# Server settings
SERVER_ADDRESS = "127.0.0.1:8188"
SERVER_URL = "http://127.0.0.1:8188"

# Timeouts
DEFAULT_TIMEOUT = 300      # 5 minutes
LONG_TIMEOUT = 1800        # 30 minutes
VERY_LONG_TIMEOUT = 3600   # 60 minutes

# File extensions
IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"]
```

## 🐛 Error Handling

### Common Issues

1. **Server not running**: Check `comfyui.is_server_running()`
2. **Workflow errors**: Check ComfyUI logs for node errors
3. **File not found**: Verify paths and permissions
4. **Timeout**: Increase timeout values for large images

### Debugging

```python
# Enable detailed logging
qwen.scripts.log("Debug message")

# Check server status
if not comfyui.is_server_running():
    print("ComfyUI server is not running")

# Check workflow validity
workflow = comfyui.load_workflow(workflow_path)
print(f"Workflow loaded: {len(workflow)} nodes")
```

## 📝 Example Usage

See the example files:
- `qwen-simple-usage.py` - Basic usage example
- `qwen-api-integration-example.py` - Comprehensive test suite

## 🔗 Integration Points

The Qwen workflow integrates with your existing ComfyUI API through:

1. **ComfyUI class**: Core ComfyUI functionality
2. **ComfyUIConfig**: Configuration management
3. **File management**: Automatic file handling and cleanup
4. **WebSocket monitoring**: Real-time progress tracking
5. **Error handling**: Comprehensive error management

This provides a complete, production-ready solution for Qwen image generation within your existing ComfyUI infrastructure.
