const path = require('path');
const fs = require('fs');

// Add the api/runpod directory to the module path
const runpodPath = path.resolve(__dirname, 'api', 'runpod');
require('module')._resolveFilename = (function(originalResolveFilename) {
  return function(request, parent, isMain) {
    if (request.startsWith('./') || request.startsWith('../')) {
      return originalResolveFilename(request, parent, isMain);
    }
    try {
      return originalResolveFilename(request, parent, isMain);
    } catch (err) {
      // Try to resolve from runpod directory
      try {
        return originalResolveFilename(request, { filename: path.join(runpodPath, 'index.js') }, isMain);
      } catch (err2) {
        throw err;
      }
    }
  };
})(require('module')._resolveFilename);

// Import the queue manager
const { getQueueManager } = require('./api/runpod/queue-manager');

class QwenImageGenerator {
  constructor() {
    this.queueManager = getQueueManager();
    this.generatedImages = [];
  }

  async initialize() {
    console.log('🚀 Initializing Qwen Image Generator...');
    
    // Start the queue manager if not already running
    if (!this.queueManager.getQueueStatus().isRunning) {
      await this.queueManager.start();
      console.log('✅ Queue manager started');
    } else {
      console.log('✅ Queue manager already running');
    }
  }

  async generateImage(prompt, options = {}) {
    const {
      negativePrompt = "blurry, low quality, distorted, ugly, bad anatomy, bad proportions, extra limbs, missing limbs, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, extra fingers, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, text, error, missing fingers, missing arms, missing legs, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
      width = 1328,
      height = 1328,
      seed = Math.floor(Math.random() * 1000000),
      steps = 4
    } = options;

    console.log(`🎨 Generating Qwen image with prompt: "${prompt}"`);
    console.log(`📐 Dimensions: ${width}x${height}`);
    console.log(`🎲 Seed: ${seed}`);
    console.log(`⚡ Steps: ${steps}`);

    const requestData = {
      prompt,
      negativePrompt,
      width,
      height,
      seed,
      steps,
      workflow: 'qwen-image-8steps',
      model: 'qwen-image',
      category: 'image-generation'
    };

    try {
      // Add workflow request to queue
      const requestId = await this.queueManager.addWorkflowRequest('qwen-image', requestData);
      console.log(`📝 Request queued with ID: ${requestId}`);

      // Wait for pod to be available and get pod details
      let pod = null;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max wait

      while (!pod && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        pod = this.queueManager.getPodForWorkflow('qwen-image');
        if (pod) {
          console.log(`✅ Found pod: ${pod.id} (status: ${pod.status})`);
          break;
        }
        
        attempts++;
        console.log(`⏳ Waiting for pod... (attempt ${attempts}/${maxAttempts})`);
      }

      if (!pod) {
        throw new Error('Failed to get pod within timeout period');
      }

      // Wait for pod to have IP address
      console.log(`🌐 Waiting for pod ${pod.id} to get IP address...`);
      const podWithIp = await this.queueManager.getPodWithIp(pod.id);
      
      if (!podWithIp.success || !podWithIp.pod?.ip) {
        throw new Error(`Failed to get pod IP: ${podWithIp.error}`);
      }

      console.log(`✅ Pod ready with IP: ${podWithIp.pod.ip}`);

      // Execute the actual image generation via ComfyUI API
      const result = await this.executeComfyUIWorkflow(podWithIp.pod.ip, requestData);
      
      if (result.success) {
        console.log(`🎉 Image generated successfully!`);
        console.log(`📁 Output files: ${result.files?.join(', ') || 'N/A'}`);
        
        this.generatedImages.push({
          requestId,
          prompt,
          podId: pod.id,
          podIp: podWithIp.pod.ip,
          result,
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          requestId,
          podId: pod.id,
          podIp: podWithIp.pod.ip,
          result
        };
      } else {
        throw new Error(`Image generation failed: ${result.error}`);
      }

    } catch (error) {
      console.error(`❌ Error generating image: ${error.message}`);
      return {
        success: false,
        error: error.message,
        requestId: requestId || 'unknown'
      };
    }
  }

  async executeComfyUIWorkflow(podIp, requestData) {
    const comfyUIUrl = `http://${podIp}:8188`;
    console.log(`🔗 Connecting to ComfyUI at: ${comfyUIUrl}`);

    try {
      // Load the Qwen workflow
      const workflowPath = path.join(__dirname, 'BACKEND OLD', 'runpod', 'comfyui', 'workflows', 'qwen_image', 'qwen-image-8steps.json');
      const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

      // Update workflow with request data
      workflow["6"]["inputs"]["text"] = requestData.prompt;
      workflow["7"]["inputs"]["text"] = requestData.negativePrompt;
      workflow["58"]["inputs"]["width"] = requestData.width;
      workflow["58"]["inputs"]["height"] = requestData.height;
      workflow["58"]["inputs"]["batch_size"] = 1;
      workflow["3"]["inputs"]["seed"] = requestData.seed;
      workflow["3"]["inputs"]["steps"] = requestData.steps;
      workflow["60"]["inputs"]["filename_prefix"] = `qwen_${requestData.seed}`;

      console.log(`🔧 Workflow configured for generation`);

      // Queue the prompt
      const queueResponse = await fetch(`${comfyUIUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: workflow,
          client_id: `qwen_test_${Date.now()}`
        })
      });

      if (!queueResponse.ok) {
        throw new Error(`Failed to queue prompt: ${queueResponse.status} ${queueResponse.statusText}`);
      }

      const queueResult = await queueResponse.json();
      const promptId = queueResult.prompt_id;

      console.log(`📋 Prompt queued with ID: ${promptId}`);

      // Wait for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes max

      while (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(`${comfyUIUrl}/history/${promptId}`);
        if (!statusResponse.ok) {
          console.log(`⏳ Waiting for completion... (attempt ${attempts + 1}/${maxAttempts})`);
          attempts++;
          continue;
        }

        const history = await statusResponse.json();
        const promptHistory = history[promptId];

        if (promptHistory && promptHistory.status) {
          const status = promptHistory.status;
          console.log(`📊 Status: ${status.status}`);

          if (status.status === 'success') {
            completed = true;
            console.log(`✅ Generation completed successfully!`);

            // Get the generated files
            const outputFiles = [];
            if (status.outputs) {
              for (const nodeId in status.outputs) {
                const nodeOutput = status.outputs[nodeId];
                if (nodeOutput.images) {
                  for (const image of nodeOutput.images) {
                    const filename = image.filename;
                    const subfolder = image.subfolder || '';
                    const filepath = subfolder ? `${subfolder}/${filename}` : filename;
                    outputFiles.push(filepath);
                  }
                }
              }
            }

            return {
              success: true,
              promptId,
              files: outputFiles,
              status: status.status
            };
          } else if (status.status === 'error') {
            throw new Error(`Generation failed: ${status.error || 'Unknown error'}`);
          }
        }

        attempts++;
        console.log(`⏳ Waiting for completion... (attempt ${attempts}/${maxAttempts})`);
      }

      if (!completed) {
        throw new Error('Generation timed out');
      }

    } catch (error) {
      console.error(`❌ ComfyUI execution error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateMultipleImages(prompts, options = {}) {
    console.log(`🎨 Generating ${prompts.length} Qwen images...`);
    
    const results = [];
    
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      console.log(`\n🖼️  Image ${i + 1}/${prompts.length}: "${prompt}"`);
      
      const result = await this.generateImage(prompt, {
        ...options,
        seed: options.seed ? options.seed + i : Math.floor(Math.random() * 1000000)
      });
      
      results.push(result);
      
      // Small delay between generations
      if (i < prompts.length - 1) {
        console.log(`⏳ Waiting 2 seconds before next generation...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }

  getGeneratedImages() {
    return this.generatedImages;
  }

  async cleanup() {
    console.log('🧹 Cleaning up...');
    await this.queueManager.cleanup();
  }
}

// Main execution function
async function main() {
  const generator = new QwenImageGenerator();
  
  try {
    await generator.initialize();
    
    // Define the two image prompts
    const prompts = [
      "A majestic dragon soaring through clouds above a medieval castle, fantasy art style, highly detailed, epic lighting",
      "A futuristic cyberpunk cityscape at night with neon lights, flying cars, and towering skyscrapers, digital art style"
    ];
    
    console.log('\n🎯 Starting Qwen Image Generation Test');
    console.log('=====================================');
    
    // Generate the images
    const results = await generator.generateMultipleImages(prompts, {
      width: 1024,
      height: 1024,
      steps: 4
    });
    
    console.log('\n📊 Generation Results:');
    console.log('=====================');
    
    results.forEach((result, index) => {
      console.log(`\nImage ${index + 1}:`);
      console.log(`  Prompt: "${prompts[index]}"`);
      console.log(`  Success: ${result.success ? '✅' : '❌'}`);
      if (result.success) {
        console.log(`  Request ID: ${result.requestId}`);
        console.log(`  Pod ID: ${result.podId}`);
        console.log(`  Pod IP: ${result.podIp}`);
        console.log(`  Files: ${result.result?.files?.join(', ') || 'N/A'}`);
      } else {
        console.log(`  Error: ${result.error}`);
      }
    });
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n🎉 Generated ${successCount}/${prompts.length} images successfully!`);
    
    // Show all generated images
    const allImages = generator.getGeneratedImages();
    console.log(`\n📸 Total images generated in this session: ${allImages.length}`);
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
  } finally {
    // Note: We don't cleanup immediately to allow inspection of results
    console.log('\n💡 Note: Pods will remain active for inspection. Run cleanup manually if needed.');
    // await generator.cleanup();
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { QwenImageGenerator };
