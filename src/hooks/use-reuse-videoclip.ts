import { useState, useEffect, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import type { MusicTrack } from '@/types/music-clip';

interface UseReuseVideoclipProps {
  musicTracks: MusicTrack[];
  trackDescriptions: Record<string, string>;
  setTrackDescriptions: (descriptions: Record<string, string>) => void;
  promptForm: UseFormReturn<any>;
  settingsForm: UseFormReturn<any>;
  projectId?: string | null;
  // S3/Backend data loading
  loadedSharedDescription?: string;
  loadedIndividualDescriptions?: Record<string, string>;
  loadedReuseEnabled?: boolean;
}

interface UseReuseVideoclipReturn {
  isReuseEnabled: boolean;
  sharedDescription: string;
  toggleReuse: (enabled: boolean) => void;
  updateSharedDescription: (description: string) => void;
  updateIndividualDescription: (trackId: string, description: string) => void;
  getTrackValidity: (trackId: string) => boolean;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  getAllDescriptions: () => {
    isReuseEnabled: boolean;
    sharedDescription: string;
    individualDescriptions: Record<string, string>;
  };
}

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 500;

export function useReuseVideoclip({
  musicTracks,
  trackDescriptions,
  setTrackDescriptions,
  promptForm,
  settingsForm,
  projectId,
  loadedSharedDescription,
  loadedIndividualDescriptions,
  loadedReuseEnabled
}: UseReuseVideoclipProps): UseReuseVideoclipReturn {
  const [isReuseEnabled, setIsReuseEnabled] = useState<boolean>(false);
  const [sharedDescription, setSharedDescription] = useState<string>('');
  const [individualDescriptions, setIndividualDescriptions] = useState<Record<string, string>>({});
  const [isLoadingFromStorage, setIsLoadingFromStorage] = useState<boolean>(true);

  // Load from localStorage immediately on mount (before S3 data is available)
  useEffect(() => {
    console.log('useReuseVideoclip: projectId =', projectId);
    if (typeof window !== 'undefined' && projectId) {
      console.log('Loading from localStorage for project:', projectId);
      const savedReuse = localStorage.getItem(`musicClip_${projectId}_reuseEnabled`);
      const savedShared = localStorage.getItem(`musicClip_${projectId}_sharedDescription`);
      const savedIndividual = localStorage.getItem(`musicClip_${projectId}_individualDescriptions`);

      console.log('Loaded from localStorage:', {
        reuseEnabled: savedReuse,
        sharedDescription: savedShared,
        individualDescriptions: savedIndividual
      });

      if (savedReuse !== null) {
        setIsReuseEnabled(JSON.parse(savedReuse));
      }
      if (savedShared) {
        setSharedDescription(savedShared);
      }
      if (savedIndividual) {
        setIndividualDescriptions(JSON.parse(savedIndividual));
      }
      setIsLoadingFromStorage(false);
    } else {
      console.log('Not loading from localStorage - projectId is:', projectId);
      // Try to load from a temporary key for new projects
      if (typeof window !== 'undefined') {
        const tempReuse = localStorage.getItem('musicClip_temp_reuseEnabled');
        const tempShared = localStorage.getItem('musicClip_temp_sharedDescription');
        const tempIndividual = localStorage.getItem('musicClip_temp_individualDescriptions');

        console.log('Loading from temp localStorage:', {
          reuseEnabled: tempReuse,
          sharedDescription: tempShared,
          individualDescriptions: tempIndividual
        });

        if (tempReuse !== null) {
          setIsReuseEnabled(JSON.parse(tempReuse));
        }
        if (tempShared) {
          setSharedDescription(tempShared);
        }
        if (tempIndividual) {
          setIndividualDescriptions(JSON.parse(tempIndividual));
        }
      }
      setIsLoadingFromStorage(false);
    }
  }, [projectId]);

  // Load from S3/Backend data when available, with localStorage as fallback
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId && musicTracks.length > 0) {
      // Priority: S3/Backend data > localStorage
      let reuseEnabled = false;
      let sharedDesc = '';
      let individualDescs: Record<string, string> = {};

      // Check if we have loaded data from S3/Backend
      if (loadedReuseEnabled !== undefined) {
        reuseEnabled = loadedReuseEnabled;
      } else {
        // Fallback to localStorage
        const savedReuse = localStorage.getItem(`musicClip_${projectId}_reuseEnabled`);
        if (savedReuse !== null) {
          reuseEnabled = JSON.parse(savedReuse);
        }
      }

      if (loadedSharedDescription !== undefined) {
        sharedDesc = loadedSharedDescription;
      } else {
        // Fallback to localStorage
        const savedShared = localStorage.getItem(`musicClip_${projectId}_sharedDescription`);
        if (savedShared) {
          sharedDesc = savedShared;
        }
      }

      if (loadedIndividualDescriptions !== undefined) {
        individualDescs = loadedIndividualDescriptions;
      } else {
        // Fallback to localStorage
        const savedIndividual = localStorage.getItem(`musicClip_${projectId}_individualDescriptions`);
        if (savedIndividual) {
          individualDescs = JSON.parse(savedIndividual);
        }
      }

      // Ensure all tracks have entries (fill missing ones with empty strings)
      const allTrackIds = musicTracks.map(track => track.id);
      const completeIndividualDescs: Record<string, string> = {};
      allTrackIds.forEach(trackId => {
        completeIndividualDescs[trackId] = individualDescs[trackId] || '';
      });

      // Set states
      setIsReuseEnabled(reuseEnabled);
      setSharedDescription(sharedDesc);
      setIndividualDescriptions(completeIndividualDescs);

      // Update track descriptions based on mode
      if (reuseEnabled) {
        // Reuse mode: apply shared description to all tracks
        const newTrackDescriptions: Record<string, string> = {};
        allTrackIds.forEach(trackId => {
          newTrackDescriptions[trackId] = sharedDesc;
        });
        setTrackDescriptions(newTrackDescriptions);

        // Update form with shared description (with a small delay to ensure form is ready)
        setTimeout(() => {
          promptForm.setValue("videoDescription", sharedDesc, { shouldValidate: true, shouldDirty: true });
        }, 100);
      } else {
        // Individual mode: use individual descriptions
        setTrackDescriptions(completeIndividualDescs);

        // Set form to current track's description if available (with a small delay to ensure form is ready)
        setTimeout(() => {
          const currentTrackId = allTrackIds[0]; // Default to first track
          if (currentTrackId && completeIndividualDescs[currentTrackId]) {
            promptForm.setValue("videoDescription", completeIndividualDescs[currentTrackId], { shouldValidate: true, shouldDirty: true });
          } else {
            promptForm.setValue("videoDescription", "", { shouldValidate: true, shouldDirty: true });
          }
        }, 100);
      }
    }
  }, [projectId, loadedReuseEnabled, loadedSharedDescription, loadedIndividualDescriptions, musicTracks, setTrackDescriptions, promptForm]);

  // Apply descriptions to tracks and form when tracks are loaded
  useEffect(() => {
    if (musicTracks.length > 0) {
      const allTrackIds = musicTracks.map(track => track.id);

      if (isReuseEnabled) {
        // Reuse mode: apply shared description to all tracks
        const newTrackDescriptions: Record<string, string> = {};
        allTrackIds.forEach(trackId => {
          newTrackDescriptions[trackId] = sharedDescription;
        });
        setTrackDescriptions(newTrackDescriptions);

        // Update form with shared description (with a small delay to ensure form is ready)
        setTimeout(() => {
          promptForm.setValue("videoDescription", sharedDescription, { shouldValidate: true, shouldDirty: true });
        }, 100);
      } else {
        // Individual mode: use individual descriptions
        const completeIndividualDescs: Record<string, string> = {};
        allTrackIds.forEach(trackId => {
          completeIndividualDescs[trackId] = individualDescriptions[trackId] || '';
        });
        setTrackDescriptions(completeIndividualDescs);

        // Set form to current track's description if available (with a small delay to ensure form is ready)
        setTimeout(() => {
          const currentTrackId = allTrackIds[0]; // Default to first track
          if (currentTrackId && completeIndividualDescs[currentTrackId]) {
            promptForm.setValue("videoDescription", completeIndividualDescs[currentTrackId], { shouldValidate: true, shouldDirty: true });
          } else {
            promptForm.setValue("videoDescription", "", { shouldValidate: true, shouldDirty: true });
          }
        }, 100);
      }
    }
  }, [musicTracks, isReuseEnabled, sharedDescription, individualDescriptions, setTrackDescriptions, promptForm]);

  // Save to localStorage whenever state changes
  const saveToLocalStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (projectId) {
        localStorage.setItem(`musicClip_${projectId}_reuseEnabled`, JSON.stringify(isReuseEnabled));
        localStorage.setItem(`musicClip_${projectId}_sharedDescription`, sharedDescription);
        localStorage.setItem(`musicClip_${projectId}_individualDescriptions`, JSON.stringify(individualDescriptions));
      } else {
        localStorage.setItem('musicClip_temp_reuseEnabled', JSON.stringify(isReuseEnabled));
        localStorage.setItem('musicClip_temp_sharedDescription', sharedDescription);
        localStorage.setItem('musicClip_temp_individualDescriptions', JSON.stringify(individualDescriptions));
      }
    }
  }, [projectId, isReuseEnabled, sharedDescription, individualDescriptions]);

  // Load from localStorage
  const loadFromLocalStorage = useCallback(() => {
    if (typeof window !== 'undefined' && projectId) {
      const savedReuse = localStorage.getItem(`musicClip_${projectId}_reuseEnabled`);
      const savedShared = localStorage.getItem(`musicClip_${projectId}_sharedDescription`);
      const savedIndividual = localStorage.getItem(`musicClip_${projectId}_individualDescriptions`);

      if (savedReuse !== null) {
        setIsReuseEnabled(JSON.parse(savedReuse));
      }
      if (savedShared) {
        setSharedDescription(savedShared);
      }
      if (savedIndividual) {
        setIndividualDescriptions(JSON.parse(savedIndividual));
      }
    }
  }, [projectId]);

  // Auto-save to localStorage when state changes
  useEffect(() => {
    saveToLocalStorage();
  }, [saveToLocalStorage]);

  // Validate description length
  const isValidDescription = useCallback((description: string): boolean => {
    const trimmed = description.trim();
    return trimmed.length >= MIN_DESCRIPTION_LENGTH && trimmed.length <= MAX_DESCRIPTION_LENGTH;
  }, []);

  // Get track validity based on current mode
  const getTrackValidity = useCallback((trackId: string): boolean => {
    if (isReuseEnabled) {
      return isValidDescription(sharedDescription);
    } else {
      const description = individualDescriptions[trackId] || trackDescriptions[trackId] || '';
      return isValidDescription(description);
    }
  }, [isReuseEnabled, sharedDescription, individualDescriptions, trackDescriptions, isValidDescription]);

  // Update shared description
  const updateSharedDescription = useCallback((description: string) => {
    // Don't update if the description is empty and we already have a non-empty description
    if (description.trim() === '' && sharedDescription.trim() !== '') {
      console.log('Skipping empty description update, keeping existing:', sharedDescription);
      return;
    }

    setSharedDescription(description);

    if (isReuseEnabled) {
      // Update all tracks with the shared description
      const newTrackDescriptions: Record<string, string> = {};
      musicTracks.forEach(track => {
        newTrackDescriptions[track.id] = description;
      });
      setTrackDescriptions(newTrackDescriptions);
    }

    // Save to localStorage immediately
    if (typeof window !== 'undefined') {
      if (projectId) {
        console.log('Saving shared description to localStorage:', description);
        localStorage.setItem(`musicClip_${projectId}_sharedDescription`, description);
      } else {
        console.log('Saving shared description to temp localStorage:', description);
        localStorage.setItem('musicClip_temp_sharedDescription', description);
      }
    }
  }, [isReuseEnabled, musicTracks, setTrackDescriptions, projectId, sharedDescription]);

  // Update individual description
  const updateIndividualDescription = useCallback((trackId: string, description: string) => {
    if (!isReuseEnabled) {
      // Don't update if the description is empty and we already have a non-empty description for this track
      const existingDescription = individualDescriptions[trackId] || '';
      if (description.trim() === '' && existingDescription.trim() !== '') {
        console.log('Skipping empty individual description update for track:', trackId, 'keeping existing:', existingDescription);
        return;
      }

      // Only update individual descriptions when not in reuse mode
      const newIndividualDescriptions = {
        ...individualDescriptions,
        [trackId]: description
      };
      setIndividualDescriptions(newIndividualDescriptions);

      // Update track descriptions
      const newTrackDescriptions = {
        ...trackDescriptions,
        [trackId]: description
      };
      setTrackDescriptions(newTrackDescriptions);

      // Save to localStorage immediately
      if (typeof window !== 'undefined') {
        if (projectId) {
          console.log('Saving individual descriptions to localStorage:', newIndividualDescriptions);
          localStorage.setItem(`musicClip_${projectId}_individualDescriptions`, JSON.stringify(newIndividualDescriptions));
        } else {
          console.log('Saving individual descriptions to temp localStorage:', newIndividualDescriptions);
          localStorage.setItem('musicClip_temp_individualDescriptions', JSON.stringify(newIndividualDescriptions));
        }
      }
    }
  }, [isReuseEnabled, individualDescriptions, trackDescriptions, setTrackDescriptions, projectId]);

  // Toggle reuse mode
  const toggleReuse = useCallback((enabled: boolean) => {
    setIsReuseEnabled(enabled);

    if (enabled) {
      // Switching to reuse mode
      const currentSharedDesc = promptForm.getValues("videoDescription") || sharedDescription;
      setSharedDescription(currentSharedDesc);

      // Save current individual descriptions before switching
      const currentIndividual: Record<string, string> = {};
      musicTracks.forEach(track => {
        currentIndividual[track.id] = individualDescriptions[track.id] || trackDescriptions[track.id] || '';
      });
      setIndividualDescriptions(currentIndividual);

      // Apply shared description to all tracks
      const newTrackDescriptions: Record<string, string> = {};
      musicTracks.forEach(track => {
        newTrackDescriptions[track.id] = currentSharedDesc;
      });
      setTrackDescriptions(newTrackDescriptions);

      // Update form with shared description
      promptForm.setValue("videoDescription", currentSharedDesc, { shouldValidate: true, shouldDirty: true });

      // Save to localStorage immediately
      if (typeof window !== 'undefined') {
        if (projectId) {
          localStorage.setItem(`musicClip_${projectId}_reuseEnabled`, JSON.stringify(enabled));
          localStorage.setItem(`musicClip_${projectId}_sharedDescription`, currentSharedDesc);
          localStorage.setItem(`musicClip_${projectId}_individualDescriptions`, JSON.stringify(currentIndividual));
        } else {
          localStorage.setItem('musicClip_temp_reuseEnabled', JSON.stringify(enabled));
          localStorage.setItem('musicClip_temp_sharedDescription', currentSharedDesc);
          localStorage.setItem('musicClip_temp_individualDescriptions', JSON.stringify(currentIndividual));
        }
      }
    } else {
      // Switching to individual mode
      // Restore individual descriptions
      const restoredDescriptions: Record<string, string> = {};
      musicTracks.forEach(track => {
        restoredDescriptions[track.id] = individualDescriptions[track.id] || trackDescriptions[track.id] || '';
      });
      setTrackDescriptions(restoredDescriptions);

      // Set form to current track's description if available
      const currentTrackId = musicTracks.find(track => track.id === settingsForm.getValues("selectedTrackId"))?.id;
      if (currentTrackId && individualDescriptions[currentTrackId]) {
        promptForm.setValue("videoDescription", individualDescriptions[currentTrackId], { shouldValidate: true, shouldDirty: true });
      } else {
        promptForm.setValue("videoDescription", "", { shouldValidate: true, shouldDirty: true });
      }

      // Save to localStorage immediately
      if (typeof window !== 'undefined') {
        if (projectId) {
          localStorage.setItem(`musicClip_${projectId}_reuseEnabled`, JSON.stringify(enabled));
          localStorage.setItem(`musicClip_${projectId}_individualDescriptions`, JSON.stringify(restoredDescriptions));
        } else {
          localStorage.setItem('musicClip_temp_reuseEnabled', JSON.stringify(enabled));
          localStorage.setItem('musicClip_temp_individualDescriptions', JSON.stringify(restoredDescriptions));
        }
      }
    }
  }, [
    promptForm,
    sharedDescription,
    musicTracks,
    individualDescriptions,
    trackDescriptions,
    setTrackDescriptions,
    settingsForm,
    projectId
  ]);

  // Get all descriptions for saving to S3/Backend
  const getAllDescriptions = useCallback(() => {
    return {
      isReuseEnabled,
      sharedDescription,
      individualDescriptions
    };
  }, [isReuseEnabled, sharedDescription, individualDescriptions]);

  return {
    isReuseEnabled,
    sharedDescription,
    toggleReuse,
    updateSharedDescription,
    updateIndividualDescription,
    getTrackValidity,
    saveToLocalStorage,
    loadFromLocalStorage,
    getAllDescriptions
  };
}
