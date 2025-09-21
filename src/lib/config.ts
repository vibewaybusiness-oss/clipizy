/**
 * Centralized configuration for the application
 */

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// WSL Network Configuration
// In WSL, we need to use the actual WSL IP address instead of localhost
const WSL_IP = '172.31.247.43';
const WINDOWS_HOST_IP = '172.31.240.1'; // Fallback Windows host IP

// Backend Configuration
export const BACKEND_CONFIG = {
  // Primary backend URL - use WSL IP for WSL environments
  url: process.env.BACKEND_URL || `http://${WSL_IP}:8000`,

  // Fallback URLs for different environments
  fallbackUrls: {
    localhost: 'http://localhost:8000',
    wsl: `http://${WSL_IP}:8000`,
    windows: `http://${WINDOWS_HOST_IP}:8000`,
  },

  // Timeout configurations
  timeouts: {
    default: 10000, // 10 seconds
    upload: 600000, // 10 minutes for file uploads
    analysis: 300000, // 5 minutes for analysis
  },

  // Retry configuration
  retries: {
    maxAttempts: 3,
    delay: 1000, // 1 second
  }
};

// Frontend Configuration
export const FRONTEND_CONFIG = {
  url: process.env.FRONTEND_URL || `http://${WSL_IP}:3000`,
  port: 3000,
};

// API Configuration
export const API_CONFIG = {
  // Base API paths
  basePath: '/api',
  musicClipPath: '/api/music-clip',
  analysisPath: '/api/analysis',

  // File upload configuration
  upload: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedAudioFormats: ['.mp3', '.wav', '.flac', '.aac', '.m4a'],
    allowedVideoFormats: ['.mp4', '.mov', '.avi', '.mkv'],
  },

  // CORS configuration
  cors: {
    allowedOrigins: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      `http://${WSL_IP}:3000`,
      `http://${WINDOWS_HOST_IP}:3000`,
    ],
  },
};

// Environment-specific configuration
export const ENV_CONFIG = {
  isDevelopment,
  isProduction,
  isWSL: process.env.WSL_DISTRO_NAME !== undefined,
  isWindows: process.platform === 'win32',
};

// Helper function to get the correct backend URL
export function getBackendUrl(): string {
  // Check if we're in WSL - use WSL IP for better connectivity
  if (ENV_CONFIG.isWSL) {
    return BACKEND_CONFIG.fallbackUrls.wsl;
  }

  // For Windows, try localhost first, then fallback to WSL IP
  if (ENV_CONFIG.isWindows) {
    return BACKEND_CONFIG.fallbackUrls.localhost;
  }

  // Default to configured URL
  return BACKEND_CONFIG.url;
}

// Helper function to get timeout for specific operations
export function getTimeout(operation: keyof typeof BACKEND_CONFIG.timeouts): number {
  return BACKEND_CONFIG.timeouts[operation];
}

// Helper function to check if we're in a WSL environment
export function isWSLEnvironment(): boolean {
  return ENV_CONFIG.isWSL || process.env.WSL_DISTRO_NAME !== undefined;
}

// Export default configuration
export default {
  backend: BACKEND_CONFIG,
  frontend: FRONTEND_CONFIG,
  api: API_CONFIG,
  env: ENV_CONFIG,
  getBackendUrl,
  getTimeout,
  isWSLEnvironment,
};
