# RunPod Integration Tests

This directory contains test scripts to verify the RunPod integration with FastAPI.

## Prerequisites

1. **API Key Setup**: You need a RunPod API key. Set it up in one of these ways:
   ```bash
   # Option 1: Environment variable (recommended)
   export RUNPOD_API_KEY="your-api-key-here"
   
   # Option 2: Create API key file
   echo "your-api-key-here" > runpod_api_key
   ```

2. **Dependencies**: Make sure you have the required Python packages:
   ```bash
   pip install httpx fastapi pydantic python-dotenv
   ```

## Test Scripts

### 1. Simple Recruitment Test (`test_simple_recruitment.py`)

**Purpose**: Basic test to recruit a pod and verify connectivity.

**What it does**:
- Recruits a single pod with ComfyUI-compatible configuration
- Waits for the pod to be ready
- Tests basic connectivity to port 8188
- Cleans up the pod automatically

**Usage**:
```bash
cd api/runpod
python test_simple_recruitment.py
```

**Expected Output**:
```
🎯 Simple RunPod Recruitment Test
========================================
📋 Pod Configuration:
   Name: simple-test-1234567890
   Image: runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04
   GPU Count: 1
   Memory: 24GB
   Ports: 22,8080,8188,8888,11434

🚀 Starting pod recruitment...
✅ Pod recruited successfully!
   Pod ID: pod-abc123
   GPU Type: NVIDIA GeForce RTX 4090
   Attempts: 1

⏳ Waiting for pod to be ready...
✅ Pod is ready!
   IP: 1.2.3.4
   Port: 11434
   Status: RUNNING

🔗 Testing connectivity to 1.2.3.4:8188...
✅ Port 8188 is accessible!

🎉 Basic recruitment test completed successfully!
💡 You can now use this pod for ComfyUI workflows

🧹 Cleaning up pod...
✅ Pod terminated successfully
```

### 2. Full Workflow Test (`test_pod_recruitment.py`)

**Purpose**: Complete test including ComfyUI workflow execution.

**What it does**:
- Recruits a pod
- Waits for ComfyUI to be ready
- Sends a test image generation workflow
- Monitors workflow execution
- Reports results and cleans up

**Usage**:
```bash
cd api/runpod
python test_pod_recruitment.py
```

**Expected Output**:
```
🚀 RunPod ComfyUI Workflow Test
==================================================
🎯 Recruiting test pod...
✅ Pod recruited successfully!
   Pod ID: pod-abc123
   GPU Type: NVIDIA GeForce RTX 4090
   Attempts: 1

⏳ Waiting for pod pod-abc123 to be ready...
✅ Pod is ready!
   IP: 1.2.3.4
   Port: 11434
   Status: RUNNING

🌐 Pod IP: 1.2.3.4
🔗 Testing ComfyUI connection to http://1.2.3.4:8188
✅ ComfyUI is accessible

📤 Sending test workflow to http://1.2.3.4:8188
📋 Queuing workflow...
✅ Workflow queued with ID: 12345
⏳ Waiting for workflow completion...
✅ Workflow completed successfully!
   Prompt ID: 12345
   Generated files: ['test_image_00001.png']

🎉 Workflow test completed successfully!

🧹 Cleaning up pod pod-abc123...
✅ Pod terminated successfully

🏁 Test completed
```

## Configuration

The test scripts use the configuration from `config.json`. Key settings:

```json
{
  "workflow": {
    "default": {
      "timeouts": {
        "pause": 5,
        "terminate": 500
      },
      "network-volume": "ktsq4ji8l0"
    }
  },
  "podSettings": {
    "defaultImage": "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
    "defaultGpuCount": 1,
    "defaultMemoryInGb": 24,
    "defaultDiskInGb": 20,
    "defaultVcpuCount": 4,
    "defaultPorts": "22,8080,8888,11434",
    "defaultCountryCode": "CA",
    "supportPublicIp": true,
    "networkVolumeId": "ktsq4ji8l0"
  }
}
```

## Troubleshooting

### Common Issues

1. **API Key Error**:
   ```
   RunPod API key not found. Set RUNPOD_API_KEY or create api/runpod/runpod_api_key file
   ```
   **Solution**: Set up your API key as described in Prerequisites.

2. **Pod Recruitment Fails**:
   ```
   ❌ Pod recruitment failed: Failed to recruit pod after 3 attempts with all GPU types
   ```
   **Solution**: Check your RunPod account balance and GPU availability.

3. **Connection Timeout**:
   ```
   ❌ Pod did not become ready within 10 minutes
   ```
   **Solution**: The pod may be taking longer to start. Try increasing the timeout or check RunPod status.

4. **ComfyUI Not Accessible**:
   ```
   ❌ Cannot connect to ComfyUI - service may not be running
   ```
   **Solution**: ComfyUI may need more time to start. The pod is ready but the service is still initializing.

### Debug Mode

To see more detailed logging, you can modify the logging level in the test scripts:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Integration with FastAPI

These test scripts verify that the RunPod integration works correctly with your FastAPI application. Once these tests pass, you can use the RunPod services in your FastAPI routes:

```python
from api.runpod.pod_management import PodManager, PodRecruitmentConfig
from api.runpod.queue_manager import get_queue_manager

# In your FastAPI route
async def create_pod_endpoint():
    pod_manager = PodManager(get_client())
    config = PodRecruitmentConfig(name="my-pod", ...)
    result = await pod_manager.recruit_pod(config)
    return result
```

## Cost Considerations

⚠️ **Important**: These tests will create actual RunPod instances that cost money. Make sure to:

1. Monitor your RunPod account balance
2. The tests automatically clean up pods, but check your RunPod dashboard
3. Consider using smaller/cheaper GPU types for testing
4. Set up billing alerts in your RunPod account

## Next Steps

After successful testing:

1. Integrate the RunPod services into your FastAPI application
2. Set up proper error handling and monitoring
3. Configure production settings in `config.json`
4. Set up automated pod management and scaling
5. Implement proper logging and metrics collection
