import { useState, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';
import type { MusicTrack, TrackDescriptions, TrackGenres } from '@/types/music-clip';

export function useMusicTracks(projectId?: string | null) {
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>(() => {
    if (typeof window !== 'undefined' && projectId) {
      const saved = localStorage.getItem(`musicClip_${projectId}_musicTracks`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && projectId) {
      return localStorage.getItem(`musicClip_${projectId}_selectedTrackId`) || null;
    }
    return null;
  });
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined' && projectId) {
      const saved = localStorage.getItem(`musicClip_${projectId}_selectedTrackIds`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [trackDescriptions, setTrackDescriptions] = useState<TrackDescriptions>(() => {
    if (typeof window !== 'undefined' && projectId) {
      const saved = localStorage.getItem(`musicClip_${projectId}_trackDescriptions`);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [trackGenres, setTrackGenres] = useState<TrackGenres>(() => {
    if (typeof window !== 'undefined' && projectId) {
      const saved = localStorage.getItem(`musicClip_${projectId}_trackGenres`);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  // PERSISTENCE: Save state changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      localStorage.setItem(`musicClip_${projectId}_musicTracks`, JSON.stringify(musicTracks));
    }
  }, [musicTracks, projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      if (selectedTrackId) {
        localStorage.setItem(`musicClip_${projectId}_selectedTrackId`, selectedTrackId);
      } else {
        localStorage.removeItem(`musicClip_${projectId}_selectedTrackId`);
      }
    }
  }, [selectedTrackId, projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      localStorage.setItem(`musicClip_${projectId}_selectedTrackIds`, JSON.stringify(selectedTrackIds));
    }
  }, [selectedTrackIds, projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      localStorage.setItem(`musicClip_${projectId}_trackDescriptions`, JSON.stringify(trackDescriptions));
    }
  }, [trackDescriptions, projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      localStorage.setItem(`musicClip_${projectId}_trackGenres`, JSON.stringify(trackGenres));
    }
  }, [trackGenres, projectId]);

  const addTracks = useCallback((newTracks: MusicTrack[]) => {
    setMusicTracks(prev => [...prev, ...newTracks]);
    
    // Set the first track as selected if none is selected
    if (!selectedTrackId && newTracks.length > 0) {
      setSelectedTrackId(newTracks[0].id);
      setSelectedTrackIds([newTracks[0].id]);
    }
    
    toast({
      title: "Tracks Added",
      description: `${newTracks.length} track(s) have been added to the list.`,
    });
  }, [selectedTrackId, toast]);

  const removeTrack = useCallback((trackId: string) => {
    setMusicTracks(prev => {
      // Find the track to remove and clean up its blob URL
      const trackToRemove = prev.find(track => track.id === trackId);
      if (trackToRemove && trackToRemove.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(trackToRemove.url);
        } catch (error) {
          console.warn('Failed to revoke blob URL for track:', trackId, error);
        }
      }
      
      const newTracks = prev.filter(track => track.id !== trackId);
      
      // Update selection if needed
      if (selectedTrackId === trackId) {
        if (newTracks.length > 0) {
          const nextTrack = newTracks[0];
          setSelectedTrackId(nextTrack.id);
          setSelectedTrackIds([nextTrack.id]);
        } else {
          setSelectedTrackId(null);
          setSelectedTrackIds([]);
        }
      } else {
        // Remove from selected tracks if it was selected
        setSelectedTrackIds(prev => {
          const newSelection = prev.filter(id => id !== trackId);
          // Ensure at least one track is selected if there are tracks available
          if (newSelection.length === 0 && newTracks.length > 0) {
            setSelectedTrackId(newTracks[0].id);
            return [newTracks[0].id];
          }
          return newSelection;
        });
      }
      
      return newTracks;
    });
    
    // Clean up track-specific data
    setTrackDescriptions(prev => {
      const newDescriptions = { ...prev };
      delete newDescriptions[trackId];
      return newDescriptions;
    });
    
    setTrackGenres(prev => {
      const newGenres = { ...prev };
      delete newGenres[trackId];
      return newGenres;
    });
    
    toast({
      title: "Track Removed",
      description: "The track has been removed from your list.",
    });
  }, [selectedTrackId, toast]);

  const removeTracks = useCallback((trackIds: string[]) => {
    setMusicTracks(prev => {
      // Find tracks to remove and clean up their blob URLs
      const tracksToRemove = prev.filter(track => trackIds.includes(track.id));
      tracksToRemove.forEach(track => {
        if (track.url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(track.url);
          } catch (error) {
            console.warn('Failed to revoke blob URL for track:', track.id, error);
          }
        }
      });
      
      const newTracks = prev.filter(track => !trackIds.includes(track.id));
      
      // Update selection if any selected tracks are being removed
      const remainingSelectedIds = selectedTrackIds.filter(id => !trackIds.includes(id));
      
      // Ensure at least one track is selected if there are tracks available
      if (remainingSelectedIds.length === 0 && newTracks.length > 0) {
        setSelectedTrackId(newTracks[0].id);
        setSelectedTrackIds([newTracks[0].id]);
      } else if (selectedTrackId && trackIds.includes(selectedTrackId)) {
        if (newTracks.length > 0) {
          const nextTrack = newTracks[0];
          setSelectedTrackId(nextTrack.id);
          setSelectedTrackIds([nextTrack.id]);
        } else {
          setSelectedTrackId(null);
          setSelectedTrackIds([]);
        }
      } else {
        setSelectedTrackIds(remainingSelectedIds);
      }
      
      return newTracks;
    });
    
    // Clean up track-specific data
    setTrackDescriptions(prev => {
      const newDescriptions = { ...prev };
      trackIds.forEach(id => delete newDescriptions[id]);
      return newDescriptions;
    });
    
    setTrackGenres(prev => {
      const newGenres = { ...prev };
      trackIds.forEach(id => delete newGenres[id]);
      return newGenres;
    });
    
    const trackCount = trackIds.length;
    const trackText = trackCount === 1 ? 'track' : 'tracks';
    toast({
      title: "Tracks Deleted",
      description: `${trackCount} ${trackText} removed successfully.`,
    });
  }, [selectedTrackId, selectedTrackIds, toast]);

  const selectTrack = useCallback((track: MusicTrack, event?: React.MouseEvent) => {
    const isCtrlOrCmd = event?.ctrlKey || event?.metaKey;
    const isShift = event?.shiftKey;
    
    if (isShift && selectedTrackIds.length > 0) {
      // Range selection mode
      const currentTrackIndex = musicTracks.findIndex(t => t.id === track.id);
      const lastSelectedIndex = musicTracks.findIndex(t => t.id === selectedTrackIds[selectedTrackIds.length - 1]);
      
      if (currentTrackIndex !== -1 && lastSelectedIndex !== -1) {
        const startIndex = Math.min(currentTrackIndex, lastSelectedIndex);
        const endIndex = Math.max(currentTrackIndex, lastSelectedIndex);
        
        const rangeTrackIds = musicTracks
          .slice(startIndex, endIndex + 1)
          .map(t => t.id);
        
        // Merge with existing selection, removing duplicates
        setSelectedTrackIds(prev => {
          const newSelection = [...new Set([...prev, ...rangeTrackIds])];
          setSelectedTrackId(track.id);
          return newSelection;
        });
      }
    } else if (isCtrlOrCmd) {
      // Multi-selection mode
      setSelectedTrackIds(prev => {
        if (prev.includes(track.id)) {
          // Don't allow deselecting if it's the only selected track
          if (prev.length === 1) {
            return prev; // Keep the current selection
          }
          
          // Remove from selection
          const newSelection = prev.filter(id => id !== track.id);
          if (selectedTrackId === track.id) {
            // If removing the currently selected track, select the first remaining
            setSelectedTrackId(newSelection[0]);
          }
          return newSelection;
        } else {
          // Add to selection
          const newSelection = [...prev, track.id];
          setSelectedTrackId(track.id);
          return newSelection;
        }
      });
    } else {
      // Single selection mode
      setSelectedTrackIds([track.id]);
      setSelectedTrackId(track.id);
    }
  }, [selectedTrackId, selectedTrackIds, musicTracks]);

  const updateTrackDescription = useCallback((trackId: string, description: string) => {
    setTrackDescriptions(prev => ({
      ...prev,
      [trackId]: description
    }));
  }, []);

  const updateTrackGenre = useCallback((trackId: string, genre: string) => {
    setTrackGenres(prev => ({
      ...prev,
      [trackId]: genre
    }));
  }, []);

  const updateTrackDuration = useCallback((trackId: string, duration: number) => {
    setMusicTracks(prev => prev.map(track => {
      if (track.id === trackId && track.duration !== duration) {
        return { ...track, duration };
      }
      return track;
    }));
  }, []);

  const getTotalDuration = useCallback(() => {
    return musicTracks.reduce((total, track) => total + track.duration, 0);
  }, [musicTracks]);

  const getCurrentTrack = useCallback(() => {
    return musicTracks.find(track => track.id === selectedTrackId) || null;
  }, [musicTracks, selectedTrackId]);

  const reorderTracks = useCallback((fromIndex: number, toIndex: number) => {
    setMusicTracks(prev => {
      const newTracks = [...prev];
      const [movedTrack] = newTracks.splice(fromIndex, 1);
      newTracks.splice(toIndex, 0, movedTrack);
      return newTracks;
    });
  }, []);

  const loadFromBackend = useCallback(() => {
    if (typeof window === 'undefined' || isInitialized) return;
    
    // This function will be called by the parent component when backend data is available
    // It's a placeholder for when we need to override localStorage with backend data
    setIsInitialized(true);
  }, [isInitialized]);

  const pushToBackend = useCallback(async (projectId?: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      // This function will be called by the parent component to push current tracks to backend
      console.log('Pushing current tracks to backend...', {
        musicTracks,
        selectedTrackId,
        selectedTrackIds,
        trackDescriptions,
        trackGenres
      });
      
      return {
        musicTracks,
        selectedTrackId,
        selectedTrackIds,
        trackDescriptions,
        trackGenres
      };
    } catch (error) {
      console.error('Failed to prepare tracks data for backend push:', error);
      throw error;
    }
  }, [musicTracks, selectedTrackId, selectedTrackIds, trackDescriptions, trackGenres]);

  const clearAllTracks = useCallback(() => {
    setMusicTracks([]);
    setSelectedTrackId(null);
    setSelectedTrackIds([]);
    setTrackDescriptions({});
    setTrackGenres({});
    
    // Clear localStorage
    if (typeof window !== 'undefined' && projectId) {
      localStorage.removeItem(`musicClip_${projectId}_musicTracks`);
      localStorage.removeItem(`musicClip_${projectId}_selectedTrackId`);
      localStorage.removeItem(`musicClip_${projectId}_selectedTrackIds`);
      localStorage.removeItem(`musicClip_${projectId}_trackDescriptions`);
      localStorage.removeItem(`musicClip_${projectId}_trackGenres`);
    }
  }, [projectId]);

  // Cleanup on unmount - only revoke blob URLs when component is actually unmounting
  useEffect(() => {
    return () => {
      // Only revoke blob URLs when the component is unmounting
      // This prevents premature revocation during re-renders
      musicTracks.forEach(track => {
        if (track.url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(track.url);
          } catch (error) {
            console.warn('Failed to revoke blob URL during cleanup:', track.id, error);
          }
        }
      });
    };
  }, []); // Empty dependency array to only run on unmount

  return {
    musicTracks,
    selectedTrackId,
    selectedTrackIds,
    trackDescriptions,
    trackGenres,
    addTracks,
    removeTrack,
    removeTracks,
    selectTrack,
    updateTrackDescription,
    updateTrackGenre,
    updateTrackDuration,
    getTotalDuration,
    getCurrentTrack,
    reorderTracks,
    setMusicTracks,
    setSelectedTrackId,
    setSelectedTrackIds,
    setTrackDescriptions,
    setTrackGenres,
    clearAllTracks,
    loadFromBackend,
    pushToBackend,
  };
}
