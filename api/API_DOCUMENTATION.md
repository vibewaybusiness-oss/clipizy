# Vibewave Backend API Documentation

## 🚀 Overview

The Vibewave Backend API provides comprehensive endpoints for AI-powered music video creation, with full RunPod integration for GPU-accelerated image and video generation.

## 📋 Base URL

```
http://localhost:8000
```

## 🔗 API Endpoints

### Health Check
- `GET /health` - Overall API health check
- `GET /api/runpod/health` - RunPod service health check
- `GET /api/qwen/health` - Qwen image generation health check

### RunPod Integration (`/api/runpod`)

#### Account Management
- `GET /api/runpod/account` - Get RunPod account information
- `GET /api/runpod/stats` - Get RunPod usage statistics

#### Pod Management
- `GET /api/runpod/pods` - Get all pods
- `GET /api/runpod/pods/{pod_id}` - Get specific pod details
- `POST /api/runpod/pods` - Create a new pod
- `POST /api/runpod/pods/{pod_id}/start` - Start a pod
- `POST /api/runpod/pods/{pod_id}/stop` - Stop a pod
- `POST /api/runpod/pods/{pod_id}/restart` - Restart a pod
- `POST /api/runpod/pods/{pod_id}/terminate` - Terminate a pod
- `GET /api/runpod/pods/{pod_id}/ip` - Get pod IP address

#### GPU and Cloud Types
- `GET /api/runpod/gpu-types` - Get available GPU types
- `GET /api/runpod/cloud-types` - Get available cloud types

#### Network Volumes
- `GET /api/runpod/network-volumes` - Get network volumes
- `GET /api/runpod/network-volumes/{volume_id}` - Get specific network volume

#### Templates
- `GET /api/runpod/templates` - Get available templates

#### Workflow Management
- `POST /api/runpod/workflows/queue` - Queue a workflow for execution
- `GET /api/runpod/workflows/status/{request_id}` - Get workflow execution status
- `GET /api/runpod/workflows/queue/status` - Get current queue status
- `GET /api/runpod/workflows/history` - Get workflow execution history
- `DELETE /api/runpod/workflows/{request_id}` - Cancel a workflow request

#### Image Generation
- `POST /api/runpod/generate-image` - Generate image (synchronous)
- `POST /api/runpod/generate-image-async` - Generate image (asynchronous)
- `POST /api/runpod/generate-multiple-images` - Generate multiple images

### Qwen Image Generation (`/api/qwen`)

#### Core Generation
- `POST /api/qwen/generate` - Generate Qwen image (synchronous)
- `POST /api/qwen/generate-async` - Generate Qwen image (asynchronous)
- `GET /api/qwen/status/{request_id}` - Get generation status

#### Batch Generation
- `POST /api/qwen/batch-generate` - Generate multiple images from prompts

#### Utilities
- `GET /api/qwen/presets` - Get generation presets and settings
- `GET /api/qwen/examples` - Get example prompts and tips

## 📝 Request/Response Models

### WorkflowInput
```json
{
  "prompt": "A beautiful landscape with mountains and a lake",
  "negative_prompt": "blurry, low quality, distorted",
  "width": 1024,
  "height": 1024,
  "seed": 12345,
  "steps": 4
}
```

### WorkflowResult
```json
{
  "success": true,
  "files": ["qwen_12345_001.png", "qwen_12345_002.png"],
  "error": null,
  "request_id": "req-12345",
  "pod_id": "pod-67890",
  "pod_ip": "192.168.1.100"
}
```

### ComfyUIRequest
```json
{
  "id": "req-12345",
  "workflow_name": "comfyui_image_qwen",
  "inputs": {
    "prompt": "A beautiful landscape",
    "negative_prompt": "blurry, low quality",
    "width": 1024,
    "height": 1024,
    "seed": 12345,
    "steps": 4
  },
  "status": "completed",
  "pod_id": "pod-67890",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:05:00Z",
  "result": {
    "success": true,
    "files": ["qwen_12345_001.png"]
  },
  "error": null
}
```

### QueueStatus
```json
{
  "active_pods": [
    {
      "id": "pod-67890",
      "name": "comfyui_image_qwen-pod",
      "status": "running",
      "ip": "192.168.1.100",
      "workflow_name": "comfyui_image_qwen"
    }
  ],
  "pending_requests": [],
  "completed_requests": [
    {
      "id": "req-12345",
      "workflow_name": "comfyui_image_qwen",
      "status": "completed"
    }
  ],
  "failed_requests": []
}
```

## 🚀 Usage Examples

### 1. Generate a Single Image (Synchronous)

```bash
curl -X POST "http://localhost:8000/api/qwen/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A majestic dragon soaring through clouds above a medieval castle, fantasy art style, highly detailed, epic lighting",
    "width": 1024,
    "height": 1024,
    "steps": 4
  }'
```

