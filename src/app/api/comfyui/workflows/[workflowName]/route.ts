import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowName: string }> }
) {
  try {
    const { workflowName } = await params;
    const backendUrl = `${BACKEND_URL}/api/comfyui/workflows/${workflowName}`;
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
    console.error('ComfyUI workflow config error:', error);
    return NextResponse.json(
      { error: 'Failed to get workflow config' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowName: string }> }
) {
  try {
    const { workflowName } = await params;
    return NextResponse.json({
      success: false,
      error: 'Workflow execution not available. Please expose port 8188 in your RunPod console first.'
    }, { status: 503 });
  } catch (error) {
    console.error('ComfyUI workflow execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}
