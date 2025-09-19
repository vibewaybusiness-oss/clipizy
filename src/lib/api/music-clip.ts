interface MusicTrack {
  id: string;
  file_path: string;
  ai_generated: boolean;
  prompt?: string;
  genre?: string;
  instrumental: boolean;
  video_description?: string;
  metadata: {
    duration?: number;
    format?: string;
    sample_rate?: number;
    channels?: number;
    bitrate?: number;
    size_mb?: number;
  };
  status: string;
  created_at: string;
}

interface ProjectSettings {
  videoType: string;
  budget: number[];
  user_price?: number;
  videoStyle: string;
  animationStyle: string;
  createIndividualVideos: boolean;
  createCompilation: boolean;
  useSameVideoForAll: boolean;
}

interface ProjectScript {
  steps: {
    music: {
      tracks: MusicTrack[];
      settings: ProjectSettings;
    };
    analysis: Record<string, any>;
    visuals: Record<string, any>;
    export: Record<string, any>;
  };
}

export class MusicClipAPI {
  private baseUrl = '/api/music-clip';

  async createProject(name?: string, description?: string): Promise<{ project_id: string; name: string; description?: string; status: string; created_at: string }> {
    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, description }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to create project: ${errorData.error || response.statusText}`);
    }

    return response.json();
  }

  async uploadTrack(
    projectId: string,
    file: File,
    options: {
      ai_generated?: boolean;
      prompt?: string;
      genre?: string;
      instrumental?: boolean;
      video_description?: string;
    } = {}
  ): Promise<{
    track_id: string;
    file_path: string;
    metadata: any;
    ai_generated: boolean;
    prompt?: string;
    genre?: string;
    instrumental: boolean;
    video_description?: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ai_generated', String(options.ai_generated || false));
    formData.append('instrumental', String(options.instrumental || false));
    
    if (options.prompt) formData.append('prompt', options.prompt);
    if (options.genre) formData.append('genre', options.genre);
    if (options.video_description) formData.append('video_description', options.video_description);

    const response = await fetch(`${this.baseUrl}/projects/${projectId}/upload-track`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to upload track: ${errorData.error || response.statusText}`);
    }

    return response.json();
  }

  async uploadTracksBatch(
    projectId: string,
    files: File[],
    options: {
      ai_generated?: boolean;
      prompt?: string;
      genre?: string;
      instrumental?: boolean;
      video_description?: string;
    } = {}
  ): Promise<{
    total_files: number;
    successful_uploads: number;
    failed_uploads: number;
    processing_time_seconds: number;
    results: Array<{
      success: boolean;
      filename: string;
      track_id?: string;
      file_path?: string;
      metadata?: any;
      error?: string;
    }>;
    successful_tracks: any[];
    failed_tracks: any[];
  }> {
    const formData = new FormData();
    
    // Append all files
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Append options
    if (options.ai_generated !== undefined) formData.append('ai_generated', options.ai_generated.toString());
    if (options.prompt) formData.append('prompt', options.prompt);
    if (options.genre) formData.append('genre', options.genre);
    if (options.instrumental !== undefined) formData.append('instrumental', options.instrumental.toString());
    if (options.video_description) formData.append('video_description', options.video_description);

    const response = await fetch(`${this.baseUrl}/projects/${projectId}/upload-tracks-batch`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to upload tracks batch: ${errorData.error || response.statusText}`);
    }

    return response.json();
  }

  async updateProjectSettings(
    projectId: string,
    settings: Partial<ProjectSettings>
  ): Promise<{ project_id: string; settings: ProjectSettings }> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to update project settings: ${errorData.error || response.statusText}`);
    }

    return response.json();
  }

  async getProjectScript(projectId: string): Promise<ProjectScript> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/script`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to get project script: ${errorData.error || response.statusText}`);
    }

    return response.json();
  }

  async getProjectTracks(projectId: string): Promise<{ project_id: string; tracks: MusicTrack[] }> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/tracks`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to get project tracks: ${errorData.error || response.statusText}`);
    }

    return response.json();
  }

  async updateTrack(
    projectId: string,
    trackId: string,
    updates: {
      video_description?: string;
      genre?: string;
      prompt?: string;
      instrumental?: boolean;
    }
  ): Promise<{
    track_id: string;
    video_description?: string;
    genre?: string;
    prompt?: string;
    instrumental?: boolean;
  }> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/tracks/${trackId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to update track: ${errorData.error || response.statusText}`);
    }

    return response.json();
  }

  async getAllProjects(): Promise<{
    projects: Array<{
      project_id: string;
      name: string;
      description?: string;
      status: string;
      created_at: string;
      tracks?: Array<{
        id: string;
        name: string;
        duration: number;
        created_at: string;
      }>;
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/projects`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to get projects: ${errorData.error || response.statusText}`);
    }

    return response.json();
  }

  async resetProjects(): Promise<{
    message: string;
    deleted_count: number;
    user_id: string;
  }> {
    const response = await fetch(`${this.baseUrl}/projects/reset`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to reset projects: ${errorData.error || response.statusText}`);
    }

    return response.json();
  }

  async getTrackUrl(projectId: string, trackId: string): Promise<{ url: string }> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/tracks/${trackId}/url`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to get track URL: ${errorData.error || response.statusText}`);
    }

    return response.json();
  }

  async deleteProject(projectId: string): Promise<{ message: string; project_id: string }> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to delete project: ${errorData.error || response.statusText}`);
    }

    return response.json();
  }
}

export const musicClipAPI = new MusicClipAPI();
