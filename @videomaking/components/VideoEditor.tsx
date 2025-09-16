"use client";

import React, { useRef, useEffect, useState } from 'react';
import { VideoProject, VideoEditorProps } from '../types';
import { VideoCanvas, VideoCanvasRef } from './VideoCanvas';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

export function VideoEditor({ 
  project, 
  onProjectChange, 
  className = "" 
}: VideoEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const canvasRef = useRef<VideoCanvasRef>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const duration = project.duration;

  useEffect(() => {
    if (isPlaying) {
      const animate = (timestamp: number) => {
        if (lastTimeRef.current === 0) {
          lastTimeRef.current = timestamp;
        }
        
        const deltaTime = (timestamp - lastTimeRef.current) / 1000;
        const newTime = Math.min(currentTime + deltaTime * playbackRate, duration);
        
        setCurrentTime(newTime);
        lastTimeRef.current = timestamp;
        
        if (newTime < duration) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsPlaying(false);
        }
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
  }, [isPlaying, currentTime, duration, playbackRate]);

  const handlePlay = () => {
    setIsPlaying(true);
    lastTimeRef.current = 0;
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, duration)));
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume[0]);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* VIDEO CANVAS */}
      <div className="flex-1 bg-black rounded-lg overflow-hidden relative">
        <VideoCanvas
          ref={canvasRef}
          project={project}
          currentTime={currentTime}
          isPlaying={isPlaying}
          className="w-full h-full"
        />
        
        {/* OVERLAY CONTROLS */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-black/50 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSeek(Math.max(0, currentTime - 10))}
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={isPlaying ? handlePause : handlePlay}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROL PANEL */}
      <div className="mt-4 space-y-4">
        {/* TIME DISPLAY */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* SEEK BAR */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            onValueChange={(value) => handleSeek(value[0])}
            max={duration}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* PLAYBACK CONTROLS */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
            >
              <Square className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={isPlaying ? handlePause : handlePlay}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            {/* VOLUME CONTROL */}
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

            {/* PLAYBACK RATE */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">Speed:</span>
              <select
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                className="text-xs bg-background border rounded px-2 py-1"
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          </div>
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
