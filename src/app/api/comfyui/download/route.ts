import { NextRequest, NextResponse } from 'next/server';
import { downloadImage } from '../../../../../backendOLD/comfyUI/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || '';
    const subfolder = searchParams.get('subfolder') || '';
    const type = searchParams.get('type') || 'output';
    
    return await downloadImage(filename, subfolder, type);
  } catch (error) {
    console.error('ComfyUI download error:', error);
    return NextResponse.json(
      { error: 'Failed to download image' },
      { status: 500 }
    );
  }
}
