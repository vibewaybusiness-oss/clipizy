import { BaseApiClient } from './base';
import { API_BASE_URL, API_PATHS } from './config';
import type { MusicTrack } from '@/types/domains';

export interface Project {
  id: string;
  name: string | null;
  type: 'music-clip' | 'video-clip' | 'short-clip';
  status: 'created' | 'uploading' | 'analyzing' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'draft';
  created_at: string;
  updated_at: string;
  description: string | null;
  user_id: string;
}

export interface CreateProjectRequest {
  name?: string;
  type: 'music-clip' | 'video-clip' | 'short-clip';
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface ProjectSettings {
  videoType: string;
  budget: number[];
  user_price?: number;
  videoStyle: string;
  animationStyle: string;
  createIndividualVideos: boolean;
  createCompilation: boolean;
  useSameVideoForAll: boolean;
}

export interface ProjectScript {
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

export interface AutoSaveData {
  projectId: string;
  musicClipData: any;
  tracksData: any;
  analysisData: any;
  timestamp: number;
}

export class ProjectsService extends BaseApiClient {
  private static instance: ProjectsService;
  private saveQueue: Map<string, AutoSaveData> = new Map();
  private saveTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private isOnline: boolean = typeof window !== 'undefined' ? navigator.onLine : true;
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;
  private saveDelay = 5000; // Increased from 2000ms to 5000ms to reduce API calls

  constructor() {
    super(API_BASE_URL);
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
    }
  }

  public static getInstance(): ProjectsService {
    if (!ProjectsService.instance) {
      ProjectsService.instance = new ProjectsService();
    }
    return ProjectsService.instance;
  }

  // PROJECT MANAGEMENT
  async getProjects(): Promise<Project[]> {
    return this.get<Project[]>(API_PATHS.MUSIC_CLIP + '/projects');
  }

  async getProject(projectId: string): Promise<Project> {
    return this.get<Project>(API_PATHS.MUSIC_CLIP + `/projects/${projectId}`);
  }

  async createProject(data: CreateProjectRequest): Promise<Project> {
    return this.post<Project>(API_PATHS.MUSIC_CLIP + '/projects', data);
  }

  async updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
    return this.put<Project>(API_PATHS.MUSIC_CLIP + `/projects/${id}`, data);
  }

  async deleteProject(id: string): Promise<void> {
    return this.delete<void>(API_PATHS.MUSIC_CLIP + `/projects/${id}`);
  }

  async getProjectStats(projectId: string): Promise<any> {
    return this.get<any>(API_PATHS.MUSIC_CLIP + `/projects/${projectId}/stats`);
  }

  // MUSIC CLIP SPECIFIC METHODS
  async createMusicClipProject(name?: string, description?: string): Promise<{ id: string; name: string; description?: string; status: string; created_at: string }> {
    return this.post(API_PATHS.MUSIC_CLIP + '/projects', { name, description });
  }

  async uploadTrackSimple(
    file: File,
    options: {
      projectId?: string;
      ai_generated?: boolean;
      prompt?: string;
      genre?: string;
      instrumental?: boolean;
      video_description?: string;
    } = {}
  ): Promise<{
    track_id: string;
    project_id: string;
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

    if (options.projectId) formData.append('project_id', options.projectId);
    if (options.prompt) formData.append('prompt', options.prompt);
    if (options.genre) formData.append('genre', options.genre);
    if (options.video_description) formData.append('video_description', options.video_description);

    return this.request(API_PATHS.MUSIC_CLIP + '/upload-track', {
      method: 'POST',
      body: formData,
    });
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

    return this.request(API_PATHS.MUSIC_CLIP + `/projects/${projectId}/upload-track`, {
      method: 'POST',
      body: formData,
    });
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
    files.forEach(file => formData.append('files', file));

    // Don't append projectId to form data since it's in the URL path
    if (options.ai_generated !== undefined) formData.append('ai_generated', options.ai_generated.toString());
    if (options.prompt) formData.append('prompt', options.prompt);
    if (options.genre) formData.append('genre', options.genre);
    if (options.instrumental !== undefined) formData.append('instrumental', options.instrumental.toString());
    if (options.video_description) formData.append('video_description', options.video_description);

    return this.request(API_PATHS.MUSIC_CLIP + `/projects/${projectId}/upload-tracks-batch`, {
      method: 'POST',
      body: formData,
    });
  }

