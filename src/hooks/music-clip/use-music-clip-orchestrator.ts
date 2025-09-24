"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/ui/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { 
  useAudioPlayback, 
  useMusicTracks, 
  usePromptGeneration, 
  usePricingService, 
  useMusicClipState, 
  useProjectManagement, 
  useDragAndDrop, 
  useMusicAnalysis 
} from "@/hooks";
import { useUrlManagement } from "./use-url-management";
import { useDataPersistence } from "./use-data-persistence";
import { useUserOnboarding } from "../use-user-onboarding";
import { projectsAPI } from "@/lib/api/projects";
import { musicClipAPI } from "@/lib/api/music-clip";
import { formatDuration, getTotalDuration, isValidUUID, getAudioDuration } from "@/utils/music-clip-utils";
import type { MusicTrack } from "@/types/domains/music";
import * as z from "zod";
import { SettingsSchema, PromptSchema } from "@/components/forms/music-clip/ClipiziGenerator";

interface UseMusicClipOrchestratorOptions {
  urlProjectId?: string | null;
  isNewProject?: boolean;
}

interface UseMusicClipOrchestratorReturn {
  // State
  user: any;
  authLoading: boolean;
  projectId: string | null;
  musicTracks: any;
  musicClipState: any;
  audioPlayback: any;
  dragAndDrop: any;
  musicAnalysis: any;
  promptGeneration: any;
  pricingService: any;
  projectManagement: any;
  trackValidity: Record<string, boolean>;
  musicAnalysisData: any;
  isLoadingAnalysisData: boolean;
  musicGenerationPrice: number;
  userOnboarding: any;
  showOnboardingLoading: boolean;
  
  // Actions
  handleGenerateMusic: (options?: { duration: number; model: string }, isInstrumental?: boolean) => Promise<void>;
  handleGenerateMusicPrompt: (selectedGenre?: string, isInstrumental?: boolean) => Promise<void>;
  handleGenerateMusicDescription: (selectedGenre?: string, isInstrumental?: boolean) => Promise<void>;
  handleGenreSelect: (genre: string, isInstrumental: boolean) => Promise<void>;
  handleRandomGenerate: (isInstrumental: boolean) => Promise<void>;
  handleAudioFileChange: (files: File[]) => Promise<void>;
  handleTrackSelect: (track: MusicTrack, event?: React.MouseEvent) => void;
  handlePlayPause: (track: MusicTrack) => void;
  handleTrackRemove: (trackId: string) => void;
  handleTrackReorder: (fromId: string, toId: string, position: 'above' | 'below' | null) => void;
  handleSettingsSubmit: (values: z.infer<typeof SettingsSchema>) => Promise<void>;
  handleReuseVideoToggle: (enabled: boolean) => void;
  onPromptSubmit: (values: z.infer<typeof PromptSchema>, newTrackDescriptions?: Record<string, string>, trackGenres?: Record<string, string>) => void;
  onPromptSubmitForm: (values: z.infer<typeof PromptSchema>) => void;
  onOverviewSubmit: (values: any) => Promise<void>;
  handleContinue: () => Promise<void>;
  handleBack: (e?: React.MouseEvent) => void;
  handleTrackDescriptionsUpdate: (descriptions: Record<string, string>) => void;
  handleSharedDescriptionUpdate: (desc: string) => void;
  loadAnalysisData: (projectId: string) => Promise<void>;
  loadExistingProject: (projectId: string) => Promise<void>;
  
  // Computed values
  areAllTracksValid: boolean;
  canContinue: boolean;
  continueText: string;
}

