"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, ArrowLeft, ChevronLeft, ChevronRight, Upload, Film, Trash2 } from "lucide-react";
import { MusicLogo } from "@/components/music-logo";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import { useMusicTracks } from "@/hooks/use-music-tracks";
import { usePromptGeneration } from "@/hooks/use-prompt-generation";
import { usePricingService } from "@/hooks/use-pricing-service";
import { useMusicClipState } from "@/hooks/use-music-clip-state";
import { useProjectManagement } from "@/hooks/use-project-management";
import { useDragAndDrop } from "@/hooks/use-drag-and-drop";
import { useMusicAnalysis } from "@/hooks/use-music-analysis";
import { musicClipAPI } from "@/lib/api/music-clip";
import { musicAnalysisAPI } from "@/lib/api/music-analysis";
import { autoSaveService } from "@/lib/auto-save-service";
import { formatDuration, getTotalDuration, fileToDataUri } from "@/utils/music-clip-utils";
import type { MusicTrack } from "@/types/music-clip";
import { SettingsSchema, PromptSchema, OverviewSchema } from "@/components/clipizi-generator";
import * as z from "zod";
import WaveformVisualizer, { type WaveformVisualizerRef } from "@/components/waveform-visualizer";
import { StepUpload } from "@/components/create/create-music/step-music";
import { StepSettings } from "@/components/create/create-music/step-video";
import { StepPrompt } from "@/components/create/create-music/step-overview";
import { StepOverview } from "@/components/create/create-music/step-settings";
import { GenreSelector } from "@/components/create/create-music/genre-selector";
import { TimelineHeader } from "@/components/timeline-header";
import { TrackCard } from "@/components/create/create-music/track-card";
import { AIAnalysisOverlay } from "@/components/ui/ai-analysis-overlay";
import { MusicAnalysisVisualizer } from "@/components/create/create-music/music-analysis-visualizer";
import { OverviewLayout } from "@/components/create/create-music/overview-layout";

