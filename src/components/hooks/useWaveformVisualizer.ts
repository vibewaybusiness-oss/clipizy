import { useState, useRef, useEffect, useCallback } from 'react';
import { Scene } from '../types/clipizy.types';
import { generateWaveformData, drawWaveform } from '../utils/waveform.utils';

export const useWaveformVisualizer = (audioFile: File | null, scenes: Scene[], onScenesUpdate: (scenes: Scene[]) => void) => {
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData.length) return;
    drawWaveform(canvas, waveformData, currentTime, duration, scenes);
  }, [waveformData, currentTime, duration, scenes]);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);

  useEffect(() => {
    if (audioFile) {
      setIsLoading(true);
      generateWaveformData(audioFile)
        .then((data) => {
          setWaveformData(data);
          setDuration(data.length > 0 ? 0 : 0); // This should be set from audio duration
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [audioFile]);

  useEffect(() => {
    draw();
  }, [draw, scenes]);

  useEffect(() => {
    if (audioFile) {
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
      endTime: 0,
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

  return {
    // State
    waveformData,
    duration,
    currentTime,
    isPlaying,
    isLoading,
    selectedSceneId,
    draggingSceneId,
    
    // Refs
    canvasRef,
    audioRef,
    timelineRef,
    
    // Actions
    setSelectedSceneId,
    setDraggingSceneId,
    togglePlayback,
    handleAddScene,
    handleDeleteScene,
    handleTimelineClick,
    handlePinClick,
    stopAudio,
  };
};
