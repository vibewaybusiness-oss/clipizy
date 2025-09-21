import { VideoProject, VideoClip, VideoResolution } from '../types';

export const videoUtils = {
  // Calculate project duration from clips
  calculateDuration(project: VideoProject): number {
    if (project.clips.length === 0) return 0;
    
    return Math.max(...project.clips.map(clip => clip.endTime));
  },

  // Get active clips at a specific time
  getActiveClips(project: VideoProject, time: number): VideoClip[] {
    return project.clips.filter(clip => 
      time >= clip.startTime && time <= clip.endTime
    );
  },

  // Get clips in a time range
  getClipsInRange(project: VideoProject, startTime: number, endTime: number): VideoClip[] {
    return project.clips.filter(clip => 
      (clip.startTime >= startTime && clip.startTime < endTime) ||
      (clip.endTime > startTime && clip.endTime <= endTime) ||
      (clip.startTime <= startTime && clip.endTime >= endTime)
    );
  },

  // Check for clip collisions
  checkCollisions(project: VideoProject, clipId: string, startTime: number, duration: number): VideoClip[] {
    const clip = project.clips.find(c => c.id === clipId);
    if (!clip) return [];

    const endTime = startTime + duration;
    
    return project.clips.filter(c => 
      c.id !== clipId && 
      c.layer === clip.layer &&
      ((startTime >= c.startTime && startTime < c.endTime) ||
       (endTime > c.startTime && endTime <= c.endTime) ||
       (startTime <= c.startTime && endTime >= c.endTime))
    );
  },

  // Snap time to grid
  snapToGrid(time: number, gridSize: number): number {
    return Math.round(time / gridSize) * gridSize;
  },

  // Convert time to frame number
  timeToFrame(time: number, frameRate: number): number {
    return Math.floor(time * frameRate);
  },

  // Convert frame number to time
  frameToTime(frame: number, frameRate: number): number {
    return frame / frameRate;
  },

  // Get project statistics
  getProjectStats(project: VideoProject) {
    const totalClips = project.clips.length;
    const videoClips = project.clips.filter(c => c.type === 'video').length;
    const audioClips = project.clips.filter(c => c.type === 'audio').length;
    const imageClips = project.clips.filter(c => c.type === 'image').length;
    const textClips = project.clips.filter(c => c.type === 'text').length;
    
    const totalEffects = project.effects.length;
    const totalTransitions = project.transitions.length;
    
    const duration = videoUtils.calculateDuration(project);
    const fileSize = videoUtils.estimateFileSize(project);
    
    return {
      totalClips,
      videoClips,
      audioClips,
      imageClips,
      textClips,
      totalEffects,
      totalTransitions,
      duration,
      fileSize
    };
  },

  // Estimate file size
  estimateFileSize(project: VideoProject): number {
    const { resolution, frameRate } = project.settings;
    const duration = videoUtils.calculateDuration(project);
    
    // Rough estimation based on resolution and duration
    const pixels = resolution.width * resolution.height;
    const totalFrames = duration * frameRate;
    
    // Estimate bytes per pixel (very rough)
    const bytesPerPixel = 3; // RGB
    const estimatedBytes = pixels * totalFrames * bytesPerPixel;
    
    return Math.round(estimatedBytes / (1024 * 1024)); // Convert to MB
  },

  // Validate project
  validateProject(project: VideoProject): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for empty project
    if (project.clips.length === 0) {
      errors.push('Project has no clips');
    }
    
    // Check for invalid clips
    project.clips.forEach((clip, index) => {
      if (clip.duration <= 0) {
        errors.push(`Clip ${index + 1} has invalid duration`);
      }
      if (clip.startTime < 0) {
        errors.push(`Clip ${index + 1} has negative start time`);
      }
      if (clip.endTime <= clip.startTime) {
        errors.push(`Clip ${index + 1} has invalid end time`);
      }
    });
    
    // Check for overlapping clips on same layer
    const layers = new Map<number, VideoClip[]>();
    project.clips.forEach(clip => {
      if (!layers.has(clip.layer)) {
        layers.set(clip.layer, []);
      }
      layers.get(clip.layer)!.push(clip);
    });
    
    layers.forEach((clips, layer) => {
      clips.sort((a, b) => a.startTime - b.startTime);
      
      for (let i = 1; i < clips.length; i++) {
        const prevClip = clips[i - 1];
        const currentClip = clips[i];
        
        if (currentClip.startTime < prevClip.endTime) {
          errors.push(`Overlapping clips on layer ${layer}`);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Create project thumbnail
  async createThumbnail(project: VideoProject, time: number = 0): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = project.settings.resolution.width;
    canvas.height = project.settings.resolution.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    // Clear with background color
    ctx.fillStyle = project.settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Render active clips
    const activeClips = videoUtils.getActiveClips(project, time);
    activeClips.sort((a, b) => a.layer - b.layer);
    
    for (const clip of activeClips) {
      await renderClipThumbnail(ctx, clip, time);
    }
    
    return canvas.toDataURL('image/jpeg', 0.8);
  },

  // Export project as JSON
  exportProject(project: VideoProject): string {
    return JSON.stringify(project, null, 2);
  },

  // Import project from JSON
  importProject(json: string): VideoProject {
    const data = JSON.parse(json);
    
    // Validate the imported data
    const validation = videoUtils.validateProject(data);
    if (!validation.isValid) {
      throw new Error(`Invalid project data: ${validation.errors.join(', ')}`);
    }
    
    return data;
  },

  // Get supported resolutions
  getSupportedResolutions(): VideoResolution[] {
    return [
      { width: 640, height: 480, name: '480p' },
      { width: 854, height: 480, name: '480p (16:9)' },
      { width: 1280, height: 720, name: '720p' },
      { width: 1920, height: 1080, name: '1080p' },
      { width: 2560, height: 1440, name: '1440p' },
      { width: 3840, height: 2160, name: '4K' },
      { width: 7680, height: 4320, name: '8K' }
    ];
  },

  // Get aspect ratio from resolution
  getAspectRatio(resolution: VideoResolution): string {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(resolution.width, resolution.height);
    const width = resolution.width / divisor;
    const height = resolution.height / divisor;
    return `${width}:${height}`;
  }
};

async function renderClipThumbnail(ctx: CanvasRenderingContext2D, clip: VideoClip, time: number): Promise<void> {
  ctx.save();
  
  // Apply transforms
  ctx.translate(clip.transform.x, clip.transform.y);
  ctx.rotate(clip.transform.rotation);
  ctx.scale(clip.transform.scaleX, clip.transform.scaleY);
  
  // Apply opacity
  ctx.globalAlpha = clip.opacity;
  
  // Render placeholder based on clip type
  switch (clip.type) {
    case 'video':
    case 'image':
      ctx.fillStyle = `hsl(${(clip.id.charCodeAt(0) * 137.5) % 360}, 70%, 50%)`;
      ctx.fillRect(0, 0, 200, 150);
      break;
    case 'text':
      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(clip.name, 0, 0);
      break;
  }
  
  ctx.restore();
}
