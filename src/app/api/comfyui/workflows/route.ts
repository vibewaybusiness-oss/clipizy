import { NextRequest, NextResponse } from 'next/server';
import { getAvailableWorkflows } from '@/lib/comfyui-api';

export async function GET(request: NextRequest) {
  try {
    return await getAvailableWorkflows();
  } catch (error) {
    console.error('ComfyUI workflows error:', error);
    return NextResponse.json(
      { error: 'Failed to get workflows' },
      { status: 500 }
    );
  }
}
