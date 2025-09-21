import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

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
    const backendUrl = `${BACKEND_URL}/api/comfyui/status`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getWorkflows(): Promise<NextResponse> {
  try {
    const backendUrl = `${BACKEND_URL}/api/comfyui/workflows`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getWorkflowConfig(workflowName: string): Promise<NextResponse> {
  try {
    const backendUrl = `${BACKEND_URL}/api/comfyui/workflows/${workflowName}`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({
          success: false,
          error: `Workflow '${workflowName}' not found`
        }, { status: 404 });
      }
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function executeWorkflow(workflowName: string, inputs: any): Promise<NextResponse> {
  try {
    const backendUrl = `${BACKEND_URL}/api/comfyui/execute`;
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_type: workflowName,
        inputs: inputs
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getRequestStatus(requestId: string): Promise<NextResponse> {
  try {
    const backendUrl = `${BACKEND_URL}/api/comfyui/request/${requestId}`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({
          success: false,
          error: `Request ${requestId} not found`
        }, { status: 404 });
      }
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getQueueStatus(): Promise<NextResponse> {
  try {
    const backendUrl = `${BACKEND_URL}/api/runpod/queue/status`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      ...data
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
    const backendUrl = `${BACKEND_URL}/api/comfyui/requests`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function recruitComfyUIPod(): Promise<NextResponse> {
  try {
    const backendUrl = `${BACKEND_URL}/api/runpod/queue/add`;
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_name: 'comfyui_image_qwen',
        input_data: {
          prompt: 'Initialize image generation pod',
          workflow: 'comfyui_image_qwen'
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: 'Image generation pod recruitment initiated. Pod will be created automatically.',
      requestId: data.request_id,
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
    // Get queue status first to find ComfyUI pods
    const statusUrl = `${BACKEND_URL}/api/runpod/queue/status`;
    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to get queue status: ${statusResponse.status}`);
    }

    const queueStatus = await statusResponse.json();
    const comfyUIPods = queueStatus.activePods?.filter((pod: any) =>
      pod.workflowName === 'comfyui' || pod.workflowName === 'comfyui_image_qwen'
    ) || [];

    if (comfyUIPods.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active ComfyUI pods found to release'
      });
    }

    const results = [];

    // Terminate all ComfyUI pods
    for (const pod of comfyUIPods) {
      try {
        const terminateUrl = `${BACKEND_URL}/api/runpod/pods/${pod.id}`;
        const terminateResponse = await fetch(terminateUrl, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await terminateResponse.json();
        results.push({
          podId: pod.id,
          success: terminateResponse.ok,
          error: result.error || (terminateResponse.ok ? null : 'Termination failed')
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
