"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Music, Play, Pause, Trash2, Clock } from 'lucide-react';
import type { MusicTrack } from '@/types/music-clip';

interface TrackCardProps {
  track: MusicTrack;
  isSelected: boolean;
  isPlaying: boolean;
  hasDescription?: boolean;
  onSelect: (track: MusicTrack, event?: React.MouseEvent) => void;
  onPlayPause: (track: MusicTrack) => void;
  onRemove: (trackId: string) => void;
  selectionIndex?: number;
  totalSelected?: number;
  onDragStart?: (e: React.DragEvent, track: MusicTrack) => void;
  onDragOver?: (e: React.DragEvent, track: MusicTrack) => void;
  onDrop?: (e: React.DragEvent, track: MusicTrack) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  dropPosition?: 'above' | 'below' | null;
}

export function TrackCard({
  track,
  isSelected,
  isPlaying,
  hasDescription = false,
  onSelect,
  onPlayPause,
  onRemove,
  selectionIndex,
  totalSelected = 0,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  isDragOver = false,
  dropPosition = null
}: TrackCardProps) {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  return (
    <div className="relative">
      {/* Drop indicator line above */}
      {dropPosition === 'above' && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded-full z-10 shadow-lg">
          <div className="absolute -left-1 -top-1 w-2 h-2 bg-primary rounded-full"></div>
          <div className="absolute -right-1 -top-1 w-2 h-2 bg-primary rounded-full"></div>
        </div>
      )}
      
      <div
        className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 group relative ${
          isSelected
            ? 'border-primary/60 bg-gradient-to-r from-primary/5 to-primary/10 ring-2 ring-primary/30 shadow-lg'
            : 'border-border/60 hover:border-primary/40 hover:bg-gradient-to-r hover:from-primary/3 hover:to-primary/8 hover:shadow-md'
        } ${
          isDragging ? 'opacity-50 scale-95' : ''
        } ${
          isDragOver ? 'border-primary/80 bg-primary/10 ring-2 ring-primary/40' : ''
        }`}
        onClick={(e) => onSelect(track, e)}
        draggable
        onDragStart={(e) => onDragStart?.(e, track)}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver?.(e, track);
        }}
        onDrop={(e) => onDrop?.(e, track)}
        onDragEnd={onDragEnd}
      >
      <div className="space-y-3">
        {/* Header Row */}
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
            hasDescription
              ? 'bg-gradient-to-br from-green-500 to-green-600 text-white border-2 border-green-400 shadow-lg'
              : isSelected
                ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg' 
                : 'bg-gradient-to-br from-muted to-muted/80 text-muted-foreground group-hover:from-primary/20 group-hover:to-primary/30 group-hover:text-primary'
          }`}>
            <Music className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-base truncate flex-1">{track.name}</h3>
                {/* No audio content indicator */}
                {!track.url && (!track.file || track.file.size === 0) && (
                  <div className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex-shrink-0">
                    No Audio
                  </div>
                )}
                {/* Multi-selection indicator inline with title */}
                {isSelected && totalSelected > 1 && selectionIndex !== undefined && (
                  <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {selectionIndex + 1}
                  </div>
                )}
              </div>
            </div>
            
            {/* Metadata Row with buttons */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(track.duration)}</span>
                </div>
                
                {track.genre && (
                  <div className="px-3 py-1 bg-gradient-to-r from-primary/10 to-primary/20 text-primary rounded-full text-xs font-semibold border border-primary/20 max-w-[120px]">
                    <span className="truncate block">{track.genre}</span>
                  </div>
                )}
              </div>
              
              {/* Action buttons inline with timer */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayPause(track);
                  }}
                  className="h-8 w-8 p-0 hover:bg-primary/20 rounded-lg"
                  disabled={!track.url && (!track.file || track.file.size === 0)}
                  title={!track.url && (!track.file || track.file.size === 0) ? "No audio content available" : ""}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(track.id);
                  }}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/20 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Prompt Display */}
        {track.prompt && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-1">AI Prompt:</p>
                <p className="text-sm text-foreground leading-relaxed italic">
                  "{track.prompt}"
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
      
      {/* Drop indicator line below */}
      {dropPosition === 'below' && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full z-10 shadow-lg">
          <div className="absolute -left-1 -top-1 w-2 h-2 bg-primary rounded-full"></div>
          <div className="absolute -right-1 -top-1 w-2 h-2 bg-primary rounded-full"></div>
        </div>
      )}
    </div>
  );
}
