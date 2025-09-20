# RunPod Pod Test Script

This is an independent test script to start a RunPod pod with specific volume and template configurations.

## Configuration

- **Volume ID**: `spwpjg3lk3`
- **Template ID**: `fdcc1twlxx`

## Prerequisites

1. Install dependencies:
   ```bash
   pip install -r test_requirements.txt
   ```

2. Set up RunPod API key:
   ```bash
   export RUNPOD_API_KEY=your_api_key_here
   ```

## Usage

Run the test script:
```bash
python test_runpod_pod.py
```

## What the script does

1. Loads the RunPod API key from environment or file
2. Verifies the specified network volume exists
3. Creates a pod with the specified volume and template
4. Waits for the pod to be fully ready
5. Reports success or failure

## Pod Configuration

The test creates a pod with:
- GPU: NVIDIA GeForce RTX 4090
- Image: runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04
- Network Volume: spwpjg3lk3 (mounted at /workspace)
- Template: fdcc1twlxx
- Ports: 22, 8080, 8188, 8888, 11434
- Container Disk: 20GB
- Local Volume: 0GB (using network volume)

## Output

The script provides detailed logging of:
- API key loading
- Volume verification
- Pod creation process
- Pod readiness status
- Final success/failure status
