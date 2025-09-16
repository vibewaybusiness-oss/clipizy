# RunPod API Setup Instructions

## The Issue
No pods are getting recruited because the RunPod API key is not configured.

## Solution

### Step 1: Get Your RunPod API Key
1. Go to [RunPod Console](https://console.runpod.io/settings/api-keys)
2. Sign in to your RunPod account
3. Create a new API key
4. Copy the API key (it will look like: `rpd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Step 2: Set the Environment Variable

#### Option A: PowerShell (Recommended)
```powershell
$env:RUNPOD_API_KEY="your_actual_api_key_here"
```

#### Option B: Command Prompt
```cmd
set RUNPOD_API_KEY=your_actual_api_key_here
```

#### Option C: Create .env file
Create a `.env` file in the project root with:
```
RUNPOD_API_KEY=your_actual_api_key_here
```

### Step 3: Test the Connection
```bash
node test-runpod-connection.js
```

### Step 4: Run the Image Generation Test
```bash
node simple-queen-test.js
```

## Expected Behavior
Once the API key is set correctly:
1. The test will recruit a ComfyUI pod (takes 2-5 minutes)
2. The pod will install ComfyUI and expose port 8188
3. The system will execute the Queen Elizabeth II image generation
4. You'll see the generated image URLs in the output

## Troubleshooting
- If you get "API key not found" errors, make sure the environment variable is set
- If pod recruitment fails, check your RunPod account balance
- If the pod times out, it may take longer to initialize (up to 10 minutes)
