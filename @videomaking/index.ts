// VIDEOMAKING CORE EXPORTS
export { VideoMaker } from './components/VideoMaker';
export { VideoEditor } from './components/VideoEditor';
export { VideoPreview } from './components/VideoPreview';
export { Timeline } from './components/Timeline';
export { AssetLibrary } from './components/AssetLibrary';
export { EffectsPanel } from './components/EffectsPanel';
export { AudioWaveform } from './components/AudioWaveform';
export { VideoCanvas } from './components/VideoCanvas';
export { ExportDialog } from './components/ExportDialog';

// TYPES
export type { VideoProject, VideoClip, AudioTrack, Effect, Transition } from './types';
export type { VideoMakerProps, VideoEditorProps, TimelineProps } from './types';

// HOOKS
export { useVideoEditor } from './hooks/useVideoEditor';
export { useTimeline } from './hooks/useTimeline';
export { useAssetLibrary } from './hooks/useAssetLibrary';
export { useExport } from './hooks/useExport';

// UTILITIES
export { videoUtils } from './utils/videoUtils';
export { audioUtils } from './utils/audioUtils';
export { exportUtils } from './utils/exportUtils';