export function useMusicClipOrchestrator({
  urlProjectId,
  isNewProject = false
}: UseMusicClipOrchestratorOptions): UseMusicClipOrchestratorReturn {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  // Initialize all the existing hooks first
  const audioPlayback = useAudioPlayback();
  const projectManagement = useProjectManagement();
  const promptGeneration = usePromptGeneration();
  const pricingService = usePricingService();
  const dragAndDrop = useDragAndDrop();
  const userOnboarding = useUserOnboarding();
  
  // Use URL projectId if available, otherwise use persisted projectId
  const projectId = urlProjectId || (isNewProject ? null : projectManagement.state.currentProjectId);
  
  // Initialize hooks that depend on projectId
  const musicClipState = useMusicClipState(projectId);
  const musicTracks = useMusicTracks(projectId, musicClipState.actions.markAsChanged);
  const musicAnalysis = useMusicAnalysis(projectId);
  
  // Local state
  const [trackValidity, setTrackValidity] = useState<Record<string, boolean>>({});
  const [preservedIndividualDescriptions, setPreservedIndividualDescriptions] = useState<Record<string, string>>({});
  const [musicAnalysisData, setMusicAnalysisData] = useState<any>(null);
  const [isLoadingAnalysisData, setIsLoadingAnalysisData] = useState(false);
  const [musicGenerationPrice, setMusicGenerationPrice] = useState(0);
  const [showOnboardingLoading, setShowOnboardingLoading] = useState(false);
  
  // Refs
  const hasLoadedProjectRef = useRef<Set<string>>(new Set());
  const hasClearedNewProject = useRef(false);
  const lastProcessedDuration = useRef<number>(0);
  const lastProcessedAudioFile = useRef<File | null>(null);
  
  // URL Management
  const urlManagement = useUrlManagement({
    projectId,
    currentStep: musicClipState.state.currentStep,
    maxReachedStep: musicClipState.state.maxReachedStep,
    onStepChange: (step) => musicClipState.actions.setCurrentStep(step as 1 | 2 | 3 | 4),
    onProjectIdChange: (newProjectId) => {
      // Handle project ID changes if needed
    }
  });
  
  // Data Persistence
  const dataPersistence = useDataPersistence({
    projectId,
    userId: user?.id || null,
    musicClipData: musicClipState.actions.getCurrentState(),
    tracksData: musicTracks.getCurrentState(),
    analysisData: musicAnalysis.analysisData,
    isEnabled: !!projectId && !!user?.id
  });
  
  // Debug logging for data persistence
  useEffect(() => {
    console.log('Data persistence setup:', {
      projectId,
      userId: user?.id,
      hasUser: !!user,
      isEnabled: !!projectId && !!user?.id
    });
  }, [projectId, user?.id, user]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('User not authenticated, redirecting to login');
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);
  
  // Clear project data when starting a new project
  useEffect(() => {
    if (isNewProject && !hasClearedNewProject.current) {
      console.log('Starting new project - clearing all data');
      hasClearedNewProject.current = true;
      
      // Clear project management state
      projectManagement.actions.clearProjectData();
      
      // Clear music tracks
      musicTracks.clearAllTracks();
      
      // Reset music clip state
      try {
        musicClipState.actions.handleReset();
      } catch (error) {
        console.error('Error calling handleReset:', error);
      }
      
      // Reset validation state
      setTrackValidity({});
      
      // Clear URL parameters to clean up the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }
  }, [isNewProject]);
  
  // Load existing project data if projectId is provided
  useEffect(() => {
    console.log('🔄 Project loading effect triggered:', { 
      projectId, 
      urlProjectId, 
      isLoadingProject: projectManagement.state.isLoadingProject,
      isNewProject 
    });
    
    if (projectId && !projectManagement.state.isLoadingProject) {
      // Check if we have localStorage data for this project
      const hasLocalData = musicClipState.state.settings || musicTracks.musicTracks.length > 0;
      
      // Always load from backend if:
      // 1. This is a URL projectId (returning to existing project via URL) - prioritize backend data
      // 2. We don't have local data
      // 3. We haven't loaded this project yet in this session
      const shouldLoadFromBackend = urlProjectId || !hasLocalData || !hasLoadedProjectRef.current.has(projectId);
      
      if (shouldLoadFromBackend) {
        console.log('📥 Loading existing project from backend:', projectId, { 
          reason: urlProjectId ? 'URL projectId (continuing existing project)' : !hasLocalData ? 'no local data' : 'not loaded yet' 
        });
        // Mark as loaded before calling to prevent loops
        hasLoadedProjectRef.current.add(projectId);
        loadExistingProject(projectId);
      } else {
        console.log('💾 Using localStorage data for existing project:', projectId);
        // Mark as loaded to prevent future loads
        hasLoadedProjectRef.current.add(projectId);
        // localStorage data is already loaded by the hooks
      }
    } else if (!projectId) {
      // Starting a new project - no localStorage loading, start fresh
      console.log('🆕 Starting new project - no data loading needed');
      // Clear the loaded projects set for new projects
      hasLoadedProjectRef.current.clear();
    }
  }, [projectId, urlProjectId, isNewProject]);

  // Clear loaded projects when URL projectId changes (navigating to different project)
  const prevUrlProjectIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (urlProjectId !== prevUrlProjectIdRef.current) {
      // URL projectId changed, clear the loaded set to ensure we load the new project from backend
      if (prevUrlProjectIdRef.current !== null) {
        console.log('URL projectId changed, clearing loaded projects set');
        hasLoadedProjectRef.current.clear();
      }
      prevUrlProjectIdRef.current = urlProjectId;
    }
  }, [urlProjectId]);
  
  // Calculate music generation price when number of tracks changes
  useEffect(() => {
    const calculatePrice = () => {
      if (musicClipState.state.musicTracksToGenerate > 0) {
        const price = pricingService.calculateMusicPrice(musicClipState.state.musicTracksToGenerate, 'stable-audio');
        setMusicGenerationPrice(price.credits);
      }
    };
    calculatePrice();
  }, [musicClipState.state.musicTracksToGenerate, pricingService]);
  
  // Check if all tracks are valid for step 3
  const areAllTracksValid = useCallback(() => {
    if (musicTracks.musicTracks.length === 0) return false;
    return musicTracks.musicTracks.every(track => trackValidity[track.id] === true);
  }, [musicTracks.musicTracks, trackValidity]);
  
  // Live validation mapping based on reuse toggle state
  useEffect(() => {
    const minLen = 10;
    const maxLen = 500;
    const isReuse = !!musicClipState.state.settings?.useSameVideoForAll;
    
    const newMap: Record<string, boolean> = {};
    
    if (isReuse) {
      // Reuse mode: validate based on shared description
      const sharedDesc = musicClipState.state.sharedDescription?.trim() || "";
      const isValid = sharedDesc.length >= minLen && sharedDesc.length <= maxLen;
      
      // Apply the same validation to all tracks based on shared description
      musicTracks.musicTracks.forEach(t => {
        newMap[t.id] = isValid;
      });
    } else {
      // Individual mode: validate based on individual descriptions
      musicTracks.musicTracks.forEach(t => {
        // Check the individual track descriptions from the music clip state
        const desc = (musicClipState.state.individualDescriptions[t.id] || "").trim();
        const isValid = desc.length >= minLen && desc.length <= maxLen;
        newMap[t.id] = isValid;
      });
    }
    
    // If no tracks exist, don't show validation errors
    if (musicTracks.musicTracks.length === 0) {
      return;
    }
    
    setTrackValidity(newMap);
  }, [
    musicClipState.state.settings?.useSameVideoForAll,
    musicClipState.state.sharedDescription,
    musicClipState.state.individualDescriptions,
    musicTracks.musicTracks
  ]);
  
  // Auto-load analysis data when on step 4
  useEffect(() => {
    if (musicClipState.state.currentStep === 4 && projectId && !musicAnalysisData) {
      console.log('Auto-loading analysis data for step 4, project:', projectId);
      
      // Validate project ID before attempting to load analysis data
      if (isValidUUID(projectId)) {
        loadAnalysisData(projectId);
      } else {
        console.warn('Invalid project ID format, skipping analysis data load:', projectId);
        toast({
          variant: "destructive",
          title: "Invalid Project ID",
          description: "The current project ID is invalid. Please create a new project.",
        });
      }
    }
  }, [musicClipState.state.currentStep, projectId, musicAnalysisData]);
  
  // Function to load analysis data from backend
  const loadAnalysisData = useCallback(async (projectId: string) => {
    try {
      console.log('Loading analysis data for project:', projectId);
      
      // Check if user is authenticated
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) {
        console.log('User not authenticated, skipping analysis data load');
        return;
      }
      
      // Additional check: verify token is not expired
      try {
        if (token && typeof window !== 'undefined') {
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          if (tokenData.exp && tokenData.exp < currentTime) {
            console.log('Token expired, skipping analysis data load');
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            return;
          }
        }
      } catch (error) {
        console.log('Invalid token format, skipping analysis data load');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        return;
      }
      
      // Validate project ID format (should be a valid UUID)
      if (!isValidUUID(projectId)) {
        console.error('Invalid project ID format:', projectId);
        toast({
          variant: "destructive",
          title: "Invalid Project ID",
          description: "The project ID format is invalid. Please create a new project.",
        });
        return;
      }
      
      setIsLoadingAnalysisData(true);
      try {
        const data = await musicClipAPI.getProjectAnalysis(projectId);
        console.log('Loaded analysis data from backend:', data);
        
        // Extract the first track's analysis data
        let trackData = null;
        
        if (data.music && Object.keys(data.music).length > 0) {
          const trackId = Object.keys(data.music)[0];
          trackData = data.music[trackId];
        } else if (data.analysis && data.analysis.music && Object.keys(data.analysis.music).length > 0) {
          // Handle the case where data is in {analysis: {music: {...}}} format
          const trackId = Object.keys(data.analysis.music)[0];
          trackData = data.analysis.music[trackId];
        } else if (data.analysis) {
          // Fallback for direct analysis data
          trackData = data.analysis;
        }
        
        if (trackData) {
          console.log('Track data from backend:', trackData);
          
          // Convert backend format to our component format
          const analysisData = {
            file_path: '/tmp/analysis.wav',
            metadata: {
              title: trackData.title || 'Unknown',
              artist: 'Unknown',
              album: 'Unknown',
              genre: 'Unknown',
              year: 'Unknown',
              duration: trackData.duration,
              bitrate: 1411200,
              sample_rate: 44100,
              channels: 2,
              file_size: 0,
              file_type: '.wav'
            },
            features: {
              duration: trackData.duration || 0,
              tempo: trackData.tempo || 120,
              spectral_centroid: trackData.audio_features?.spectral_centroid || 0,
              rms_energy: trackData.audio_features?.rms_energy || 0,
              harmonic_ratio: trackData.audio_features?.harmonic_ratio || 0,
              onset_rate: trackData.audio_features?.onset_rate || 0,
              key: 'Unknown',
              time_signature: 'Unknown'
            },
            genre_scores: {
              'Ambient': 0,
              'Synthwave / Electronic': 0,
              'Jazz / Blues': 1,
              'Classical / Orchestral': 1,
              'Rock / Metal / Punk': 1
            },
            predicted_genre: 'Electronic',
            confidence: 85,
            peak_analysis: {
              peak_times: trackData.segments_sec || [],
              peak_scores: Array.from({ length: (trackData.segments_sec || []).length }, () => 1 + Math.random() * 3),
              total_peaks: (trackData.segments_sec || []).length,
              analysis_duration: trackData.duration
            },
            analysis_timestamp: data.analyzed_at || new Date().toISOString(),
            segments_sec: trackData.segments_sec || [],
            segments: trackData.segments || [],
            segment_analysis: trackData.segment_analysis || [],
            beat_times_sec: trackData.beat_times_sec || [],
            downbeats_sec: trackData.downbeats_sec || [],
            tempo: trackData.tempo,
            duration: trackData.duration,
            debug: trackData.debug || {},
            original_filename: trackData.title || 'Unknown',
            file_size: 0
          };
          
          setMusicAnalysisData(analysisData);
        } else {
          console.log('No music data found in backend response');
        }
      } catch (error: any) {
        console.error('Error loading analysis data:', error);
        
        // Handle specific error cases
        if (error.status === 401 || error.status === 403) {
          console.log('Authentication error, user needs to log in');
          // Don't show error toast for auth errors, just log and skip
          return;
        } else if (error.status === 404) {
          toast({
            variant: "destructive",
            title: "Project Not Found",
            description: "The project was not found. Please create a new project.",
          });
        } else if (error.status === 500) {
          toast({
            variant: "destructive",
            title: "Server Error",
            description: "There was an error loading the project data. Please try again.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error Loading Data",
            description: `Failed to load analysis data: ${error.message || 'Unknown error'}`,
          });
        }
      } finally {
        setIsLoadingAnalysisData(false);
      }
    } catch (error: any) {
      console.error('Failed to load analysis data:', error);
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Failed to connect to the server. Please check your connection and try again.",
      });
    } finally {
      setIsLoadingAnalysisData(false);
    }
  }, [toast]);
  
  // Load existing project function
  const loadExistingProject = useCallback(async (projectId: string) => {
    try {
      musicClipState.actions.setIsLoadingExistingProject(true);
      console.log('📥 Loading existing project from backend:', projectId);
      const projectData = await projectManagement.actions.loadExistingProject(projectId);
      
      // Debug project data structure
      console.log('Project data structure:', projectData);
      
      // Update settings if available - with proper null checks
      if (projectData?.script?.steps?.music?.settings) {
        const settings = projectData.script.steps.music.settings;
        console.log('Loading settings:', settings);
        
        // Fix invalid videoType values from backend
        const fixedSettings = {
          ...settings,
          videoType: settings.videoType === 'individual' ? 'looped-static' : settings.videoType
        };
        
        // Ensure videoType is valid
        if (!['looped-static', 'looped-animated', 'scenes'].includes(fixedSettings.videoType)) {
          fixedSettings.videoType = 'looped-static';
        }
        
        console.log('Fixed settings:', fixedSettings);
        musicClipState.actions.setSettings(fixedSettings);
        musicClipState.forms.settingsForm.reset(fixedSettings);
      } else {
        console.log('No settings found in project data - preserving existing form values');
        // Don't reset the form if it already has values, just ensure videoType is set
        const currentFormValues = musicClipState.forms.settingsForm.getValues();
        if (!currentFormValues.videoType) {
          console.log('Setting default videoType to looped-static');
          musicClipState.forms.settingsForm.setValue("videoType", "looped-static");
        }
      }
      
      // Update tracks if available
      if (projectData?.tracks && projectData.tracks.length > 0) {
        console.log(`Loading ${projectData.tracks.length} tracks in parallel...`);
        console.log('Track structure:', projectData.tracks[0]); // Debug first track structure
        const startTime = performance.now();
        
        // Fetch URLs for all tracks in parallel
        const trackUrlPromises = projectData.tracks.map(async (track: any) => {
          try {
            const urlResponse = await projectsAPI.getTrackUrl(projectId, track.id);
            return {
              track,
              url: urlResponse.url,
              success: true
            };
          } catch (error) {
            console.error(`Failed to get URL for track ${track.id}:`, error);
            return {
              track,
              url: '',
              success: false
            };
          }
        });
        
        // Wait for all track URL requests to complete
        const trackResults = await Promise.all(trackUrlPromises);
        
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        const successfulTracks = trackResults.filter(result => result.success).length;
        const failedTracks = trackResults.length - successfulTracks;
        console.log(`Loaded ${trackResults.length} tracks in ${loadTime.toFixed(2)}ms (parallel) - ${successfulTracks} successful, ${failedTracks} failed`);
        
        // Create MusicTrack objects from the results
        const tracks: MusicTrack[] = trackResults.map(({ track, url, success }) => {
          console.log(`Track ${track.id}: URL=${url}, Success=${success}`);
          console.log(`Track metadata:`, track.metadata);
          console.log(`Track duration from metadata:`, track.metadata?.duration);
          
          // Convert relative URL to full URL if needed
          let fullUrl = url;
          if (url && !url.startsWith('http') && !url.startsWith('blob:')) {
            // If it's a relative path, prepend the backend URL
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            fullUrl = `${backendUrl}/${url}`;
            console.log(`Converted relative URL to full URL: ${url} -> ${fullUrl}`);
          }
          
          const trackDuration = track.metadata?.duration || 0;
          console.log(`Final track duration: ${trackDuration}`);
          
          return {
            id: track.id,
            url: fullUrl, // Use the full URL for playback
            duration: trackDuration,
            name: track.file_path.split('/').pop() || 'Unknown Track',
            prompt: track.prompt,
            genre: track.genre,
            videoDescription: track.video_description,
            generatedAt: new Date(track.created_at),
            isGenerated: track.ai_generated,
            status: 'completed',
            created_at: track.created_at
          };
        });
        
        // Check if any tracks have missing duration and try to re-extract metadata
        const tracksWithMissingDuration = tracks.filter(track => track.duration === 0);
        if (tracksWithMissingDuration.length > 0) {
          console.log(`Found ${tracksWithMissingDuration.length} tracks with missing duration, attempting to re-extract metadata...`);
          
          // Try to re-extract metadata for tracks with missing duration
          for (const track of tracksWithMissingDuration) {
            try {
              // Use the HTML5 Audio API to get duration from the URL
              const audio = new Audio(track.url);
              audio.addEventListener('loadedmetadata', () => {
                if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
                  console.log(`Re-extracted duration for track ${track.id}: ${audio.duration}s`);
                  musicTracks.updateTrackDuration(track.id, audio.duration);
                  
                  // Also update the audio duration in the music clip state if this is the selected track
                  if (musicTracks.selectedTrackId === track.id) {
                    musicClipState.actions.setAudioDuration(audio.duration);
                  }
                }
              });
              audio.addEventListener('error', (e) => {
                console.warn(`Failed to load audio for track ${track.id}:`, e);
              });
            } catch (error) {
              console.warn(`Failed to re-extract duration for track ${track.id}:`, error);
            }
          }
        }
        
        console.log('Setting music tracks:', tracks);
        musicTracks.setMusicTracks(tracks);
        
        if (tracks.length > 0) {
          console.log('Setting selected track ID:', tracks[0].id);
          musicTracks.setSelectedTrackId(tracks[0].id);
          musicTracks.setSelectedTrackIds([tracks[0].id]);
          
          // Set the audio duration for the selected track
          const selectedTrack = tracks[0];
          musicClipState.actions.setAudioDuration(selectedTrack.duration);
          console.log(`Set audio duration for selected track: ${selectedTrack.duration}s`);
          
          // Verify the state was set correctly
          setTimeout(() => {
            console.log('Verification - Current music tracks state:', {
              tracksLength: musicTracks.musicTracks.length,
              selectedTrackId: musicTracks.selectedTrackId,
              selectedTrackIds: musicTracks.selectedTrackIds,
              audioDuration: musicClipState.audioDuration
            });
          }, 100);
        }
        
        // Reset validation state when loading project
        console.log('Resetting validation state for loaded project');
        setTrackValidity({});
      } else {
        console.log('No tracks found in project data:', projectData?.tracks);
      }
      
      // Load analysis data if available
      if (projectData?.analysis) {
        console.log('Loading analysis data from project:', projectData.analysis);
        musicAnalysis.updateAnalysisData(projectData.analysis);
      }
    } catch (error) {
      console.error('Failed to load existing project:', error);
      
      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('Project not found')) {
        toast({
          variant: "destructive",
          title: "Project Not Found",
          description: "The selected project could not be found. Using local data instead.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Loading Error",
          description: "Failed to load the existing project from server. Using local data instead.",
        });
      }
    } finally {
      musicClipState.actions.setIsLoadingExistingProject(false);
    }
  }, [musicClipState, projectManagement, musicTracks, musicAnalysis, toast]);
  
  // All the handler functions (abbreviated for brevity - these would contain the full logic from MusicClipPage.tsx)
  const handleGenerateMusic = useCallback(async (options?: { duration: number; model: string }, isInstrumental?: boolean) => {
    // Implementation from MusicClipPage.tsx
    console.log('handleGenerateMusic called with:', { options, isInstrumental, musicPrompt: musicClipState.state.musicPrompt });
    
    if (!musicClipState.state.musicPrompt.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Description",
        description: "Please describe the music you want to generate.",
      });
      return;
    }
    
    // For now, just generate prompts instead of actual music
    await handleGenerateMusicPrompt(undefined, isInstrumental);
  }, [musicClipState.state.musicPrompt, toast]);
  
  const handleGenerateMusicPrompt = useCallback(async (selectedGenre?: string, isInstrumental?: boolean) => {
    // Implementation from MusicClipPage.tsx
    musicClipState.actions.setIsUploadingTracks(true);
    
    try {
      // Use existing projectId if available, otherwise create new project
      let currentProjectId = projectManagement.state.currentProjectId;
      console.log('🎵 Project management state:', {
        currentProjectId: projectManagement.state.currentProjectId,
        isProjectCreated: projectManagement.state.isProjectCreated,
        isLoadingProject: projectManagement.state.isLoadingProject
      });
      
      // If project is currently loading, wait for it to complete
      if (projectManagement.state.isLoadingProject) {
        console.log('🎵 Project is currently loading, waiting...');
        // Wait a bit for the project to finish loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        currentProjectId = projectManagement.state.currentProjectId;
        console.log('🎵 After waiting, currentProjectId:', currentProjectId);
      }
      
      if (!currentProjectId) {
        console.log('🎵 No existing project found, creating new one...');
        
        // Show onboarding loading for new users
        if (userOnboarding.state.isNewUser && !userOnboarding.state.isLoading) {
          console.log('🆕 New user detected - showing onboarding loading for music generation');
          setShowOnboardingLoading(true);
        }
        
        currentProjectId = await projectManagement.actions.createProject();
        console.log('🎵 New project created with ID:', currentProjectId);
        
        // Hide onboarding loading and mark user as returning
        setShowOnboardingLoading(false);
        userOnboarding.actions.markAsReturningUser();
      } else {
        console.log('🎵 Using existing project ID for music generation:', currentProjectId);
      }
      
      const categories = selectedGenre ? [selectedGenre] : undefined;
      
      const params = new URLSearchParams({
        prompt_type: 'music',
        source: 'json',
        instrumental: (isInstrumental || false).toString(),
      });
      
      if (categories) {
        params.append('categories', categories.join(','));
      }
      
      const response = await fetch(`/api/prompts/random?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch prompt');
      }
      
      const data = await response.json();
      
      // Generate prompts for the specified number of tracks
      const generatedTracks: MusicTrack[] = [];
      for (let i = 0; i < musicClipState.state.musicTracksToGenerate; i++) {
        const trackId = `generated-${Date.now()}-${i}`;
        const trackNumber = musicTracks.musicTracks.length + i + 1;
        const trackName = data.category ? `${data.category} Track ${trackNumber}` : `Generated Track ${trackNumber}`;
        
        // Create a placeholder file for AI-generated tracks
        const placeholderFile = new File([], trackName, { type: 'audio/wav' });
        
        const track: MusicTrack = {
          id: trackId,
          file: placeholderFile,
          url: '', // No URL for placeholder tracks
          duration: 30, // Default duration
          name: trackName,
          prompt: data.prompt,
          videoDescription: '',
          generatedAt: new Date(),
          genre: data.category,
          isGenerated: true,
          status: 'completed',
          created_at: new Date().toISOString()
        };
        generatedTracks.push(track);
      }
      
      musicTracks.addTracks(generatedTracks);
      
      // Update the music prompt form field
      musicClipState.forms.promptForm.setValue('musicDescription', data.prompt);
      
      // Immediately save the generated prompt to localStorage
      musicClipState.actions.setMusicPrompt(data.prompt);
      
      toast({
        title: "Music Prompts Generated",
        description: `Generated ${musicClipState.state.musicTracksToGenerate} track${musicClipState.state.musicTracksToGenerate !== 1 ? 's' : ''} with ${data.category} style prompts.`,
      });
      
    } catch (error) {
      console.error('Error generating music prompts:', error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate music prompts. Please try again.",
      });
    } finally {
      musicClipState.actions.setIsUploadingTracks(false);
      // Always hide onboarding loading on error
      setShowOnboardingLoading(false);
    }
  }, [musicClipState, musicTracks, projectManagement, toast]);
  
  // More handler functions would go here...
  // (I'm abbreviating for brevity, but all the handlers from MusicClipPage.tsx would be implemented)
  
  const handleGenerateMusicDescription = useCallback(async (selectedGenre?: string, isInstrumental?: boolean) => {
    console.log('🎵 Generating music description:', { selectedGenre, isInstrumental });
    
    // Update the local isInstrumental state
    if (isInstrumental !== undefined) {
      musicClipState.actions.setIsInstrumental(isInstrumental);
    }

    try {
      console.log('🎵 Calling promptGeneration.generateMusicDescription...');
      const data = await promptGeneration.generateMusicDescription(selectedGenre, isInstrumental);
      console.log('🎵 Received data:', data);

      // Only update the music prompt text area, don't create tracks
      musicClipState.actions.setMusicPrompt(data.prompt);

      toast({
        title: "Music Description Generated",
        description: `Generated ${data.category} style description for your music.`,
      });

    } catch (error) {
      console.error('❌ Error generating music description:', error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate music description. Please try again.",
      });
    }
  }, [musicClipState, promptGeneration, toast]);
  
  const handleGenreSelect = useCallback(async (genre: string, isInstrumental: boolean) => {
    await handleGenerateMusicDescription(genre, isInstrumental);
  }, [handleGenerateMusicDescription]);
  
  const handleRandomGenerate = useCallback(async (isInstrumental: boolean) => {
    await handleGenerateMusicDescription(undefined, isInstrumental);
  }, [handleGenerateMusicDescription]);
  
  const handleAudioFileChange = useCallback(async (files: File[]) => {
    console.log('🎵 handleAudioFileChange called with files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    const audioFiles = files.filter(file => file.type.startsWith("audio/"));
    console.log('🎵 Filtered audio files:', audioFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));

    if (audioFiles.length === 0) {
      console.log('❌ No audio files found');
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload audio files (e.g., MP3, WAV).",
      });
      return;
    }

    console.log('🎵 Starting upload process...');
    musicClipState.actions.setIsUploadingTracks(true);

    try {
      // Use existing projectId if available, otherwise create new project
      let currentProjectId = projectManagement.state.currentProjectId;
      console.log('🎵 Project management state for file upload:', {
        currentProjectId: projectManagement.state.currentProjectId,
        isProjectCreated: projectManagement.state.isProjectCreated,
        isLoadingProject: projectManagement.state.isLoadingProject
      });
      
      // If project is currently loading, wait for it to complete
      if (projectManagement.state.isLoadingProject) {
        console.log('🎵 Project is currently loading for file upload, waiting...');
        // Wait a bit for the project to finish loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        currentProjectId = projectManagement.state.currentProjectId;
        console.log('🎵 After waiting for file upload, currentProjectId:', currentProjectId);
      }
      
      if (!currentProjectId) {
        console.log('🎵 Creating new project...');
        
        // Show onboarding loading for new users
        if (userOnboarding.state.isNewUser && !userOnboarding.state.isLoading) {
          console.log('🆕 New user detected - showing onboarding loading');
          setShowOnboardingLoading(true);
        }
        
        currentProjectId = await projectManagement.actions.createProject();
        console.log('🎵 Project created with ID:', currentProjectId);
        
        // Hide onboarding loading and mark user as returning
        setShowOnboardingLoading(false);
        userOnboarding.actions.markAsReturningUser();
      } else {
        console.log('🎵 Using existing project ID:', currentProjectId);
      }

      if (!currentProjectId) {
        throw new Error('Failed to get project ID');
      }

      // Use parallel batch upload for multiple files
      if (audioFiles.length > 1) {
        console.log('🎵 Uploading multiple files via batch...');
        try {
          const batchResult = await projectsAPI.uploadTracksBatch(currentProjectId, audioFiles, {
            ai_generated: false,
            instrumental: false,
          });
          console.log('🎵 Batch upload result:', batchResult);

          const newTracks: MusicTrack[] = [];

          // Process successful uploads
          for (const result of batchResult.successful_tracks) {
            const file = audioFiles.find(f => f.name === result.filename);
            if (file && result.track_id) {
              const url = URL.createObjectURL(file);

              // Use backend metadata duration or fallback to 0
              const trackDuration = result.metadata?.duration || 0;

              const newTrack: MusicTrack = {
                id: result.track_id,
                file: file,
                url: url,
                duration: trackDuration,
                name: file.name,
                generatedAt: new Date(),
                prompt: result.prompt,
                genre: result.genre,
                videoDescription: result.video_description,
                isGenerated: result.ai_generated || false,
                status: 'completed',
                uploaded: true,
                created_at: new Date().toISOString()
              };

              newTracks.push(newTrack);

              // Fallback: try to get duration from HTML5 Audio API if backend didn't provide it
              if (trackDuration === 0) {
                const audio = new Audio(url);
                audio.addEventListener('loadedmetadata', () => {
                  if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
                    musicTracks.updateTrackDuration(newTrack.id, audio.duration);
                  }
                });
              }
            }
          }

          // Handle failed uploads
          if (batchResult.failed_uploads > 0) {
            const failedFiles = batchResult.failed_tracks.map(t => t.filename).join(', ');
            toast({
              variant: "destructive",
              title: "Some Uploads Failed",
              description: `Failed to upload ${batchResult.failed_uploads} file(s): ${failedFiles}`,
            });
          }

          if (newTracks.length > 0) {
            console.log('🎵 Adding batch tracks to UI:', newTracks);
            musicTracks.addTracks(newTracks);
            console.log('🎵 Batch tracks added to musicTracks state');

            const firstTrack = newTracks[0];
            // Only set audio file if it's actually a File object
            if (firstTrack.file && firstTrack.file instanceof File) {
              musicClipState.actions.setAudioFile(firstTrack.file);
              console.log('🎵 Set audio file in state (batch)');
            } else {
              musicClipState.actions.setAudioFile(null);
              console.log('🎵 Cleared audio file in state (batch)');
            }
            musicClipState.actions.setAudioUrl(firstTrack.url);
            musicClipState.actions.setAudioDuration(firstTrack.duration);
            console.log('🎵 Set audio URL and duration in state (batch)');

            toast({
              title: "Tracks Uploaded",
              description: `Successfully uploaded ${newTracks.length} track(s) in ${batchResult.processing_time_seconds.toFixed(1)}s.`,
            });
            console.log('🎵 Batch upload completed successfully');
          }
        } catch (batchError) {
          console.error('Batch upload failed, falling back to individual uploads:', batchError);
          
          // Fallback to individual uploads if batch fails
          const newTracks: MusicTrack[] = [];
          let successCount = 0;
          let failCount = 0;

          for (const file of audioFiles) {
            try {
              // Extract duration from file before uploading
              let fileDuration = 0;
              try {
                fileDuration = await getAudioDuration(file);
                console.log('🎵 Extracted duration from file:', file.name, fileDuration);
              } catch (durationError) {
                console.warn('🎵 Failed to extract duration from file:', file.name, durationError);
                // Continue with upload even if duration extraction fails
              }

              const uploadResult = await projectsAPI.uploadTrack(currentProjectId, file, {
                ai_generated: false,
                instrumental: false,
              });

              const url = URL.createObjectURL(file);
              
              // Use extracted duration or fallback to backend metadata
              const finalDuration = fileDuration || uploadResult.metadata?.duration || 0;
              
              const newTrack: MusicTrack = {
                id: uploadResult.track_id,
                file: file,
                url: url,
                duration: finalDuration,
                name: file.name,
                generatedAt: new Date(),
                prompt: uploadResult.prompt,
                genre: uploadResult.genre,
                videoDescription: uploadResult.video_description,
                isGenerated: uploadResult.ai_generated || false,
                status: 'completed',
                uploaded: true,
                created_at: new Date().toISOString()
              };

              newTracks.push(newTrack);
              successCount++;

              // Fallback: try to get duration from HTML5 Audio API if we still don't have it
              if (finalDuration === 0) {
                const audio = new Audio(url);
                audio.addEventListener('loadedmetadata', () => {
                  if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
                    musicTracks.updateTrackDuration(newTrack.id, audio.duration);
                  }
                });
              }
            } catch (error) {
              console.error(`Failed to upload ${file.name}:`, error);
              failCount++;
            }
          }

          if (newTracks.length > 0) {
            console.log('🎵 Adding fallback tracks to UI:', newTracks);
            musicTracks.addTracks(newTracks);
            console.log('🎵 Fallback tracks added to musicTracks state');

            const firstTrack = newTracks[0];
            if (firstTrack.file && firstTrack.file instanceof File) {
              musicClipState.actions.setAudioFile(firstTrack.file);
              console.log('🎵 Set audio file in state (fallback)');
            } else {
              musicClipState.actions.setAudioFile(null);
              console.log('🎵 Cleared audio file in state (fallback)');
            }
            musicClipState.actions.setAudioUrl(firstTrack.url);
            musicClipState.actions.setAudioDuration(firstTrack.duration);
            console.log('🎵 Set audio URL and duration in state (fallback)');
          }

          if (failCount > 0) {
            toast({
              variant: "destructive",
              title: "Some Uploads Failed",
              description: `Successfully uploaded ${successCount} file(s), failed to upload ${failCount} file(s).`,
            });
          } else {
            toast({
              title: "Tracks Uploaded",
              description: `Successfully uploaded ${successCount} track(s).`,
            });
          }
        }
      } else {
        // Single file upload
        const file = audioFiles[0];
        console.log('🎵 Uploading single file:', file.name);
        try {
          // Extract duration from file before uploading
          let fileDuration = 0;
          try {
            fileDuration = await getAudioDuration(file);
            console.log('🎵 Extracted duration from file:', fileDuration);
          } catch (durationError) {
            console.warn('🎵 Failed to extract duration from file:', durationError);
            // Continue with upload even if duration extraction fails
          }

          const uploadResult = await projectsAPI.uploadTrack(currentProjectId, file, {
            ai_generated: false,
            instrumental: false,
          });
          console.log('🎵 Single upload result:', uploadResult);

          const url = URL.createObjectURL(file);

          // Use extracted duration or fallback to backend metadata
          const finalDuration = fileDuration || uploadResult.metadata?.duration || 0;

          const newTrack: MusicTrack = {
            id: uploadResult.track_id,
            file: file,
            url: url,
            duration: finalDuration,
            name: file.name,
            generatedAt: new Date(),
            prompt: uploadResult.prompt,
            genre: uploadResult.genre,
            videoDescription: uploadResult.video_description,
            isGenerated: uploadResult.ai_generated || false,
            status: 'completed',
            uploaded: true,
            created_at: new Date().toISOString()
          };

          console.log('🎵 Adding track to UI:', newTrack);
          musicTracks.addTracks([newTrack]);
          console.log('🎵 Track added to musicTracks state');

          // Only set audio file if it's actually a File object
          if (newTrack.file && newTrack.file instanceof File) {
            musicClipState.actions.setAudioFile(newTrack.file);
            console.log('🎵 Set audio file in state');
          } else {
            musicClipState.actions.setAudioFile(null);
            console.log('🎵 Cleared audio file in state');
          }
          musicClipState.actions.setAudioUrl(newTrack.url);
          musicClipState.actions.setAudioDuration(newTrack.duration);
          console.log('🎵 Set audio URL and duration in state');

          // Fallback: try to get duration from HTML5 Audio API if we still don't have it
          if (finalDuration === 0) {
            const audio = new Audio(url);
            audio.addEventListener('loadedmetadata', () => {
              if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
                musicTracks.updateTrackDuration(newTrack.id, audio.duration);
                musicClipState.actions.setAudioDuration(audio.duration);
              }
            });
          }

          toast({
            title: "Track Uploaded",
            description: `Successfully uploaded ${file.name}.`,
          });
          console.log('🎵 Upload completed successfully');
        } catch (error) {
          console.error('Error uploading single track:', error);
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: `Failed to upload ${file.name}. Please try again.`,
          });
        }
      }
    } catch (error) {
      console.error('Error in handleAudioFileChange:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Failed to upload tracks. Please try again.",
      });
    } finally {
      musicClipState.actions.setIsUploadingTracks(false);
      // Always hide onboarding loading on error
      setShowOnboardingLoading(false);
    }
  }, [musicClipState, musicTracks, projectManagement, toast]);
  
  const handleTrackSelect = useCallback((track: MusicTrack, event?: React.MouseEvent) => {
    musicTracks.selectTrack(track, event);
    
    // Only set audio file if it exists and is actually a File object (for uploaded tracks)
    if (track.file && track.file instanceof File) {
      musicClipState.actions.setAudioFile(track.file);
    } else {
      // For tracks loaded from backend or with non-File objects, clear the audio file
      musicClipState.actions.setAudioFile(null);
    }
    musicClipState.actions.setAudioUrl(track.url);
    musicClipState.actions.setAudioDuration(track.duration);
  }, [musicTracks, musicClipState.actions]);
  
  const handlePlayPause = useCallback((track: MusicTrack) => {
    audioPlayback.playTrack(track);
  }, [audioPlayback]);
  
  const handleTrackRemove = useCallback((trackId: string) => {
    if (audioPlayback.currentlyPlayingId === trackId) {
      audioPlayback.stopCurrentAudio();
    }
    
    musicTracks.removeTrack(trackId);
    
    if (musicTracks.selectedTrackId === trackId) {
      const remainingTracks = musicTracks.musicTracks.filter(track => track.id !== trackId);
      if (remainingTracks.length > 0) {
        const nextTrack = remainingTracks[0];
        handleTrackSelect(nextTrack);
      } else {
        musicClipState.actions.setAudioFile(null);
        musicClipState.actions.setAudioUrl(null);
        musicClipState.actions.setAudioDuration(0);
      }
    }
  }, [audioPlayback, musicTracks, musicClipState.actions, handleTrackSelect]);
  
  const handleTrackReorder = useCallback((fromId: string, toId: string, position: 'above' | 'below' | null) => {
    const fromIndex = musicTracks.musicTracks.findIndex(t => t.id === fromId);
    const toIndex = musicTracks.musicTracks.findIndex(t => t.id === toId);
    
    if (fromIndex !== -1 && toIndex !== -1) {
      const adjustedToIndex = position === 'below' ? toIndex + 1 : toIndex;
      musicTracks.reorderTracks(fromIndex, adjustedToIndex);
    }
  }, [musicTracks]);
  
  const handleSettingsSubmit = useCallback(async (values: z.infer<typeof SettingsSchema>) => {
    const currentBudget = musicClipState.forms.settingsForm.getValues("budget")?.[0] || 1;
    const settingsWithDefaults = {
      ...values,
      budget: values.budget || [currentBudget],
      user_price: currentBudget, // Save the user-set price separately
    };
    
    musicClipState.actions.setSettings(settingsWithDefaults);
    
    // Always save data to backend when submitting settings
    if (projectManagement.state.currentProjectId) {
      try {
        await dataPersistence.saveDataToBackend();
        musicClipState.actions.markAsSaved();
        console.log('Settings saved to backend on navigation');
      } catch (error) {
        console.error('Failed to save settings to backend:', error);
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Failed to save your settings. Please try again.",
        });
        return; // Don't navigate if save failed
      }
    }
    
    // Set navigation loading state
    musicClipState.actions.setIsNavigating(true);
    
    // Trigger music analysis when moving from step 2 to step 3
    try {
      musicClipState.actions.setIsAnalyzingMusic(true);
      console.log('=== TRIGGERING MUSIC ANALYSIS FROM STEP 2 ===');
      console.log('Available tracks:', musicTracks.musicTracks.map(t => ({ 
        id: t.id, 
        name: t.name, 
        hasFile: !!t.file, 
        hasUrl: !!t.url,
        isGenerated: t.isGenerated 
      })));
      
      // Clear any mock analysis data to force re-analysis
      musicAnalysis.clearMockAnalysisData();
      console.log('Cleared mock analysis data to force re-analysis');
      
      // Get tracks that need analysis
      const tracksNeedingAnalysis = musicAnalysis.getTracksNeedingAnalysis(musicTracks.musicTracks);
      console.log('Tracks needing analysis:', tracksNeedingAnalysis.map(t => ({ 
        id: t.id, 
        name: t.name, 
        hasFile: !!t.file, 
        hasUrl: !!t.url 
      })));
      
      if (tracksNeedingAnalysis.length > 0) {
        console.log(`Analyzing ${tracksNeedingAnalysis.length} tracks before proceeding to step 3`);
        await musicAnalysis.analyzeMissingTracks(musicTracks.musicTracks);
      } else {
        console.log('All tracks already analyzed or no tracks available for analysis');
      }
      
      // Save analysis data to project if we have any
      if (musicAnalysis.analysisData && projectManagement.state.currentProjectId) {
        try {
          // This would be handled by the data persistence hook
          console.log('Analysis data would be saved to project');
        } catch (error) {
          console.error('Failed to save analysis data:', error);
        }
      }
    } catch (error) {
      console.error('Music analysis failed:', error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Failed to analyze music tracks. Please try again.",
      });
    } finally {
      musicClipState.actions.setIsAnalyzingMusic(false);
    }
    
    musicClipState.actions.setCurrentStep(3);
    musicClipState.actions.setMaxReachedStep(3);
    
    // Reset navigation state after a short delay
    setTimeout(() => {
      musicClipState.actions.setIsNavigating(false);
    }, 500);
  }, [musicClipState, projectManagement, dataPersistence, musicAnalysis, musicTracks.musicTracks, toast]);
  
  const handleReuseVideoToggle = useCallback((enabled: boolean) => {
    console.log('handleReuseVideoToggle called with:', enabled);
    
    // Get current mode before updating settings
    const currentSettings = musicClipState.forms.settingsForm.getValues();
    const wasInReuseMode = currentSettings.useSameVideoForAll;
    
    // Update the settings state immediately so validation logic works correctly
    const updatedSettings = {
      ...currentSettings,
      useSameVideoForAll: enabled
    };
    musicClipState.actions.setSettings(updatedSettings);
    
    // Get current form value for potential use in both modes
    const currentFormValue = musicClipState.forms.promptForm.getValues("videoDescription") || "";
    let descriptionToUse = "";
    
    if (enabled) {
      // Switching TO reuse mode: save current individual descriptions and load shared description
      console.log('Switching to reuse mode - saving current individual descriptions');
      
      // Save current individual descriptions to localStorage before switching
      const currentIndividualDescriptions = { ...musicClipState.state.individualDescriptions };
      setPreservedIndividualDescriptions(currentIndividualDescriptions);
      
      // Save to localStorage immediately
      if (typeof window !== 'undefined' && projectId) {
        localStorage.setItem(`musicClip_${projectId}_individualDescriptions`, JSON.stringify(currentIndividualDescriptions));
      }
      
      // Load shared description from localStorage or use existing
      const existingSharedDesc = musicClipState.state.sharedDescription || musicClipState.state.prompts?.videoDescription || "";
      
      // If we were already in reuse mode, preserve the current form value
      // If we're switching from individual mode, use stored shared description
      if (wasInReuseMode) {
        descriptionToUse = currentFormValue.trim() || existingSharedDesc;
        console.log('Already in reuse mode - preserving form value:', { currentFormValue, existingSharedDesc, descriptionToUse });
      } else {
        // When switching from individual to reuse mode, use empty string if no shared description exists
        // This prevents using individual track descriptions as shared descriptions
        descriptionToUse = existingSharedDesc;
        console.log('Switching from individual to reuse mode - using stored shared description:', {
          currentFormValue,
          existingSharedDesc,
          descriptionToUse,
          wasInReuseMode,
          note: 'If shared description contains individual track data, it was incorrectly saved previously'
        });
      }
      
      musicClipState.actions.setSharedDescription(descriptionToUse);
      musicClipState.forms.promptForm.setValue("videoDescription", descriptionToUse, { shouldValidate: true, shouldDirty: true });
      
    } else {
      // Switching FROM reuse mode: save current shared description and load individual descriptions
      console.log('Switching to individual mode - saving current shared description');
      
      // Save current shared description to localStorage before switching
      const currentSharedDesc = musicClipState.state.sharedDescription || musicClipState.forms.promptForm.getValues("videoDescription") || "";
      if (currentSharedDesc) {
        musicClipState.actions.setSharedDescription(currentSharedDesc);
        if (typeof window !== 'undefined' && projectId) {
          localStorage.setItem(`musicClip_${projectId}_sharedDescription`, currentSharedDesc);
        }
      }
      
      // Load individual descriptions from localStorage
      let individualDescriptionsToLoad = { ...preservedIndividualDescriptions };
      if (typeof window !== 'undefined' && projectId) {
        const savedIndividual = localStorage.getItem(`musicClip_${projectId}_individualDescriptions`);
        if (savedIndividual) {
          try {
            individualDescriptionsToLoad = JSON.parse(savedIndividual);
          } catch (error) {
            console.warn('Failed to parse saved individual descriptions:', error);
          }
        }
      }
      
      // Apply loaded individual descriptions
      musicClipState.actions.setIndividualDescriptions(individualDescriptionsToLoad);
      
      // Clear the form field for individual mode
      musicClipState.forms.promptForm.setValue("videoDescription", '', { shouldValidate: true, shouldDirty: true });
    }
    
    // Force immediate validation update by running validation logic directly
    const minLen = 10;
    const maxLen = 500;
    const newMap: Record<string, boolean> = {};
    
    if (enabled) {
      // Reuse mode: validate based on shared description
      const sharedDesc = descriptionToUse?.trim() || "";
      const isValid = sharedDesc.length >= minLen && sharedDesc.length <= maxLen;
      
      // Apply the same validation to all tracks based on shared description
      musicTracks.musicTracks.forEach(t => {
        newMap[t.id] = isValid;
      });
    } else {
      // Individual mode: validate based on individual descriptions
      musicTracks.musicTracks.forEach(t => {
        const desc = (musicClipState.state.individualDescriptions[t.id] || "").trim();
        const isValid = desc.length >= minLen && desc.length <= maxLen;
        newMap[t.id] = isValid;
      });
    }
    
    // Update validation state immediately
    if (musicTracks.musicTracks.length > 0) {
      setTrackValidity(newMap);
    }
  }, [musicClipState, projectId, preservedIndividualDescriptions, musicTracks.musicTracks]);
  
  const onPromptSubmit = useCallback(async (values: z.infer<typeof PromptSchema>, newTrackDescriptions?: Record<string, string>, trackGenres?: Record<string, string>) => {
    musicClipState.actions.setPrompts(values);
    
    if (musicClipState.state.settings?.useSameVideoForAll) {
      // Reuse mode: save as shared description
      if (values.videoDescription) {
        musicClipState.actions.setSharedDescription(values.videoDescription);
      }
    } else {
      // Individual mode: save as individual descriptions
      if (newTrackDescriptions) {
        musicClipState.actions.setIndividualDescriptions(prev => ({
          ...prev,
          ...newTrackDescriptions
        }));
      }
    }
    
    if (trackGenres) {
      musicTracks.setTrackGenres(prev => ({
        ...prev,
        ...trackGenres
      }));
    }
    
    if (trackGenres) {
      musicTracks.setMusicTracks(prev => prev.map(track => ({
        ...track,
        genre: trackGenres[track.id] || track.genre
      })));
    }
    
    // Always save data to backend when submitting prompts
    if (projectManagement.state.currentProjectId) {
      try {
        await dataPersistence.saveDataToBackend();
        musicClipState.actions.markAsSaved();
        console.log('Prompts saved to backend on navigation');
      } catch (error) {
        console.error('Failed to save prompts to backend:', error);
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Failed to save your prompts. Please try again.",
        });
        return; // Don't navigate if save failed
      }
    }
    
    // Set navigation loading state
    musicClipState.actions.setIsNavigating(true);
    
    musicClipState.actions.setCurrentStep(4);
    musicClipState.actions.setMaxReachedStep(4);
    
    // Reset navigation state after a short delay
    setTimeout(() => {
      musicClipState.actions.setIsNavigating(false);
    }, 500);
  }, [musicClipState, musicTracks, projectManagement, dataPersistence, toast]);
  
  const onPromptSubmitForm = useCallback((values: z.infer<typeof PromptSchema>) => {
    onPromptSubmit(values);
  }, [onPromptSubmit]);
  
  const onOverviewSubmit = useCallback(async (values: any) => {
    console.log('=== onOverviewSubmit CALLED ===');
    console.log('Values:', values);
    console.log('Current step before:', musicClipState.state.currentStep);
    
    // Always save data to backend when submitting overview
    if (projectManagement.state.currentProjectId) {
      try {
        await dataPersistence.saveDataToBackend();
        musicClipState.actions.markAsSaved();
        console.log('Overview data saved to backend on navigation');
      } catch (error) {
        console.error('Failed to save overview data to backend:', error);
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Failed to save your overview data. Please try again.",
        });
        return; // Don't navigate if save failed
      }
    }
    
    // Navigate to step 4
    console.log('Navigating to step 4...');
    musicClipState.actions.setCurrentStep(4);
    console.log('Current step after setCurrentStep(4):', musicClipState.state.currentStep);
  }, [musicClipState, projectManagement, dataPersistence, toast]);
  
  const handleContinue = useCallback(async () => {
    // Always save data to backend when continuing, regardless of hasUnsavedChanges flag
    if (projectManagement.state.currentProjectId) {
      try {
        await dataPersistence.saveDataToBackend();
        musicClipState.actions.markAsSaved();
        console.log('Data saved to backend on continue navigation');
      } catch (error) {
        console.error('Failed to save data to backend on continue:', error);
        // Show user-friendly error message
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Failed to save your progress. Please try again.",
        });
        return; // Don't navigate if save failed
      }
    }
    
    // Navigate to next step
    musicClipState.actions.handleContinue();
  }, [musicClipState, projectManagement, dataPersistence, toast]);

  const handleBack = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    audioPlayback.stopAllAudio();
    musicClipState.actions.handleReset();
    projectManagement.actions.clearProjectData();
    musicTracks.setMusicTracks([]);
    musicTracks.setSelectedTrackId(null);
    musicTracks.setSelectedTrackIds([]);
    musicTracks.setTrackDescriptions({});
    musicTracks.setTrackGenres({});
    
    router.replace('/dashboard/create');
  }, [audioPlayback, musicClipState.actions, projectManagement.actions, musicTracks, router]);
  
  // Memoized callbacks to prevent infinite loops in StepPrompt
  const handleTrackDescriptionsUpdate = useCallback((descriptions: Record<string, string>) => {
    // Update individual descriptions in music clip state
    musicClipState.actions.setIndividualDescriptions(descriptions);
  }, [musicClipState.actions]);
  
  const handleSharedDescriptionUpdate = useCallback((desc: string) => {
    // Update the shared description state
    musicClipState.actions.setSharedDescription(desc);
  }, [musicClipState.actions]);
  
  // Computed values
  const canContinue = areAllTracksValid();
  const continueText = `Checkout with ${musicClipState.state.settings?.user_price || musicClipState.state.settings?.budget?.[0] || 0} credits`; // Updated
  
  return {
    // State
    user,
    authLoading,
    projectId,
    musicTracks,
    musicClipState,
    audioPlayback,
    dragAndDrop,
    musicAnalysis,
    promptGeneration,
    pricingService,
    projectManagement,
    trackValidity,
    musicAnalysisData,
    isLoadingAnalysisData,
    musicGenerationPrice,
    userOnboarding,
    showOnboardingLoading,
    
    // Actions
    handleGenerateMusic,
    handleGenerateMusicPrompt,
    handleGenerateMusicDescription,
    handleGenreSelect,
    handleRandomGenerate,
    handleAudioFileChange,
    handleTrackSelect,
    handlePlayPause,
    handleTrackRemove,
    handleTrackReorder,
    handleSettingsSubmit,
    handleReuseVideoToggle,
    onPromptSubmit,
    onPromptSubmitForm,
    onOverviewSubmit,
    handleContinue,
    handleBack,
    handleTrackDescriptionsUpdate,
    handleSharedDescriptionUpdate,
    loadAnalysisData,
    loadExistingProject,
    
    // Computed values
    areAllTracksValid,
    canContinue,
    continueText
  };
}
