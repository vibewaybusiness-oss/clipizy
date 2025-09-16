import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '../../../../../../backendOLD/comfyUI/api';

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowName: string } }
) {
  try {
    const body = await request.json();
    return await generateImage(params.workflowName, body);
  } catch (error) {
    console.error('ComfyUI image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
