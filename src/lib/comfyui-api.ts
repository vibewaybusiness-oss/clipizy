/**
 * ComfyUI API client for image generation and workflow management
 */

const COMFYUI_BASE_URL = process.env.NEXT_PUBLIC_COMFYUI_URL || 'http://localhost:8188';

export interface ComfyUIWorkflow {
  id: string;
  name: string;
  description: string;
  category: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
}

export interface ComfyUIStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  current_step: number;
  total_steps: number;
  message?: string;
  result?: {
    images: string[];
    metadata: Record<string, any>;
  };
}

export interface ComfyUIGenerationRequest {
  workflow: string;
  inputs: Record<string, any>;
  priority?: number;
}

/**
 * Get available ComfyUI workflows
 */
export async function getAvailableWorkflows(): Promise<ComfyUIWorkflow[]> {
  try {
    const response = await fetch(`${COMFYUI_BASE_URL}/workflows`);
    if (!response.ok) {
      throw new Error(`Failed to fetch workflows: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching ComfyUI workflows:', error);
    return [];
  }
}

/**
 * Generate image using ComfyUI
 */
export async function generateImage(
  workflowName: string,
  inputs: Record<string, any>
): Promise<{ promptId: string; status: string }> {
  try {
    const response = await fetch(`${COMFYUI_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow: workflowName,
        inputs,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate image: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

/**
 * Get workflow status
 */
export async function getWorkflowStatus(promptId: string): Promise<ComfyUIStatus> {
  try {
    const response = await fetch(`${COMFYUI_BASE_URL}/status/${promptId}`);
    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting workflow status:', error);
    throw error;
  }
}

/**
 * Download generated image
 */
export async function downloadImage(imageUrl: string): Promise<Blob> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return await response.blob();
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

/**
 * Get ComfyUI system status
 */
export async function getSystemStatus(): Promise<{
  status: 'online' | 'offline';
  version: string;
  uptime: number;
}> {
  try {
    const response = await fetch(`${COMFYUI_BASE_URL}/status`);
    if (!response.ok) {
      throw new Error(`Failed to get system status: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting system status:', error);
    return {
      status: 'offline',
      version: 'unknown',
      uptime: 0,
    };
  }
}
