// API Configuration
import { getBackendUrl } from '@/lib/config';

export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.vibewave.com' 
  : getBackendUrl();

export const API_PATHS = {
  AUTH: '/auth',
  API: '/api',
  MUSIC_CLIP: '/api/music-clip',
} as const;
