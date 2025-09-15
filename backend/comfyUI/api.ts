import { NextRequest, NextResponse } from 'next/server';
import ComfyUIService, { WorkflowInput } from './comfyui-service';
import { getQueueManager } from '../runpod-api/queue-manager';

// Global ComfyUI service instance
let comfyUIService: ComfyUIService | null = null;
let currentPodId: string | null = null;

// Initialize ComfyUI service with pod
async function initializeComfyUIService(podIp: string): Promise<ComfyUIService> {
  const service = new ComfyUIService(podIp);
  
  // Test connection
  const isConnected = await service.testConnection();
  if (!isConnected) {
    throw new Error(`Cannot connect to ComfyUI at ${podIp}:8188`);
  }
  
  return service;
}

// Recruit a new ComfyUI pod using queue manager
export async function recruitComfyUIPod(): Promise<NextResponse> {
  try {
    console.log('🚀 Recruiting ComfyUI pod via queue manager...');
    
    const queueManager = getQueueManager();
    
    // Add a request to the queue manager for image generation workflow
    const requestId = await queueManager.addWorkflowRequest('qwen-image', {
      prompt: 'Initialize image generation pod',
      workflow: 'qwen-image'
    });
    
    console.log(`✅ ComfyUI request added to queue: ${requestId}`);
    
    // Wait a moment for the queue manager to process the request
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we have an active pod
    const queueStatus = queueManager.getQueueStatus();
    const activeImagePod = queueStatus.activePods.find(pod => pod.workflowName === 'qwen-image');
    
    if (!activeImagePod) {
      return NextResponse.json({
        success: false,
        error: 'No image generation pod available after queue processing'
      }, { status: 500 });
    }

    currentPodId = activeImagePod.id;
    console.log(`✅ Image generation pod available: ${currentPodId}`);

    return NextResponse.json({
      success: true,
      message: 'Image generation pod recruitment initiated via queue manager',
      requestId: requestId,
      podId: currentPodId,
      status: 'recruiting',
      instructions: {
        step1: 'Pod is being created automatically via queue manager',
        step2: 'ComfyUI will be installed and started on the new pod',
        step3: 'Port 8188 will be automatically exposed',
        step4: 'Check status in a few minutes'
      }
    });

  } catch (error) {
    console.error('❌ Error recruiting ComfyUI pod:', error);
    return NextResponse.json({
      success: false,
      error: `ComfyUI pod recruitment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Release ComfyUI pod
export async function releaseComfyUIPod(): Promise<NextResponse> {
  try {
    if (!currentPodId) {
      return NextResponse.json({
        success: false,
        error: 'No active pod to release'
      }, { status: 400 });
    }

    console.log(`🗑️ Releasing ComfyUI pod: ${currentPodId}`);
    
    // Use queue manager to release the pod
    const queueManager = getQueueManager();
    const pod = queueManager.getPodById(currentPodId);
    
    if (pod) {
      // The queue manager will handle pod cleanup based on timeouts
      console.log(`✅ Pod ${currentPodId} will be managed by queue manager`);
    }

    comfyUIService = null;
    currentPodId = null;

    return NextResponse.json({
      success: true,
      message: 'ComfyUI pod released'
    });

  } catch (error) {
    console.error('❌ Error releasing ComfyUI pod:', error);
    return NextResponse.json({
      success: false,
      error: `Pod release failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Get ComfyUI status
export async function getComfyUIStatus(): Promise<NextResponse> {
  try {
    if (!comfyUIService) {
      return NextResponse.json({
        success: false,
        connected: false,
        message: 'ComfyUI service not initialized'
      });
    }

    const isConnected = await comfyUIService.testConnection();
    
    return NextResponse.json({
      success: true,
      connected: isConnected,
      podId: currentPodId,
      message: isConnected ? 'ComfyUI is running' : 'ComfyUI is not responding'
    });

  } catch (error) {
    console.error('❌ Error checking ComfyUI status:', error);
    return NextResponse.json({
      success: false,
      connected: false,
      error: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}

// Get available workflows
export async function getWorkflows(): Promise<NextResponse> {
  try {
    if (!comfyUIService) {
      return NextResponse.json({
        success: false,
        error: 'ComfyUI service not initialized'
      }, { status: 400 });
    }

    // Get system stats instead of workflows
    const stats = await comfyUIService.getSystemStats();
    
    return NextResponse.json({
      success: true,
      stats: stats,
      message: 'ComfyUI system stats retrieved'
    });

  } catch (error) {
    console.error('❌ Error getting workflows:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to get workflows: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Get workflow configuration
export async function getWorkflowConfig(workflowName: string): Promise<NextResponse> {
  try {
    if (!comfyUIService) {
      return NextResponse.json({
        success: false,
        error: 'ComfyUI service not initialized'
      }, { status: 400 });
    }

    const config = await comfyUIService.getWorkflowConfig(workflowName);
    
    return NextResponse.json({
      success: true,
      workflow: workflowName,
      config: config
    });

  } catch (error) {
    console.error('❌ Error getting workflow config:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to get workflow config: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Execute workflow
export async function executeWorkflow(workflowName: string, inputs: WorkflowInput): Promise<NextResponse> {
  try {
    if (!comfyUIService) {
      return NextResponse.json({
        success: false,
        error: 'ComfyUI service not initialized'
      }, { status: 400 });
    }

    const result = await comfyUIService.executeWorkflow(workflowName, inputs);
    
    return NextResponse.json({
      success: result.success,
      promptId: result.prompt_id,
      status: result.status,
      error: result.error,
      images: result.images
    });

  } catch (error) {
    console.error('❌ Error executing workflow:', error);
    return NextResponse.json({
      success: false,
      error: `Workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Generate image (simplified interface)
export async function generateImage(prompt: string, negativePrompt?: string, width?: number, height?: number, steps?: number, cfg?: number, seed?: string): Promise<NextResponse> {
  try {
    if (!comfyUIService) {
      return NextResponse.json({
        success: false,
        error: 'ComfyUI service not initialized'
      }, { status: 400 });
    }

    const inputs: WorkflowInput = {
      prompt: prompt,
      negative_prompt: negativePrompt || 'blurry, low quality, distorted, ugly, deformed, cartoon, anime, sketch',
      width: width || 1024,
      height: height || 1024,
      steps: steps || 20,
      cfg: cfg || 7,
      seed: seed || 'randomize'
    };

    const result = await comfyUIService.executeWorkflow('qwen-image', inputs);
    
    return NextResponse.json({
      success: result.success,
      promptId: result.prompt_id,
      status: result.status,
      error: result.error,
      images: result.images
    });

  } catch (error) {
    console.error('❌ Error generating image:', error);
    return NextResponse.json({
      success: false,
      error: `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Check workflow status
export async function checkWorkflowStatus(promptId: string): Promise<NextResponse> {
  try {
    if (!comfyUIService) {
      return NextResponse.json({
        success: false,
        error: 'ComfyUI service not initialized'
      }, { status: 400 });
    }

    const history = await comfyUIService.getHistory(promptId);
    
    return NextResponse.json({
      success: true,
      promptId: promptId,
      history: history
    });

  } catch (error) {
    console.error('❌ Error checking workflow status:', error);
    return NextResponse.json({
      success: false,
      error: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Download generated image
export async function downloadImage(imageUrl: string, outputPath: string): Promise<NextResponse> {
  try {
    if (!comfyUIService) {
      return NextResponse.json({
        success: false,
        error: 'ComfyUI service not initialized'
      }, { status: 400 });
    }

    await comfyUIService.downloadImage(imageUrl, outputPath);
    
    return NextResponse.json({
      success: true,
      message: 'Image downloaded successfully',
      outputPath: outputPath
    });

  } catch (error) {
    console.error('❌ Error downloading image:', error);
    return NextResponse.json({
      success: false,
      error: `Image download failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
