"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Upload, Trash2 } from "lucide-react";
import { TrackCard } from "@/components/forms/TrackCard";
import type { MusicTrack } from "@/types/domains/music";
import { useToast } from "@/hooks/ui/use-toast";

interface MusicTracksPanelProps {
  musicTracks: MusicTrack[];
  selectedTrackIds: string[];
  currentlyPlayingId: string | null;
  isPlaying: boolean;
  trackDescriptions: Record<string, string>;
  isUploadingTracks: boolean;
  isDragOver: boolean;
  isTrackReordering: boolean;
  draggedTrackId: string | null;
  dragOverTrackId: string | null;
  dropPosition: 'above' | 'below' | null;
  totalDuration: number;
  onTrackSelect: (track: MusicTrack, event?: React.MouseEvent) => void;
  onPlayPause: (track: MusicTrack) => void;
  onTrackRemove: (trackId: string) => void;
  onRemoveTracks: (trackIds: string[]) => void;
  onDragStart: (e: React.DragEvent, track: MusicTrack) => void;
  onDragOver: (e: React.DragEvent, track: MusicTrack) => void;
  onDrop: (e: React.DragEvent, track: MusicTrack) => void;
  onDragEnd: () => void;
  onAudioFileChange: (files: File[]) => void;
  formatDuration: (seconds: number) => string;
}

export function MusicTracksPanel({
  musicTracks,
  selectedTrackIds,
  currentlyPlayingId,
  isPlaying,
  trackDescriptions,
  isUploadingTracks,
  isDragOver,
  isTrackReordering,
  draggedTrackId,
  dragOverTrackId,
  dropPosition,
  totalDuration,
  onTrackSelect,
  onPlayPause,
  onTrackRemove,
  onRemoveTracks,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onAudioFileChange,
  formatDuration,
}: MusicTracksPanelProps) {
  const { toast } = useToast();

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isTrackReordering) {
      return;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isTrackReordering) {
      return;
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isTrackReordering) {
      return;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isTrackReordering) {
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Invalid Files",
        description: "Please drop audio files only.",
      });
      return;
    }

    onAudioFileChange(audioFiles);
  };

  const handleRemoveSelected = () => {
    onRemoveTracks(selectedTrackIds);
    toast({
      title: "Tracks Deleted",
      description: `${selectedTrackIds.length} tracks have been removed.`,
    });
  };

  return (
    <div
      className={`flex flex-col h-full xl:col-span-1 transition-all duration-300 ${
        isDragOver ? 'scale-[1.02]' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Card className={`bg-card border shadow-lg flex-1 flex flex-col min-h-0 transition-all duration-300 ${
        isDragOver
          ? 'border-primary/50 bg-primary/5'
          : 'border-border'
      }`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Music className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Music Tracks
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {musicTracks.length} track{musicTracks.length !== 1 ? 's' : ''} loaded
                  {selectedTrackIds.length > 1 && (
                    <span className="ml-2 text-primary font-medium">
                      • {selectedTrackIds.length} selected
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            {musicTracks.length > 0 && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total Duration</div>
                <div className="text-sm font-semibold text-primary">
                  {formatDuration(totalDuration)}
                </div>
              </div>
            )}
          </div>

          {musicTracks.length === 0 && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground text-center">
                Drag and drop audio files here or use the controls on the left
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            {isUploadingTracks ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">
                      Uploading tracks...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please wait while your files are being processed
                    </p>
                  </div>
                </div>
              </div>
            ) : musicTracks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-all duration-300 ${
                    isDragOver ? 'bg-primary/20 scale-110' : 'bg-primary/10'
                  }`}>
                    <Upload className={`w-6 h-6 text-primary transition-all duration-300 ${
                      isDragOver ? 'scale-110' : ''
                    }`} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      isDragOver ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {isDragOver ? 'Drop audio files here!' : 'No tracks loaded'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload or generate music to get started
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`p-3 space-y-2 h-full overflow-y-auto transition-all duration-300 relative custom-scrollbar ${
                  isDragOver ? 'opacity-50' : ''
                }`}
                style={{ maxHeight: 'calc(100vh - 300px)' }}
              >
                {isDragOver && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg z-10">
                    <div className="text-center space-y-2">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Drop to add more tracks</p>
                    </div>
                  </div>
                )}
                {musicTracks.map((track, index) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isSelected={selectedTrackIds.includes(track.id)}
                    isPlaying={currentlyPlayingId === track.id && isPlaying}
                    hasDescription={!!(track.videoDescription || trackDescriptions[track.id])}
                    onSelect={onTrackSelect}
                    onPlayPause={onPlayPause}
                    onRemove={onTrackRemove}
                    selectionIndex={selectedTrackIds.includes(track.id) ? selectedTrackIds.indexOf(track.id) : undefined}
                    totalSelected={selectedTrackIds.length}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onDragEnd={onDragEnd}
                    isDragging={draggedTrackId === track.id}
                    isDragOver={dragOverTrackId === track.id}
                    dropPosition={dragOverTrackId === track.id ? dropPosition : null}
                  />
                ))}
              </div>
            )}
          </div>

          {selectedTrackIds.length > 1 && (
            <div className="p-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveSelected}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedTrackIds.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
