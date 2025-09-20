import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/comfyui-api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowName: string }> }
) {
  try {
    const { workflowName } = await params;
    const body = await request.json();
    return await generateImage(workflowName, body);
  } catch (error) {
    console.error('ComfyUI image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
