import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowStatus } from '@/lib/comfyui-api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ promptId: string }> }
) {
  try {
    const { promptId } = await params;
    return await getWorkflowStatus(promptId);
  } catch (error) {
    console.error('ComfyUI status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check workflow status' },
      { status: 500 }
    );
  }
}
