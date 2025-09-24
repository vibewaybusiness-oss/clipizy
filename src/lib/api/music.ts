import { BaseApiClient } from './base';
import type { MusicTrack } from '@/types/domains';

export interface MusicAnalysisResult {
  trackId: string;
  analysis: {
    duration: number;
    tempo: number;
    segments_sec: number[];
    beat_times_sec: number[];
    downbeats_sec: number[];
    debug: {
      method: string;
      num_segments: number;
      segment_lengths: number[];
    };
    title: string;
    audio_features: {
      duration: number;
      tempo: number;
      spectral_centroid: number;
      rms_energy: number;
      harmonic_ratio: number;
      onset_rate: number;
    };
    music_descriptors: string[];
    segments: Array<{
      segment_index: number;
      start_time: number;
      end_time: number;
      duration: number;
      features: {
        duration: number;
        tempo: number;
        spectral_centroid: number;
        rms_energy: number;
        harmonic_ratio: number;
        onset_rate: number;
        start_time: number;
        end_time: number;
      };
      descriptors: string[];
    }>;
    segment_analysis: Array<{
      segment_index: number;
      start_time: number;
      end_time: number;
      duration: number;
      features: {
        duration: number;
        tempo: number;
        spectral_centroid: number;
        rms_energy: number;
        harmonic_ratio: number;
        onset_rate: number;
        start_time: number;
        end_time: number;
      };
      descriptors: string[];
    }>;
  };
  error?: string;
}

export class MusicService extends BaseApiClient {
  constructor() {
    super('/api');
  }

