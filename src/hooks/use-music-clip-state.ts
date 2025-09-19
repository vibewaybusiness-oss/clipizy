import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SettingsSchema } from '@/components/vibewave-generator';

const PromptSchema = z.object({
  musicDescription: z.string().min(1, "Music description is required"),
  videoDescription: z.string().optional(),
  style: z.string().optional(),
  mood: z.string().optional(),
});

const OverviewSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// STATE INTERFACES
export interface MusicClipState {
  // Step management
  currentStep: 1 | 2 | 3 | 4;
  maxReachedStep: 1 | 2 | 3 | 4;
  
  // Audio state
  audioFile: File | null;
  audioUrl: string | null;
  audioDuration: number;
  
  // Music generation
  musicPrompt: string;
  musicTracksToGenerate: number;
  isInstrumental: boolean;
  isUploadingTracks: boolean;
  isGeneratingVideo: boolean;
  isLoadingExistingProject: boolean;
  
  // Settings and prompts
  settings: z.infer<typeof SettingsSchema> | null;
  prompts: any;
  
  // Descriptions - separate storage for individual vs shared
  sharedDescription: string;
  individualDescriptions: Record<string, string>;
  
  // UI state
  showGenreSelector: boolean;
  vibeFile: File | null;
  channelAnimationFile: File | null;
}

export interface MusicClipActions {
  // Step management
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
  setMaxReachedStep: (step: 1 | 2 | 3 | 4) => void;
  handleContinue: () => void;
  handleBack: () => void;
  handleReset: () => void;
  loadFromBackend: () => void;
  pushToBackend: (projectId?: string) => Promise<any>;
  
  // Audio state
  setAudioFile: (file: File | null) => void;
  setAudioUrl: (url: string | null) => void;
  setAudioDuration: (duration: number) => void;
  
  // Music generation
  setMusicPrompt: (prompt: string) => void;
  setMusicTracksToGenerate: (count: number) => void;
  setIsInstrumental: (isInstrumental: boolean) => void;
  setIsUploadingTracks: (isUploading: boolean) => void;
  setIsGeneratingVideo: (isGenerating: boolean) => void;
  setIsLoadingExistingProject: (isLoading: boolean) => void;
  
  // Settings and prompts
  setSettings: (settings: z.infer<typeof SettingsSchema>) => void;
  setPrompts: (prompts: any) => void;
  
  // Descriptions
  setSharedDescription: (description: string) => void;
  setIndividualDescriptions: (descriptions: Record<string, string>) => void;
  updateIndividualDescription: (trackId: string, description: string) => void;
  
  // UI state
  setShowGenreSelector: (show: boolean) => void;
  setVibeFile: (file: File | null) => void;
  setChannelAnimationFile: (file: File | null) => void;
}

export interface MusicClipForms {
  settingsForm: any;
  promptForm: any;
  overviewForm: any;
}

