import type { MusicTrack } from '@/types/music-clip';

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

export class MusicAnalysisAPI {
  private baseUrl = '/api/music-analysis';

  async analyzeTrack(track: MusicTrack): Promise<MusicAnalysisResult> {
    try {
      if (!track.file) {
        throw new Error('Track file is required for analysis');
      }

      const formData = new FormData();
      formData.append('file', track.file);

      const response = await fetch(`${this.baseUrl}/analyze/comprehensive`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Analysis failed: ${errorData.error || response.statusText}`);
      }

      const analysis = await response.json();

      return {
        trackId: track.id,
        analysis: {
          duration: analysis.duration,
          tempo: analysis.tempo,
          segments_sec: analysis.segments_sec,
          beat_times_sec: analysis.beat_times_sec,
          downbeats_sec: analysis.downbeats_sec,
          debug: analysis.debug,
          title: analysis.title || track.name,
          audio_features: analysis.audio_features,
          music_descriptors: analysis.music_descriptors,
          segments: analysis.segments,
          segment_analysis: analysis.segment_analysis,
        },
      };
    } catch (error) {
      console.error(`Failed to analyze track ${track.id}:`, error);
      return {
        trackId: track.id,
        analysis: {} as any,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async analyzeTracksInParallel(tracks: MusicTrack[]): Promise<MusicAnalysisResult[]> {
    console.log(`Starting parallel analysis for ${tracks.length} tracks`);
    
    const analysisPromises = tracks.map(track => this.analyzeTrack(track));
    
    try {
      const results = await Promise.all(analysisPromises);
      console.log(`Completed parallel analysis for ${tracks.length} tracks`);
      return results;
    } catch (error) {
      console.error('Error during parallel analysis:', error);
      throw error;
    }
  }
}

export const musicAnalysisAPI = new MusicAnalysisAPI();
