"use client";

import { useEffect, useCallback } from "react";
import { autoSaveService } from "@/lib/auto-save-service";
import { projectsAPI } from "@/lib/api/projects";

interface UseDataPersistenceOptions {
  projectId: string | null;
  userId: string | null;
  musicClipData: any;
  tracksData: any;
  analysisData: any;
  isEnabled?: boolean;
}

interface UseDataPersistenceReturn {
  saveDataToBackend: () => Promise<void>;
  flushPendingSaves: () => void;
}

export function useDataPersistence({
  projectId,
  userId,
  musicClipData,
  tracksData,
  analysisData,
  isEnabled = true
}: UseDataPersistenceOptions): UseDataPersistenceReturn {
  
  const pushDataToBackend = useCallback(async (projectId: string, userId: string, musicClipData: any, tracksData: any) => {
    try {
      console.log('Pushing data to backend for project:', projectId, 'user:', userId);

      // Update project settings using the project management hook
      if (musicClipData?.settings) {
        try {
          // Include user_id in the settings update to ensure proper user association
          const settingsWithUserId = {
            ...musicClipData.settings,
            user_id: userId
          };
          await projectsAPI.updateProjectSettings(projectId, settingsWithUserId);
          console.log('Settings successfully saved to backend with user_id:', userId);
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
          if (musicClipData.individualDescriptions?.[track.id]) {
            updates.video_description = musicClipData.individualDescriptions[track.id];
          }
          if (tracksData.trackGenres?.[track.id]) {
            updates.genre = tracksData.trackGenres[track.id];
          }

          if (Object.keys(updates).length > 0) {
            console.log(`Updating track ${track.id} with:`, updates);
            try {
              await projectsAPI.updateTrack(projectId, track.id, updates);
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
      if (musicClipData.settings?.useSameVideoForAll && musicClipData.sharedDescription) {
        console.log('Saving shared description to backend:', musicClipData.sharedDescription);
        try {
          await projectsAPI.updateProjectSettings(projectId, {
            ...musicClipData.settings,
            sharedDescription: musicClipData.sharedDescription,
            user_id: userId
          });
          console.log('Shared description successfully saved to backend with user_id:', userId);
        } catch (error) {
          console.error('Failed to save shared description:', error);
        }
      }

      // Save analysis data to project if available
      if (analysisData) {
        try {
          await projectsAPI.updateProjectAnalysis(projectId, analysisData);
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
  }, []);

  const saveDataToBackend = useCallback(async () => {
    console.log('saveDataToBackend called with:', { projectId, userId, isEnabled });
    
    if (!projectId || !userId || !isEnabled) {
      console.log('Skipping save - missing requirements:', { 
        hasProjectId: !!projectId, 
        hasUserId: !!userId, 
        isEnabled 
      });
      return;
    }
    
    try {
      console.log('Starting data save to backend...');
      
      // First, trigger autosave to ensure data is saved to storage
      const autoSaveData = {
        projectId,
        musicClipData,
        tracksData,
        analysisData,
        timestamp: Date.now()
      };
      
      console.log('Triggering autosave with data:', autoSaveData);
      autoSaveService.scheduleSave(projectId, autoSaveData);
      
      // Also push data directly to backend for immediate save
      await pushDataToBackend(projectId, userId, musicClipData, tracksData);
      console.log('Data save completed successfully');
    } catch (error) {
      console.error('Failed to save data to backend:', error);
    }
  }, [projectId, userId, musicClipData, tracksData, analysisData, pushDataToBackend, isEnabled]);

  const flushPendingSaves = useCallback(() => {
    if (!isEnabled) return;
    
    try {
      // Flush all pending auto-saves immediately
      autoSaveService.flushAllSaves();
    } catch (error) {
      console.error('Failed to flush pending saves:', error);
    }
  }, [isEnabled]);

  // Push data to backend when leaving the page
  useEffect(() => {
    if (!isEnabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (projectId) {
        try {
          // Flush all pending auto-saves immediately
          autoSaveService.flushAllSaves();

          const data = {
            projectId,
            userId,
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
      if (document.visibilityState === 'hidden' && projectId) {
        // Flush all pending auto-saves when page becomes hidden
        autoSaveService.flushAllSaves();

        // Use regular fetch for visibility change (less critical)
        pushDataToBackend(projectId, userId, musicClipData, tracksData)
          .catch(error => console.error('Failed to push data to backend on visibility change:', error));
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
  }, [projectId, userId, musicClipData, tracksData, analysisData, pushDataToBackend, isEnabled]);

  return {
    saveDataToBackend,
    flushPendingSaves
  };
}
