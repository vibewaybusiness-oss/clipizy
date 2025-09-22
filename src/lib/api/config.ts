// API Configuration
import { getBackendUrl } from '@/lib/config';

// Use Next.js API routes for development, production API for production
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.vibewave.com' 
  : '/api';

export const API_PATHS = {
  AUTH: '/auth',
  API: '/api',
  MUSIC_CLIP: '/api/music-clip',
} as const;
