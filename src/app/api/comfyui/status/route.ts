import { NextRequest, NextResponse } from 'next/server';
import { getComfyUIStatus } from '../../../../../backendOLD/comfyUI/api';

export async function GET(request: NextRequest) {
  try {
    return await getComfyUIStatus();
  } catch (error) {
    console.error('ComfyUI status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get ComfyUI status' },
      { status: 500 }
    );
  }
}
