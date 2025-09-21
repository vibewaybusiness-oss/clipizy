import { ReactNode } from 'react';

export interface VideoProject {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  duration: number;
  resolution: VideoResolution;
  frameRate: number;
  clips: VideoClip[];
  audioTracks: AudioTrack[];
  effects: Effect[];
  transitions: Transition[];
  keyframes: Keyframe[];
  settings: ProjectSettings;
}

export interface VideoClip {
  id: string;
  name: string;
  type: 'video' | 'image' | 'text' | 'audio';
  source: string;
  startTime: number;
  duration: number;
  endTime: number;
  layer: number;
  effects: Effect[];
  transform: Transform;
  opacity: number;
  volume?: number;
  muted?: boolean;
  selected?: boolean;
}

export interface AudioTrack {
  id: string;
  name: string;
  source: string;
  startTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  effects: Effect[];
}

export interface Effect {
  id: string;
  name: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, any>;
  startTime?: number;
  duration?: number;
}

export interface Transition {
  id: string;
  name: string;
  type: TransitionType;
  duration: number;
  startTime: number;
  endTime: number;
  enabled: boolean;
  parameters: Record<string, any>;
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX: number;
  skewY: number;
}

export interface ProjectSettings {
  resolution: VideoResolution;
  frameRate: number;
  aspectRatio: string;
  backgroundColor: string;
  audioSampleRate: number;
  audioChannels: number;
}

export interface VideoResolution {
  width: number;
  height: number;
  name: string;
}

export type EffectType =
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'opacity'
  | 'scale'
  | 'rotation'
  | 'position'
  | 'crop'
  | 'colorize'
  | 'vignette'
  | 'noise'
  | 'sharpen'
  | 'glow'
  | 'shadow';

export type TransitionType =
  | 'fade'
  | 'slide'
  | 'wipe'
  | 'zoom'
  | 'rotate'
  | 'dissolve'
  | 'push'
  | 'reveal';

export interface VideoMakerProps {
  project?: VideoProject;
  onProjectChange?: (project: VideoProject) => void;
  onSave?: (project: VideoProject) => void;
  onExport?: (project: VideoProject, format: ExportFormat) => void;
  className?: string;
  children?: ReactNode;
}

export interface VideoEditorProps {
  project: VideoProject;
  onProjectChange: (project: VideoProject) => void;
  className?: string;
}

export interface TimelineProps {
  project: VideoProject;
  onProjectChange: (project: VideoProject) => void;
  currentTime: number;
  onTimeChange: (time: number) => void;
  className?: string;
  musicFile?: string;
}

export interface ExportFormat {
  name: string;
  extension: string;
  mimeType: string;
  resolution: VideoResolution;
  frameRate: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  codec: string;
}

export interface AssetItem {
  id: string;
  name: string;
  type: 'video' | 'image' | 'audio' | 'text';
  url: string;
  thumbnail?: string;
  duration?: number;
  size: number;
  createdAt: Date;
  tags: string[];
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text';
  clips: VideoClip[];
  height: number;
  locked: boolean;
  muted: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  muted: boolean;
}

export interface EditorState {
  selectedClips: string[];
  selectedTracks: string[];
  hoveredClip?: string;
  hoveredTrack?: string;
  zoom: number;
  scrollPosition: number;
  snapToGrid: boolean;
  gridSize: number;
}

export interface Keyframe {
  id: string;
  time: number;
  property: string;
  value: number;
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  enabled: boolean;
}
