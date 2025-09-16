import { NextRequest, NextResponse } from 'next/server';
import { checkWorkflowStatus } from '../../../../../../backendOLD/comfyUI/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { promptId: string } }
) {
  try {
    return await checkWorkflowStatus(params.promptId);
  } catch (error) {
    console.error('ComfyUI status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check workflow status' },
      { status: 500 }
    );
  }
}
