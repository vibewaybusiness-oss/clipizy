"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VideoProject, TimelineProps, VideoClip } from '../types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
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
  VolumeX
} from 'lucide-react';

export function Timeline({ 
  project, 
  onProjectChange, 
  currentTime, 
  onTimeChange, 
  className = "" 
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);

  const timelineWidth = 1000 * zoom;
  const pixelsPerSecond = timelineWidth / project.duration;

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollPosition;
    const time = x / pixelsPerSecond;
    
    onTimeChange(Math.max(0, Math.min(time, project.duration)));
  }, [pixelsPerSecond, scrollPosition, project.duration, onTimeChange]);

  const handleClipDrag = useCallback((clipId: string, newStartTime: number) => {
    const updatedProject = {
      ...project,
      clips: project.clips.map(clip => 
        clip.id === clipId 
          ? { 
              ...clip, 
              startTime: Math.max(0, newStartTime),
              endTime: Math.max(0, newStartTime) + clip.duration
            }
          : clip
      )
    };
    onProjectChange(updatedProject);
  }, [project, onProjectChange]);

  const handleClipResize = useCallback((clipId: string, newDuration: number) => {
    const clip = project.clips.find(c => c.id === clipId);
    if (!clip) return;

    const updatedProject = {
      ...project,
      clips: project.clips.map(c => 
        c.id === clipId 
          ? { 
              ...c, 
              duration: Math.max(0.1, newDuration),
              endTime: c.startTime + Math.max(0.1, newDuration)
            }
          : c
      )
    };
    onProjectChange(updatedProject);
  }, [project, onProjectChange]);

  const handleClipSelect = useCallback((clipId: string, multiSelect: boolean = false) => {
    if (multiSelect) {
      setSelectedClips(prev => 
        prev.includes(clipId) 
          ? prev.filter(id => id !== clipId)
          : [...prev, clipId]
      );
    } else {
      setSelectedClips([clipId]);
    }
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const updatedProject = {
      ...project,
      clips: project.clips.filter(clip => !selectedClips.includes(clip.id))
    };
    onProjectChange(updatedProject);
    setSelectedClips([]);
  }, [project, onProjectChange, selectedClips]);

  const handleCopySelected = useCallback(() => {
    // Implementation for copying clips
    console.log('Copying clips:', selectedClips);
  }, [selectedClips]);

  const handleSplitClip = useCallback((clipId: string) => {
    const clip = project.clips.find(c => c.id === clipId);
    if (!clip) return;

    const splitTime = currentTime - clip.startTime;
    if (splitTime <= 0 || splitTime >= clip.duration) return;

    const newClip: VideoClip = {
      ...clip,
      id: `clip-${Date.now()}`,
      startTime: currentTime,
      duration: clip.duration - splitTime,
      endTime: clip.endTime
    };

    const updatedClip = {
      ...clip,
      duration: splitTime,
      endTime: clip.startTime + splitTime
    };

    const updatedProject = {
      ...project,
      clips: project.clips.map(c => c.id === clipId ? updatedClip : c).concat(newClip)
    };
    onProjectChange(updatedProject);
  }, [project, onProjectChange, currentTime]);

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
          <Button variant="outline" size="sm">
            <Play className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Pause className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Square className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Zoom:</span>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={0.1}
              max={5}
              step={0.1}
              className="w-20"
            />
          </div>
          
          {selectedClips.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleCopySelected}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeleteSelected}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
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
          <div className="flex-1 relative overflow-x-auto">
            <div
              ref={timelineRef}
              className="relative h-full cursor-pointer"
              style={{ width: timelineWidth }}
              onClick={handleTimelineClick}
            >
              {/* TIME RULER */}
              <div className="h-8 border-b bg-muted/30 flex items-center relative">
                {Array.from({ length: Math.ceil(project.duration) + 1 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute text-xs text-muted-foreground"
                    style={{ left: i * pixelsPerSecond }}
                  >
                    {formatTime(i)}
                  </div>
                ))}
              </div>

              {/* TRACKS */}
              {Array.from({ length: maxLayer + 1 }, (_, layerIndex) => (
                <div key={layerIndex} className="h-16 border-b relative">
                  {/* CLIPS IN THIS LAYER */}
                  {clipsByLayer[layerIndex]?.map((clip) => (
                    <TimelineClip
                      key={clip.id}
                      clip={clip}
                      pixelsPerSecond={pixelsPerSecond}
                      isSelected={selectedClips.includes(clip.id)}
                      onSelect={(multiSelect) => handleClipSelect(clip.id, multiSelect)}
                      onDrag={(newStartTime) => handleClipDrag(clip.id, newStartTime)}
                      onResize={(newDuration) => handleClipResize(clip.id, newDuration)}
                      onSplit={() => handleSplitClip(clip.id)}
                    />
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
  );
}

interface TimelineClipProps {
  clip: VideoClip;
  pixelsPerSecond: number;
  isSelected: boolean;
  onSelect: (multiSelect: boolean) => void;
  onDrag: (newStartTime: number) => void;
  onResize: (newDuration: number) => void;
  onSplit: () => void;
}

function TimelineClip({ 
  clip, 
  pixelsPerSecond, 
  isSelected, 
  onSelect, 
  onDrag, 
  onResize, 
  onSplit 
}: TimelineClipProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState(0);

  const clipWidth = clip.duration * pixelsPerSecond;
  const clipLeft = clip.startTime * pixelsPerSecond;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart(e.clientX);
    onSelect(e.ctrlKey || e.metaKey);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart;
    const deltaTime = deltaX / pixelsPerSecond;
    const newStartTime = clip.startTime + deltaTime;
    
    onDrag(Math.max(0, newStartTime));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setDragStart(e.clientX);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - dragStart;
    const deltaTime = deltaX / pixelsPerSecond;
    const newDuration = clip.duration + deltaTime;
    
    onResize(Math.max(0.1, newDuration));
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', isDragging ? handleMouseMove : handleResizeMove);
      document.addEventListener('mouseup', isDragging ? handleMouseUp : handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', isDragging ? handleMouseMove : handleResizeMove);
        document.removeEventListener('mouseup', isDragging ? handleMouseUp : handleResizeEnd);
      };
    }
  }, [isDragging, isResizing]);

  return (
    <div
      className={`absolute h-full border rounded cursor-move select-none ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'
      }`}
      style={{
        left: clipLeft,
        width: clipWidth,
        backgroundColor: getClipColor(clip.type),
        minWidth: 20
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="h-full flex items-center justify-between px-2">
        <span className="text-xs text-white truncate">{clip.name}</span>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onSplit();
            }}
          >
            <Scissors className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* RESIZE HANDLE */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}

function getClipColor(type: string): string {
  switch (type) {
    case 'video': return 'bg-blue-500';
    case 'image': return 'bg-green-500';
    case 'audio': return 'bg-purple-500';
    case 'text': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
