import { NextResponse } from 'next/server';

interface ComfyUIRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  cfg?: number;
  sampler?: string;
  scheduler?: string;
}

interface ComfyUIResponse {
  success: boolean;
  prompt_id?: string;
  error?: string;
  images?: string[];
}

export async function generateImage(
  workflowName: string,
  request: ComfyUIRequest
): Promise<NextResponse> {
  try {
    // Call the backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/comfyui/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_name: workflowName,
        input_data: request
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({
        success: true,
        prompt_id: data.prompt_id,
        images: data.images || []
      });
    } else {
      return NextResponse.json({
        success: false,
        error: data.error || 'Image generation failed'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('ComfyUI generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Image generation failed'
    }, { status: 500 });
  }
}

export async function downloadImage(
  filename: string,
  subfolder: string = '',
  type: string = 'output'
): Promise<NextResponse> {
  try {
    // Call the backend API to get the download URL
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/comfyui/download?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.download_url) {
      // Redirect to the download URL
      return NextResponse.redirect(data.download_url);
    } else {
      return NextResponse.json({
        success: false,
        error: data.error || 'Download failed'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('ComfyUI download error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Download failed'
    }, { status: 500 });
  }
}

export async function getWorkflowStatus(promptId: string): Promise<NextResponse> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/comfyui/status/${promptId}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('ComfyUI status error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Status check failed'
    }, { status: 500 });
  }
}

export async function getAvailableWorkflows(): Promise<NextResponse> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/comfyui/workflows`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('ComfyUI workflows error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch workflows'
    }, { status: 500 });
  }
}
