"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface AudioWaveformProps {
  audioUrl?: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeChange: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  className?: string;
}

export function AudioWaveform({
  audioUrl,
  currentTime,
  duration,
  isPlaying,
  onTimeChange,
  onPlay,
  onPause,
  onStop,
  className = ""
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>();
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Generate mock waveform data
  useEffect(() => {
    if (!duration) return;
    
    const samples = Math.floor(duration * 10); // 10 samples per second
    const mockData = Array.from({ length: samples }, () => Math.random() * 0.8 + 0.1);
    setWaveformData(mockData);
  }, [duration]);

  // Load audio file
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;

    const audio = audioRef.current;
    audio.src = audioUrl;
    audio.volume = isMuted ? 0 : volume;

    const handleLoadedData = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      console.error('Failed to load audio file');
    };

    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, volume, isMuted]);

  // Handle play/pause
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Render waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Calculate visible range
    const visibleDuration = duration / zoom;
    const startTime = scrollPosition;
    const endTime = startTime + visibleDuration;
    const startSample = Math.floor(startTime * 10);
    const endSample = Math.floor(endTime * 10);
    const visibleSamples = waveformData.slice(startSample, endSample);

    if (visibleSamples.length === 0) return;

    const sampleWidth = width / visibleSamples.length;

    // Draw waveform
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.beginPath();

    visibleSamples.forEach((sample, index) => {
      const x = index * sampleWidth;
      const amplitude = sample * (height * 0.4);
      const y1 = centerY - amplitude;
      const y2 = centerY + amplitude;

      if (index === 0) {
        ctx.moveTo(x, y1);
      } else {
        ctx.lineTo(x, y1);
      }
    });

    ctx.stroke();

    // Draw bottom half
    ctx.beginPath();
    visibleSamples.forEach((sample, index) => {
      const x = index * sampleWidth;
      const amplitude = sample * (height * 0.4);
      const y1 = centerY + amplitude;

      if (index === 0) {
        ctx.moveTo(x, centerY);
      } else {
        ctx.lineTo(x, y1);
      }
    });

    ctx.stroke();

    // Draw current time indicator
    const currentX = ((currentTime - startTime) / visibleDuration) * width;
    if (currentX >= 0 && currentX <= width) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentX, 0);
      ctx.lineTo(currentX, height);
      ctx.stroke();
    }

    // Draw time markers
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    const markerInterval = Math.max(1, Math.floor(visibleDuration / 10));
    for (let i = 0; i <= visibleDuration; i += markerInterval) {
      const x = (i / visibleDuration) * width;
      const time = startTime + i;
      
      ctx.fillText(formatTime(time), x, height - 5);
      
      // Draw vertical line
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

  }, [waveformData, currentTime, duration, zoom, scrollPosition]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const visibleDuration = duration / zoom;
    const startTime = scrollPosition;
    const time = startTime + (x / rect.width) * visibleDuration;
    
    onTimeChange(Math.max(0, Math.min(time, duration)));
  }, [duration, zoom, scrollPosition, onTimeChange]);

  const handleZoomChange = useCallback((value: number[]) => {
    setZoom(value[0]);
  }, []);

  const handleScrollChange = useCallback((value: number[]) => {
    setScrollPosition(value[0]);
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : newVolume;
    }
  }, [isMuted]);

  const handleMuteToggle = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) {
      audioRef.current.volume = newMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  const handleSeek = useCallback((direction: 'back' | 'forward', amount: number = 5) => {
    const newTime = direction === 'back' 
      ? Math.max(0, currentTime - amount)
      : Math.min(duration, currentTime + amount);
    onTimeChange(newTime);
  }, [currentTime, duration, onTimeChange]);

  return (
    <div className={`flex flex-col bg-muted/30 rounded-lg ${className}`}>
      {/* AUDIO CONTROLS */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSeek('back', 5)}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={isPlaying ? onPause : onPlay}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
            >
              <Square className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSeek('forward', 5)}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMuteToggle}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.01}
                className="w-20"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.min(5, zoom + 0.1))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ZOOM AND SCROLL CONTROLS */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Zoom:</span>
              <Slider
                value={[zoom]}
                onValueChange={handleZoomChange}
                min={0.1}
                max={5}
                step={0.1}
                className="w-20"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Scroll:</span>
              <Slider
                value={[scrollPosition]}
                onValueChange={handleScrollChange}
                min={0}
                max={Math.max(0, duration - duration / zoom)}
                step={0.1}
                className="w-32"
              />
            </div>
          </div>
        </div>
      </div>

      {/* WAVEFORM CANVAS */}
      <div className="flex-1 p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-32 cursor-pointer border rounded"
            onClick={handleCanvasClick}
          />
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <div className="text-sm text-muted-foreground">Loading audio...</div>
            </div>
          )}
        </div>

        {/* TIME DISPLAY */}
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* HIDDEN AUDIO ELEMENT */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => {
          const audio = e.target as HTMLAudioElement;
          onTimeChange(audio.currentTime);
        }}
        onEnded={onStop}
      />
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
