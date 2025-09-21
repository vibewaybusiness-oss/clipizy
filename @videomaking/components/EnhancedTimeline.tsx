"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VideoProject, TimelineProps, VideoClip } from '../types';
import { Button } from '../../src/components/ui/button';
import { Slider } from '../../src/components/ui/slider';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Scissors,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Music,
  Zap
} from 'lucide-react';

interface MusicAnalysis {
  audio_file: string;
  analysis_timestamp: string;
  total_peaks: number;
  total_segments: number;
  smoothed_peaks: Array<{
    index: number;
    time_seconds: number;
    time_formatted: string;
    score: number;
  }>;
  segments: Array<{
    index: number;
    time_seconds: number;
    time_formatted: string;
    ma_short_gap: number;
    ma_long_gap: number;
    ma_divergence: number;
    combined_gap: number;
    fitted_to_tempo: boolean;
  }>;
  summary: {
    peak_times: number[];
    segment_times: number[];
  };
}

export function EnhancedTimeline({
  project,
  onProjectChange,
  currentTime,
  onTimeChange,
  className = "",
  musicFile = "music_4"
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [musicAnalysis, setMusicAnalysis] = useState<MusicAnalysis | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const timelineWidth = 1000 * zoom;
  const pixelsPerSecond = timelineWidth / project.duration;

  // Audio playback controls
  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      onTimeChange(0);
    }
  }, [onTimeChange]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      onTimeChange(time);
    }
  }, [onTimeChange]);

  // Timeline interaction
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollPosition;
    const time = x / pixelsPerSecond;

    const newTime = Math.max(0, Math.min(time, project.duration));
    seek(newTime);
  }, [pixelsPerSecond, scrollPosition, project.duration, seek]);

  const handleWaveformClick = useCallback((e: React.MouseEvent) => {
    if (!waveformCanvasRef.current) return;

    const rect = waveformCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Calculate time based on visible range and zoom
    const visibleDuration = project.duration / zoom;
    const startTime = scrollPosition / pixelsPerSecond;
    const time = startTime + (x / rect.width) * visibleDuration;

    const newTime = Math.max(0, Math.min(time, project.duration));
    seek(newTime);
  }, [project.duration, zoom, scrollPosition, pixelsPerSecond, seek]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleTimelineClick(e);
  }, [handleTimelineClick]);

  const handleWaveformMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleWaveformClick(e);
  }, [handleWaveformClick]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();

      // Try waveform first, then timeline
      const waveformRect = waveformCanvasRef.current?.getBoundingClientRect();
      const timelineRect = timelineRef.current?.getBoundingClientRect();

      if (waveformRect && e.clientX >= waveformRect.left && e.clientX <= waveformRect.right) {
        // Mouse is over waveform
        const x = e.clientX - waveformRect.left;
        const visibleDuration = project.duration / zoom;
        const startTime = scrollPosition / pixelsPerSecond;
        const time = startTime + (x / waveformRect.width) * visibleDuration;
        const newTime = Math.max(0, Math.min(time, project.duration));
        seek(newTime);
      } else if (timelineRect) {
        // Mouse is over timeline
        const x = e.clientX - timelineRect.left + scrollPosition;
        const time = x / pixelsPerSecond;
        const newTime = Math.max(0, Math.min(time, project.duration));
        seek(newTime);
      }
    }
  }, [isDragging, pixelsPerSecond, scrollPosition, project.duration, seek, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      onTimeChange(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeChange]);

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with text input
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (isPlaying) {
            pause();
          } else {
            play();
          }
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom(prev => Math.min(prev + 0.2, maxZoom));
          break;
         case '-':
           e.preventDefault();
           setZoom(prev => Math.max(prev - 0.2, minZoom));
           break;
         case '0':
           e.preventDefault();
           setZoom(minZoom);
           setScrollPosition(0);
           break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, play, pause, minZoom, maxZoom]);

  // Load music analysis if available
  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        // Try to load analysis for the current project
        console.log(`Loading music analysis for: ${musicFile}`);
        const response = await fetch(`/TEST Library/analysis/${musicFile}_analysis.json`);
        const analysis: MusicAnalysis = await response.json();
        setMusicAnalysis(analysis);
        console.log(`Loaded analysis for ${musicFile}:`, analysis);

        // Generate waveform data based on peaks
        const samples = Math.floor(project.duration * 10);
        const data = Array.from({ length: samples }, (_, i) => {
          const time = i / 10;
          const peak = analysis.smoothed_peaks.find(p => Math.abs(p.time_seconds - time) < 0.1);
          return peak ? Math.min(Math.abs(peak.score) / 15, 1) : Math.random() * 0.3 + 0.1;
        });
        setWaveformData(data);

         // Calculate zoom bounds
         const containerWidth = 800; // Approximate container width
         const padding = 100; // Extra space after timeline
         const minZoomValue = Math.max(0.1, project.duration / (containerWidth - padding));
         const maxZoomValue = Math.max(1, project.duration / (containerWidth / 1000));

         setMinZoom(minZoomValue);
         setMaxZoom(maxZoomValue);
         setZoom(minZoomValue); // Start at minimum zoom to show full timeline
         setScrollPosition(0); // Start at beginning
      } catch (error) {
        console.error('Failed to load music analysis:', error);
        // Generate mock waveform data
        const samples = Math.floor(project.duration * 10);
        const data = Array.from({ length: samples }, () => Math.random() * 0.8 + 0.1);
        setWaveformData(data);
      }
    };

    loadAnalysis();
  }, [project.duration, musicFile]);

  // Render waveform
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
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
    const visibleDuration = project.duration / zoom;
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

    // Draw segments if available
    if (musicAnalysis) {
      musicAnalysis.segments.forEach((segment) => {
        const x = ((segment.time_seconds - startTime) / visibleDuration) * width;
        if (x >= 0 && x <= width) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();

          // Segment label
          ctx.fillStyle = '#10b981';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`S${segment.index}`, x, 15);
        }
      });

      // Draw peaks
      musicAnalysis.smoothed_peaks.forEach((peak) => {
        const x = ((peak.time_seconds - startTime) / visibleDuration) * width;
        if (x >= 0 && x <= width) {
          const amplitude = Math.min(Math.abs(peak.score) / 15, 1) * (height * 0.4);

          ctx.fillStyle = peak.score > 0 ? '#10b981' : '#ef4444';
          ctx.beginPath();
          ctx.arc(x, centerY, 3, 0, 2 * Math.PI);
          ctx.fill();

          // Peak label for major peaks
          if (Math.abs(peak.score) > 5) {
            ctx.fillStyle = peak.score > 0 ? '#10b981' : '#ef4444';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`P${peak.index}`, x, centerY - 10);
          }
        }
      });
    }

    // Draw current time indicator
    const currentX = ((currentTime - startTime) / visibleDuration) * width;
    if (currentX >= 0 && currentX <= width) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentX, 0);
      ctx.lineTo(currentX, height);
      ctx.stroke();
    }

  }, [waveformData, currentTime, project.duration, zoom, scrollPosition, musicAnalysis]);

  // Group clips by layer
  const clipsByLayer = project.clips.reduce((acc, clip) => {
    if (!acc[clip.layer]) acc[clip.layer] = [];
    acc[clip.layer].push(clip);
    return acc;
  }, {} as Record<number, VideoClip[]>);

  const maxLayer = Math.max(...Object.keys(clipsByLayer).map(Number), 0);

  return (
    <div className={`flex flex-col bg-muted/30 ${className}`}>
      {/* TIMELINE HEADER */}
      <div className="h-12 border-b bg-muted/50 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={isPlaying ? pause : play}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={stop}
          >
            <Square className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => seek(Math.max(0, currentTime - 5))}
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => seek(Math.min(project.duration, currentTime + 5))}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Zoom:</span>
            <Slider
              value={[zoom]}
              onValueChange={(value: number[]) => setZoom(value[0])}
              min={minZoom}
              max={maxZoom}
              step={0.1}
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* MUSIC WAVEFORM TRACK */}
      <div className="h-24 border-b bg-muted/20">
        <div className="h-full flex">
          <div className="w-32 border-r bg-muted/30 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Music className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Music</span>
            </div>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <canvas
              ref={waveformCanvasRef}
              className="w-full h-full cursor-pointer"
              onMouseDown={handleWaveformMouseDown}
              onClick={handleWaveformClick}
            />
            {musicAnalysis && (
              <div className="absolute top-1 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                {musicAnalysis.total_peaks} Peaks, {musicAnalysis.total_segments} Segments
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TIMELINE CONTENT */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* TRACK LABELS */}
          <div className="w-32 border-r bg-muted/20">
            {Array.from({ length: maxLayer + 1 }, (_, i) => (
              <div key={i} className="h-16 border-b flex items-center justify-between px-2">
                <span className="text-xs text-muted-foreground">Layer {i}</span>
                <Button variant="ghost" size="sm">
                  <Lock className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* TIMELINE TRACKS */}
          <div className="flex-1 relative">
            {/* HORIZONTAL SCROLLBAR */}
            <div className="h-4 bg-muted/20 border-t">
              <div className="h-full relative">
                <div className="absolute inset-0 bg-muted/30 rounded-sm mx-1 my-1">
                  <div
                    className="h-full bg-primary/50 rounded-sm cursor-pointer"
                    style={{
                      width: `${(1000 / timelineWidth) * 100}%`,
                      left: `${(scrollPosition / (timelineWidth - 1000)) * 100}%`
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                      if (!rect) return;

                      const handleScroll = (e: MouseEvent) => {
                        const x = e.clientX - rect.left;
                        const newScroll = (x / rect.width) * (timelineWidth - 1000);
                        setScrollPosition(Math.max(0, Math.min(newScroll, timelineWidth - 1000)));
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleScroll);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };

                      document.addEventListener('mousemove', handleScroll);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
              <div
                ref={timelineRef}
                className="relative h-full cursor-pointer"
                style={{ width: timelineWidth, transform: `translateX(-${scrollPosition}px)` }}
                onMouseDown={handleMouseDown}
                onClick={handleTimelineClick}
              >
                {/* TIME RULER */}
                 <div className="h-8 border-b bg-muted/30 flex items-center relative">
                   {(() => {
                     const visibleDuration = project.duration / zoom;
                     const startTime = scrollPosition / pixelsPerSecond;
                     const endTime = startTime + visibleDuration;

                     // Calculate appropriate tick interval (max 5 seconds)
                     let tickInterval = 1;
                     if (visibleDuration > 50) tickInterval = 10;
                     else if (visibleDuration > 20) tickInterval = 5;
                     else if (visibleDuration > 10) tickInterval = 2;
                     else tickInterval = 1;

                     const ticks = [];
                     for (let time = Math.floor(startTime / tickInterval) * tickInterval; time <= endTime; time += tickInterval) {
                       if (time >= 0 && time <= project.duration) {
                         ticks.push(
                           <div
                             key={time}
                             className="absolute text-xs text-muted-foreground"
                             style={{ left: time * pixelsPerSecond }}
                           >
                             {formatTime(time)}
                           </div>
                         );
                       }
                     }
                     return ticks;
                   })()}
                 </div>

                {/* TRACKS */}
                {Array.from({ length: maxLayer + 1 }, (_, layerIndex) => (
                  <div key={layerIndex} className="h-16 border-b relative">
                    {/* CLIPS IN THIS LAYER */}
                    {clipsByLayer[layerIndex]?.map((clip) => (
                      <div
                        key={clip.id}
                        className="absolute h-full border rounded cursor-move select-none bg-blue-500/80 hover:bg-blue-500"
                        style={{
                          left: clip.startTime * pixelsPerSecond,
                          width: clip.duration * pixelsPerSecond,
                          top: 0
                        }}
                      >
                        <div className="p-2 text-xs text-white truncate">
                          {clip.name}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* PLAYHEAD */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
                  style={{ left: currentTime * pixelsPerSecond }}
                >
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HIDDEN AUDIO ELEMENT */}
      <audio
        ref={audioRef}
        src={musicAnalysis ? `/TEST Library/music/${musicFile}.wav` : undefined}
        onTimeUpdate={(e) => onTimeChange(e.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
        onLoadStart={() => console.log(`Loading audio: /TEST Library/music/${musicFile}.wav`)}
        onError={(e) => console.error('Audio load error:', e)}
      />
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
