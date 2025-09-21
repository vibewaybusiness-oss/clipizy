# Configuration Management

This document describes the centralized configuration system for the clipizi application.

## Overview

The application uses centralized configuration to manage network settings, timeouts, and environment-specific values. This eliminates the need to hardcode IP addresses and other settings throughout the codebase.

## Frontend Configuration

### Location
- **File**: `src/lib/config.ts`
- **Type**: TypeScript configuration module

### Key Features
- **Environment Detection**: Automatically detects WSL, Windows, and development environments
- **Dynamic Backend URL**: Uses appropriate IP address based on environment
- **Centralized Timeouts**: Consistent timeout values across all API calls
- **CORS Configuration**: Centralized CORS origins for backend

### Usage
```typescript
import { getBackendUrl, getTimeout, BACKEND_CONFIG } from '@/lib/config';

// Get the correct backend URL for current environment
const backendUrl = getBackendUrl();

// Get timeout for specific operations
const uploadTimeout = getTimeout('upload'); // 10 minutes
const defaultTimeout = getTimeout('default'); // 10 seconds
```

### Configuration Values
- **WSL IP**: `172.31.247.43` (primary WSL network interface)
- **Windows Host IP**: `172.31.240.1` (fallback Windows host)
- **Upload Timeout**: 10 minutes for file uploads
- **Analysis Timeout**: 5 minutes for AI analysis
- **Default Timeout**: 10 seconds for regular API calls

## Backend Configuration

### Location
- **File**: `api/config.py`
- **Type**: Python Pydantic settings

### Key Features
- **Environment Variables**: Supports `.env` file and environment variables
- **CORS Origins**: Centralized list of allowed origins
- **Network Settings**: WSL and Windows host IP addresses
- **File Upload Limits**: Configurable file size and format restrictions

### Usage
```python
from api.config import settings

# Get CORS origins
cors_origins = settings.cors_origins

# Get WSL IP
wsl_ip = settings.wsl_ip

# Get file upload limits
max_size = settings.max_file_size
```

## API Client

### Location
- **File**: `src/lib/api-client.ts`
- **Type**: TypeScript utility functions

### Features
- **Centralized Requests**: All API calls go through the client
- **Automatic Timeout Handling**: Uses appropriate timeouts for different operations
- **Error Handling**: Consistent error handling across all API calls
- **FormData Support**: Special handling for file uploads

### Usage
```typescript
import { apiGet, apiPost, apiUpload } from '@/lib/api-client';

// GET request
const response = await apiGet('/music-clip/projects');

// POST request with JSON
const response = await apiPost('/music-clip/projects', { name: 'My Project' });

// File upload
const formData = new FormData();
formData.append('file', file);
const response = await apiUpload('/music-clip/projects/123/upload-track', formData);
```

## Environment Detection

The system automatically detects the environment and uses appropriate settings:

### WSL Environment
- **Detection**: `process.env.WSL_DISTRO_NAME` is defined
- **Backend URL**: Uses WSL IP (`172.31.247.43:8000`)
- **CORS**: Allows WSL IP origins

### Windows Environment
- **Detection**: `process.platform === 'win32'`
- **Backend URL**: Uses localhost (`localhost:8000`)
- **CORS**: Allows localhost origins

### Development Environment
- **Detection**: `process.env.NODE_ENV === 'development'`
- **Features**: Enhanced logging, debug mode, relaxed CORS

## Migration Guide

### Before (Hardcoded)
```typescript
const BACKEND_URL = process.env.BACKEND_URL || 'http://172.31.247.43:8000';
const timeout = 10000;
```

### After (Centralized)
```typescript
import { getBackendUrl, getTimeout } from '@/lib/config';

const backendUrl = getBackendUrl();
const timeout = getTimeout('default');
```

## Benefits

1. **Maintainability**: Single source of truth for all configuration
2. **Environment Awareness**: Automatic detection and appropriate settings
3. **Consistency**: Same configuration across all API routes
4. **Flexibility**: Easy to change settings without touching multiple files
5. **Type Safety**: TypeScript support with proper typing
6. **Documentation**: Self-documenting configuration with clear defaults

## Future Enhancements

- [ ] Environment-specific configuration files
- [ ] Runtime configuration updates
- [ ] Configuration validation
- [ ] Hot reloading of configuration changes
- [ ] Configuration UI for administrators
