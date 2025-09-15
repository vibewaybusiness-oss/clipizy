import { VideoProject } from '../types';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export class OllamaVideoProcessor {
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  // Generate video description from audio
  async analyzeAudio(audioUrl: string): Promise<{
    description: string;
    mood: string;
    tempo: string;
    genre: string;
    scenes: Array<{
      startTime: number;
      endTime: number;
      description: string;
    }>;
  }> {
    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: `Analyze this audio file and provide a detailed description for video generation. 
                 Audio URL: ${audioUrl}
                 
                 Please provide:
                 1. A general description of the audio
                 2. The mood/atmosphere
                 3. The tempo (slow, medium, fast)
                 4. The genre (electronic, rock, classical, etc.)
                 5. Scene breakdown with timestamps and descriptions
                 
                 Format your response as JSON.`,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.response);
  }

  // Generate video prompts from project
  async generateVideoPrompts(project: VideoProject): Promise<{
    mainPrompt: string;
    scenePrompts: string[];
    stylePrompts: string[];
  }> {
    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: `Generate video prompts for this project:
                 Project: ${project.name}
                 Duration: ${project.duration} seconds
                 Resolution: ${project.settings.resolution.width}x${project.settings.resolution.height}
                 
                 Please provide:
                 1. A main video prompt
                 2. Scene-specific prompts
                 3. Style and effect prompts
                 
                 Format your response as JSON.`,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.response);
  }

  // Generate effects descriptions
  async generateEffects(project: VideoProject): Promise<Array<{
    name: string;
    type: string;
    parameters: Record<string, any>;
    description: string;
  }>> {
    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: `Suggest video effects for this project:
                 Project: ${project.name}
                 Duration: ${project.duration} seconds
                 Clips: ${project.clips.length}
                 
                 Please suggest appropriate effects with parameters.
                 Format your response as JSON array.`,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.response);
  }

  // Generate transitions
  async generateTransitions(project: VideoProject): Promise<Array<{
    name: string;
    type: string;
    duration: number;
    parameters: Record<string, any>;
  }>> {
    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: `Suggest transitions for this project:
                 Project: ${project.name}
                 Duration: ${project.duration} seconds
                 Clips: ${project.clips.length}
                 
                 Please suggest appropriate transitions.
                 Format your response as JSON array.`,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.response);
  }

  // Optimize project settings
  async optimizeProject(project: VideoProject): Promise<{
    suggestedResolution: { width: number; height: number; name: string };
    suggestedFrameRate: number;
    suggestedQuality: string;
    optimizations: string[];
  }> {
    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: `Optimize this video project settings:
                 Project: ${project.name}
                 Current Resolution: ${project.settings.resolution.width}x${project.settings.resolution.height}
                 Current Frame Rate: ${project.settings.frameRate}
                 Duration: ${project.duration} seconds
                 
                 Please suggest optimizations for better performance and quality.
                 Format your response as JSON.`,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.response);
  }
}

// Integration with existing Ollama setup
export function createOllamaIntegration() {
  return new OllamaVideoProcessor({
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.1'
  });
}
