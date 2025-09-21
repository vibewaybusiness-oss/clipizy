"use client";

import React, { useRef, useEffect, useState } from 'react';
import { VideoProject } from '../types';
import { VideoCanvas } from './VideoCanvas';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface VideoPreviewProps {
  project: VideoProject;
  currentTime: number;
  isPlaying: boolean;
  className?: string;
}

export function VideoPreview({ 
  project, 
  currentTime, 
  isPlaying, 
  className = "" 
}: VideoPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on project resolution
    canvas.width = project.settings.resolution.width;
    canvas.height = project.settings.resolution.height;

    // Clear canvas
    ctx.fillStyle = project.settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render clips at current time
    const activeClips = project.clips.filter(clip => 
      currentTime >= clip.startTime && currentTime <= clip.endTime
    );

    // Sort by layer (higher layer on top)
    activeClips.sort((a, b) => a.layer - b.layer);

    activeClips.forEach(clip => {
      renderClip(ctx, clip, currentTime);
    });

  }, [project, currentTime, isPlaying]);

  const renderClip = (ctx: CanvasRenderingContext2D, clip: any, time: number) => {
    if (clip.type === 'video' || clip.type === 'image') {
      renderMediaClip(ctx, clip, time);
    } else if (clip.type === 'text') {
      renderTextClip(ctx, clip, time);
    }
  };

  const renderMediaClip = (ctx: CanvasRenderingContext2D, clip: any, time: number) => {
    // This would typically load and render actual media
    // For now, we'll render a placeholder
    ctx.save();
    
    // Apply transform
    ctx.translate(clip.transform.x, clip.transform.y);
    ctx.rotate(clip.transform.rotation);
    ctx.scale(clip.transform.scaleX, clip.transform.scaleY);
    
    // Apply opacity
    ctx.globalAlpha = clip.opacity;
    
    // Render placeholder rectangle
    ctx.fillStyle = `hsl(${(clip.id.charCodeAt(0) * 137.5) % 360}, 70%, 50%)`;
    ctx.fillRect(0, 0, 200, 150);
    
    // Render clip name
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(clip.name, 100, 75);
    
    ctx.restore();
  };

  const renderTextClip = (ctx: CanvasRenderingContext2D, clip: any, time: number) => {
    ctx.save();
    
    ctx.translate(clip.transform.x, clip.transform.y);
    ctx.rotate(clip.transform.rotation);
    ctx.scale(clip.transform.scaleX, clip.transform.scaleY);
    
    ctx.globalAlpha = clip.opacity;
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(clip.name, 0, 0);
    
    ctx.restore();
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      canvasRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div 
      className={`relative bg-black rounded-lg overflow-hidden ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
      
      {/* OVERLAY CONTROLS */}
      {showControls && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent">
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <Square className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={handleMuteToggle}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={handleFullscreen}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TIME INDICATOR */}
      <div className="absolute top-4 left-4">
        <div className="bg-black/50 text-white px-2 py-1 rounded text-sm">
          {formatTime(currentTime)} / {formatTime(project.duration)}
        </div>
      </div>

      {/* PROJECT INFO */}
      <div className="absolute top-4 right-4">
        <div className="bg-black/50 text-white px-2 py-1 rounded text-sm">
          {project.settings.resolution.width}x{project.settings.resolution.height} @ {project.settings.frameRate}fps
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
