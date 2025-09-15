import { useState, useCallback, useRef } from 'react';
import { VideoProject, VideoClip, TimelineTrack } from '../types';

interface UseTimelineReturn {
  tracks: TimelineTrack[];
  selectedClips: string[];
  selectedTracks: string[];
  hoveredClip?: string;
  hoveredTrack?: string;
  zoom: number;
  scrollPosition: number;
  snapToGrid: boolean;
  gridSize: number;
  setSelectedClips: (clips: string[]) => void;
  setSelectedTracks: (tracks: string[]) => void;
  setHoveredClip: (clipId?: string) => void;
  setHoveredTrack: (trackId?: string) => void;
  setZoom: (zoom: number) => void;
  setScrollPosition: (position: number) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSize: (size: number) => void;
  selectClip: (clipId: string, multiSelect?: boolean) => void;
  selectTrack: (trackId: string, multiSelect?: boolean) => void;
  moveClip: (clipId: string, newStartTime: number) => void;
  resizeClip: (clipId: string, newDuration: number) => void;
  splitClip: (clipId: string, splitTime: number) => void;
  duplicateClip: (clipId: string) => void;
  deleteSelectedClips: () => void;
  snapToGridTime: (time: number) => number;
  getClipsAtTime: (time: number) => VideoClip[];
  getClipsInRange: (startTime: number, endTime: number) => VideoClip[];
}

export function useTimeline(project: VideoProject): UseTimelineReturn {
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [hoveredClip, setHoveredClip] = useState<string>();
  const [hoveredTrack, setHoveredTrack] = useState<string>();
  const [zoom, setZoom] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(1); // seconds

  // Create tracks from clips
  const tracks: TimelineTrack[] = project.clips.reduce((acc, clip) => {
    let track = acc.find(t => t.id === `track-${clip.layer}`);
    
    if (!track) {
      track = {
        id: `track-${clip.layer}`,
        name: `Layer ${clip.layer}`,
        type: clip.type === 'audio' ? 'audio' : 'video',
        clips: [],
        height: 64,
        locked: false,
        muted: false
      };
      acc.push(track);
    }
    
    track.clips.push(clip);
    return acc;
  }, [] as TimelineTrack[]);

  // Sort tracks by layer
  tracks.sort((a, b) => {
    const aLayer = parseInt(a.id.replace('track-', ''));
    const bLayer = parseInt(b.id.replace('track-', ''));
    return aLayer - bLayer;
  });

  const selectClip = useCallback((clipId: string, multiSelect: boolean = false) => {
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

  const selectTrack = useCallback((trackId: string, multiSelect: boolean = false) => {
    if (multiSelect) {
      setSelectedTracks(prev => 
        prev.includes(trackId) 
          ? prev.filter(id => id !== trackId)
          : [...prev, trackId]
      );
    } else {
      setSelectedTracks([trackId]);
    }
  }, []);

  const moveClip = useCallback((clipId: string, newStartTime: number) => {
    const snapTime = snapToGrid ? snapToGridTime(newStartTime) : newStartTime;
    
    // Check for collisions
    const clip = project.clips.find(c => c.id === clipId);
    if (!clip) return;

    const newEndTime = snapTime + clip.duration;
    const conflictingClips = project.clips.filter(c => 
      c.id !== clipId && 
      c.layer === clip.layer &&
      ((snapTime >= c.startTime && snapTime < c.endTime) ||
       (newEndTime > c.startTime && newEndTime <= c.endTime) ||
       (snapTime <= c.startTime && newEndTime >= c.endTime))
    );

    if (conflictingClips.length > 0) {
      // Handle collision - could push clips or prevent move
      console.warn('Clip collision detected');
    }
  }, [project.clips, snapToGrid]);

  const resizeClip = useCallback((clipId: string, newDuration: number) => {
    const clip = project.clips.find(c => c.id === clipId);
    if (!clip) return;

    const minDuration = 0.1;
    const maxDuration = project.duration - clip.startTime;
    const clampedDuration = Math.max(minDuration, Math.min(newDuration, maxDuration));
    
    // Check for collisions
    const newEndTime = clip.startTime + clampedDuration;
    const conflictingClips = project.clips.filter(c => 
      c.id !== clipId && 
      c.layer === clip.layer &&
      newEndTime > c.startTime && newEndTime <= c.endTime
    );

    if (conflictingClips.length > 0) {
      console.warn('Clip resize collision detected');
    }
  }, [project.clips, project.duration]);

  const splitClip = useCallback((clipId: string, splitTime: number) => {
    const clip = project.clips.find(c => c.id === clipId);
    if (!clip) return;

    const relativeTime = splitTime - clip.startTime;
    if (relativeTime <= 0 || relativeTime >= clip.duration) return;

    // This would need to be handled by the parent component
    // as it requires updating the project state
    console.log('Split clip at:', splitTime);
  }, []);

  const duplicateClip = useCallback((clipId: string) => {
    const clip = project.clips.find(c => c.id === clipId);
    if (!clip) return;

    // This would need to be handled by the parent component
    console.log('Duplicate clip:', clipId);
  }, [project.clips]);

  const deleteSelectedClips = useCallback(() => {
    // This would need to be handled by the parent component
    console.log('Delete clips:', selectedClips);
  }, [selectedClips]);

  const snapToGridTime = useCallback((time: number) => {
    if (!snapToGrid) return time;
    return Math.round(time / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  const getClipsAtTime = useCallback((time: number) => {
    return project.clips.filter(clip => 
      time >= clip.startTime && time <= clip.endTime
    );
  }, [project.clips]);

  const getClipsInRange = useCallback((startTime: number, endTime: number) => {
    return project.clips.filter(clip => 
      (clip.startTime >= startTime && clip.startTime < endTime) ||
      (clip.endTime > startTime && clip.endTime <= endTime) ||
      (clip.startTime <= startTime && clip.endTime >= endTime)
    );
  }, [project.clips]);

  return {
    tracks,
    selectedClips,
    selectedTracks,
    hoveredClip,
    hoveredTrack,
    zoom,
    scrollPosition,
    snapToGrid,
    gridSize,
    setSelectedClips,
    setSelectedTracks,
    setHoveredClip,
    setHoveredTrack,
    setZoom,
    setScrollPosition,
    setSnapToGrid,
    setGridSize,
    selectClip,
    selectTrack,
    moveClip,
    resizeClip,
    splitClip,
    duplicateClip,
    deleteSelectedClips,
    snapToGridTime,
    getClipsAtTime,
    getClipsInRange
  };
}
