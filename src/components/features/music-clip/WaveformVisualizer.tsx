"use client";

import React, { useImperativeHandle, forwardRef } from 'react';
import { Play, Pause, Plus, Trash2, MapPin, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Scene } from '../../types/vibewave.types';
import { WaveformVisualizerRef, WaveformVisualizerProps } from '../../types/waveform.types';
import { useWaveformVisualizer } from '../../hooks/useWaveformVisualizer';
import { formatTime } from '../../utils/waveform.utils';

const WaveformVisualizer = forwardRef<WaveformVisualizerRef, WaveformVisualizerProps>(({
  audioFile,
  scenes,
  onScenesUpdate,
  showSceneControls = true,
  onResetScenes,
  musicTitle
}, ref) => {
  const {
    waveformData,
    duration,
    currentTime,
    isPlaying,
    isLoading,
    selectedSceneId,
    draggingSceneId,
    canvasRef,
    timelineRef,
    setSelectedSceneId,
    setDraggingSceneId,
    togglePlayback,
    handleAddScene,
    handleDeleteScene,
    handleTimelineClick,
    handlePinClick,
    stopAudio,
  } = useWaveformVisualizer(audioFile, scenes, onScenesUpdate);

  useImperativeHandle(ref, () => ({
    generateWaveformImage: (): string | null => {
      const canvas = canvasRef.current;
      if (!canvas || !waveformData.length) return null;

      // Temporarily increase size for better resolution
      const dpr = 3;
      const originalWidth = canvas.width;
      const originalHeight = canvas.height;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.scale(dpr, dpr);
      // Redraw with high resolution
      const barWidth = rect.width / waveformData.length;
      const barGap = 1;
      const centerY = rect.height / 2;

      const style = getComputedStyle(document.documentElement);
      const waveColor = `hsl(${style.getPropertyValue('--muted-foreground').trim()})`;
      const progressColor = `hsl(${style.getPropertyValue('--primary').trim()})`;
      const backgroundColor = `hsl(${style.getPropertyValue('--secondary').trim()})`;

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, rect.width, rect.height);

      const playheadX = (currentTime / duration) * rect.width;

      for (let i = 0; i < waveformData.length; i++) {
        const x = i * barWidth;
        const barHeight = waveformData[i] * rect.height;

        ctx.fillStyle = x < playheadX ? progressColor : waveColor;
        ctx.fillRect(x, centerY - barHeight / 2, barWidth - barGap, barHeight);
      }

      // Draw pins on the high-res canvas
      const pinColor = `hsl(${style.getPropertyValue('--accent').trim()})`;

      scenes.forEach((scene) => {
        const x = (scene.startTime / duration) * rect.width;
        ctx.fillStyle = pinColor;
        ctx.beginPath();
        ctx.moveTo(x, rect.height - 25);
        ctx.lineTo(x - 6, rect.height - 35);
        ctx.arc(x, rect.height - 35, 6, Math.PI, 0);
        ctx.lineTo(x + 6, rect.height - 35);
        ctx.closePath();
        ctx.fill();
      });

      const dataUrl = canvas.toDataURL('image/png');

      // Restore original canvas size
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      return dataUrl;
    },
    stopAudio: stopAudio
  }));

  return (
    <div className="space-y-2 p-4 rounded-md border bg-secondary/50">
      <div className="relative h-[100px] w-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin"/>
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          className={cn("w-full h-full rounded", isLoading && "opacity-0")} 
        />
      </div>

      <div ref={timelineRef} className="relative h-8 w-full cursor-pointer" onClick={handleTimelineClick}>
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-px bg-muted-foreground/30" />
        {duration > 0 && showSceneControls && scenes.map(scene => (
          <div
            key={scene.id}
            className="absolute top-0 cursor-pointer group"
            style={{ left: `${(scene.startTime / duration) * 100}%` }}
            onMouseDown={(e) => { 
              e.stopPropagation(); 
              setDraggingSceneId(scene.id); 
              setSelectedSceneId(scene.id); 
            }}
            onClick={(e) => { 
              e.stopPropagation(); 
              handlePinClick(scene); 
            }}
          >
            <MapPin 
              className={cn(
                "w-6 h-6 text-muted-foreground transition-all duration-150 ease-in-out -translate-x-1/2 group-hover:text-accent group-hover:scale-125",
                (draggingSceneId === scene.id || selectedSceneId === scene.id) && "text-accent scale-125"
              )} 
              fill="currentColor" 
            />
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-background/80 px-1 py-0.5 rounded-sm backdrop-blur-sm pointer-events-none">
              {scene.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="icon" onClick={togglePlayback} type="button" disabled={isLoading}>
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </Button>
        <div className="flex-1 flex items-center justify-center gap-4">
          {showSceneControls && (
            <>
              <Button variant="outline" size="icon" type="button" onClick={handleAddScene} disabled={isLoading}>
                <Plus className="w-4 h-4"/>
                <span className="sr-only">Add Scene Marker</span>
              </Button>
              <Button variant="outline" size="icon" type="button" onClick={handleDeleteScene} disabled={isLoading || selectedSceneId === null}>
                <Trash2 className="w-4 h-4"/>
                <span className="sr-only">Delete Scene Marker</span>
              </Button>
              {onResetScenes && (
                <Button variant="outline" size="icon" type="button" onClick={onResetScenes} disabled={isLoading}>
                  <RotateCcw className="w-4 h-4"/>
                  <span className="sr-only">Reset Scene Markers</span>
                </Button>
              )}
            </>
          )}
        </div>
        <span className="text-sm text-muted-foreground tabular-nums w-24 text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {musicTitle && (
        <div className="mt-3 text-center">
          <p className="text-sm font-medium text-foreground">{musicTitle}</p>
        </div>
      )}
    </div>
  );
});

WaveformVisualizer.displayName = "WaveformVisualizer";

export default WaveformVisualizer;