function MusicClipPage() {
  // Custom hooks for state management
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get('projectId');
  const isNewProject = searchParams.get('new') !== null;
  const projectManagement = useProjectManagement();

  // Use URL projectId if available, otherwise use persisted projectId
  // If it's a new project, don't use persisted projectId
  const projectId = urlProjectId || (isNewProject ? null : projectManagement.state.currentProjectId);

  const audioPlayback = useAudioPlayback();
  const musicTracks = useMusicTracks(projectId);
  const promptGeneration = usePromptGeneration();
  const pricingService = usePricingService();
  const musicClipState = useMusicClipState(projectId);
  const dragAndDrop = useDragAndDrop();
  const musicAnalysis = useMusicAnalysis(projectId);
  const waveformRef = useRef<WaveformVisualizerRef>(null);
  const lastProcessedDuration = useRef<number>(0);

  // TRACK VALIDATION SNAPSHOT FOR LIVE UI
  const [trackValidity, setTrackValidity] = useState<Record<string, boolean>>({});

  // Store individual descriptions when switching to reuse mode
  const [preservedIndividualDescriptions, setPreservedIndividualDescriptions] = useState<Record<string, string>>({});

  // Music analysis visualization state
  const [musicAnalysisData, setMusicAnalysisData] = useState<any>(null);
  const [isLoadingAnalysisData, setIsLoadingAnalysisData] = useState(false);

  // Function to load analysis data from backend
  const loadAnalysisData = useCallback(async (projectId: string) => {
    try {
      console.log('Loading analysis data for project:', projectId);
      setIsLoadingAnalysisData(true);
      const response = await fetch(`/api/music-clip/projects/${projectId}/analysis`);
      console.log('Backend response status:', response.status);

      if (response.ok) {
        const data = await response.json();
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
          console.log('Track data keys:', Object.keys(trackData));
          console.log('Track data tempo:', trackData.tempo);
          console.log('Track data duration:', trackData.duration);

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
      } else {
        console.error('Backend response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Failed to load analysis data:', error);
    } finally {
      setIsLoadingAnalysisData(false);
    }
  }, []);

  // Auto-load analysis data when on step 4
  useEffect(() => {
    if (musicClipState.state.currentStep === 4 && projectId && !musicAnalysisData) {
      console.log('Auto-loading analysis data for step 4, project:', projectId);
      loadAnalysisData(projectId);
    }
  }, [musicClipState.state.currentStep, projectId, musicAnalysisData, loadAnalysisData]);

  // Check if all tracks are valid for step 3
  const areAllTracksValid = useMemo(() => {
    if (musicTracks.musicTracks.length === 0) return false;
    return musicTracks.musicTracks.every(track => trackValidity[track.id] === true);
  }, [musicTracks.musicTracks, trackValidity]);

  const areBoolMapsEqual = (a: Record<string, boolean>, b: Record<string, boolean>) => {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (a[k] !== b[k]) return false;
    }
    return true;
  };

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

    if (!areBoolMapsEqual(trackValidity, newMap)) {
      setTrackValidity(newMap);
    }
  }, [
    musicClipState.state.settings?.useSameVideoForAll,
    musicClipState.state.sharedDescription,
    musicClipState.state.individualDescriptions,
    musicTracks.musicTracks
  ]);

  // Force validation refresh on page load and when tracks change
  useEffect(() => {
    console.log('Force validation refresh - tracks loaded or page reloaded');
    // This will trigger the validation effect above by changing the dependency array
    setTrackValidity(prev => ({ ...prev }));
  }, [musicTracks.musicTracks.length, musicTracks.musicTracks.map(t => t.id).join(',')]);

  // Load appropriate descriptions when navigating to step 4 (prompt step)
  useEffect(() => {
    if (musicClipState.state.currentStep === 4) {
      console.log('Navigating to step 4 - loading descriptions for prompt form');

      if (musicClipState.state.settings?.useSameVideoForAll) {
        // Reuse mode: load shared description into form field
        const sharedDesc = musicClipState.state.sharedDescription || "";
        console.log('Loading shared description for reuse mode:', sharedDesc);
        musicClipState.forms.promptForm.setValue("videoDescription", sharedDesc, { shouldValidate: true, shouldDirty: true });
      } else {
        // Individual mode: ensure individual descriptions are loaded
        console.log('Individual mode - individual descriptions:', musicClipState.state.individualDescriptions);
        // The individual descriptions are already loaded in the music clip state
        // The StepPrompt component will use them via the trackDescriptions prop
      }
    }
  }, [musicClipState.state.currentStep, musicClipState.state.settings?.useSameVideoForAll, musicClipState.state.sharedDescription, musicClipState.state.individualDescriptions]);

  // Local state
  const [musicGenerationPrice, setMusicGenerationPrice] = useState(0);


  // Cleanup audio when leaving the page
  useEffect(() => {
    return () => {
      // Stop all audio without causing re-renders
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        if (audio instanceof HTMLAudioElement) {
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
          audio.load();
        }
      });

      // Clean up the main audio URL with a delay to ensure audio operations complete
      if (musicClipState.state.audioUrl && musicClipState.state.audioUrl.startsWith('blob:')) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(musicClipState.state.audioUrl);
          } catch (error) {
            console.warn('Failed to revoke main audio blob URL during cleanup:', error);
          }
        }, 200);
      }

      // Clean up all track blob URLs with a delay
      musicTracks.musicTracks.forEach(track => {
        if (track.url.startsWith('blob:')) {
          setTimeout(() => {
            try {
              URL.revokeObjectURL(track.url);
            } catch (error) {
              console.warn('Failed to revoke track blob URL during cleanup:', track.id, error);
            }
          }, 200);
        }
      });
    };
  }, []); // Empty dependency array to only run on unmount

  // Set audio duration when audio file changes
  useEffect(() => {
    if (musicClipState.state.audioFile && musicClipState.state.audioFile.size > 0) {
      // Validate that audioFile is actually a File or Blob object
      if (!(musicClipState.state.audioFile instanceof File) && !(musicClipState.state.audioFile instanceof Blob)) {
        console.warn('[MUSIC CLIP] audioFile is not a File or Blob object:', typeof musicClipState.state.audioFile);
        return;
      }

      // Only try to get duration for files with actual content
      const tempUrl = URL.createObjectURL(musicClipState.state.audioFile);
      console.log('[MUSIC CLIP] Created temporary blob URL for duration detection:', tempUrl, 'File size:', musicClipState.state.audioFile.size);

      const audio = new Audio(tempUrl);
      let isMetadataLoaded = false;
      let isErrorHandled = false;

      const handleLoadedMetadata = () => {
        if (!isMetadataLoaded && !isErrorHandled) {
          isMetadataLoaded = true;
          musicClipState.actions.setAudioDuration(audio.duration);
          console.log('[MUSIC CLIP] Audio metadata loaded, duration:', audio.duration);

          // Revoke the temporary URL after getting duration
          setTimeout(() => {
            try {
              URL.revokeObjectURL(tempUrl);
              console.log('[MUSIC CLIP] Revoked temporary blob URL for duration detection:', tempUrl);
            } catch (error) {
              console.warn('Failed to revoke temporary blob URL:', error);
            }
          }, 1000);
        }
      };

      const handleError = (e: Event) => {
        if (!isErrorHandled && !isMetadataLoaded) {
          isErrorHandled = true;
          console.error('[MUSIC CLIP] Audio load error for file:', musicClipState.state.audioFile?.name, 'Size:', musicClipState.state.audioFile?.size, e);

          // Set duration to 0 for files that can't be loaded
          musicClipState.actions.setAudioDuration(0);

          // Revoke URL on error
          setTimeout(() => {
            try {
              URL.revokeObjectURL(tempUrl);
              console.log('[MUSIC CLIP] Revoked temporary blob URL on error:', tempUrl);
            } catch (error) {
              console.warn('Failed to revoke blob URL on error:', error);
            }
          }, 1000);
        }
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('error', handleError);
        // Revoke the URL if it hasn't been revoked yet
        setTimeout(() => {
          try {
            URL.revokeObjectURL(tempUrl);
            console.log('[MUSIC CLIP] Revoked temporary blob URL on cleanup:', tempUrl);
          } catch (error) {
            // URL might already be revoked, ignore error
          }
        }, 2000);
      }
    } else if (musicClipState.state.audioFile && musicClipState.state.audioFile.size === 0) {
      // File is empty, set duration to 0
      console.log('[MUSIC CLIP] Empty file detected, setting duration to 0');
      musicClipState.actions.setAudioDuration(0);
    }
  }, [musicClipState.state.audioFile]);

  // Update track duration when audio duration changes
  useEffect(() => {
    if (musicClipState.state.audioDuration > 0 && musicTracks.selectedTrackId && musicClipState.state.audioDuration !== lastProcessedDuration.current) {
      lastProcessedDuration.current = musicClipState.state.audioDuration;
      musicTracks.updateTrackDuration(musicTracks.selectedTrackId, musicClipState.state.audioDuration);
    }
  }, [musicClipState.state.audioDuration, musicTracks.selectedTrackId]);

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

  // Initialize step from URL parameter (only on mount)
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      const stepParam = searchParams.get('step');
      if (stepParam) {
        const step = parseInt(stepParam, 10);
        if (step >= 1 && step <= 4) {
          console.log('Initializing step from URL:', step);
          musicClipState.actions.setCurrentStep(step as 1 | 2 | 3 | 4);
          musicClipState.actions.setMaxReachedStep(Math.max(musicClipState.state.maxReachedStep, step) as 1 | 2 | 3 | 4);
        }
      }
      hasInitialized.current = true;
    }
  }, []); // Only run on mount

  // Track if we've already cleared data for new project
  const hasClearedNewProject = useRef(false);

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
        // Fallback to resetState if actions is not available
        musicClipState.resetState();
      }

      // Reset validation state
      setTrackValidity({});

      // Clear URL parameters to clean up the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }
  }, [isNewProject]); // Only depend on isNewProject to prevent infinite loops

  // Reset the ref when component unmounts or when isNewProject changes
  useEffect(() => {
    if (!isNewProject) {
      hasClearedNewProject.current = false;
    }
  }, [isNewProject]);

  // Load existing project data if projectId is provided
  useEffect(() => {
    if (projectId && !projectManagement.state.isLoadingProject) {
      // Check if we have localStorage data for this project
      const hasLocalData = musicClipState.state.settings || musicTracks.musicTracks.length > 0;

      if (hasLocalData) {
        console.log('Using localStorage data for project:', projectId);
        // localStorage data is already loaded by the hooks
      } else if (urlProjectId) {
        // Only load from backend if this is a URL projectId (not persisted)
        console.log('No localStorage data found, loading from backend for project:', projectId);
        loadExistingProject(projectId);
      } else {
        console.log('Using persisted project with no localStorage data:', projectId);
        // This is a persisted project with no localStorage data, which is fine
      }
    } else if (!projectId) {
      // Starting a new project - no localStorage loading, start fresh
      console.log('Starting new project - no data loading needed');
    }
  }, [projectId, urlProjectId, projectManagement.state.isLoadingProject, musicClipState.state.settings, musicTracks.musicTracks.length]);

  // Music analysis is now only triggered manually on step 3 continue button

  // Update URL when step changes (with throttling to prevent browser hanging)
  const prevStepRef = useRef(musicClipState.state.currentStep);
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (prevStepRef.current !== musicClipState.state.currentStep) {
      console.log('Step changed from', prevStepRef.current, 'to', musicClipState.state.currentStep);

      // Clear any pending URL update
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }

      // Throttle URL updates to prevent browser hanging
      urlUpdateTimeoutRef.current = setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('step', musicClipState.state.currentStep.toString());
        // Include projectId in URL if available
        if (projectId) {
          url.searchParams.set('projectId', projectId);
        }
        window.history.replaceState({}, '', url.toString());
        prevStepRef.current = musicClipState.state.currentStep;
      }, 100); // 100ms delay
    }

    // Cleanup timeout on unmount
    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
    };
  }, [musicClipState.state.currentStep, projectId]);

  // Debug step changes
  useEffect(() => {
    console.log('Current step changed to:', musicClipState.state.currentStep);
  }, [musicClipState.state.currentStep]);

  // Push data to backend when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const projectId = searchParams.get('projectId');
      if (projectId) {
        try {
          // Flush all pending auto-saves immediately
          autoSaveService.flushAllSaves();

          const musicClipData = musicClipState.actions.getCurrentState();
          const tracksData = musicTracks.getCurrentState();
          const analysisData = musicAnalysis.analysisData;

          const data = {
            projectId,
            musicClipData,
            tracksData,
            analysisData,
            timestamp: Date.now()
          };

          // Use sendBeacon for critical data saving
          const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
          const success = navigator.sendBeacon('/api/music-clip/auto-save', blob);

          if (!success) {
            console.warn('Failed to send beacon for auto-save');
          } else {
            console.log('Data saved via beacon on page unload');
          }
        } catch (error) {
          console.error('Failed to prepare data for beacon save:', error);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const projectId = searchParams.get('projectId');
        if (projectId) {
          // Flush all pending auto-saves when page becomes hidden
          autoSaveService.flushAllSaves();

          // Use regular fetch for visibility change (less critical)
          pushDataToBackend(projectId, musicClipState.actions.getCurrentState(), musicTracks.getCurrentState())
            .catch(error => console.error('Failed to push data to backend on visibility change:', error));
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [searchParams, musicClipState.actions, musicTracks, musicAnalysis.analysisData]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/music-clip')) {
        return;
      }

      const stepParam = searchParams.get('step');
      if (stepParam) {
        const step = parseInt(stepParam, 10);
        if (step >= 1 && step <= 4) {
          musicClipState.actions.setCurrentStep(step as 1 | 2 | 3 | 4);
        }
      } else {
        musicClipState.actions.setCurrentStep(1);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [searchParams]);

  // Restore audio file state from localStorage on mount
  useEffect(() => {
    const restoreAudioState = async () => {
      if (musicTracks.selectedTrackId && musicTracks.musicTracks.length > 0) {
        const selectedTrack = musicTracks.musicTracks.find(track => track.id === musicTracks.selectedTrackId);
        if (selectedTrack && selectedTrack.file && selectedTrack.file.size > 0) {
          musicClipState.actions.setAudioFile(selectedTrack.file);
          musicClipState.actions.setAudioUrl(selectedTrack.url);
          musicClipState.actions.setAudioDuration(selectedTrack.duration);
        }
      }
    };

    restoreAudioState();
  }, [musicTracks.selectedTrackId, musicTracks.musicTracks]);

  const pushDataToBackend = async (projectId: string, musicClipData: any, tracksData: any) => {
    try {
      console.log('Pushing data to backend for project:', projectId);

      // Update project settings using the project management hook
      if (musicClipData?.settings) {
        try {
          await projectManagement.actions.updateProjectSettings(projectId, musicClipData.settings);
          console.log('Settings synced to backend successfully');
        } catch (settingsError) {
          console.error('Failed to save settings:', settingsError);
          // Don't throw here, continue with other operations
        }
      }

      // Update tracks if we have track data
      if (tracksData?.musicTracks && tracksData.musicTracks.length > 0) {
        // Update track descriptions and genres
        for (const track of tracksData.musicTracks) {
          const updates: any = {};

          // Use individual descriptions from music clip state
          if (musicClipState.state.individualDescriptions[track.id]) {
            updates.video_description = musicClipState.state.individualDescriptions[track.id];
          }
          if (tracksData.trackGenres?.[track.id]) {
            updates.genre = tracksData.trackGenres[track.id];
          }

          if (Object.keys(updates).length > 0) {
            console.log(`Updating track ${track.id} with:`, updates);
            try {
              await musicClipAPI.updateTrack(projectId, track.id, updates);
              console.log(`Successfully updated track ${track.id}`);
            } catch (trackError) {
              console.error(`Failed to update track ${track.id}:`, trackError);
              // Continue with other tracks even if one fails
            }
          } else {
            console.log(`No updates needed for track ${track.id}`);
          }
        }
      }

      // Save shared description separately if in reuse mode
      if (musicClipState.state.settings?.useSameVideoForAll && musicClipState.state.sharedDescription) {
        console.log('Saving shared description to backend:', musicClipState.state.sharedDescription);
        // TODO: Add API call to save shared description to project settings
        // This could be saved as a project-level setting or in a separate table
      }

      // Save analysis data to project if available
      if (musicAnalysis.analysisData) {
        try {
          await musicClipAPI.updateProjectAnalysis(projectId, musicAnalysis.analysisData);
          console.log('Analysis data saved to project');
        } catch (error) {
          console.error('Failed to save analysis data:', error);
        }
      }

      console.log('Successfully pushed data to backend');
    } catch (error) {
      console.error('Failed to push data to backend:', error);
      // Don't throw error to avoid blocking page navigation
    }
  };

  const loadExistingProject = async (projectId: string) => {
    try {
      musicClipState.actions.setIsLoadingExistingProject(true);
      console.log('Loading project from backend:', projectId);
      const projectData = await projectManagement.actions.loadExistingProject(projectId);

      // Debug project data structure
      console.log('Project data structure:', projectData);
      console.log('Script structure:', projectData?.script);
      console.log('Steps structure:', projectData?.script?.steps);
      console.log('Music structure:', projectData?.script?.steps?.music);

      // Update settings if available - with proper null checks
      if (projectData?.script?.steps?.music?.settings) {
        const settings = projectData.script.steps.music.settings;
        console.log('Loading settings:', settings);
        musicClipState.actions.setSettings(settings);
        musicClipState.forms.settingsForm.reset(settings);
      } else {
        console.log('No settings found in project data - using default settings');
        // For old projects that don't have settings, we'll use the default settings
        // The musicClipState should already have default settings initialized
      }

      // Update tracks if available
      if (projectData?.tracks.tracks && projectData.tracks.tracks.length > 0) {
        console.log(`Loading ${projectData.tracks.tracks.length} tracks in parallel...`);
        const startTime = performance.now();

        // Fetch URLs for all tracks in parallel
        const trackUrlPromises = projectData.tracks.tracks.map(async (track: any) => {
          try {
            const urlResponse = await musicClipAPI.getTrackUrl(projectId, track.id);
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

          // For existing tracks from backend, don't create a File object
          // The S3 URL will be used directly for playback

          return {
            id: track.id,
            // No file property for tracks loaded from backend
            url: url, // Use the S3 URL for playback
            duration: track.metadata.duration || 0,
            name: track.file_path.split('/').pop() || 'Unknown Track',
            prompt: track.prompt,
            genre: track.genre,
            videoDescription: track.video_description,
            generatedAt: new Date(track.created_at),
            isGenerated: track.ai_generated,
          };
        });

        musicTracks.setMusicTracks(tracks);

        if (tracks.length > 0) {
          musicTracks.setSelectedTrackId(tracks[0].id);
          musicTracks.setSelectedTrackIds([tracks[0].id]);
        }

        // Reset validation state when loading project
        console.log('Resetting validation state for loaded project');
        setTrackValidity({});
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
  };

  const handleGenerateMusic = async (options?: { duration: number; model: string }, isInstrumental?: boolean) => {
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
  };

  const handleGenerateMusicPrompt = async (selectedGenre?: string, isInstrumental?: boolean) => {
    musicClipState.actions.setIsUploadingTracks(true);

    try {
      // Create project if not already created
      const projectId = await projectManagement.actions.createProject();

      const categories = selectedGenre ? [selectedGenre] : undefined;

      const params = new URLSearchParams({
        prompt_type: 'music',
        source: 'json',
        instrumental: (isInstrumental || false).toString(),
      });

      if (categories) {
        params.append('categories', categories.join(','));
      }

      const response = await fetch(`/api/prompts/random?${params.toString()}`);

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
        // Note: These are placeholder tracks for prompt generation only
        // They don't have actual audio files until generated
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
    }
  };

  const handleGenerateMusicDescription = async (selectedGenre?: string, isInstrumental?: boolean) => {
    // Update the local isInstrumental state
    if (isInstrumental !== undefined) {
      musicClipState.actions.setIsInstrumental(isInstrumental);
    }

    try {
      const data = await promptGeneration.generateMusicDescription(selectedGenre, isInstrumental);

      // Only update the music prompt text area, don't create tracks
      musicClipState.actions.setMusicPrompt(data.prompt);

      toast({
        title: "Music Description Generated",
        description: `Generated ${data.category} style description for your music.`,
      });

    } catch (error) {
      console.error('Error generating music description:', error);
    }
  };

  const handleGenreSelect = async (genre: string, isInstrumental: boolean) => {
    await handleGenerateMusicDescription(genre, isInstrumental);
  };

  const handleRandomGenerate = async (isInstrumental: boolean) => {
    await handleGenerateMusicDescription(undefined, isInstrumental);
  };

  const handleAudioFileChange = async (files: File[]) => {
    const audioFiles = files.filter(file => file.type.startsWith("audio/"));

    if (audioFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload audio files (e.g., MP3, WAV).",
      });
      return;
    }

    musicClipState.actions.setIsUploadingTracks(true);

    try {
      const projectId = await projectManagement.actions.createProject();

      if (!projectId) {
        throw new Error('Failed to create project');
      }

      // Use parallel batch upload for multiple files
      if (audioFiles.length > 1) {
        const batchResult = await musicClipAPI.uploadTracksBatch(projectId, audioFiles, {
          ai_generated: false,
          instrumental: false,
        });

        const newTracks: MusicTrack[] = [];

        // Process successful uploads
        for (const result of batchResult.successful_tracks) {
          const file = audioFiles.find(f => f.name === result.filename);
          if (file && result.track_id) {
            const url = URL.createObjectURL(file);

            const newTrack: MusicTrack = {
              id: result.track_id,
              file: file,
              url: url,
              duration: result.metadata?.duration || 0,
              name: file.name,
              generatedAt: new Date(),
              prompt: result.prompt,
              genre: result.genre,
              videoDescription: result.video_description,
              isGenerated: result.ai_generated || false,
            };

            newTracks.push(newTrack);

            const audio = new Audio(url);
            audio.addEventListener('loadedmetadata', () => {
              musicTracks.updateTrackDuration(newTrack.id, audio.duration);
            });
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
          musicTracks.addTracks(newTracks);

          const firstTrack = newTracks[0];
          musicClipState.actions.setAudioFile(firstTrack.file || null);
          musicClipState.actions.setAudioUrl(firstTrack.url);
          musicClipState.actions.setAudioDuration(firstTrack.duration);

          toast({
            title: "Tracks Uploaded",
            description: `Successfully uploaded ${newTracks.length} track(s) in ${batchResult.processing_time_seconds.toFixed(1)}s.`,
          });
        }
      } else {
        // Single file upload (keep existing logic for single files)
        const file = audioFiles[0];
        try {
          const uploadResult = await musicClipAPI.uploadTrack(projectId, file, {
            ai_generated: false,
            instrumental: false,
          });

          const url = URL.createObjectURL(file);

          const newTrack: MusicTrack = {
            id: uploadResult.track_id,
            file: file,
            url: url,
            duration: uploadResult.metadata.duration || 0,
            name: file.name,
            generatedAt: new Date(),
            prompt: uploadResult.prompt,
            genre: uploadResult.genre,
            videoDescription: uploadResult.video_description,
            isGenerated: uploadResult.ai_generated,
          };

          musicTracks.addTracks([newTrack]);

          const audio = new Audio(url);
          audio.addEventListener('loadedmetadata', () => {
            musicTracks.updateTrackDuration(newTrack.id, audio.duration);
          });

          musicClipState.actions.setAudioFile(newTrack.file || null);
          musicClipState.actions.setAudioUrl(newTrack.url);
          musicClipState.actions.setAudioDuration(newTrack.duration);

          toast({
            title: "Track Uploaded",
            description: `Successfully uploaded ${file.name} to your project.`,
          });

        } catch (error) {
          console.error(`Failed to upload track ${file.name}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: `Failed to upload ${file.name}: ${errorMessage}`,
          });
        }
      }
    } finally {
      musicClipState.actions.setIsUploadingTracks(false);
    }
  };

  const handleTrackSelect = (track: MusicTrack, event?: React.MouseEvent) => {
    musicTracks.selectTrack(track, event);

    // Only set audio file if it exists (for uploaded tracks)
    if (track.file) {
      musicClipState.actions.setAudioFile(track.file);
    } else {
      // For tracks loaded from backend, clear the audio file
      musicClipState.actions.setAudioFile(null);
    }
    musicClipState.actions.setAudioUrl(track.url);
    musicClipState.actions.setAudioDuration(track.duration);
  };

  const handlePlayPause = (track: MusicTrack) => {
    audioPlayback.playTrack(track);
  };

  const handleTrackRemove = (trackId: string) => {
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
  };

  const handleTrackReorder = (fromId: string, toId: string, position: 'above' | 'below' | null) => {
    const fromIndex = musicTracks.musicTracks.findIndex(t => t.id === fromId);
    const toIndex = musicTracks.musicTracks.findIndex(t => t.id === toId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const adjustedToIndex = position === 'below' ? toIndex + 1 : toIndex;
      musicTracks.reorderTracks(fromIndex, adjustedToIndex);
    }
  };

  const handleSettingsSubmit = async (values: z.infer<typeof SettingsSchema>) => {
    const currentBudget = musicClipState.forms.settingsForm.getValues("budget")?.[0] || 1;
    const settingsWithDefaults = {
      ...values,
      budget: values.budget || [currentBudget],
      user_price: currentBudget, // Save the user-set price separately
    };

    musicClipState.actions.setSettings(settingsWithDefaults);

    if (projectManagement.state.currentProjectId) {
      try {
        await projectManagement.actions.updateProjectSettings(projectManagement.state.currentProjectId, settingsWithDefaults);
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    }

    musicClipState.actions.setCurrentStep(3);
    musicClipState.actions.setMaxReachedStep(3);
  };

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
  }, [musicClipState, projectId, preservedIndividualDescriptions, musicTracks.musicTracks, setTrackValidity]);

  const onPromptSubmit = (values: z.infer<typeof PromptSchema>, newTrackDescriptions?: Record<string, string>, trackGenres?: Record<string, string>) => {
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

    musicClipState.actions.setCurrentStep(4);
    musicClipState.actions.setMaxReachedStep(4);
  };

  const onPromptSubmitForm = (values: z.infer<typeof PromptSchema>) => {
    onPromptSubmit(values);
  };

  const onOverviewSubmit = async (values: z.infer<typeof OverviewSchema>) => {
    console.log('=== onOverviewSubmit CALLED ===');
    console.log('Values:', values);
    console.log('Current step before:', musicClipState.state.currentStep);

    // Navigate to step 4
    console.log('Navigating to step 4...');
    musicClipState.actions.setCurrentStep(4);
    console.log('Current step after setCurrentStep(4):', musicClipState.state.currentStep);
  };

  const handleBack = (e?: React.MouseEvent) => {
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
  };

  // Memoized callbacks to prevent infinite loops in StepPrompt
  const handleTrackDescriptionsUpdate = useCallback((descriptions: Record<string, string>) => {
    // Update individual descriptions in music clip state
    musicClipState.actions.setIndividualDescriptions(descriptions);
  }, [musicClipState.actions]);

  const handleSharedDescriptionUpdate = useCallback((desc: string) => {
    // Update the shared description state
    musicClipState.actions.setSharedDescription(desc);
  }, [musicClipState.actions]);

  // Render overview layout separately for step 4
  if (musicClipState.state.currentStep === 4) {
    return (
      <OverviewLayout
        form={musicClipState.forms.promptForm}
        settings={musicClipState.state.settings}
        audioFile={musicClipState.state.audioFile}
        audioDuration={musicClipState.state.audioDuration}
        musicTracks={musicTracks.musicTracks}
        selectedTrackId={musicTracks.selectedTrackId}
        onTrackSelect={(trackId: string) => handleTrackSelect(musicTracks.musicTracks.find(t => t.id === trackId)!, undefined)}
        onSubmit={onPromptSubmitForm}
        onBack={() => musicClipState.actions.setCurrentStep(3)}
        fileToDataUri={fileToDataUri}
        toast={toast}
        onTrackDescriptionsUpdate={handleTrackDescriptionsUpdate}
        onSharedDescriptionUpdate={handleSharedDescriptionUpdate}
        onPromptsUpdate={musicClipState.actions.setPrompts}
        trackDescriptions={musicClipState.state.individualDescriptions}
        analysisData={musicAnalysisData}
        canContinue={areAllTracksValid}
        onContinue={() => {
          const formValues = musicClipState.forms.promptForm.getValues();
          onPromptSubmit(formValues);
        }}
        continueText={`Checkout with ${musicClipState.state.settings?.user_price || musicClipState.state.settings?.budget?.[0] || 0} credits`}
      />
    );
  }

  return (
    <>
      {/* FULL-SCREEN LOADING OVERLAY */}
      {musicClipState.state.isLoadingExistingProject && (
        <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-8">
            <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-foreground">Loading Project</h2>
              <p className="text-base text-muted-foreground max-w-md">
                Please wait while we load your existing project data...
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>

      <div className="h-screen bg-background flex flex-col">
        {/* HEADER */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard/create"
                  className="flex items-center space-x-2 text-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Back to Create</span>
                </Link>

              </div>

              <div className="flex-1 flex justify-center">
                <TimelineHeader
                  currentStep={musicClipState.state.currentStep}
                  maxReachedStep={musicClipState.state.maxReachedStep}
                  totalSteps={4}
                  onStepClick={(step) => {
                    if (step <= musicClipState.state.maxReachedStep) {
                      musicClipState.actions.setCurrentStep(step as 1 | 2 | 3 | 4);
                    }
                  }}
                />
              </div>

              <Badge className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg flex items-center space-x-2">
                <MusicLogo className="w-4 h-4" />
                <span>Music Clip Creator</span>
              </Badge>
            </div>
          </div>
        </div>


        {/* MAIN CONTENT */}
        <div className="flex-1 w-full max-w-7xl mx-auto px-8 py-4 overflow-y-auto">
          <div className="min-h-full flex flex-col space-y-4">
            <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-0 w-full items-center">
              {/* LEFT SIDE - UPLOAD AREA */}
              <div className="flex flex-col xl:col-span-3 h-full min-h-[600px] xl:min-h-[calc(100vh-200px)]">
                {musicClipState.state.currentStep === 1 && (
                  <StepUpload
                    musicPrompt={musicClipState.state.musicPrompt}
                    setMusicPrompt={musicClipState.actions.setMusicPrompt}
                    musicTracksToGenerate={musicClipState.state.musicTracksToGenerate}
                    setMusicTracksToGenerate={musicClipState.actions.setMusicTracksToGenerate}
                    musicGenerationPrice={musicGenerationPrice}
                    onAudioFileChange={handleAudioFileChange}
                    onGenerateMusic={handleGenerateMusic}
                    onOpenGenreSelector={() => musicClipState.actions.setShowGenreSelector(true)}
                    onContinue={musicClipState.actions.handleContinue}
                    canContinue={musicTracks.musicTracks.length > 0 && musicTracks.selectedTrackId !== null}
                    vibeFile={musicClipState.state.vibeFile}
                    onVibeFileChange={musicClipState.actions.setVibeFile}
                  />
                )}

                {musicClipState.state.currentStep === 2 && (
                  <div className="flex flex-col h-full">
                    <Card className="bg-card border border-border  flex-1 flex flex-col">
                      <CardContent className="space-y-6 flex-1 flex flex-col p-6">
                        <StepSettings
                          form={musicClipState.forms.settingsForm}
                          audioDuration={musicClipState.state.audioDuration}
                          totalDuration={getTotalDuration(musicTracks.musicTracks)}
                          trackCount={musicTracks.musicTracks.length}
                          trackDurations={musicTracks.musicTracks.map(track => track.duration)}
                          onSubmit={handleSettingsSubmit}
                          onBack={() => musicClipState.actions.setCurrentStep(1)}
                          hideNavigation={true}
                          onReuseVideoToggle={handleReuseVideoToggle}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {musicClipState.state.currentStep === 3 && (
                  <div className="flex flex-col h-full">
                    <StepOverview
                      form={musicClipState.forms.overviewForm}
                      settings={musicClipState.state.settings}
                      prompts={musicClipState.state.prompts}
                      channelAnimationFile={musicClipState.state.channelAnimationFile}
                      setChannelAnimationFile={musicClipState.actions.setChannelAnimationFile}
                      onSubmit={onOverviewSubmit}
                      onBack={() => musicClipState.actions.setCurrentStep(2)}
                      isGeneratingVideo={false}
                      toast={toast}
                    />
                  </div>
                )}

              </div>

              {/* RIGHT SIDE - DRAG AND DROP AREA */}
              <div
                className={`flex flex-col h-full xl:col-span-1 min-h-[600px] xl:min-h-[calc(100vh-200px)] transition-all duration-300 ${
                  dragAndDrop.state.isDragOver ? 'scale-[1.02]' : ''
                }`}
                onDragEnter={(e) => dragAndDrop.actions.handleDragEnter(e, dragAndDrop.state.isTrackReordering)}
                onDragOver={(e) => dragAndDrop.actions.handleDragOver(e, dragAndDrop.state.isTrackReordering)}
                onDragLeave={(e) => dragAndDrop.actions.handleDragLeave(e, dragAndDrop.state.isTrackReordering)}
                onDrop={(e) => {
                  dragAndDrop.actions.handleDrop(e, dragAndDrop.state.isTrackReordering);

                  const files = Array.from(e.dataTransfer.files);
                  const audioFiles = files.filter(file => file.type.startsWith('audio/'));

                  if (audioFiles.length === 0) {
                    toast({
                      variant: "destructive",
                      title: "Invalid Files",
                      description: "Please drop audio files only.",
                    });
                    return;
                  }

                  handleAudioFileChange(audioFiles);
                }}
              >
                <Card className={`bg-card border  flex-1 flex flex-col min-h-0 transition-all duration-300 ${
                  dragAndDrop.state.isDragOver
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border'
                }`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Music className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-foreground">
                            Music Tracks
                          </CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            {musicTracks.musicTracks.length} track{musicTracks.musicTracks.length !== 1 ? 's' : ''} loaded
                            {musicTracks.selectedTrackIds.length > 1 && (
                              <span className="ml-2 text-primary font-medium">
                                • {musicTracks.selectedTrackIds.length} selected
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      {musicTracks.musicTracks.length > 0 && (
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Total Duration</div>
                          <div className="text-sm font-semibold text-primary">
                            {formatDuration(getTotalDuration(musicTracks.musicTracks))}
                          </div>
                        </div>
                      )}
                    </div>

                    {musicTracks.musicTracks.length === 0 && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-dashed border-border">
                        <p className="text-sm text-muted-foreground text-center">
                          Drag and drop audio files here or use the controls on the left
                        </p>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 min-h-0">
                      {musicClipState.state.isUploadingTracks ? (
                        <div className="flex-1 flex items-center justify-center p-6">
                          <div className="text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-primary">
                                Uploading tracks...
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Please wait while your files are being processed
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : musicTracks.musicTracks.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-6">
                          <div className="text-center space-y-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-all duration-300 ${
                              dragAndDrop.state.isDragOver ? 'bg-primary/20 scale-110' : 'bg-primary/10'
                            }`}>
                              <Upload className={`w-6 h-6 text-primary transition-all duration-300 ${
                                dragAndDrop.state.isDragOver ? 'scale-110' : ''
                              }`} />
                            </div>
                            <div>
                              <p className={`text-sm font-medium transition-colors duration-300 ${
                                dragAndDrop.state.isDragOver ? 'text-primary' : 'text-muted-foreground'
                              }`}>
                                {dragAndDrop.state.isDragOver ? 'Drop audio files here!' : 'No tracks loaded'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Upload or generate music to get started
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`p-3 space-y-2 h-full overflow-y-auto transition-all duration-300 relative scrollbar-modern ${
                            dragAndDrop.state.isDragOver ? 'opacity-50' : ''
                          }`}
                          style={{ maxHeight: 'calc(100vh - 300px)' }}
                        >
                          {dragAndDrop.state.isDragOver && (
                            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg z-10">
                              <div className="text-center space-y-2">
                                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                                  <Upload className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">Drop to add more tracks</p>
                              </div>
                            </div>
                          )}
                          {musicTracks.musicTracks.map((track, index) => (
                            <TrackCard
                              key={track.id}
                              track={track}
                              isSelected={musicTracks.selectedTrackIds.includes(track.id)}
                              isPlaying={audioPlayback.currentlyPlayingId === track.id && audioPlayback.isPlaying}
                              hasDescription={!!trackValidity[track.id]}
                              onSelect={handleTrackSelect}
                              onPlayPause={handlePlayPause}
                              onRemove={handleTrackRemove}
                              selectionIndex={musicTracks.selectedTrackIds.includes(track.id) ? musicTracks.selectedTrackIds.indexOf(track.id) : undefined}
                              totalSelected={musicTracks.selectedTrackIds.length}
                              onDragStart={(e) => dragAndDrop.actions.handleDragStart(e, track.id)}
                              onDragOver={(e) => dragAndDrop.actions.handleTrackDragOver(e, track.id)}
                              onDrop={(e) => {
                                const result = dragAndDrop.actions.handleTrackDrop(e, track.id);
                                if (result && 'fromId' in result) {
                                  handleTrackReorder(result.fromId, result.toId, result.position);
                                }
                              }}
                              onDragEnd={dragAndDrop.actions.handleDragEnd}
                              isDragging={dragAndDrop.state.draggedTrackId === track.id}
                              isDragOver={dragAndDrop.state.dragOverTrackId === track.id}
                              dropPosition={dragAndDrop.state.dragOverTrackId === track.id ? dragAndDrop.state.dropPosition : null}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {musicTracks.selectedTrackIds.length > 1 && (
                      <div className="p-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            musicTracks.removeTracks(musicTracks.selectedTrackIds);
                            toast({
                              title: "Tracks Deleted",
                              description: `${musicTracks.selectedTrackIds.length} tracks have been removed.`,
                            });
                          }}
                          className="w-full"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Selected ({musicTracks.selectedTrackIds.length})
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* NAVIGATION BUTTONS */}
            {musicTracks.musicTracks.length > 0 && musicTracks.selectedTrackId && musicClipState.state.currentStep <= 4 && (
              <div className="fixed bottom-0 left-16 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                  <div className="flex items-center justify-between">
                    <div className="w-24 flex-shrink-0">
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          if (musicClipState.state.currentStep > 1) {
                            musicClipState.actions.handleBack();
                          } else {
                            handleBack(e);
                          }
                        }}
                        className="w-24 h-10 flex items-center justify-center space-x-2 text-foreground border-border hover:bg-muted hover:text-foreground min-w-24 max-w-24"
                        disabled={musicClipState.state.currentStep === 1 && musicTracks.musicTracks.length === 0}
                        style={{ width: '96px', minWidth: '96px', maxWidth: '96px' }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back</span>
                      </Button>
                    </div>

                    {musicClipState.state.currentStep === 3 && (
                      <div className="flex-1 flex justify-end">
                        <Button
                          onClick={async () => {
                            console.log('=== MUSIC CLIP STEP 3 CONTINUE BUTTON CLICKED ===');
                            console.log('Current step:', musicClipState.state.currentStep);
                            console.log('Form values:', musicClipState.forms.overviewForm.getValues());
                            console.log('Form state:', musicClipState.forms.overviewForm.formState);
                            console.log('Form errors:', musicClipState.forms.overviewForm.formState.errors);
                            console.log('Form isValid:', musicClipState.forms.overviewForm.formState.isValid);

                            // Ensure all tracks are analyzed before proceeding
                            try {
                              musicClipState.actions.setIsAnalyzingMusic(true);

                              // Get tracks that need analysis
                              const tracksNeedingAnalysis = musicAnalysis.getTracksNeedingAnalysis(musicTracks.musicTracks);

                              if (tracksNeedingAnalysis.length > 0) {
                                console.log(`Analyzing ${tracksNeedingAnalysis.length} tracks before proceeding to step 4`);
                                await musicAnalysis.analyzeMissingTracks(musicTracks.musicTracks);
                              } else {
                                console.log('All tracks already analyzed');
                              }

                              // Save analysis data to project if we have any
                              if (musicAnalysis.analysisData && projectManagement.state.currentProjectId) {
                                try {
                                  await musicClipAPI.updateProjectAnalysis(projectManagement.state.currentProjectId, musicAnalysis.analysisData);
                                  console.log('Analysis data saved to project');
                                } catch (error) {
                                  console.error('Failed to save analysis data:', error);
                                }
                              }
                            } catch (error) {
                              console.error('Music analysis failed:', error);
                              toast({
                                variant: "destructive",
                                title: "Analysis Failed",
                                description: "Failed to analyze music tracks. You can continue without analysis.",
                              });
                            } finally {
                              musicClipState.actions.setIsAnalyzingMusic(false);
                            }

                            // Navigate to step 4
                            console.log('Directly navigating to step 4 (bypassing form validation)...');
                            musicClipState.actions.setCurrentStep(4);
                            console.log('Current step after setCurrentStep(4):', musicClipState.state.currentStep);
                          }}
                          className="flex items-center space-x-2 text-white btn-ai-gradient"
                          disabled={musicClipState.state.isGeneratingVideo}
                        >
                          <span>Continue</span>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {musicClipState.state.currentStep === 1 && (
                      <Button
                        onClick={musicClipState.actions.handleContinue}
                        className={`flex items-center space-x-2 text-white ${
                          musicTracks.musicTracks.length > 0 && musicTracks.selectedTrackId ? 'btn-ai-gradient' : 'bg-muted text-foreground/50 cursor-not-allowed'
                        }`}
                        disabled={musicTracks.musicTracks.length === 0 || !musicTracks.selectedTrackId}
                      >
                        <span>Continue</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}

                    {musicClipState.state.currentStep === 2 && (
                      <Button
                        onClick={() => musicClipState.forms.settingsForm.handleSubmit(handleSettingsSubmit)()}
                        className={`flex items-center space-x-2 text-white ${
                          musicClipState.forms.settingsForm.formState.isValid ? 'btn-ai-gradient' : 'bg-muted text-foreground/50 cursor-not-allowed'
                        }`}
                        disabled={!musicClipState.forms.settingsForm.formState.isValid}
                      >
                        <span>Continue</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}


                  </div>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Genre Selector Modal */}
        <GenreSelector
          isOpen={musicClipState.state.showGenreSelector}
          onClose={() => musicClipState.actions.setShowGenreSelector(false)}
          onSelectGenre={handleGenreSelect}
          onGenerateRandom={handleRandomGenerate}
        />

        {/* AI Analysis Overlay */}
        <AIAnalysisOverlay
          isVisible={musicClipState.state.isAnalyzingMusic}
          title="Analyzing Music"
          subtitle="AI is processing your audio tracks..."
          progress={musicAnalysis.analysisProgress ?
            Object.values(musicAnalysis.analysisProgress).filter(status => status === 'completed').length /
            Object.keys(musicAnalysis.analysisProgress).length * 100 : undefined}
        />

      </div>
    </>
  );
}

export default MusicClipPage;
