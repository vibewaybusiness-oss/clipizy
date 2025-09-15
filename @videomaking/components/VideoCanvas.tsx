"use client";

import React, { forwardRef, useRef, useEffect, useImperativeHandle } from 'react';
import { VideoProject } from '../types';

interface VideoCanvasProps {
  project: VideoProject;
  currentTime: number;
  isPlaying: boolean;
  className?: string;
}

export interface VideoCanvasRef {
  getCanvas: () => HTMLCanvasElement | null;
  render: () => void;
  exportFrame: () => string;
}

export const VideoCanvas = forwardRef<VideoCanvasRef, VideoCanvasProps>(
  ({ project, currentTime, isPlaying, className = "" }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      render: () => renderFrame(),
      exportFrame: () => {
        const canvas = canvasRef.current;
        return canvas ? canvas.toDataURL('image/png') : '';
      }
    }));

    const renderFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = project.settings.resolution.width;
      canvas.height = project.settings.resolution.height;

      // Clear canvas with background color
      ctx.fillStyle = project.settings.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get active clips at current time
      const activeClips = project.clips.filter(clip => 
        currentTime >= clip.startTime && currentTime <= clip.endTime
      );

      // Sort by layer (higher layer on top)
      activeClips.sort((a, b) => a.layer - b.layer);

      // Render each active clip
      activeClips.forEach(clip => {
        renderClip(ctx, clip, currentTime);
      });

      // Render effects
      project.effects.forEach(effect => {
        if (effect.enabled) {
          renderEffect(ctx, effect, currentTime);
        }
      });
    };

    const renderClip = (ctx: CanvasRenderingContext2D, clip: any, time: number) => {
      ctx.save();

      // Apply transform
      ctx.translate(clip.transform.x, clip.transform.y);
      ctx.rotate(clip.transform.rotation);
      ctx.scale(clip.transform.scaleX, clip.transform.scaleY);

      // Apply opacity
      ctx.globalAlpha = clip.opacity;

      // Render based on clip type
      switch (clip.type) {
        case 'video':
          renderVideoClip(ctx, clip, time);
          break;
        case 'image':
          renderImageClip(ctx, clip, time);
          break;
        case 'text':
          renderTextClip(ctx, clip, time);
          break;
        case 'audio':
          // Audio clips don't have visual representation
          break;
      }

      // Apply clip-specific effects
      clip.effects.forEach((effect: any) => {
        if (effect.enabled) {
          applyEffect(ctx, effect, time);
        }
      });

      ctx.restore();
    };

    const renderVideoClip = (ctx: CanvasRenderingContext2D, clip: any, time: number) => {
      // Placeholder for video rendering
      // In a real implementation, this would load and render actual video frames
      const clipTime = time - clip.startTime;
      const progress = clipTime / clip.duration;

      // Create a gradient background
      const gradient = ctx.createLinearGradient(0, 0, 200, 150);
      gradient.addColorStop(0, `hsl(${(clip.id.charCodeAt(0) * 137.5) % 360}, 70%, 50%)`);
      gradient.addColorStop(1, `hsl(${(clip.id.charCodeAt(0) * 137.5 + 60) % 360}, 70%, 30%)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 200, 150);

      // Add some animation based on time
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(0, 0, 200 * progress, 150);

      // Render clip info
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(clip.name, 100, 75);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '12px Arial';
      ctx.fillText(`${formatTime(clipTime)} / ${formatTime(clip.duration)}`, 100, 95);
    };

    const renderImageClip = (ctx: CanvasRenderingContext2D, clip: any, time: number) => {
      // Placeholder for image rendering
      ctx.fillStyle = `hsl(${(clip.id.charCodeAt(0) * 137.5) % 360}, 60%, 60%)`;
      ctx.fillRect(0, 0, 200, 150);

      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(clip.name, 100, 75);
    };

    const renderTextClip = (ctx: CanvasRenderingContext2D, clip: any, time: number) => {
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(clip.name, 0, 0);
    };

    const renderEffect = (ctx: CanvasRenderingContext2D, effect: any, time: number) => {
      // Apply global effects
      switch (effect.type) {
        case 'blur':
          ctx.filter = `blur(${effect.parameters.amount || 0}px)`;
          break;
        case 'brightness':
          ctx.filter = `brightness(${effect.parameters.amount || 1})`;
          break;
        case 'contrast':
          ctx.filter = `contrast(${effect.parameters.amount || 1})`;
          break;
        case 'saturation':
          ctx.filter = `saturate(${effect.parameters.amount || 1})`;
          break;
      }
    };

    const applyEffect = (ctx: CanvasRenderingContext2D, effect: any, time: number) => {
      // Apply clip-specific effects
      switch (effect.type) {
        case 'opacity':
          ctx.globalAlpha *= effect.parameters.amount || 1;
          break;
        case 'scale':
          ctx.scale(effect.parameters.amount || 1, effect.parameters.amount || 1);
          break;
        case 'rotation':
          ctx.rotate((effect.parameters.amount || 0) * Math.PI / 180);
          break;
      }
    };

    useEffect(() => {
      renderFrame();
    }, [project, currentTime]);

    useEffect(() => {
      if (isPlaying) {
        const animate = () => {
          renderFrame();
          animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
      } else {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      }

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [isPlaying]);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    );
  }
);

VideoCanvas.displayName = 'VideoCanvas';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