  async updateProjectSettings(
    projectId: string,
    settings: Partial<ProjectSettings>
  ): Promise<{ id: string; settings: ProjectSettings }> {
    const requestBody = { projectId, ...settings };
    return this.post(API_PATHS.MUSIC_CLIP + '/project-settings', requestBody);
  }

  async getProjectScript(projectId: string): Promise<ProjectScript> {
    try {
      return await this.get(API_PATHS.MUSIC_CLIP + `/projects/${projectId}/script`);
    } catch (error) {
      // Handle network errors gracefully - don't throw the error
      console.warn('Failed to get project script due to network error:', error);
      return { steps: { music: { settings: null } } } as ProjectScript;
    }
  }

  async getProjectTracks(projectId: string): Promise<{ id: string; tracks: MusicTrack[] }> {
    try {
      return await this.get(API_PATHS.MUSIC_CLIP + `/projects/${projectId}/tracks`);
    } catch (error) {
      // Handle network errors gracefully - don't throw the error
      console.warn('Failed to get project tracks due to network error:', error);
      return { id: projectId, tracks: [] };
    }
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
    return this.patch(API_PATHS.MUSIC_CLIP + `/projects/${projectId}/tracks/${trackId}`, updates);
  }

  async getAllProjects(): Promise<{
    projects: Array<{
      id: string;
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
    return this.get(API_PATHS.MUSIC_CLIP + '/projects');
  }

  async resetProjects(): Promise<{
    message: string;
    deleted_count: number;
    user_id: string;
  }> {
    return this.delete(API_PATHS.MUSIC_CLIP + '/projects/reset');
  }

  async getTrackUrl(projectId: string, trackId: string): Promise<{ url: string }> {
    try {
      return await this.get(API_PATHS.MUSIC_CLIP + `/projects/${projectId}/tracks/${trackId}/url`);
    } catch (error) {
      // Handle network errors gracefully - don't throw the error
      console.warn('Failed to get track URL due to network error:', error);
      return { url: '' };
    }
  }

  async updateProjectAnalysis(projectId: string, analysisData: any): Promise<{ message: string; id: string }> {
    return this.put(API_PATHS.MUSIC_CLIP + `/projects/${projectId}/analysis`, analysisData);
  }

  async getProjectAnalysis(projectId: string): Promise<{ analysis: any }> {
    return this.get(API_PATHS.MUSIC_CLIP + `/projects/${projectId}/analysis`);
  }

  // AUTO-SAVE FUNCTIONALITY
  private setupEventListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSaveQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushAllSaves();
      }
    });

    window.addEventListener('beforeunload', () => {
      this.flushAllSaves();
    });

    setInterval(() => {
      this.flushAllSaves();
    }, 60000); // Increased from 30s to 60s to reduce API calls
  }

  public scheduleSave(projectId: string, data: Partial<AutoSaveData>) {
    const hasTracksToUpload = data.tracksData?.musicTracks?.some((track: any) =>
      track.file && track.file instanceof File && !track.uploaded
    );
    const hasOtherData = data.musicClipData || data.analysisData;

    if (!hasTracksToUpload && !hasOtherData) {
      return;
    }

    const existingTimeout = this.saveTimeouts.get(projectId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const currentData = this.saveQueue.get(projectId) || {
      projectId,
      musicClipData: null,
      tracksData: null,
      analysisData: null,
      timestamp: Date.now()
    };

    const updatedData = {
      ...currentData,
      ...data,
      timestamp: Date.now()
    };

    this.saveQueue.set(projectId, updatedData);

    const timeout = setTimeout(() => {
      this.saveToBackend(projectId, updatedData);
    }, this.saveDelay);

    this.saveTimeouts.set(projectId, timeout);
  }

  private async saveToBackend(projectId: string, data: AutoSaveData) {
    if (!this.isOnline) {
      return;
    }

    // Check if user is authenticated before saving
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      console.log('User not authenticated, skipping auto-save');
      return;
    }

    // Additional check: verify token is not expired
    try {
      if (token && typeof window !== 'undefined') {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        if (tokenData.exp && tokenData.exp < currentTime) {
          console.log('Token expired, skipping auto-save');
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          return;
        }
      }
    } catch (error) {
      console.log('Invalid token format, skipping auto-save');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      return;
    }

    try {
      if (data.musicClipData) {
        await this.saveMusicClipData(projectId, data.musicClipData);
      }

      if (data.tracksData) {
        await this.saveTracksData(projectId, data.tracksData);
      }

      if (data.analysisData) {
        await this.saveAnalysisData(projectId, data.analysisData);
      }

      this.saveQueue.delete(projectId);
      this.retryAttempts.delete(projectId);
    } catch (error) {
      console.error(`Auto-save failed for project ${projectId}:`, error);
      this.handleSaveError(projectId, data);
    }
  }

  private async saveMusicClipData(projectId: string, data: any) {
    if (data.settings) {
      await this.updateProjectSettings(projectId, data.settings);
    }
  }

  private async saveTracksData(projectId: string, data: any) {
    if (data.musicTracks && Array.isArray(data.musicTracks)) {
      const tracksToUpload = data.musicTracks.filter((track: any) =>
        track.file && track.file instanceof File && !track.uploaded
      );

      for (const track of tracksToUpload) {
        try {
          await this.uploadTrack(projectId, track.file, {
            ai_generated: track.ai_generated || false,
            prompt: track.prompt,
            genre: track.genre,
            instrumental: track.instrumental || false,
            video_description: track.video_description
          });
          track.uploaded = true;
        } catch (error) {
          console.error(`Failed to upload track ${track.id}:`, error);
        }
      }
    }
  }

  private async saveAnalysisData(projectId: string, data: any) {
    // Check if user is authenticated before saving analysis data
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      console.log('User not authenticated, skipping analysis data save');
      return;
    }
    
    // Additional check: verify token is not expired
    try {
      if (token && typeof window !== 'undefined') {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        if (tokenData.exp && tokenData.exp < currentTime) {
          console.log('Token expired, skipping analysis data save');
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          return;
        }
      }
    } catch (error) {
      console.log('Invalid token format, skipping analysis data save');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      return;
    }
    
    if (data.music && Object.keys(data.music).length > 0) {
      await this.updateProjectAnalysis(projectId, data);
    }
  }

  private handleSaveError(projectId: string, data: AutoSaveData) {
    const currentRetries = this.retryAttempts.get(projectId) || 0;

    if (currentRetries < this.maxRetries) {
      const retryDelay = Math.pow(2, currentRetries) * 1000;
      this.retryAttempts.set(projectId, currentRetries + 1);

      setTimeout(() => {
        this.saveToBackend(projectId, data);
      }, retryDelay);
    } else {
      this.retryAttempts.delete(projectId);
    }
  }

  private async processSaveQueue() {
    if (!this.isOnline) return;

    const promises = Array.from(this.saveQueue.entries()).map(([projectId, data]) =>
      this.saveToBackend(projectId, data)
    );

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error processing save queue:', error);
    }
  }

  public async flushAllSaves() {
    const promises = Array.from(this.saveQueue.entries()).map(([projectId, data]) =>
      this.saveToBackend(projectId, data)
    );

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error flushing saves:', error);
    }
  }

  public getQueueStatus() {
    return {
      queueSize: this.saveQueue.size,
      isOnline: this.isOnline,
      queuedProjects: Array.from(this.saveQueue.keys())
    };
  }
}

export const projectsService = ProjectsService.getInstance();
export const projectsAPI = projectsService;