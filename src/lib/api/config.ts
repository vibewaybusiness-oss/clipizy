// API Configuration
import { getBackendUrl } from '@/lib/config';

// ALWAYS use Next.js API routes to ensure proper routing
export const API_BASE_URL = '/api';

export const API_PATHS = {
  AUTH: '/auth',
  API: '/api',
  MUSIC_CLIP: '/music-clip',
} as const;
