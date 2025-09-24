import { BaseApiClient } from './base';
import { API_BASE_URL, API_PATHS } from './config';

export interface MusicClipProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  settings?: any;
  tracks?: any[];
}

export interface CreateMusicClipProjectRequest {
  name?: string;
  description?: string;
  settings?: any;
}

export interface UpdateMusicClipProjectRequest {
  name?: string;
  description?: string;
  settings?: any;
}

class MusicClipAPI extends BaseApiClient {
  constructor() {
    super(API_BASE_URL);
  }

  async getProjects(): Promise<MusicClipProject[]> {
    const response = await this.get<{ projects: MusicClipProject[] }>(API_PATHS.MUSIC_CLIP + '/projects');
    return response.projects || [];
  }

  async createProject(data: CreateMusicClipProjectRequest): Promise<MusicClipProject> {
    return this.post<MusicClipProject>(API_PATHS.MUSIC_CLIP + '/projects', data);
  }

  async getProject(projectId: string): Promise<MusicClipProject> {
    return this.get<MusicClipProject>(`${API_PATHS.MUSIC_CLIP}/projects/${projectId}`);
  }

  async updateProject(projectId: string, data: UpdateMusicClipProjectRequest): Promise<MusicClipProject> {
    return this.put<MusicClipProject>(`${API_PATHS.MUSIC_CLIP}/projects/${projectId}`, data);
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.delete<void>(`${API_PATHS.MUSIC_CLIP}/projects/${projectId}`);
  }

  async resetProjects(): Promise<void> {
    return this.delete<void>(`${API_PATHS.MUSIC_CLIP}/projects`);
  }

  async getProjectScript(projectId: string): Promise<any> {
    try {
      return await this.get<any>(`${API_PATHS.MUSIC_CLIP}/projects/${projectId}/script`);
    } catch (error) {
      // Handle network errors gracefully - don't throw the error
      console.warn('Failed to get project script due to network error:', error);
      // Return empty script to prevent the error from propagating
      return { steps: { music: { settings: {} } } };
    }
  }

  async updateProjectSettings(projectId: string, settings: any): Promise<any> {
    try {
      // Check if user is authenticated before making API call
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) {
        console.log('User not authenticated, returning mock response for project settings update');
        return { success: false, error: 'Authentication required' };
      }

      const requestBody = { projectId, ...settings };
      console.log('Updating project settings:', { projectId, settings, requestBody });
      const result = await this.post<any>(`${API_PATHS.MUSIC_CLIP}/projects/${projectId}/settings`, requestBody);
      console.log('Project settings update result:', result);
      return result;
    } catch (error) {
      // Handle network errors gracefully - don't throw the error
      console.warn('Failed to update project settings due to network error:', error);
      console.warn('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        projectId,
        settings
      });
      // Return a mock response to prevent the error from propagating
      return { success: false, error: 'Network error' };
    }
  }

  async getProjectTracks(projectId: string): Promise<any[]> {
    try {
      const response = await this.get<{ tracks: any[] }>(`${API_PATHS.MUSIC_CLIP}/projects/${projectId}/tracks`);
      return response.tracks || [];
    } catch (error) {
      // Handle network errors gracefully - don't throw the error
      console.warn('Failed to get project tracks due to network error:', error);
      // Return empty tracks array to prevent the error from propagating
      return [];
    }
  }

  async uploadTrack(projectId: string, file: File, additionalData?: Record<string, any>): Promise<any> {
    const data = { projectId, ...additionalData };
    return this.uploadFile<any>(`${API_PATHS.MUSIC_CLIP}/upload-track`, file, data);
  }

  async getProjectAnalysis(projectId: string): Promise<any> {
    return this.get<any>(`${API_PATHS.MUSIC_CLIP}/projects/${projectId}/analysis`);
  }

  async updateProjectAnalysis(projectId: string, analysisData: any): Promise<any> {
    return this.put<any>(`${API_PATHS.MUSIC_CLIP}/projects/${projectId}/analysis`, analysisData);
  }

  async updateProjectScript(projectId: string, script: any): Promise<any> {
    return this.put<any>(`${API_PATHS.MUSIC_CLIP}/projects/${projectId}/script`, script);
  }

  async autoSave(projectId: string, data: any): Promise<void> {
    return this.post<void>(`${API_PATHS.MUSIC_CLIP}/projects/${projectId}/auto-save`, data);
  }
}

export const projectsAPI = new MusicClipAPI();
export const musicClipAPI = new MusicClipAPI();
