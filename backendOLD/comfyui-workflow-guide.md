# ComfyUI Workflow Execution Guide

## 🎨 How to Run the Qwen Image Workflow

### Method 1: Using ComfyUI Web Interface

1. **Access ComfyUI**: Open your browser and go to `http://YOUR_POD_IP:8188`
2. **Load Workflow**: 
   - Click "Load" button in ComfyUI
   - Select `qwen-image-4steps.json` file
   - The workflow will load with all nodes connected

3. **Customize Settings**:
   - **Positive Prompt**: Change the text in the "CLIP Text Encode (Positive Prompt)" node
   - **Image Size**: Modify width/height in "EmptySD3LatentImage" node (default: 1328x1328)
   - **Steps**: Adjust in "KSampler" node (default: 4 steps)
   - **CFG**: Change in "KSampler" node (default: 1.0)

4. **Run Workflow**:
   - Click "Queue Prompt" button
   - Wait for generation to complete
   - Images will appear in the output

### Method 2: Using API (Programmatic)

```typescript
// 1. Load the workflow
const workflow = JSON.parse(fs.readFileSync('qwen-image-4steps.json', 'utf8'));

// 2. Modify the prompt
const positivePromptNode = workflow.nodes.find(node => 
  node.type === 'CLIPTextEncode' && 
  node.title === 'CLIP Text Encode (Positive Prompt)'
);
positivePromptNode.widgets_values[0] = "Your custom prompt here";

// 3. Execute via API
const response = await fetch('http://YOUR_POD_IP:8188/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: workflow,
    client_id: 'your-client-id'
  })
});

const result = await response.json();
const promptId = result.prompt_id;

// 4. Check status
const historyResponse = await fetch(`http://YOUR_POD_IP:8188/history/${promptId}`);
const history = await historyResponse.json();
```

### Method 3: Using cURL

```bash
# Execute workflow
curl -X POST http://YOUR_POD_IP:8188/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": WORKFLOW_JSON,
    "client_id": "test-client"
  }'

# Check status
curl http://YOUR_POD_IP:8188/history/PROMPT_ID

# Download image
curl http://YOUR_POD_IP:8188/view?filename=IMAGE_NAME.png&subfolder=&type=output
```

## 🔧 Workflow Configuration

### Key Nodes in the Workflow:

1. **UNETLoader**: Loads the Qwen Image model
2. **CLIPLoader**: Loads the text encoder
3. **VAELoader**: Loads the VAE for image decoding
4. **EmptySD3LatentImage**: Sets image dimensions
5. **CLIPTextEncode**: Processes positive/negative prompts
6. **KSampler**: Performs the actual generation
7. **VAEDecode**: Converts latent to image
8. **SaveImage**: Saves the final image

### Customizable Parameters:

- **Image Size**: 1328x1328 (recommended for Qwen Image)
- **Steps**: 4 (very fast), 10 (balanced), 50 (maximum quality)
- **CFG**: 1.0 (fast), 3.0 (balanced), 7.0 (detailed)
- **Sampler**: euler (fast), ddim (quality)
- **Scheduler**: simple (fast), normal (balanced)

## 📊 Expected Performance

- **GPU**: RTX 4090 24GB
- **VRAM Usage**: ~86%
- **Generation Time**: 
  - 4 steps: ~10-15 seconds
  - 10 steps: ~25-35 seconds
  - 50 steps: ~90-120 seconds

## 🎯 Example Prompts

Try these prompts with the workflow:

1. **Cyberpunk**: "A beautiful cyberpunk cityscape at sunset, neon lights reflecting on wet streets, futuristic architecture"

2. **Portrait**: "Portrait of a mysterious woman with glowing eyes, digital art style, high detail"

3. **Landscape**: "Majestic mountain landscape with aurora borealis, photorealistic, 8k resolution"

4. **Abstract**: "Abstract geometric patterns in vibrant colors, modern art style, symmetrical"

## 🚨 Troubleshooting

### Common Issues:

1. **Out of Memory**: Reduce image size or use fewer steps
2. **Slow Generation**: Check GPU utilization, try different sampler
3. **Poor Quality**: Increase steps or CFG value
4. **API Timeout**: Increase timeout values in your client

### Debug Steps:

1. Check ComfyUI logs: `tail -f /workspace/ComfyUI/comfyui.log`
2. Monitor GPU usage: `nvidia-smi`
3. Check queue status: `http://YOUR_POD_IP:8188/queue`
4. Verify models are loaded: `http://YOUR_POD_IP:8188/system_stats`