export function useMusicClipState(projectId?: string | null) {
  // STEP MANAGEMENT STATE
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(() => {
    if (typeof window !== 'undefined' && projectId) {
      const saved = localStorage.getItem(`musicClip_${projectId}_currentStep`);
      return saved ? parseInt(saved) as 1 | 2 | 3 | 4 : 1;
    }
    return 1;
  });
  const [maxReachedStep, setMaxReachedStep] = useState<1 | 2 | 3 | 4>(() => {
    if (typeof window !== 'undefined' && projectId) {
      const saved = localStorage.getItem(`musicClip_${projectId}_maxReachedStep`);
      return saved ? parseInt(saved) as 1 | 2 | 3 | 4 : 1;
    }
    return 1;
  });
  const [isInitialized, setIsInitialized] = useState(false);
  
  // AUDIO STATE
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && projectId) {
      return localStorage.getItem(`musicClip_${projectId}_audioUrl`) || null;
    }
    return null;
  });
  const [audioDuration, setAudioDuration] = useState<number>(() => {
    if (typeof window !== 'undefined' && projectId) {
      const saved = localStorage.getItem(`musicClip_${projectId}_audioDuration`);
      return saved ? parseFloat(saved) : 0;
    }
    return 0;
  });
  
  // Track previous audio URL for cleanup
  const previousAudioUrlRef = useRef<string | null>(null);
  
  // MUSIC GENERATION STATE
  const [musicPrompt, setMusicPrompt] = useState<string>('');
  const [musicTracksToGenerate, setMusicTracksToGenerate] = useState<number>(1);
  const [isInstrumental, setIsInstrumental] = useState<boolean>(false);
  const [isUploadingTracks, setIsUploadingTracks] = useState<boolean>(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [isLoadingExistingProject, setIsLoadingExistingProject] = useState<boolean>(false);
  
  // SETTINGS AND PROMPTS STATE
  const [settings, setSettings] = useState<z.infer<typeof SettingsSchema> | null>(() => {
    if (typeof window !== 'undefined' && projectId) {
      const saved = localStorage.getItem(`musicClip_${projectId}_settings`);
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [prompts, setPrompts] = useState<any>(() => {
    if (typeof window !== 'undefined' && projectId) {
      const saved = localStorage.getItem(`musicClip_${projectId}_prompts`);
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  
  // DESCRIPTION STATES - separate storage for individual vs shared
  const [sharedDescription, setSharedDescription] = useState<string>(() => {
    if (typeof window !== 'undefined' && projectId) {
      return localStorage.getItem(`musicClip_${projectId}_sharedDescription`) || '';
    }
    return '';
  });
  const [individualDescriptions, setIndividualDescriptions] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined' && projectId) {
      const saved = localStorage.getItem(`musicClip_${projectId}_individualDescriptions`);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  
  // UI STATE
  const [showGenreSelector, setShowGenreSelector] = useState<boolean>(false);
  const [vibeFile, setVibeFile] = useState<File | null>(null);
  const [channelAnimationFile, setChannelAnimationFile] = useState<File | null>(null);

  // FORM INSTANCES
  const settingsForm = useForm<z.infer<typeof SettingsSchema>>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: (() => {
      if (typeof window !== 'undefined' && projectId) {
        const saved = localStorage.getItem(`musicClip_${projectId}_settingsForm`);
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch (error) {
            console.warn('Failed to parse saved settings form data:', error);
          }
        }
      }
      return {
        videoType: "looped-static",
        budget: [100],
        videoStyle: 'cinematic',
        animationStyle: 'smooth',
        createIndividualVideos: false,
        createCompilation: true,
        useSameVideoForAll: false,
      };
    })(),
  });

  const promptForm = useForm<z.infer<typeof PromptSchema>>({
    resolver: zodResolver(PromptSchema),
    defaultValues: (() => {
      if (typeof window !== 'undefined' && projectId) {
        const saved = localStorage.getItem(`musicClip_${projectId}_promptForm`);
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch (error) {
            console.warn('Failed to parse saved prompt form data:', error);
          }
        }
      }
      return {
        musicDescription: '',
        videoDescription: '',
        style: 'cinematic',
        mood: 'energetic',
      };
    })(),
  });

  const overviewForm = useForm<z.infer<typeof OverviewSchema>>({
    resolver: zodResolver(OverviewSchema),
    defaultValues: (() => {
      if (typeof window !== 'undefined' && projectId) {
        const saved = localStorage.getItem(`musicClip_${projectId}_overviewForm`);
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch (error) {
            console.warn('Failed to parse saved overview form data:', error);
          }
        }
      }
      return {
        projectName: '',
        description: '',
        tags: [],
      };
    })(),
  });

  // PERSISTENCE: Save state changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      localStorage.setItem(`musicClip_${projectId}_currentStep`, currentStep.toString());
    }
  }, [currentStep, projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      localStorage.setItem(`musicClip_${projectId}_maxReachedStep`, maxReachedStep.toString());
    }
  }, [maxReachedStep, projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      if (audioUrl) {
        localStorage.setItem(`musicClip_${projectId}_audioUrl`, audioUrl);
      } else {
        localStorage.removeItem(`musicClip_${projectId}_audioUrl`);
      }
    }
  }, [audioUrl, projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      localStorage.setItem(`musicClip_${projectId}_audioDuration`, audioDuration.toString());
    }
  }, [audioDuration, projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      if (settings) {
        localStorage.setItem(`musicClip_${projectId}_settings`, JSON.stringify(settings));
      } else {
        localStorage.removeItem(`musicClip_${projectId}_settings`);
      }
    }
  }, [settings, projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      if (prompts) {
        localStorage.setItem(`musicClip_${projectId}_prompts`, JSON.stringify(prompts));
      } else {
        localStorage.removeItem(`musicClip_${projectId}_prompts`);
      }
    }
  }, [prompts, projectId]);

  // PERSISTENCE: Save description states to localStorage (real-time updates)
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      if (sharedDescription) {
        localStorage.setItem(`musicClip_${projectId}_sharedDescription`, sharedDescription);
      } else {
        localStorage.removeItem(`musicClip_${projectId}_sharedDescription`);
        console.log('Removed shared description from localStorage');
      }
    }
  }, [sharedDescription, projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      if (Object.keys(individualDescriptions).length > 0) {
        localStorage.setItem(`musicClip_${projectId}_individualDescriptions`, JSON.stringify(individualDescriptions));
      } else {
        localStorage.removeItem(`musicClip_${projectId}_individualDescriptions`);
        console.log('Removed individual descriptions from localStorage');
      }
    }
  }, [individualDescriptions, projectId]);

  // PERSISTENCE: Save form data changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      const subscription = settingsForm.watch((value) => {
        localStorage.setItem(`musicClip_${projectId}_settingsForm`, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [settingsForm, projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      const subscription = promptForm.watch((value) => {
        localStorage.setItem(`musicClip_${projectId}_promptForm`, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [promptForm, projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      const subscription = overviewForm.watch((value) => {
        localStorage.setItem(`musicClip_${projectId}_overviewForm`, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [overviewForm, projectId]);
  
  // Clean up blob URLs when audioUrl changes - but be more careful about timing
  useEffect(() => {
    const previousUrl = previousAudioUrlRef.current;
    if (previousUrl && previousUrl.startsWith('blob:') && previousUrl !== audioUrl) {
      // Add a small delay to ensure any ongoing audio operations complete
      const timeoutId = setTimeout(() => {
        try {
          URL.revokeObjectURL(previousUrl);
        } catch (error) {
          console.warn('Failed to revoke previous audio blob URL:', error);
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
    previousAudioUrlRef.current = audioUrl;
  }, [audioUrl]);
  
  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(audioUrl);
        } catch (error) {
          console.warn('Failed to revoke audio blob URL on unmount:', error);
        }
      }
    };
  }, []); // Empty dependency array to only run on unmount

  // ACTIONS
  const handleContinue = useCallback(() => {
    console.log('useMusicClipState handleContinue called, currentStep:', currentStep);
    if (currentStep < 4) {
      const nextStep = (currentStep + 1) as 1 | 2 | 3 | 4;
      console.log('useMusicClipState setting next step:', nextStep);
      setCurrentStep(nextStep);
      setMaxReachedStep(Math.max(maxReachedStep, nextStep) as 1 | 2 | 3 | 4);
    }
  }, [currentStep, maxReachedStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4);
    }
  }, [currentStep]);

  const loadFromBackend = useCallback(() => {
    if (typeof window === 'undefined' || isInitialized) return;
    
    // This function will be called by the parent component when backend data is available
    // It's a placeholder for when we need to override localStorage with backend data
    setIsInitialized(true);
  }, [isInitialized]);

  const pushToBackend = useCallback(async (projectId?: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      // This function will be called by the parent component to push current state to backend
      // The actual implementation will be in the parent component with access to API calls
      console.log('Pushing current state to backend...', {
        currentStep,
        maxReachedStep,
        settings,
        prompts,
        audioUrl,
        audioDuration
      });
      
      return {
        currentStep,
        maxReachedStep,
        settings,
        prompts,
        sharedDescription,
        individualDescriptions,
        audioUrl,
        audioDuration,
        settingsForm: settingsForm.getValues(),
        promptForm: promptForm.getValues(),
        overviewForm: overviewForm.getValues()
      };
    } catch (error) {
      console.error('Failed to prepare data for backend push:', error);
      throw error;
    }
  }, [currentStep, maxReachedStep, settings, prompts, audioUrl, audioDuration, settingsForm, promptForm, overviewForm]);

  const handleReset = useCallback(() => {
    // Clean up current audio URL if it's a blob
    if (audioUrl && audioUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch (error) {
        console.warn('Failed to revoke audio blob URL during reset:', error);
      }
    }
    
    setCurrentStep(1);
    setMaxReachedStep(1);
    setAudioFile(null);
    setAudioUrl(null);
    setAudioDuration(0);
    setMusicPrompt('');
    setMusicTracksToGenerate(1);
    setIsInstrumental(false);
    setIsUploadingTracks(false);
    setSettings(null);
    setPrompts(null);
    setSharedDescription('');
    setIndividualDescriptions({});
    setShowGenreSelector(false);
    setVibeFile(null);
    setChannelAnimationFile(null);
    
    // Clear localStorage
    if (typeof window !== 'undefined' && projectId) {
      localStorage.removeItem(`musicClip_${projectId}_currentStep`);
      localStorage.removeItem(`musicClip_${projectId}_maxReachedStep`);
      localStorage.removeItem(`musicClip_${projectId}_audioUrl`);
      localStorage.removeItem(`musicClip_${projectId}_audioDuration`);
      localStorage.removeItem(`musicClip_${projectId}_settings`);
      localStorage.removeItem(`musicClip_${projectId}_prompts`);
      localStorage.removeItem(`musicClip_${projectId}_sharedDescription`);
      localStorage.removeItem(`musicClip_${projectId}_individualDescriptions`);
      localStorage.removeItem(`musicClip_${projectId}_settingsForm`);
      localStorage.removeItem(`musicClip_${projectId}_promptForm`);
      localStorage.removeItem(`musicClip_${projectId}_overviewForm`);
      localStorage.removeItem(`musicClip_${projectId}_musicTracks`);
      localStorage.removeItem(`musicClip_${projectId}_selectedTrackId`);
      localStorage.removeItem(`musicClip_${projectId}_selectedTrackIds`);
      localStorage.removeItem(`musicClip_${projectId}_trackDescriptions`);
      localStorage.removeItem(`musicClip_${projectId}_trackGenres`);
    }
    
    // Reset forms
    settingsForm.reset();
    promptForm.reset();
    overviewForm.reset();
  }, [audioUrl, settingsForm, promptForm, overviewForm, projectId]);

  // MEMOIZED STATE AND ACTIONS
  const state: MusicClipState = useMemo(() => ({
    currentStep,
    maxReachedStep,
    audioFile,
    audioUrl,
    audioDuration,
    musicPrompt,
    musicTracksToGenerate,
    isInstrumental,
    isUploadingTracks,
    isGeneratingVideo,
    isLoadingExistingProject,
    settings,
    prompts,
    sharedDescription,
    individualDescriptions,
    showGenreSelector,
    vibeFile,
    channelAnimationFile,
  }), [
    currentStep,
    maxReachedStep,
    audioFile,
    audioUrl,
    audioDuration,
    musicPrompt,
    musicTracksToGenerate,
    isInstrumental,
    isUploadingTracks,
    isGeneratingVideo,
    isLoadingExistingProject,
    settings,
    prompts,
    sharedDescription,
    individualDescriptions,
    showGenreSelector,
    vibeFile,
    channelAnimationFile,
  ]);

  const actions: MusicClipActions = useMemo(() => ({
    setCurrentStep,
    setMaxReachedStep,
    handleContinue,
    handleBack,
    handleReset,
    loadFromBackend,
    pushToBackend,
    setAudioFile,
    setAudioUrl,
    setAudioDuration,
    setMusicPrompt,
    setMusicTracksToGenerate,
    setIsInstrumental,
    setIsUploadingTracks,
    setIsGeneratingVideo,
    setIsLoadingExistingProject,
    setSettings,
    setPrompts,
    setSharedDescription,
    setIndividualDescriptions,
    updateIndividualDescription: (trackId: string, description: string) => {
      setIndividualDescriptions(prev => ({
        ...prev,
        [trackId]: description
      }));
    },
    setShowGenreSelector,
    setVibeFile,
    setChannelAnimationFile,
  }), [
    handleContinue,
    handleBack,
    handleReset,
    loadFromBackend,
    pushToBackend,
  ]);

  const forms: MusicClipForms = useMemo(() => ({
    settingsForm,
    promptForm,
    overviewForm,
  }), [settingsForm, promptForm, overviewForm]);

  return {
    state,
    actions,
    forms,
  };
}

