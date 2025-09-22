// MUSIC DOMAIN TYPES
export interface MusicTrack {
  id: string;
  file?: File;
  url: string;
  duration: number;
  name: string;
  prompt?: string;
  videoDescription?: string;
  generatedAt: Date;
  genre?: string;
  isGenerated?: boolean;
  metadata?: {
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
  };
}

export interface TrackDescriptions {
  [trackId: string]: string;
}

export interface TrackGenres {
  [trackId: string]: string;
}

export type GenerationMode = "upload" | "generate";

export interface AudioPlaybackState {
  currentlyPlayingId: string | null;
  isPlaying: boolean;
  currentAudio: HTMLAudioElement | null;
}
