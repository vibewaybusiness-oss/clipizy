import { StableAudio2Request, StableAudio2Response, StableAudio2Config } from './types';

export class StableAudio2Client {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: StableAudio2Config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.stability.ai/v2beta/audio/stable-audio-2';
  }

  async textToAudio(request: StableAudio2Request): Promise<StableAudio2Response> {
    try {
      const formData = new FormData();
      formData.append('prompt', request.prompt);
      formData.append('output_format', request.output_format || 'mp3');
      formData.append('duration', (request.duration || 20).toString());
      formData.append('model', request.model || 'stable-audio-2.5');

      const response = await fetch(`${this.baseUrl}/text-to-audio`, {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${this.apiKey}`,
          'accept': 'audio/*',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API request failed: ${response.status} ${response.statusText}. ${errorText}`,
        };
      }

      const audioBuffer = await response.arrayBuffer();
      
      return {
        success: true,
        audio: Buffer.from(audioBuffer),
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async textToAudioAndSave(request: StableAudio2Request, outputPath: string): Promise<StableAudio2Response> {
    const result = await this.textToAudio(request);
    
    if (result.success && result.audio) {
      try {
        const fs = await import('fs/promises');
        await fs.writeFile(outputPath, result.audio);
        return {
          success: true,
          audio: result.audio,
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to save audio file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }
    
    return result;
  }
}
