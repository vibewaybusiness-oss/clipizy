import { BaseApiClient } from './base';
import { getBackendUrl } from '@/lib/config';

const API_BASE_URL = getBackendUrl();

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
    const response = await this.get<{ projects: MusicClipProject[] }>('/music-clip/projects');
    return response.projects || [];
  }

  async createProject(data: CreateMusicClipProjectRequest): Promise<MusicClipProject> {
    return this.post<MusicClipProject>('/music-clip/projects', data);
  }

  async getProject(projectId: string): Promise<MusicClipProject> {
    return this.get<MusicClipProject>(`/music-clip/projects/${projectId}`);
  }

  async updateProject(projectId: string, data: UpdateMusicClipProjectRequest): Promise<MusicClipProject> {
    return this.put<MusicClipProject>(`/music-clip/projects/${projectId}`, data);
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.delete<void>(`/music-clip/projects/${projectId}`);
  }

  async resetProjects(): Promise<void> {
    return this.delete<void>('/music-clip/projects');
  }

  async getProjectScript(projectId: string): Promise<any> {
    return this.get<any>(`/music-clip/projects/${projectId}/script`);
  }

  async updateProjectSettings(projectId: string, settings: any): Promise<any> {
    return this.post<any>(`/music-clip/projects/${projectId}/settings`, settings);
  }

  async getProjectTracks(projectId: string): Promise<any[]> {
    const response = await this.get<{ tracks: any[] }>(`/music-clip/projects/${projectId}/tracks`);
    return response.tracks || [];
  }

  async uploadTrack(projectId: string, file: File, additionalData?: Record<string, any>): Promise<any> {
    return this.uploadFile<any>(`/music-clip/projects/${projectId}/upload-track`, file, additionalData);
  }

  async getProjectAnalysis(projectId: string): Promise<any> {
    return this.get<any>(`/music-clip/projects/${projectId}/analysis`);
  }

  async updateProjectAnalysis(projectId: string, analysisData: any): Promise<any> {
    return this.put<any>(`/music-clip/projects/${projectId}/analysis`, analysisData);
  }

  async updateProjectScript(projectId: string, script: any): Promise<any> {
    return this.put<any>(`/music-clip/projects/${projectId}/script`, script);
  }

  async autoSave(projectId: string, data: any): Promise<void> {
    return this.post<void>(`/music-clip/projects/${projectId}/auto-save`, data);
  }
}

export const projectsAPI = new MusicClipAPI();
export const musicClipAPI = new MusicClipAPI();
