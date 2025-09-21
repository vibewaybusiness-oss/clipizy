
"use client";

import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Play, Pause, Plus, Trash2, MapPin, Loader2, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Scene } from './clipizi-generator';

export interface WaveformVisualizerRef {
  generateWaveformImage: () => string | null;
  stopAudio: () => void;
}

interface WaveformVisualizerProps {
  audioFile: File | null;
  scenes: Scene[];
  onScenesUpdate: (scenes: Scene[]) => void;
  showSceneControls?: boolean;
  onResetScenes?: () => void;
  musicTitle?: string;
}

const WaveformVisualizer = forwardRef<WaveformVisualizerRef, WaveformVisualizerProps>(({
  audioFile,
  scenes,
  onScenesUpdate,
  showSceneControls = true,
  onResetScenes,
  musicTitle
}, ref) => {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  const [draggingSceneId, setDraggingSceneId] = useState<number | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const generateWaveformData = useCallback(async (file: File): Promise<number[]> => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setDuration(audioBuffer.duration);
      const channelData = audioBuffer.getChannelData(0);
      const samples = 400; // Number of bars we want to show
      const blockSize = Math.floor(channelData.length / samples);
      const waveform: number[] = [];
      for (let i = 0; i < samples; i++) {
        const start = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[start + j]);
        }
        waveform.push(sum / blockSize);
      }
      const max = Math.max(...waveform);
      return waveform.map(v => v / max);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const barWidth = width / waveformData.length;
    const barGap = 1;
    const centerY = height / 2;
    
    const style = getComputedStyle(document.documentElement);
    const waveColor = `hsl(${style.getPropertyValue('--muted-foreground').trim()})`;
    const progressColor = `hsl(${style.getPropertyValue('--primary').trim()})`;
    const backgroundColor = `hsl(${style.getPropertyValue('--secondary').trim()})`;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const playheadX = (currentTime / duration) * width;

    for (let i = 0; i < waveformData.length; i++) {
      const x = i * barWidth;
      const barHeight = waveformData[i] * height;
      
      ctx.fillStyle = x < playheadX ? progressColor : waveColor;
      ctx.fillRect(x, centerY - barHeight / 2, barWidth - barGap, barHeight);
    }
  }, [waveformData, currentTime, duration]);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);

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
        draw(); // Redraw with high resolution

        // Draw pins on the high-res canvas
        const width = rect.width;
        const height = rect.height;
        const style = getComputedStyle(document.documentElement);
        const pinColor = `hsl(${style.getPropertyValue('--accent').trim()})`;

        scenes.forEach((scene) => {
            const x = (scene.startTime / duration) * width;
            ctx.fillStyle = pinColor;
            ctx.beginPath();
            ctx.moveTo(x, height - 25);
            ctx.lineTo(x - 6, height - 35);
            ctx.arc(x, height - 35, 6, Math.PI, 0);
            ctx.lineTo(x + 6, height - 35);
            ctx.closePath();
            ctx.fill();
        });
        
        const dataUrl = canvas.toDataURL('image/png');

        // Restore original canvas size
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        draw();

        return dataUrl;
      },
      stopAudio: stopAudio
  }));

  useEffect(() => {
    if (audioFile) {
      setIsLoading(true);
      generateWaveformData(audioFile)
        .then(setWaveformData)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [audioFile, generateWaveformData]);

  useEffect(() => {
    draw();
  }, [draw, scenes]);

  useEffect(() => {
    if (audioFile) {
      // Validate that audioFile is actually a File or Blob object
      if (!(audioFile instanceof File) && !(audioFile instanceof Blob)) {
        console.warn('WaveformVisualizer: audioFile is not a File or Blob object:', typeof audioFile);
        return;
      }
      
      const audio = new Audio(URL.createObjectURL(audioFile));
      audioRef.current = audio;
      
      const updateTime = () => setCurrentTime(audio.currentTime);
      const handleEnded = () => setIsPlaying(false);
      
      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('ended', handleEnded);
        if (audio.src) {
            URL.revokeObjectURL(audio.src);
        }
      };
    }
  }, [audioFile]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAddScene = () => {
      if (scenes.some(scene => scene.startTime.toFixed(2) === currentTime.toFixed(2))) return;
      const newScene: Scene = {
          id: Date.now(),
          startTime: currentTime,
          endTime: 0, // This will be recalculated
          label: "New Scene",
          description: "A new scene description.",
      };
      onScenesUpdate([...scenes, newScene].sort((a, b) => a.startTime - b.startTime));
  };

  const handleDeleteScene = () => {
      if (selectedSceneId !== null) {
          onScenesUpdate(scenes.filter(s => s.id !== selectedSceneId));
          setSelectedSceneId(null);
      }
  };

  const handleStopDragging = useCallback(() => {
      setDraggingSceneId(null);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (draggingSceneId === null || !timelineRef.current || duration === 0) return;
      
      const timelineRect = timelineRef.current.getBoundingClientRect();
      const newTime = Math.max(0, Math.min(duration, ((e.clientX - timelineRect.left) / timelineRect.width) * duration));
      
      const updatedScenes = scenes.map(s => 
          s.id === draggingSceneId ? {...s, startTime: newTime} : s
      ).sort((a, b) => a.startTime - b.startTime);

      onScenesUpdate(updatedScenes);
  }, [draggingSceneId, duration, onScenesUpdate, scenes]);

  useEffect(() => {
      if (draggingSceneId !== null) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleStopDragging);
      } else {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleStopDragging);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleStopDragging);
      };
  }, [draggingSceneId]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current || duration === 0 || draggingSceneId) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      if (audioRef.current) audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
  };
  
  const handlePinClick = (scene: Scene) => {
      if (draggingSceneId) return;
      setSelectedSceneId(scene.id);
      if (audioRef.current) audioRef.current.currentTime = scene.startTime;
      setCurrentTime(scene.startTime);
  };
  
  return (
    <div className="space-y-2 p-4 rounded-md border bg-secondary/50">
      <div className="relative h-[100px] w-full">
        {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin"/></div>}
        <canvas ref={canvasRef} className={cn("w-full h-full rounded", isLoading && "opacity-0")} />
      </div>

      <div ref={timelineRef} className="relative h-8 w-full cursor-pointer" onClick={handleTimelineClick}>
          <div className="absolute top-1/2 -translate-y-1/2 w-full h-px bg-muted-foreground/30" />
          {duration > 0 && showSceneControls && scenes.map(scene => (
              <div 
                  key={scene.id} 
                  className="absolute top-0 cursor-pointer group"
                  style={{ left: `${(scene.startTime / duration) * 100}%` }}
                  onMouseDown={(e) => { e.stopPropagation(); setDraggingSceneId(scene.id); setSelectedSceneId(scene.id); }}
                  onClick={(e) => { e.stopPropagation(); handlePinClick(scene); }}
              >
                  <MapPin className={cn("w-6 h-6 text-muted-foreground transition-all duration-150 ease-in-out -translate-x-1/2 group-hover:text-accent group-hover:scale-125",
                  (draggingSceneId === scene.id || selectedSceneId === scene.id) && "text-accent scale-125"
                  )} fill="currentColor" />
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-background/80 px-1 py-0.5 rounded-sm backdrop-blur-sm pointer-events-none">{scene.label}</div>
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
          <span className="text-sm text-muted-foreground tabular-nums w-24 text-right">{formatTime(currentTime)} / {formatTime(duration)}</span>
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
