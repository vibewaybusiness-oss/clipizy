import { Scene } from './vibewave.types';

export interface WaveformVisualizerRef {
  generateWaveformImage: () => string | null;
  stopAudio: () => void;
}

export interface WaveformVisualizerProps {
  audioFile: File | null;
  scenes: Scene[];
  onScenesUpdate: (scenes: Scene[]) => void;
  showSceneControls?: boolean;
  onResetScenes?: () => void;
  musicTitle?: string;
}

export interface WaveformState {
  waveformData: number[];
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isLoading: boolean;
  selectedSceneId: number | null;
  draggingSceneId: number | null;
}
