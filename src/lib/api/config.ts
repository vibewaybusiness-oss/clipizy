// API Configuration
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.vibewave.com' 
  : 'http://localhost:8000';

export const API_PATHS = {
  AUTH: '/auth',
  API: '/api',
  MUSIC_CLIP: '/music-clip',
} as const;
