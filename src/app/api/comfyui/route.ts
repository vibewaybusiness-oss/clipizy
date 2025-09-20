import { NextRequest, NextResponse } from 'next/server';
import { getComfyUIManager } from '../../../../backendOLD/comfyUI/comfyui-manager';
import { getQueueManager } from '../../../../backendOLD/runpod-api/queue-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        return await getComfyUIStatus();
      case 'workflows':
        return await getWorkflows();
      case 'workflow-config':
        const workflowName = searchParams.get('workflow');
        if (!workflowName) {
          return NextResponse.json({ error: 'Workflow name required' }, { status: 400 });
        }
        return await getWorkflowConfig(workflowName);
      case 'request-status':
        const requestId = searchParams.get('requestId');
        if (!requestId) {
          return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
        }
        return await getRequestStatus(requestId);
      case 'queue-status':
        return await getQueueStatus();
      case 'requests':
        return await getAllRequests();
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('ComfyUI API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'recruit':
        return await recruitComfyUIPod();
      case 'release':
        return await releaseComfyUIPod();
      case 'execute':
        const body = await request.json();
        const { workflow, inputs } = body;
        if (!workflow || !inputs) {
          return NextResponse.json({ error: 'Workflow and inputs required' }, { status: 400 });
        }
        return await executeWorkflow(workflow, inputs);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('ComfyUI API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// API Functions
async function getComfyUIStatus(): Promise<NextResponse> {
  try {
    const manager = getComfyUIManager();
    const queueStatus = await manager.getQueueStatus();
    
    return NextResponse.json({
      success: true,
      connected: queueStatus.activePods.length > 0,
      activePods: queueStatus.activePods.length,
      pendingRequests: queueStatus.comfyuiRequests.pending,
      processingRequests: queueStatus.comfyuiRequests.active,
      completedRequests: queueStatus.comfyuiRequests.completed,
      message: 'ComfyUI Manager is running'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getWorkflows(): Promise<NextResponse> {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), 'backend', 'comfyUI', 'workflows-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    return NextResponse.json({
      success: true,
      workflows: Object.values(config.workflows),
      categories: config.categories
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getWorkflowConfig(workflowName: string): Promise<NextResponse> {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), 'backend', 'comfyUI', 'workflows-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const workflowConfig = config.workflows[workflowName];
    if (!workflowConfig) {
      return NextResponse.json({
        success: false,
        error: `Workflow '${workflowName}' not found`
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      workflow: workflowConfig
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function executeWorkflow(workflowName: string, inputs: any): Promise<NextResponse> {
  try {
    const manager = getComfyUIManager();
    const request = await manager.executeWorkflow(workflowName, inputs);
    
    return NextResponse.json({
      success: true,
      requestId: request.id,
      status: request.status,
      podId: request.podId,
      podIp: request.podIp,
      message: request.status === 'pending' ? 'Request queued, waiting for pod allocation' : 
               request.status === 'processing' ? 'Workflow is being executed' :
               request.status === 'completed' ? 'Workflow completed successfully' :
               request.status === 'failed' ? 'Workflow failed' : 'Unknown status',
      error: request.error
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getRequestStatus(requestId: string): Promise<NextResponse> {
  try {
    const manager = getComfyUIManager();
    const request = manager.getRequest(requestId);
    
    if (!request) {
      return NextResponse.json({
        success: false,
        error: `Request ${requestId} not found`
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      request: {
        id: request.id,
        workflowName: request.workflowName,
        status: request.status,
        podId: request.podId,
        podIp: request.podIp,
        promptId: request.promptId,
        result: request.result,
        error: request.error,
        createdAt: request.createdAt,
        completedAt: request.completedAt
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getQueueStatus(): Promise<NextResponse> {
  try {
    const manager = getComfyUIManager();
    const queueStatus = await manager.getQueueStatus();
    
    return NextResponse.json({
      success: true,
      ...queueStatus
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getAllRequests(): Promise<NextResponse> {
  try {
    const manager = getComfyUIManager();
    const requests = manager.getAllRequests();
    
    return NextResponse.json({
      success: true,
      requests: requests.map(req => ({
        id: req.id,
        workflowName: req.workflowName,
        status: req.status,
        podId: req.podId,
        podIp: req.podIp,
        promptId: req.promptId,
        result: req.result,
        error: req.error,
        createdAt: req.createdAt,
        completedAt: req.completedAt
      }))
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function recruitComfyUIPod(): Promise<NextResponse> {
  try {
    const queueManager = getQueueManager();
    
    // Start the queue manager if not already running
    if (!queueManager.getQueueStatus().isRunning) {
      await queueManager.start();
    }
    
    // Check if there's already a pod for comfyui_image_qwen workflow (used for image generation)
    const existingPod = queueManager.getPodForWorkflow('comfyui_image_qwen');
    
    if (existingPod) {
      return NextResponse.json({
        success: true,
        message: 'Image generation pod already exists and is active',
        podId: existingPod.id,
        status: existingPod.status,
        workflowName: existingPod.workflowName
      });
    }
    
    // Add a request to trigger pod creation for image generation
    const requestId = await queueManager.addWorkflowRequest('comfyui_image_qwen', {
      prompt: 'Initialize image generation pod',
      workflow: 'comfyui_image_qwen'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Image generation pod recruitment initiated. Pod will be created automatically.',
      requestId,
      status: 'recruiting',
      instructions: {
        step1: 'Pod is being created automatically via queue manager',
        step2: 'ComfyUI will be installed and started on the new pod',
        step3: 'Port 8188 will be automatically exposed',
        step4: 'Check status in a few minutes'
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to recruit ComfyUI pod',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function releaseComfyUIPod(): Promise<NextResponse> {
  try {
    const queueManager = getQueueManager();
    const queueStatus = queueManager.getQueueStatus();
    
    // Find ComfyUI pods
    const comfyUIPods = queueStatus.activePods.filter(pod => pod.workflowName === 'comfyui');
    
    if (comfyUIPods.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active ComfyUI pods found to release'
      });
    }
    
    const { terminatePod } = await import('../../../../backendOLD/runpod-api');
    const results = [];
    
    // Terminate all ComfyUI pods
    for (const pod of comfyUIPods) {
      try {
        const result = await terminatePod(pod.id);
        results.push({
          podId: pod.id,
          success: result.success,
          error: result.error
        });
      } catch (error) {
        results.push({
          podId: pod.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    return NextResponse.json({
      success: successCount > 0,
      message: `Released ${successCount}/${totalCount} ComfyUI pods`,
      results,
      details: {
        totalPods: totalCount,
        successfulReleases: successCount,
        failedReleases: totalCount - successCount
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to release ComfyUI pods',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}