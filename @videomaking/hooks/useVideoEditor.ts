import { useState, useCallback, useRef, useEffect } from 'react';
import { VideoProject, VideoClip, Effect, Transition, AudioTrack, Keyframe } from '../types';

interface UseVideoEditorReturn {
  project: VideoProject;
  setProject: (project: VideoProject) => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  addClip: (clip: Omit<VideoClip, 'id'>) => void;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<VideoClip>) => void;
  addEffect: (effect: Omit<Effect, 'id'>) => void;
  removeEffect: (effectId: string) => void;
  updateEffect: (effectId: string, updates: Partial<Effect>) => void;
  addTransition: (transition: Omit<Transition, 'id'>) => void;
  removeTransition: (transitionId: string) => void;
  updateTransition: (transitionId: string, updates: Partial<Transition>) => void;
  addAudioTrack: (track: Omit<AudioTrack, 'id'>) => void;
  removeAudioTrack: (trackId: string) => void;
  updateAudioTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  addKeyframe: (keyframe: Omit<Keyframe, 'id'>) => void;
  removeKeyframe: (keyframeId: string) => void;
  updateKeyframe: (keyframeId: string, updates: Partial<Keyframe>) => void;
}

export function useVideoEditor(initialProject?: VideoProject): UseVideoEditorReturn {
  const [project, setProject] = useState<VideoProject>(
    initialProject || createDefaultProject()
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const duration = project.duration;

  // Playback controls
  const play = useCallback(() => {
    setIsPlaying(true);
    lastTimeRef.current = 0;
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const seek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, duration)));
  }, [duration]);

  // Animation loop
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

  // Clip management
  const addClip = useCallback((clipData: Omit<VideoClip, 'id'>) => {
    const newClip: VideoClip = {
      ...clipData,
      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setProject(prev => ({
      ...prev,
      clips: [...prev.clips, newClip],
      updatedAt: new Date()
    }));
  }, []);

  const removeClip = useCallback((clipId: string) => {
    setProject(prev => ({
      ...prev,
      clips: prev.clips.filter(clip => clip.id !== clipId),
      updatedAt: new Date()
    }));
  }, []);

  const updateClip = useCallback((clipId: string, updates: Partial<VideoClip>) => {
    setProject(prev => ({
      ...prev,
      clips: prev.clips.map(clip =>
        clip.id === clipId ? { ...clip, ...updates } : clip
      ),
      updatedAt: new Date()
    }));
  }, []);

  // Effect management
  const addEffect = useCallback((effectData: Omit<Effect, 'id'>) => {
    const newEffect: Effect = {
      ...effectData,
      id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setProject(prev => ({
      ...prev,
      effects: [...prev.effects, newEffect],
      updatedAt: new Date()
    }));
  }, []);

  const removeEffect = useCallback((effectId: string) => {
    setProject(prev => ({
      ...prev,
      effects: prev.effects.filter(effect => effect.id !== effectId),
      updatedAt: new Date()
    }));
  }, []);

  const updateEffect = useCallback((effectId: string, updates: Partial<Effect>) => {
    setProject(prev => ({
      ...prev,
      effects: prev.effects.map(effect =>
        effect.id === effectId ? { ...effect, ...updates } : effect
      ),
      updatedAt: new Date()
    }));
  }, []);

  // Transition management
  const addTransition = useCallback((transitionData: Omit<Transition, 'id'>) => {
    const newTransition: Transition = {
      ...transitionData,
      id: `transition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setProject(prev => ({
      ...prev,
      transitions: [...prev.transitions, newTransition],
      updatedAt: new Date()
    }));
  }, []);

  const removeTransition = useCallback((transitionId: string) => {
    setProject(prev => ({
      ...prev,
      transitions: prev.transitions.filter(transition => transition.id !== transitionId),
      updatedAt: new Date()
    }));
  }, []);

  const updateTransition = useCallback((transitionId: string, updates: Partial<Transition>) => {
    setProject(prev => ({
      ...prev,
      transitions: prev.transitions.map(transition =>
        transition.id === transitionId ? { ...transition, ...updates } : transition
      ),
      updatedAt: new Date()
    }));
  }, []);

  // Audio track management
  const addAudioTrack = useCallback((trackData: Omit<AudioTrack, 'id'>) => {
    const newTrack: AudioTrack = {
      ...trackData,
      id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setProject(prev => ({
      ...prev,
      audioTracks: [...prev.audioTracks, newTrack],
      updatedAt: new Date()
    }));
  }, []);

  const removeAudioTrack = useCallback((trackId: string) => {
    setProject(prev => ({
      ...prev,
      audioTracks: prev.audioTracks.filter(track => track.id !== trackId),
      updatedAt: new Date()
    }));
  }, []);

  const updateAudioTrack = useCallback((trackId: string, updates: Partial<AudioTrack>) => {
    setProject(prev => ({
      ...prev,
      audioTracks: prev.audioTracks.map(track =>
        track.id === trackId ? { ...track, ...updates } : track
      ),
      updatedAt: new Date()
    }));
  }, []);

  // Keyframe functions
  const addKeyframe = useCallback((keyframeData: Omit<Keyframe, 'id'>) => {
    const newKeyframe: Keyframe = {
      ...keyframeData,
      id: `keyframe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setProject(prev => ({
      ...prev,
      keyframes: [...prev.keyframes, newKeyframe],
      updatedAt: new Date()
    }));
  }, []);

  const removeKeyframe = useCallback((keyframeId: string) => {
    setProject(prev => ({
      ...prev,
      keyframes: prev.keyframes.filter(keyframe => keyframe.id !== keyframeId),
      updatedAt: new Date()
    }));
  }, []);

  const updateKeyframe = useCallback((keyframeId: string, updates: Partial<Keyframe>) => {
    setProject(prev => ({
      ...prev,
      keyframes: prev.keyframes.map(keyframe =>
        keyframe.id === keyframeId ? { ...keyframe, ...updates } : keyframe
      ),
      updatedAt: new Date()
    }));
  }, []);

  return {
    project,
    setProject,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setPlaybackRate,
    addClip,
    removeClip,
    updateClip,
    addEffect,
    removeEffect,
    updateEffect,
    addTransition,
    removeTransition,
    updateTransition,
    addAudioTrack,
    removeAudioTrack,
    updateAudioTrack,
    addKeyframe,
    removeKeyframe,
    updateKeyframe
  };
}

function createDefaultProject(): VideoProject {
  return {
    id: `project-${Date.now()}`,
    name: 'Untitled Project',
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    duration: 30,
    resolution: { width: 1920, height: 1080, name: '1080p' },
    frameRate: 30,
    clips: [],
    audioTracks: [],
    effects: [],
    transitions: [],
    keyframes: [],
    settings: {
      resolution: { width: 1920, height: 1080, name: '1080p' },
      frameRate: 30,
      aspectRatio: '16:9',
      backgroundColor: '#000000',
      audioSampleRate: 44100,
      audioChannels: 2
    }
  };
}
