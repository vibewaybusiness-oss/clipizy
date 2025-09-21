import { VideoProject, ExportFormat } from '../types';

export interface RunPodConfig {
  apiKey: string;
  endpoint: string;
  model: string;
}

export class RunPodVideoProcessor {
  private config: RunPodConfig;

  constructor(config: RunPodConfig) {
    this.config = config;
  }

  // Generate video using RunPod's AI models
  async generateVideo(prompt: string, project: VideoProject): Promise<string> {
    const response = await fetch(`${this.config.endpoint}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: prompt,
        duration: project.duration,
        resolution: project.settings.resolution,
        frameRate: project.settings.frameRate,
        style: 'cinematic'
      })
    });

    if (!response.ok) {
      throw new Error(`RunPod API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.videoUrl;
  }

  // Process video with effects
  async processVideo(videoUrl: string, effects: any[]): Promise<string> {
    const response = await fetch(`${this.config.endpoint}/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoUrl: videoUrl,
        effects: effects
      })
    });

    if (!response.ok) {
      throw new Error(`RunPod processing error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.processedVideoUrl;
  }

  // Export video in specified format
  async exportVideo(project: VideoProject, format: ExportFormat): Promise<string> {
    const response = await fetch(`${this.config.endpoint}/export`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project: project,
        format: format
      })
    });

    if (!response.ok) {
      throw new Error(`RunPod export error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.exportUrl;
  }

  // Check processing status
  async getStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    result?: string;
    error?: string;
  }> {
    const response = await fetch(`${this.config.endpoint}/status/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`RunPod status error: ${response.statusText}`);
    }

    return response.json();
  }
}

// Integration with existing RunPod API
export function createRunPodIntegration() {
  return new RunPodVideoProcessor({
    apiKey: process.env.RUNPOD_API_KEY || '',
    endpoint: process.env.RUNPOD_ENDPOINT || 'https://api.runpod.ai/v1',
    model: 'flux-video'
  });
}
