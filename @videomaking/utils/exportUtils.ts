import { VideoProject, ExportFormat } from '../types';

export const exportUtils = {
  // Get export presets for different platforms
  getExportPresets(): Record<string, ExportFormat> {
    return {
      'youtube-1080p': {
        name: 'YouTube 1080p',
        extension: 'mp4',
        mimeType: 'video/mp4',
        resolution: { width: 1920, height: 1080, name: '1080p' },
        frameRate: 30,
        quality: 'high',
        codec: 'h264'
      },
      'youtube-4k': {
        name: 'YouTube 4K',
        extension: 'mp4',
        mimeType: 'video/mp4',
        resolution: { width: 3840, height: 2160, name: '4K' },
        frameRate: 30,
        quality: 'ultra',
        codec: 'h264'
      },
      'instagram-square': {
        name: 'Instagram Square',
        extension: 'mp4',
        mimeType: 'video/mp4',
        resolution: { width: 1080, height: 1080, name: 'Square' },
        frameRate: 30,
        quality: 'high',
        codec: 'h264'
      },
      'instagram-story': {
        name: 'Instagram Story',
        extension: 'mp4',
        mimeType: 'video/mp4',
        resolution: { width: 1080, height: 1920, name: '9:16' },
        frameRate: 30,
        quality: 'high',
        codec: 'h264'
      },
      'tiktok': {
        name: 'TikTok',
        extension: 'mp4',
        mimeType: 'video/mp4',
        resolution: { width: 1080, height: 1920, name: '9:16' },
        frameRate: 30,
        quality: 'high',
        codec: 'h264'
      },
      'twitter': {
        name: 'Twitter',
        extension: 'mp4',
        mimeType: 'video/mp4',
        resolution: { width: 1280, height: 720, name: '720p' },
        frameRate: 30,
        quality: 'medium',
        codec: 'h264'
      }
    };
  },

  // Estimate export time based on project complexity
  estimateExportTime(project: VideoProject, format: ExportFormat): number {
    const { resolution, frameRate, quality } = format;
    const duration = project.duration;
    
    // Base time calculation
    const pixels = resolution.width * resolution.height;
    const totalFrames = duration * frameRate;
    
    // Quality multiplier
    const qualityMultiplier = {
      low: 0.5,
      medium: 1,
      high: 2,
      ultra: 4
    }[quality];
    
    // Complexity factors
    const clipCount = project.clips.length;
    const effectCount = project.effects.length;
    const transitionCount = project.transitions.length;
    
    const complexityFactor = 1 + (clipCount * 0.1) + (effectCount * 0.2) + (transitionCount * 0.1);
    
    // Calculate estimated time in minutes
    const baseTime = (pixels * totalFrames * qualityMultiplier * complexityFactor) / (1920 * 1080 * 100);
    
    return Math.max(1, Math.round(baseTime));
  },

  // Estimate file size
  estimateFileSize(project: VideoProject, format: ExportFormat): number {
    const { resolution, frameRate, quality } = format;
    const duration = project.duration;
    
    // Base size calculation
    const pixels = resolution.width * resolution.height;
    const totalFrames = duration * frameRate;
    
    // Quality multiplier (bits per pixel)
    const qualityMultiplier = {
      low: 0.5,
      medium: 1,
      high: 2,
      ultra: 4
    }[quality];
    
    // Codec efficiency
    const codecMultiplier = {
      h264: 1,
      h265: 0.7,
      vp9: 0.8,
      av1: 0.6
    }[format.codec] || 1;
    
    // Calculate size in MB
    const bitsPerPixel = 0.1 * qualityMultiplier * codecMultiplier;
    const totalBits = pixels * totalFrames * bitsPerPixel;
    const sizeMB = totalBits / (8 * 1024 * 1024);
    
    return Math.round(sizeMB);
  },

  // Validate export format
  validateExportFormat(format: ExportFormat): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (format.resolution.width <= 0 || format.resolution.height <= 0) {
      errors.push('Invalid resolution');
    }
    
    if (format.frameRate <= 0 || format.frameRate > 120) {
      errors.push('Invalid frame rate');
    }
    
    if (!['low', 'medium', 'high', 'ultra'].includes(format.quality)) {
      errors.push('Invalid quality setting');
    }
    
    if (!['h264', 'h265', 'vp9', 'av1'].includes(format.codec)) {
      errors.push('Unsupported codec');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Generate export filename
  generateFilename(project: VideoProject, format: ExportFormat): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const resolution = format.resolution.name.toLowerCase();
    const quality = format.quality;
    
    return `${project.name}_${resolution}_${quality}_${timestamp}.${format.extension}`;
  },

  // Get supported codecs for browser
  getSupportedCodecs(): string[] {
    const codecs = [];
    
    // Check for H.264 support
    if (document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"')) {
      codecs.push('h264');
    }
    
    // Check for H.265 support
    if (document.createElement('video').canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"')) {
      codecs.push('h265');
    }
    
    // Check for VP9 support
    if (document.createElement('video').canPlayType('video/webm; codecs="vp9"')) {
      codecs.push('vp9');
    }
    
    // Check for AV1 support
    if (document.createElement('video').canPlayType('video/mp4; codecs="av01.0.05M.08"')) {
      codecs.push('av1');
    }
    
    return codecs;
  },

  // Create export progress callback
  createProgressCallback(onProgress: (progress: number) => void) {
    let startTime = Date.now();
    let lastProgress = 0;
    
    return (current: number, total: number) => {
      const progress = (current / total) * 100;
      const elapsed = Date.now() - startTime;
      
      // Smooth progress updates
      if (progress - lastProgress >= 1 || current === total) {
        onProgress(progress);
        lastProgress = progress;
      }
      
      // Estimate remaining time
      if (progress > 0) {
        const estimatedTotal = elapsed / (progress / 100);
        const remaining = estimatedTotal - elapsed;
        console.log(`Export progress: ${progress.toFixed(1)}% (${Math.round(remaining / 1000)}s remaining)`);
      }
    };
  },

  // Export project metadata
  exportMetadata(project: VideoProject, format: ExportFormat) {
    return {
      project: {
        name: project.name,
        description: project.description,
        duration: project.duration,
        resolution: project.settings.resolution,
        frameRate: project.settings.frameRate,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      export: {
        format: format.name,
        resolution: format.resolution,
        frameRate: format.frameRate,
        quality: format.quality,
        codec: format.codec,
        exportedAt: new Date().toISOString()
      },
      statistics: {
        totalClips: project.clips.length,
        totalEffects: project.effects.length,
        totalTransitions: project.transitions.length,
        totalAudioTracks: project.audioTracks.length
      }
    };
  },

  // Create export manifest
  createExportManifest(project: VideoProject, format: ExportFormat, files: string[]) {
    return {
      version: '1.0',
      project: project.name,
      format: format.name,
      files: files,
      metadata: exportUtils.exportMetadata(project, format),
      createdAt: new Date().toISOString()
    };
  }
};
