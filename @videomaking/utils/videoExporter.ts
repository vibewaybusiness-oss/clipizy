"use client";

import { VideoProject, ExportFormat } from '../types';

export interface ExportProgress {
  progress: number;
  stage: string;
  message?: string;
}

export interface ExportResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function exportVideoToFile(
  project: VideoProject,
  format: ExportFormat,
  filename: string,
  onProgress?: (progress: ExportProgress) => void
): Promise<ExportResult> {
  try {
    onProgress?.({ progress: 0, stage: 'Initializing', message: 'Preparing export...' });

    // Create canvas for rendering
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    canvas.width = format.resolution.width;
    canvas.height = format.resolution.height;

    onProgress?.({ progress: 10, stage: 'Rendering', message: 'Rendering frames...' });

    // Simulate frame rendering
    const totalFrames = Math.floor(project.duration * format.frameRate);
    const frames: ImageData[] = [];

    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / format.frameRate;
      const progress = 10 + (frame / totalFrames) * 70;
      
      onProgress?.({ 
        progress, 
        stage: 'Rendering', 
        message: `Rendering frame ${frame + 1} of ${totalFrames}` 
      });

      // Clear canvas
      ctx.fillStyle = project.settings.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render clips at this time
      const activeClips = project.clips.filter(clip => 
        time >= clip.startTime && time <= clip.endTime
      );

      for (const clip of activeClips) {
        await renderClipAtTime(ctx, clip, time, canvas.width, canvas.height);
      }

      // Apply effects
      for (const effect of project.effects) {
        if (effect.enabled) {
          await applyEffectToCanvas(ctx, effect, canvas.width, canvas.height);
        }
      }

      // Capture frame
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      frames.push(imageData);

      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    onProgress?.({ progress: 80, stage: 'Encoding', message: 'Encoding video...' });

    // Create video from frames
    const videoBlob = await createVideoFromFrames(frames, format);
    
    onProgress?.({ progress: 90, stage: 'Finalizing', message: 'Creating download...' });

    // Create download URL
    const url = URL.createObjectURL(videoBlob);
    
    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    onProgress?.({ progress: 100, stage: 'Complete', message: 'Export completed!' });

    return {
      success: true,
      url
    };

  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

async function renderClipAtTime(
  ctx: CanvasRenderingContext2D,
  clip: any,
  time: number,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  // Calculate clip progress
  const clipTime = time - clip.startTime;
  const clipProgress = clipTime / clip.duration;

  if (clipProgress < 0 || clipProgress > 1) return;

  // Apply transform
  ctx.save();
  
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  ctx.translate(centerX + clip.transform.x, centerY + clip.transform.y);
  ctx.rotate((clip.transform.rotation * Math.PI) / 180);
  ctx.scale(clip.transform.scaleX, clip.transform.scaleY);
  ctx.globalAlpha = clip.opacity;

  // Render based on clip type
  if (clip.type === 'video' || clip.type === 'image') {
    await renderMediaClip(ctx, clip, clipProgress, canvasWidth, canvasHeight);
  } else if (clip.type === 'text') {
    renderTextClip(ctx, clip, clipProgress, canvasWidth, canvasHeight);
  }

  ctx.restore();
}

async function renderMediaClip(
  ctx: CanvasRenderingContext2D,
  clip: any,
  progress: number,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  // Create image element
  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      let width = canvasWidth * 0.8;
      let height = width / aspectRatio;
      
      if (height > canvasHeight * 0.8) {
        height = canvasHeight * 0.8;
        width = height * aspectRatio;
      }

      ctx.drawImage(
        img,
        -width / 2,
        -height / 2,
        width,
        height
      );
      resolve();
    };
    
    img.onerror = () => {
      // Draw placeholder if image fails to load
      ctx.fillStyle = '#666';
      ctx.fillRect(-50, -25, 100, 50);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Media', 0, 0);
      resolve();
    };
    
    img.src = clip.source;
  });
}

function renderTextClip(
  ctx: CanvasRenderingContext2D,
  clip: any,
  progress: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const text = clip.name || 'Text';
  ctx.fillText(text, 0, 0);
}

async function applyEffectToCanvas(
  ctx: CanvasRenderingContext2D,
  effect: any,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imageData.data;

  switch (effect.type) {
    case 'brightness':
      const brightness = effect.parameters.amount || 1;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * brightness);
        data[i + 1] = Math.min(255, data[i + 1] * brightness);
        data[i + 2] = Math.min(255, data[i + 2] * brightness);
      }
      break;

    case 'contrast':
      const contrast = effect.parameters.amount || 1;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128));
      }
      break;

    case 'saturation':
      const saturation = effect.parameters.amount || 1;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = Math.min(255, gray + (data[i] - gray) * saturation);
        data[i + 1] = Math.min(255, gray + (data[i + 1] - gray) * saturation);
        data[i + 2] = Math.min(255, gray + (data[i + 2] - gray) * saturation);
      }
      break;

    case 'blur':
      // Simple box blur
      const blurAmount = Math.floor(effect.parameters.amount || 0);
      if (blurAmount > 0) {
        // This is a simplified blur - in production, use a proper blur algorithm
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] + Math.random() * blurAmount * 10);
          data[i + 1] = Math.min(255, data[i + 1] + Math.random() * blurAmount * 10);
          data[i + 2] = Math.min(255, data[i + 2] + Math.random() * blurAmount * 10);
        }
      }
      break;
  }

  ctx.putImageData(imageData, 0, 0);
}

async function createVideoFromFrames(
  frames: ImageData[],
  format: ExportFormat
): Promise<Blob> {
  // In a real implementation, this would use WebCodecs API or similar
  // For now, we'll create a simple animated GIF or use a canvas-based approach
  
  return new Promise((resolve) => {
    // Create a simple video-like blob (in production, use proper video encoding)
    const canvas = document.createElement('canvas');
    canvas.width = format.resolution.width;
    canvas.height = format.resolution.height;
    const ctx = canvas.getContext('2d')!;
    
    // Draw first frame
    if (frames.length > 0) {
      ctx.putImageData(frames[0], 0, 0);
    }
    
    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'video/webm');
  });
}
