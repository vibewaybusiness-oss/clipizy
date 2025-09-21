export interface MusicTrack {
  id: string;
  file?: File; // Optional because tracks loaded from localStorage/backend don't have File objects
  url: string;
  duration: number;
  name: string;
  prompt?: string;
  videoDescription?: string;
  generatedAt: Date;
  genre?: string;
  isGenerated?: boolean;
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
