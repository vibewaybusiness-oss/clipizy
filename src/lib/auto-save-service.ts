import { musicClipAPI } from './api/music-clip';
import { musicAnalysisAPI } from './api/music-analysis';

export interface AutoSaveData {
  projectId: string;
  musicClipData: any;
  tracksData: any;
  analysisData: any;
  timestamp: number;
}

export class AutoSaveService {
  private static instance: AutoSaveService;
  private saveQueue: Map<string, AutoSaveData> = new Map();
  private saveTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private isOnline: boolean = navigator.onLine;
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;
  private saveDelay = 2000; // 2 seconds delay for debouncing

  private constructor() {
    this.setupEventListeners();
  }

  public static getInstance(): AutoSaveService {
    if (!AutoSaveService.instance) {
      AutoSaveService.instance = new AutoSaveService();
    }
    return AutoSaveService.instance;
  }

  private setupEventListeners() {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSaveQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushAllSaves();
      }
    });

    // Page unload
    window.addEventListener('beforeunload', () => {
      this.flushAllSaves();
    });

    // Periodic save (every 30 seconds)
    setInterval(() => {
      this.flushAllSaves();
    }, 30000);
  }

  public scheduleSave(projectId: string, data: Partial<AutoSaveData>) {
    // Check if there's actually data that needs saving
    const hasTracksToUpload = data.tracksData?.musicTracks?.some((track: any) =>
      track.file && track.file instanceof File && !track.uploaded
    );
    const hasOtherData = data.musicClipData || data.analysisData;

    if (!hasTracksToUpload && !hasOtherData) {
      console.log('No data needs saving, skipping auto-save');
      return;
    }

    // Clear existing timeout for this project
    const existingTimeout = this.saveTimeouts.get(projectId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Update the save queue
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

    // Schedule the save
    const timeout = setTimeout(() => {
      this.saveToBackend(projectId, updatedData);
    }, this.saveDelay);

    this.saveTimeouts.set(projectId, timeout);
  }

  private async saveToBackend(projectId: string, data: AutoSaveData) {
    if (!this.isOnline) {
      console.log('Offline - queuing save for later');
      return;
    }

    try {
      // Save music clip data
      if (data.musicClipData) {
        await this.saveMusicClipData(projectId, data.musicClipData);
      }

      // Save tracks data
      if (data.tracksData) {
        await this.saveTracksData(projectId, data.tracksData);
      }

      // Save analysis data
      if (data.analysisData) {
        await this.saveAnalysisData(projectId, data.analysisData);
      }

      // Remove from queue on success
      this.saveQueue.delete(projectId);
      this.retryAttempts.delete(projectId);

      console.log(`Auto-save successful for project ${projectId}`);
    } catch (error) {
      console.error(`Auto-save failed for project ${projectId}:`, error);
      this.handleSaveError(projectId, data);
    }
  }

  private async saveMusicClipData(projectId: string, data: any) {
    try {
      // Update project settings if they exist
      if (data.settings) {
        await musicClipAPI.updateProjectSettings(projectId, data.settings);
      }

      // Update project script if it exists
      if (data.script) {
        await musicClipAPI.updateProjectScript(projectId, data.script);
      }
    } catch (error) {
      console.error('Failed to save music clip data:', error);
      throw error;
    }
  }

  private async saveTracksData(projectId: string, data: any) {
    try {
      // Only upload tracks that have actual File objects and haven't been uploaded
      if (data.musicTracks && Array.isArray(data.musicTracks)) {
        const tracksToUpload = data.musicTracks.filter((track: any) =>
          track.file && track.file instanceof File && !track.uploaded
        );

        if (tracksToUpload.length === 0) {
          console.log('No tracks need uploading');
          return;
        }

        console.log(`Found ${tracksToUpload.length} tracks to upload`);

        for (const track of tracksToUpload) {
          try {
            console.log(`Uploading track ${track.id} with file:`, track.file.name, track.file.type);
            await musicClipAPI.uploadTrack(projectId, track.file, {
              ai_generated: track.ai_generated || false,
              prompt: track.prompt,
              genre: track.genre,
              instrumental: track.instrumental || false,
              video_description: track.video_description
            });
            track.uploaded = true;
            console.log(`Successfully uploaded track ${track.id}`);
          } catch (error) {
            console.error(`Failed to upload track ${track.id}:`, error);
            // Don't throw here to prevent blocking other tracks
          }
        }
      }
    } catch (error) {
      console.error('Failed to save tracks data:', error);
      // Don't throw here to prevent blocking other data saves
    }
  }

  private async saveAnalysisData(projectId: string, data: any) {
    try {
      // Update project analysis if it exists
      if (data.music && Object.keys(data.music).length > 0) {
        await musicClipAPI.updateProjectAnalysis(projectId, data);
      }
    } catch (error) {
      console.error('Failed to save analysis data:', error);
      throw error;
    }
  }

  private handleSaveError(projectId: string, data: AutoSaveData) {
    const currentRetries = this.retryAttempts.get(projectId) || 0;

    if (currentRetries < this.maxRetries) {
      // Retry with exponential backoff
      const retryDelay = Math.pow(2, currentRetries) * 1000;
      this.retryAttempts.set(projectId, currentRetries + 1);

      setTimeout(() => {
        this.saveToBackend(projectId, data);
      }, retryDelay);
    } else {
      console.error(`Max retries reached for project ${projectId}, giving up`);
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

export const autoSaveService = AutoSaveService.getInstance();
