# RunPod API Setup Guide

## Issue Identified
The clipizi API is not creating pods because the RunPod API key is missing or incorrectly configured.

## Current Status
- ✅ Server starts successfully
- ✅ All services initialize properly
- ✅ ComfyUI endpoints are accessible
- ❌ Pod creation fails due to missing RunPod API key

## Solution

### Option 1: Environment Variable (Recommended)
Set the `RUNPOD_API_KEY` environment variable:

```bash
export RUNPOD_API_KEY="your_runpod_api_key_here"
```

### Option 2: API Key File
Create a file with your RunPod API key in one of these locations:
- `api/runpod/runpod_api_privatekey`
- `api/runpod/runpod_api_key`
- `api/runpod/api_key`
- `runpod_api_key` (in project root)
- `runpod_api_privatekey` (in project root)

### Getting Your RunPod API Key
1. Go to [RunPod Console](https://runpod.io/console/user/settings)
2. Navigate to "API Keys" section
3. Create a new API key or copy an existing one
4. The API key should be a long alphanumeric string (not an SSH key)

### Current Files
The current files (`runpod_api_key`, `runpod_api_key.pub`) are SSH keys, not RunPod API keys. These are used for SSH access to RunPod pods, not for API authentication.

### Testing
After setting up the API key, test the connection:

```bash
python test_runpod_api.py
```

### Expected Behavior
Once the API key is properly configured:
1. Pod creation will work
2. ComfyUI requests will be processed
3. The timeout issue will be resolved

## Next Steps
1. Obtain a RunPod API key from the console
2. Set it up using one of the methods above
3. Test the connection
4. Run the ComfyUI test again
