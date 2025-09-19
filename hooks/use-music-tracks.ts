"use client";

import { useState, useCallback, useEffect } from 'react';

interface MusicTrack {
  id: string;
  name: string;
  artist?: string;
  duration: number; // in seconds
  url: string;
  genre?: string;
  mood?: string;
  tempo?: number;
  key?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MusicTracksState {
  tracks: MusicTrack[];
  musicTracks: MusicTrack[]; // Alias for compatibility
  currentTrack: MusicTrack | null;
  selectedTrackId: string | null;
  selectedTrackIds: string[];
  trackDescriptions: Record<string, string>;
  trackGenres: Record<string, string>;
  loading: boolean;
  error: string | null;
}

export function useMusicTracks() {
  const [state, setState] = useState<MusicTracksState>({
    tracks: [],
    musicTracks: [],
    currentTrack: null,
    selectedTrackId: null,
    selectedTrackIds: [],
    trackDescriptions: {},
    trackGenres: {},
    loading: false,
    error: null,
  });

  const loadTracks = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // TODO: Replace with actual API call
      // For now, return mock data
      const mockTracks: MusicTrack[] = [
        {
          id: '1',
          name: 'Sample Track 1',
          artist: 'Sample Artist',
          duration: 180,
          url: '/audio/sample1.mp3',
          genre: 'Electronic',
          mood: 'Energetic',
          tempo: 120,
          key: 'C Major',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Sample Track 2',
          artist: 'Sample Artist 2',
          duration: 240,
          url: '/audio/sample2.mp3',
          genre: 'Ambient',
          mood: 'Calm',
          tempo: 80,
          key: 'A Minor',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      setState(prev => ({ 
        ...prev, 
        tracks: mockTracks,
        musicTracks: mockTracks, 
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load tracks',
        loading: false 
      }));
    }
  }, []);

