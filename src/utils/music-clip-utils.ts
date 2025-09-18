import type { MusicTrack, TrackDescriptions } from '@/types/music-clip';

// Validation function for track descriptions
export const hasValidDescription = (
  track: MusicTrack,
  trackDescriptions: Record<string, string>,
  sharedDescription?: string,
  useSameVideoForAll?: boolean,
  minLength: number = 10
): boolean => {
  // Check if track has its own description
  const trackDescription = trackDescriptions[track.id] || track.videoDescription;
  
  // Check if using shared description
  const description = useSameVideoForAll && sharedDescription 
    ? sharedDescription 
    : trackDescription;
  
  return Boolean(description && description.trim().length >= minLength);
};

// Format duration helper
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};

// File to data URI converter
export const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// Calculate total duration of tracks
export const getTotalDuration = (tracks: MusicTrack[]): number => {
  return tracks.reduce((total, track) => total + track.duration, 0);
};

// Storage keys constants
export const STORAGE_KEYS = {
  CURRENT_STEP: 'vibewave_current_step',
  MAX_REACHED_STEP: 'vibewave_max_reached_step',
  GENERATION_MODE: 'vibewave_generation_mode',
  MUSIC_PROMPT: 'vibewave_music_prompt',
  SETTINGS: 'vibewave_settings',
  PROMPTS: 'vibewave_prompts',
  CURRENT_PROJECT_ID: 'vibewave_current_project_id',
  IS_PROJECT_CREATED: 'vibewave_is_project_created',
  MUSIC_TRACKS_TO_GENERATE: 'vibewave_music_tracks_to_generate',
  IS_INSTRUMENTAL: 'vibewave_is_instrumental',
  SCENES: 'vibewave_scenes',
  ANALYZED_SCENES: 'vibewave_analyzed_scenes',
  SHOW_SCENE_CONTROLS: 'vibewave_show_scene_controls',
  GENERATED_VIDEO_URI: 'vibewave_generated_video_uri',
  CHANNEL_ANIMATION_FILE: 'vibewave_channel_animation_file',
} as const;

// Helper functions for localStorage persistence
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Failed to parse ${key} from localStorage:`, error);
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error);
  }
}

// Clear all localStorage data
export const clearAllStorageData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};
