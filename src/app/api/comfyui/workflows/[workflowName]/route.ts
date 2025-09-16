import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowConfig } from '../../../../../../backendOLD/comfyUI/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { workflowName: string } }
) {
  try {
    return await getWorkflowConfig(params.workflowName);
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
  { params }: { params: { workflowName: string } }
) {
  try {
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
