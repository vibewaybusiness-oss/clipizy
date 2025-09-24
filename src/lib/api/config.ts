// API Configuration
import { getBackendUrl } from '@/lib/config';

// Use backend URL directly to bypass Next.js API route issues
export const API_BASE_URL = getBackendUrl();

export const API_PATHS = {
  AUTH: '/api/auth',
  API: '/api',
  MUSIC_CLIP: '/api/music-clip',
} as const;