  const addTrack = useCallback(async (track: Omit<MusicTrack, 'id' | 'createdAt' | 'updatedAt'>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // TODO: Replace with actual API call
      const newTrack: MusicTrack = {
        ...track,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setState(prev => ({ 
        ...prev, 
        tracks: [...prev.tracks, newTrack],
        musicTracks: [...prev.tracks, newTrack],
        loading: false 
      }));

      return newTrack;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to add track',
        loading: false 
      }));
      throw error;
    }
  }, []);

  const updateTrack = useCallback(async (id: string, updates: Partial<MusicTrack>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // TODO: Replace with actual API call
      setState(prev => {
        const updatedTracks = prev.tracks.map(track =>
          track.id === id 
            ? { ...track, ...updates, updatedAt: new Date() }
            : track
        );
        return {
          ...prev,
          tracks: updatedTracks,
          musicTracks: updatedTracks,
          loading: false
        };
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to update track',
        loading: false 
      }));
      throw error;
    }
  }, []);

  const deleteTrack = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // TODO: Replace with actual API call
      setState(prev => {
        const filteredTracks = prev.tracks.filter(track => track.id !== id);
        return {
          ...prev,
          tracks: filteredTracks,
          musicTracks: filteredTracks,
          currentTrack: prev.currentTrack?.id === id ? null : prev.currentTrack,
          loading: false
        };
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to delete track',
        loading: false 
      }));
      throw error;
    }
  }, []);

  const selectTrack = useCallback((track: MusicTrack | null) => {
    setState(prev => ({ ...prev, currentTrack: track }));
  }, []);

  const getTrackById = useCallback((id: string) => {
    return state.tracks.find(track => track.id === id);
  }, [state.tracks]);

  const searchTracks = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return state.tracks.filter(track =>
      track.name.toLowerCase().includes(lowercaseQuery) ||
      track.artist?.toLowerCase().includes(lowercaseQuery) ||
      track.genre?.toLowerCase().includes(lowercaseQuery)
    );
  }, [state.tracks]);

  // Load tracks on mount
  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  // Additional methods expected by existing code
  const setMusicTracks = useCallback((tracks: MusicTrack[]) => {
    setState(prev => ({
      ...prev,
      tracks,
      musicTracks: tracks,
    }));
  }, []);

  const setSelectedTrackId = useCallback((id: string | null) => {
    setState(prev => ({
      ...prev,
      selectedTrackId: id,
      selectedTrackIds: id ? [id] : [],
    }));
  }, []);

  const setSelectedTrackIds = useCallback((ids: string[]) => {
    setState(prev => ({
      ...prev,
      selectedTrackIds: ids,
      selectedTrackId: ids.length > 0 ? ids[0] : null,
    }));
  }, []);

  const setTrackDescriptions = useCallback((descriptions: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
    setState(prev => ({
      ...prev,
      trackDescriptions: typeof descriptions === 'function' ? descriptions(prev.trackDescriptions) : descriptions,
    }));
  }, []);

  const setTrackGenres = useCallback((genres: Record<string, string>) => {
    setState(prev => ({
      ...prev,
      trackGenres: genres,
    }));
  }, []);

  const addTracks = useCallback(async (tracks: MusicTrack[]) => {
    setState(prev => {
      const newTracks = [...prev.tracks, ...tracks];
      return {
        ...prev,
        tracks: newTracks,
        musicTracks: newTracks,
      };
    });
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    setState(prev => {
      const filteredTracks = prev.tracks.filter(track => track.id !== trackId);
      return {
        ...prev,
        tracks: filteredTracks,
        musicTracks: filteredTracks,
        selectedTrackId: prev.selectedTrackId === trackId ? null : prev.selectedTrackId,
        selectedTrackIds: prev.selectedTrackIds.filter(id => id !== trackId),
      };
    });
  }, []);

  const removeTracks = useCallback((trackIds: string[]) => {
    setState(prev => {
      const filteredTracks = prev.tracks.filter(track => !trackIds.includes(track.id));
      return {
        ...prev,
        tracks: filteredTracks,
        musicTracks: filteredTracks,
        selectedTrackId: trackIds.includes(prev.selectedTrackId || '') ? null : prev.selectedTrackId,
        selectedTrackIds: prev.selectedTrackIds.filter(id => !trackIds.includes(id)),
      };
    });
  }, []);

  const reorderTracks = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      const newTracks = [...prev.tracks];
      const [movedTrack] = newTracks.splice(fromIndex, 1);
      newTracks.splice(toIndex, 0, movedTrack);
      return {
        ...prev,
        tracks: newTracks,
        musicTracks: newTracks,
      };
    });
  }, []);

  const updateTrackDuration = useCallback((trackId: string, duration: number) => {
    setState(prev => {
      const updatedTracks = prev.tracks.map(track =>
        track.id === trackId ? { ...track, duration } : track
      );
      return {
        ...prev,
        tracks: updatedTracks,
        musicTracks: updatedTracks,
      };
    });
  }, []);

  const clearAllTracks = useCallback(() => {
    setState(prev => ({
      ...prev,
      tracks: [],
      musicTracks: [],
      selectedTrackId: null,
      selectedTrackIds: [],
      trackDescriptions: {},
      trackGenres: {},
    }));
  }, []);

  const pushToBackend = useCallback(async (projectId: string) => {
    // TODO: Implement actual backend push
    return {
      musicTracks: state.tracks,
      trackDescriptions: state.trackDescriptions,
      trackGenres: state.trackGenres,
    };
  }, [state.tracks, state.trackDescriptions, state.trackGenres]);

  return {
    ...state,
    loadTracks,
    addTrack,
    updateTrack,
    deleteTrack,
    selectTrack,
    getTrackById,
    searchTracks,
    setMusicTracks,
    setSelectedTrackId,
    setSelectedTrackIds,
    setTrackDescriptions,
    setTrackGenres,
    addTracks,
    removeTrack,
    removeTracks,
    reorderTracks,
    updateTrackDuration,
    clearAllTracks,
    pushToBackend,
  };
}