### 2. Generate a Single Image (Asynchronous)

```bash
# Start generation
curl -X POST "http://localhost:8000/api/qwen/generate-async" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A futuristic cyberpunk cityscape at night with neon lights",
    "width": 1024,
    "height": 1024
  }'

# Check status
curl -X GET "http://localhost:8000/api/qwen/status/{request_id}"
```

### 3. Generate Multiple Images

```bash
curl -X POST "http://localhost:8000/api/qwen/batch-generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompts": [
      "A serene mountain landscape with a crystal clear lake",
      "A futuristic cityscape with flying cars and neon lights",
      "An abstract digital art piece with vibrant colors"
    ],
    "width": 1024,
    "height": 1024,
    "steps": 4
  }'
```

### 4. Get Available Presets

```bash
curl -X GET "http://localhost:8000/api/qwen/presets"
```

### 5. Get Example Prompts

```bash
curl -X GET "http://localhost:8000/api/qwen/examples"
```

### 6. Check Queue Status

```bash
curl -X GET "http://localhost:8000/api/runpod/workflows/queue/status"
```

### 7. Get Workflow History

```bash
curl -X GET "http://localhost:8000/api/runpod/workflows/history?limit=10&status=completed"
```

## 🔧 Configuration

### Environment Variables

```bash
# Required for RunPod integration
RUNPOD_API_KEY=your-runpod-api-key

# Optional
NODE_ENV=production
DEBUG=false
```

### RunPod Configuration

The API automatically configures RunPod pods with:
- **GPU**: NVIDIA GeForce RTX 4090 (or available)
- **Image**: `runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04`
- **Disk**: 50GB container disk
- **Memory**: 24GB minimum
- **Ports**: 22, 8080, 8188, 8888, 11434

## 📊 Monitoring and Statistics

### Queue Statistics
```bash
curl -X GET "http://localhost:8000/api/runpod/stats"
```

Response:
```json
{
  "active_pods": 2,
  "pending_requests": 1,
  "completed_requests": 15,
  "failed_requests": 0,
  "total_requests": 16
}
```

### Health Checks
```bash
# Overall API health
curl -X GET "http://localhost:8000/health"

# RunPod service health
curl -X GET "http://localhost:8000/api/runpod/health"

# Qwen service health
curl -X GET "http://localhost:8000/api/qwen/health"
```

## 🚨 Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "detail": "Invalid workflow input parameters"
}
```

#### 404 Not Found
```json
{
  "detail": "Request not found"
}
```

#### 500 Internal Server Error
```json
{
  "detail": "RunPod API error: Insufficient credits"
}
```

### Error Codes

- `400` - Bad Request (invalid parameters)
- `404` - Not Found (request/pod not found)
- `408` - Request Timeout (generation timeout)
- `500` - Internal Server Error (API/service error)

## 🔄 Workflow Lifecycle

1. **Request Submission**: Client sends image generation request
2. **Queue Processing**: Request added to workflow queue
3. **Pod Allocation**: Available pod assigned or new pod created
4. **Workflow Execution**: ComfyUI workflow executed on pod
5. **Result Processing**: Generated images processed and returned
6. **Cleanup**: Pod paused/terminated if idle

## 📈 Performance Considerations

### Generation Times
- **Fast (4 steps)**: 30-60 seconds
- **Quality (8 steps)**: 60-120 seconds
- **Ultra (12 steps)**: 120-300 seconds

### Concurrent Requests
- Maximum 5 concurrent pods
- Automatic pod scaling based on demand
- Queue management with priority handling

### Resource Usage
- **Pod Creation**: 30-120 seconds
- **Memory Usage**: 24GB+ per pod
- **Storage**: 50GB+ per pod
- **Network**: High bandwidth for image transfer

## 🛠️ Development and Testing

### Running Tests
```bash
cd api
python run_tests.py --unit          # Unit tests
python run_tests.py --integration   # Integration tests
python run_tests.py --coverage      # With coverage report
```

### API Documentation
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Logging
- **Level**: INFO
- **Format**: Structured JSON
- **Output**: Console and file logging

## 🔐 Security

### API Key Management
- RunPod API key stored in environment variables
- No API key exposure in logs or responses
- Secure pod communication over HTTPS

### Pod Security
- Isolated pod environments
- No persistent data storage
- Automatic pod termination after use

## 📚 Additional Resources

- [RunPod API Documentation](https://docs.runpod.io/)
- [ComfyUI Documentation](https://github.com/comfyanonymous/ComfyUI)
- [Qwen Image Model](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## 🆘 Support

For issues or questions:
1. Check the health endpoints
2. Review the logs
3. Check RunPod account status
4. Verify API key permissions
5. Check pod resource availability

The API is designed to be robust and self-healing, with automatic error recovery and resource management.