  // TRACK MANAGEMENT
  async getTracks(projectId: string): Promise<MusicTrack[]> {
    return this.get<MusicTrack[]>(`/music-clip/projects/${projectId}/tracks`);
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
  ): Promise<MusicTrack> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId); // Add projectId to form data
    formData.append('ai_generated', String(options.ai_generated || false));
    formData.append('instrumental', String(options.instrumental || false));

    if (options.prompt) formData.append('prompt', options.prompt);
    if (options.genre) formData.append('genre', options.genre);
    if (options.video_description) formData.append('video_description', options.video_description);

    return this.request<MusicTrack>('/music-clip/upload-track', {
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
  ): Promise<MusicTrack[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    // Don't append projectId to form data since it's in the URL path
    if (options.ai_generated !== undefined) formData.append('ai_generated', options.ai_generated.toString());
    if (options.prompt) formData.append('prompt', options.prompt);
    if (options.genre) formData.append('genre', options.genre);
    if (options.instrumental !== undefined) formData.append('instrumental', options.instrumental.toString());
    if (options.video_description) formData.append('video_description', options.video_description);

    return this.request<MusicTrack[]>(`/music-clip/projects/${projectId}/upload-tracks-batch`, {
      method: 'POST',
      body: formData,
    });
  }

  async deleteTrack(projectId: string, trackId: string): Promise<void> {
    return this.delete<void>(`/music-clip/projects/${projectId}/tracks/${trackId}`);
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
    return this.patch(`/music-clip/projects/${projectId}/tracks/${trackId}`, updates);
  }

  async getTrackUrl(projectId: string, trackId: string): Promise<{ url: string }> {
    return this.get(`/music-clip/projects/${projectId}/tracks/${trackId}/url`);
  }

  // MUSIC GENERATION
  async generateMusic(
    prompt: string, 
    settings: {
      duration: number;
      isInstrumental: boolean;
      genre?: string;
    }
  ): Promise<MusicTrack> {
    return this.post<MusicTrack>('/music-clip/generate', {
      prompt,
      ...settings,
    });
  }

  // MUSIC ANALYSIS
  async analyzeTrack(track: MusicTrack): Promise<MusicAnalysisResult> {
    try {
      // If we have a track ID, use the backend analysis endpoint directly
      if (track.id) {
        console.log(`Analyzing track by ID: ${track.id}`);
        return this.analyzeTrackById(track.id);
      }

      // Check if this is a local file path (from backend) but not a mock path
      // Only treat as local path if it's an actual local path, not an S3 URL
      if (track.url && track.url.startsWith('/') && !track.url.includes('/mock/') && !track.url.includes('localhost:9000')) {
        console.log(`Analyzing local file path: ${track.url}`);
        return this.analyzeTrackByPath(track);
      }

      // If this is an S3 URL, we need to extract the file path and use the backend
      if (track.url && (track.url.includes('localhost:9000') || track.url.includes('X-Amz-Algorithm'))) {
        console.log(`Analyzing S3 URL: ${track.url}`);
        // Extract the file path from the S3 URL
        const urlParts = track.url.split('?')[0]; // Remove query parameters
        // Extract just the filename from the URL
        const filename = urlParts.split('/').pop();
        if (filename && filename.endsWith('.wav')) {
          // Use the original path structure that was passed in
          const originalPath = track.url.includes('/tracks/') ? `/tracks/${filename}` : `/music/${filename}`;
          console.log(`Extracted file path: ${originalPath}`);
          const trackWithPath = { ...track, url: originalPath };
          return this.analyzeTrackByPath(trackWithPath);
        } else {
          console.warn(`Could not extract filename from S3 URL: ${track.url}`);
          // Fall back to mock analysis
          return this.generateMockAnalysis(track, 's3_url_parse_error');
        }
      }

      let file: File;

      if (!track.file || !(track.file instanceof Blob)) {
        if (!track.url) {
          throw new Error('Neither valid file nor URL available for analysis');
        }

        if (track.url.startsWith('blob:')) {
          return this.generateMockAnalysis(track, 'mock_blob_url');
        }

        if (track.url.includes('/mock/')) {
          return this.generateMockAnalysis(track, 'mock_file_path');
        }

        let response: Response;
        try {
          response = await fetch(track.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch audio from URL: ${response.statusText}`);
          }
        } catch (error) {
          console.error('Network error fetching audio URL:', error);
          throw new Error(`Network error fetching audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        const blob = await response.blob();
        file = new File([blob], track.name, { type: blob.type || 'audio/wav' });
      } else {
        file = track.file;
      }

      const formData = new FormData();
      formData.append('file', file);

      let response: Response;
      try {
        response = await fetch('/api/music-analysis/analyze/comprehensive', {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: formData,
          credentials: 'include',
          keepalive: true,
        });
      } catch (error) {
        console.error('Network error during music analysis:', error);
        throw new Error(`Network error during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Unknown error' };
        }
        throw new Error(`Analysis failed: ${errorData.error || response.statusText}`);
      }

      const analysis = await response.json();
      return this.transformAnalysisResult(track, analysis);
    } catch (error) {
      console.error(`Failed to analyze track ${track.id}:`, error);
      return this.generateMockAnalysis(track, 'mock_error_fallback');
    }
  }

  // Analyze track by track ID
  async analyzeTrackById(trackId: string): Promise<MusicAnalysisResult> {
    try {
      console.log(`Analyzing track by ID: ${trackId}`);
      
      const response = await fetch(`/api/analysis/music/${trackId}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        keepalive: true,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Unknown error' };
        }
        
        // If track not found, return a mock analysis instead of throwing
        if (response.status === 404) {
          console.warn(`Track ${trackId} not found, using mock analysis:`, errorData);
          return this.generateMockAnalysis({ id: trackId } as MusicTrack, 'track_not_found');
        }
        
        throw new Error(`Analysis failed: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      return this.transformAnalysisResult({ id: trackId } as MusicTrack, result.analysis);
    } catch (error) {
      console.error(`Failed to analyze track ${trackId}:`, error);
      return this.generateMockAnalysis({ id: trackId } as MusicTrack, 'track_id_analysis_error');
    }
  }

  // Analyze track by server file path
  async analyzeTrackByPath(track: MusicTrack): Promise<MusicAnalysisResult> {
    try {
      console.log(`Analyzing track by path: ${track.url}`);
      
      const response = await fetch(`/api/music-analysis/analyze/file-path?file_path=${encodeURIComponent(track.url)}&analysis_type=comprehensive`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        keepalive: true,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Unknown error' };
        }
        
        // If file not found, return a mock analysis instead of throwing
        if (response.status === 404) {
          console.warn(`File not found for track ${track.id}, using mock analysis:`, errorData);
          return this.generateMockAnalysis(track, 'file_not_found');
        }
        
        throw new Error(`Analysis failed: ${errorData.error || response.statusText}`);
      }

      const analysis = await response.json();
      return this.transformAnalysisResult(track, analysis);
    } catch (error) {
      console.error(`Failed to analyze track by path ${track.id}:`, error);
      // Return mock analysis instead of throwing to prevent the entire process from failing
      return this.generateMockAnalysis(track, 'analysis_error');
    }
  }

  async analyzeTrackComprehensive(projectId: string, trackId: string): Promise<MusicAnalysisResult> {
    return this.post<MusicAnalysisResult>(
      '/music-analysis/analyze/comprehensive',
      { project_id: projectId, track_id: trackId }
    );
  }

  async analyzeTracksInParallel(tracks: MusicTrack[]): Promise<MusicAnalysisResult[]> {
    console.log('=== MUSIC SERVICE: analyzeTracksInParallel ===');
    console.log('Analyzing tracks:', tracks.map(t => ({ id: t.id, name: t.name, hasFile: !!t.file, hasUrl: !!t.url })));
    
    const analysisPromises = tracks.map((track, index) => {
      const delay = index * 100;
      return new Promise<MusicAnalysisResult>((resolve, reject) => {
        setTimeout(() => {
          console.log(`Starting analysis for track ${track.id} (${track.name})`);
          this.analyzeTrack(track)
            .then(resolve)
            .catch(reject);
        }, delay);
      });
    });

    const results = await Promise.allSettled(analysisPromises);
    const successfulResults: MusicAnalysisResult[] = [];
    const failedResults: MusicAnalysisResult[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
      } else {
        failedResults.push({
          trackId: tracks[index].id,
          error: result.reason.message || 'Analysis failed'
        } as MusicAnalysisResult);
      }
    });

    return [...successfulResults, ...failedResults];
  }

  // HELPER METHODS
  private generateMockBeatTimes(duration: number, tempo: number): number[] {
    const beatInterval = 60 / tempo;
    const beats: number[] = [];
    for (let time = 0; time < duration; time += beatInterval) {
      beats.push(time);
    }
    return beats;
  }

  private generateMockDownbeats(duration: number, tempo: number): number[] {
    const beatInterval = 60 / tempo;
    const downbeats: number[] = [];
    for (let time = 0; time < duration; time += beatInterval * 4) {
      downbeats.push(time);
    }
    return downbeats;
  }

  private generateMockAnalysis(track: MusicTrack, method: string): MusicAnalysisResult {
    const duration = track.duration || 30;
    const tempo = 120;

    return {
      trackId: track.id,
      analysis: {
        duration,
        tempo,
        segments_sec: [0, duration],
        beat_times_sec: this.generateMockBeatTimes(duration, tempo),
        downbeats_sec: this.generateMockDownbeats(duration, tempo),
        debug: {
          method,
          num_segments: 1,
          segment_lengths: [duration],
          reason: method.includes('blob') ? 'Blob URL detected - using mock data' : 'Analysis failed - using mock data'
        },
        title: track.name,
        audio_features: {
          duration,
          tempo,
          spectral_centroid: 2000 + Math.random() * 1000,
          rms_energy: 0.3 + Math.random() * 0.4,
          harmonic_ratio: 0.5 + Math.random() * 0.3,
          onset_rate: 0.1 + Math.random() * 0.2
        },
        music_descriptors: [
          `Mock analysis - ${method}`,
          'Generated track - analysis unavailable',
          'Duration-based estimation'
        ],
        segments: [{
          segment_index: 0,
          start_time: 0,
          end_time: duration,
          duration,
          features: {
            duration,
            tempo,
            spectral_centroid: 2000 + Math.random() * 1000,
            rms_energy: 0.3 + Math.random() * 0.4,
            harmonic_ratio: 0.5 + Math.random() * 0.3,
            onset_rate: 0.1 + Math.random() * 0.2,
            start_time: 0,
            end_time: duration
          },
          descriptors: ['mock', method, 'generated']
        }],
        segment_analysis: [{
          segment_index: 0,
          start_time: 0,
          end_time: duration,
          duration,
          features: {
            duration,
            tempo,
            spectral_centroid: 2000 + Math.random() * 1000,
            rms_energy: 0.3 + Math.random() * 0.4,
            harmonic_ratio: 0.5 + Math.random() * 0.3,
            onset_rate: 0.1 + Math.random() * 0.2,
            start_time: 0,
            end_time: duration
          },
          descriptors: ['mock', method, 'generated']
        }],
      },
    };
  }

  private transformAnalysisResult(track: MusicTrack, analysis: any): MusicAnalysisResult {
    return {
      trackId: track.id,
      analysis: {
        duration: analysis.duration || 0,
        tempo: analysis.tempo || 120,
        segments_sec: analysis.segments_sec || [0, analysis.duration || 0],
        beat_times_sec: analysis.beat_times_sec || [],
        downbeats_sec: analysis.downbeats_sec || [],
        debug: analysis.debug || {
          method: "comprehensive",
          num_segments: 1,
          segment_lengths: [analysis.duration || 0]
        },
        title: analysis.title || track.name,
        audio_features: analysis.audio_features || {
          duration: analysis.duration || 0,
          tempo: analysis.tempo || 120,
          spectral_centroid: 0,
          rms_energy: 0,
          harmonic_ratio: 0,
          onset_rate: 0
        },
        music_descriptors: analysis.music_descriptors || [],
        segments: analysis.segments || [],
        segment_analysis: analysis.segment_analysis || [],
      },
    };
  }
}

export const musicService = new MusicService();
