"use client";

import { useState, useCallback, useEffect } from 'react';

interface MusicClipState {
  id: string;
  name: string;
  audioFile: File | null;
  audioUrl: string | null;
  audioDuration: number;
  duration: number;
  genre: string;
  mood: string;
  style: string;
  theme: string;
  budget: number;
  sceneCount: number;
  generatedPrompts: string[];
  videoUrl: string | null;
  thumbnailUrl: string | null;
  status: 'draft' | 'processing' | 'completed' | 'error';
  currentStep: number;
  maxReachedStep: number;
  settings: any;
  prompts: any;
  sharedDescription: string;
  musicPrompt: string;
  musicTracksToGenerate: number;
  vibeFile: File | null;
  isLoadingExistingProject: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MusicClipStateHook {
  state: MusicClipState;
  loading: boolean;
  error: string | null;
  updateState: (updates: Partial<MusicClipState>) => void;
  resetState: () => void;
  saveState: () => Promise<void>;
  loadState: (id: string) => Promise<void>;
  setAudioFile: (file: File) => void;
  setAudioUrl: (url: string) => void;
  addGeneratedPrompt: (prompt: string) => void;
  removeGeneratedPrompt: (index: number) => void;
  setVideoUrl: (url: string) => void;
  setThumbnailUrl: (url: string) => void;
  setStatus: (status: MusicClipState['status']) => void;
  actions: {
    setAudioDuration: (duration: number) => void;
    setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
    setMaxReachedStep: (step: 1 | 2 | 3 | 4) => void;
    handleReset: () => void;
    pushToBackend: (projectId: string) => Promise<any>;
  };
}

const defaultState: MusicClipState = {
  id: '',
  name: '',
  audioFile: null,
  audioUrl: null,
  audioDuration: 0,
  duration: 0,
  genre: '',
  mood: '',
  style: '',
  theme: '',
  budget: 10,
  sceneCount: 1,
  generatedPrompts: [],
  videoUrl: null,
  thumbnailUrl: null,
  status: 'draft',
  currentStep: 1,
  maxReachedStep: 1,
  settings: null,
  prompts: null,
  sharedDescription: '',
  musicPrompt: '',
  musicTracksToGenerate: 1,
  vibeFile: null,
  isLoadingExistingProject: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function useMusicClipState(initialId?: string): MusicClipStateHook {
  const [state, setState] = useState<MusicClipState>(defaultState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateState = useCallback((updates: Partial<MusicClipState>) => {
    setState(prev => ({
      ...prev,
      ...updates,
      updatedAt: new Date(),
    }));
  }, []);

  const resetState = useCallback(() => {
    setState(defaultState);
    setError(null);
  }, []);

  const saveState = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      const stateToSave = {
        ...state,
        id: state.id || Date.now().toString(),
      };
      
      // Save to localStorage for now
      if (typeof window !== 'undefined') {
        localStorage.setItem(`musicClip_${stateToSave.id}`, JSON.stringify(stateToSave));
      }
      
      setState(stateToSave);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save state');
    } finally {
      setLoading(false);
    }
  }, [state]);

  const loadState = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      // Load from localStorage for now
      if (typeof window !== 'undefined') {
        const savedState = localStorage.getItem(`musicClip_${id}`);
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          setState(parsedState);
      } else {
          throw new Error('State not found');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load state');
    } finally {
      setLoading(false);
    }
  }, []);

  const setAudioFile = useCallback((file: File) => {
    updateState({ audioFile: file });
  }, [updateState]);

  const setAudioUrl = useCallback((url: string) => {
    updateState({ audioUrl: url });
  }, [updateState]);

  const addGeneratedPrompt = useCallback((prompt: string) => {
    setState(prev => ({
      ...prev,
      generatedPrompts: [...prev.generatedPrompts, prompt],
      updatedAt: new Date(),
    }));
  }, []);

  const removeGeneratedPrompt = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      generatedPrompts: prev.generatedPrompts.filter((_, i) => i !== index),
      updatedAt: new Date(),
    }));
  }, []);

  const setVideoUrl = useCallback((url: string) => {
    updateState({ videoUrl: url });
  }, [updateState]);

  const setThumbnailUrl = useCallback((url: string) => {
    updateState({ thumbnailUrl: url });
  }, [updateState]);

  const setStatus = useCallback((status: MusicClipState['status']) => {
    updateState({ status });
  }, [updateState]);

  // Load initial state if ID is provided
  useEffect(() => {
    if (initialId) {
      loadState(initialId);
    }
  }, [initialId, loadState]);

  // Auto-save state changes
  useEffect(() => {
    if (state.id && state !== defaultState) {
      const timeoutId = setTimeout(() => {
        saveState();
      }, 1000); // Debounce saves

      return () => clearTimeout(timeoutId);
    }
  }, [state, saveState]);

  // Additional methods expected by existing code
  const setAudioDuration = useCallback((duration: number) => {
    updateState({ audioDuration: duration });
  }, [updateState]);

  const setCurrentStep = useCallback((step: 1 | 2 | 3 | 4) => {
    updateState({ currentStep: step });
  }, [updateState]);

  const setMaxReachedStep = useCallback((step: 1 | 2 | 3 | 4) => {
    updateState({ maxReachedStep: step });
  }, [updateState]);

  const handleReset = useCallback(() => {
    setState(defaultState);
    setError(null);
  }, []);

  const pushToBackend = useCallback(async (projectId: string) => {
    // TODO: Implement actual backend push
    return {
      settings: state.settings,
      prompts: state.prompts,
      sharedDescription: state.sharedDescription,
      musicPrompt: state.musicPrompt,
      musicTracksToGenerate: state.musicTracksToGenerate,
      vibeFile: state.vibeFile,
    };
  }, [state]);

  return {
    state,
    loading,
    error,
    updateState,
    resetState,
    saveState,
    loadState,
    setAudioFile,
    setAudioUrl,
    addGeneratedPrompt,
    removeGeneratedPrompt,
    setVideoUrl,
    setThumbnailUrl,
    setStatus,
    actions: {
      setAudioDuration,
      setCurrentStep,
      setMaxReachedStep,
      handleReset,
      pushToBackend,
    },
  };
}