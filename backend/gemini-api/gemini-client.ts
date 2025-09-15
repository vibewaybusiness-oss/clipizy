import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface GeminiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface GenerateRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface GenerateResponse {
  success: boolean;
  data?: {
    response: string;
    model: string;
    prompt: string;
  };
  error?: string;
}

export class GeminiClient {
  private config: GeminiConfig;
  private currentPod: { id: string; ip: string; port: number } | null = null;

  constructor(config: GeminiConfig) {
    this.config = {
      model: 'gemini-1.5-flash',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      ...config
    };
  }

  async setPod(podId: string): Promise<GeminiResponse> {
    try {
      // For Gemini API, we don't need a pod - it's cloud-based
      // But we'll store the pod info for compatibility
      this.currentPod = {
        id: podId,
        ip: 'cloud',
        port: 443
      };

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getCurrentPod(): { id: string; ip: string; port: number } | null {
    return this.currentPod;
  }

  async getModels(): Promise<GeminiResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter for Gemini models
      const geminiModels = data.models?.filter((model: any) => 
        model.name?.includes('gemini')
      ) || [];

      return {
        success: true,
        data: geminiModels.map((model: any) => ({
          name: model.name,
          model: model.name,
          description: model.description || 'Gemini model'
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      const model = request.model || this.config.model;
      const maxTokens = request.maxTokens || 1000;
      const temperature = request.temperature || 0.7;

      const response = await fetch(`${this.config.baseUrl}/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.config.apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: request.prompt
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: temperature
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response generated');
      }

      const generatedText = data.candidates[0].content.parts[0].text;

      return {
        success: true,
        data: {
          response: generatedText,
          model: model,
          prompt: request.prompt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkHealth(): Promise<GeminiResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: { status: 'healthy', model: this.config.model }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Create a singleton instance
export const geminiClient = new GeminiClient({
  apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here'
});
