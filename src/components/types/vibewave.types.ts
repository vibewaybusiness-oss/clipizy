export type Step = "UPLOAD" | "SETTINGS" | "PROMPT" | "OVERVIEW" | "GENERATING" | "PREVIEW";
export type GenerationMode = "upload" | "generate";

export interface Scene {
  id: number;
  description: string;
  startTime: number;
  endTime: number;
  label: string;
}

export interface PromptData {
  musicDescription?: string;
  videoDescription?: string;
  scenes?: Scene[];
}

export interface SettingsData {
  videoType: "looped-static" | "looped-animated" | "scenes";
  budget?: number[];
  user_price?: number;
  videoStyle?: string;
  animationStyle?: string;
  createIndividualVideos: boolean;
  createCompilation: boolean;
  useSameVideoForAll: boolean;
}

export interface OverviewData {
  channelAnimationFile?: any;
  animationHasAudio: boolean;
  startAudioDuringAnimation: boolean;
  introAnimationFile?: any;
  outroAnimationFile?: any;
  playMusicDuringIntro: boolean;
  playMusicDuringOutro: boolean;
  videoDescription: string;
  audioVisualizerEnabled: boolean;
  audioVisualizerPositionV?: string;
  audioVisualizerPositionH?: string;
  audioVisualizerSize?: string;
  audioVisualizerType?: string;
  audioTransition?: string;
  videoTransition?: string;
}

export interface ClipizyGeneratorState {
  step: Step;
  generationMode: GenerationMode;
  audioFile: File | null;
  audioUrl: string | null;
  audioDuration: number;
  generatedVideoUri: string | null;
  settings: SettingsData | null;
  prompts: PromptData | null;
  musicPrompt: string;
  vibeFile: File | null;
  channelAnimationFile: File | null;
  isGeneratingVideo: boolean;
  isGeneratingMusic: boolean;
}
