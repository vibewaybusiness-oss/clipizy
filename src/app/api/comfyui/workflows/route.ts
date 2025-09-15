import { NextRequest, NextResponse } from 'next/server';
import { getWorkflows } from '../../../../../backend/comfyUI/api';

export async function GET(request: NextRequest) {
  try {
    return await getWorkflows();
  } catch (error) {
    console.error('ComfyUI workflows error:', error);
    return NextResponse.json(
      { error: 'Failed to get workflows' },
      { status: 500 }
    );
  }
}
