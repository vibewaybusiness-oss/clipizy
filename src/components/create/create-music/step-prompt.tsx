"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";

import { Form, FormField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { PromptSchema, SettingsSchema, Scene } from "@/components/vibewave-generator";
import WaveformVisualizer from "@/components/waveform-visualizer";
import { usePromptGeneration } from "@/hooks/use-prompt-generation";
import type { MusicTrack } from "@/types/music-clip";

type StepPromptProps = {
  form: UseFormReturn<z.infer<typeof PromptSchema>>;
  settings: z.infer<typeof SettingsSchema> | null;
  audioFile: File | null;
  audioDuration: number;
  musicTracks: MusicTrack[];
  selectedTrackId: string | null;
  onTrackSelect: (track: MusicTrack) => void;
  onSubmit: (values: z.infer<typeof PromptSchema>, trackDescriptions?: Record<string, string>, trackGenres?: Record<string, string>) => void;
  onBack: () => void;
  fileToDataUri: (file: File) => Promise<string>;
  toast: (options: { variant?: "default" | "destructive" | null; title: string; description: string }) => void;
  onTrackDescriptionsUpdate?: (trackDescriptions: Record<string, string>) => void;
};

export function StepPrompt({
  form,
  settings,
  audioFile,
  audioDuration,
  musicTracks,
  selectedTrackId,
  onTrackSelect,
  onSubmit,
  onBack,
  fileToDataUri,
  toast,
  onTrackDescriptionsUpdate,
}: StepPromptProps) {
  const waveformVisualizerRef = useRef<{ generateWaveformImage: () => string | null }>(null);
  const [trackDescriptions, setTrackDescriptions] = useState<Record<string, string>>({});
  // Transient storage for individual track descriptions (frontend only)
  const [transientTrackDescriptions, setTransientTrackDescriptions] = useState<Record<string, string>>({});
  // Merged description for when reuse is enabled
  const [mergedDescription, setMergedDescription] = useState<string>("");
  const promptGeneration = usePromptGeneration();

  // Watch once per render to avoid multiple subscriptions
  const watchedVideoDescription = form.watch("videoDescription") || "";

  // Shallow equality check to prevent redundant state updates
  const areDescriptionsEqual = (a: Record<string, string>, b: Record<string, string>) => {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  };

  // Debug: Monitor isGenerating state changes
  useEffect(() => {
    console.log('isGenerating state changed:', promptGeneration.isGenerating);
  }, [promptGeneration.isGenerating]);

  // Navigation functions
  const currentTrackIndex = musicTracks.findIndex(track => track.id === selectedTrackId);
  const currentTrack = musicTracks[currentTrackIndex];
  
  const handlePreviousTrack = () => {
    if (currentTrackIndex > 0) {
      // Save current description before switching
      const currentDescription = form.getValues("videoDescription");
      if (currentDescription && currentTrack) {
        if (settings?.useSameVideoForAll) {
          // Save to merged description
          setMergedDescription(currentDescription);
        } else {
          // Save to transient storage for individual tracks
          setTransientTrackDescriptions(prev => ({
            ...prev,
            [currentTrack.id]: currentDescription
          }));
        }
      }
      onTrackSelect(musicTracks[currentTrackIndex - 1]);
    }
  };
  
  const handleNextTrack = () => {
    if (currentTrackIndex < musicTracks.length - 1) {
      // Save current description before switching
      const currentDescription = form.getValues("videoDescription");
      if (currentDescription && currentTrack) {
        if (settings?.useSameVideoForAll) {
          // Save to merged description
          setMergedDescription(currentDescription);
        } else {
          // Save to transient storage for individual tracks
          setTransientTrackDescriptions(prev => ({
            ...prev,
            [currentTrack.id]: currentDescription
          }));
        }
      }
      onTrackSelect(musicTracks[currentTrackIndex + 1]);
    }
  };

  // Save current description to track
  const saveCurrentDescription = (description: string) => {
    if (settings?.useSameVideoForAll) {
      // When "Reuse clips" is enabled, update the shared description in form
      form.setValue("videoDescription", description, { shouldValidate: true, shouldDirty: true });
      setMergedDescription(description);
      
      // Also update all tracks with the same description for visual feedback
      const newDescriptions: Record<string, string> = {};
      musicTracks.forEach(track => {
        newDescriptions[track.id] = description;
      });
      setTrackDescriptions(newDescriptions);
      onTrackDescriptionsUpdate?.(newDescriptions);
    } else if (currentTrack) {
      // When "Reuse clips" is disabled, save track-specific description
      setTransientTrackDescriptions(prev => ({
        ...prev,
        [currentTrack.id]: description
      }));
      
      const newDescriptions = {
        ...trackDescriptions,
        [currentTrack.id]: description
      };
      setTrackDescriptions(newDescriptions);
      onTrackDescriptionsUpdate?.(newDescriptions);
    }
  };


  // Get current description (track-specific or shared)
  const getCurrentDescription = () => {
    if (settings?.useSameVideoForAll) {
      // When "Reuse clips" is enabled, use the shared description from form
      return form.watch("videoDescription") || "";
    }
    if (currentTrack) {
      // When "Reuse clips" is disabled, use track-specific description from transient storage first, then fallback to saved descriptions
      return transientTrackDescriptions[currentTrack.id] || trackDescriptions[currentTrack.id] || "";
    }
    return "";
  };

  // Update form when track changes (only for track-specific mode)
  React.useEffect(() => {
    if (currentTrack && !settings?.useSameVideoForAll) {
      const description = transientTrackDescriptions[currentTrack.id] || trackDescriptions[currentTrack.id] || "";
      const currentFormValue = form.getValues("videoDescription");
      if (currentFormValue !== description) {
        form.setValue("videoDescription", description, { shouldValidate: true, shouldDirty: true });
      }
    } else if (currentTrack && settings?.useSameVideoForAll) {
      // When in shared mode, use merged description or form value
      const description = mergedDescription || form.getValues("videoDescription") || "";
      const currentFormValue = form.getValues("videoDescription");
      if (currentFormValue !== description) {
        form.setValue("videoDescription", description, { shouldValidate: true, shouldDirty: true });
      }
    } else if (!currentTrack) {
      // Clear description when no track is selected
      const currentFormValue = form.getValues("videoDescription");
      if (currentFormValue !== "") {
        form.setValue("videoDescription", "", { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [currentTrack, settings?.useSameVideoForAll, transientTrackDescriptions, trackDescriptions, mergedDescription, form]);

  // Handle mode changes between shared and track-specific
  React.useEffect(() => {
    if (settings?.useSameVideoForAll) {
      // Switching to shared mode: use merged description or form value
      const descriptionToUse = mergedDescription || form.getValues("videoDescription") || "";
      const currentFormValue = form.getValues("videoDescription");
      if (currentFormValue !== descriptionToUse) {
        form.setValue("videoDescription", descriptionToUse, { shouldValidate: true, shouldDirty: true });
      }
      
      // Update all tracks with the same description for visual feedback
      const newTrackDescriptions: Record<string, string> = {};
      musicTracks.forEach(track => {
        newTrackDescriptions[track.id] = descriptionToUse;
      });
      if (!areDescriptionsEqual(trackDescriptions, newTrackDescriptions)) {
        setTrackDescriptions(newTrackDescriptions);
        onTrackDescriptionsUpdate?.(newTrackDescriptions);
      }
    } else {
      // Switching to track-specific mode: restore individual descriptions
      if (currentTrack) {
        const trackDescription = transientTrackDescriptions[currentTrack.id] || trackDescriptions[currentTrack.id] || "";
        form.setValue("videoDescription", trackDescription, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [settings?.useSameVideoForAll, currentTrack, mergedDescription, transientTrackDescriptions, trackDescriptions, musicTracks, form]);
  
  const scenes = form.watch('scenes') ?? [];
  const setScenes = useCallback((newScenes: Scene[]) => {
      form.setValue('scenes', newScenes, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  const detectGenreFromFilename = (filename: string): string => {
    const filenameLower = filename.toLowerCase();
    
  const genreKeywords = {
    "Ambient": ["ambient", "atmospheric", "ethereal", "drone", "meditative", "chill"],
    "Synthwave / Electronic": ["synth", "electronic", "synthesizer", "retro", "80s", "digital", "techno"],
    "Hip Hop / Rap": ["hip hop", "hiphop", "rap", "beats"],
    "Trap": ["trap", "trap beats", "trap music"],
    "Lo-Fi / House": ["lo-fi", "lofi", "house", "chill", "relaxing"],
    "Rock / Metal / Punk": ["rock", "metal", "punk", "grunge", "alternative", "guitar"],
    "Jazz / Blues": ["jazz", "blues", "swing", "bebop", "fusion", "smooth", "saxophone"],
    "Classical / Orchestral": ["classical", "orchestral", "symphony", "chamber", "baroque"],
      "Pop / Indie / Folk": ["pop", "indie", "alternative", "mainstream", "radio", "catchy"],
      "Techno / EDM / Club": ["techno", "edm", "club", "electronic", "beat", "party", "disco"],
      "World / Folk / Traditional": ["folk", "traditional", "world", "ethnic", "acoustic", "country"],
      "Cinematic / Trailer / Score": ["cinematic", "trailer", "score", "soundtrack", "dramatic", "epic"]
    };
    
    for (const [genre, keywords] of Object.entries(genreKeywords)) {
      if (keywords.some(keyword => filenameLower.includes(keyword))) {
        return genre;
      }
    }
    
    return 'Unknown';
  };

  const analyzeTrackGenre = async (track: MusicTrack): Promise<string | null> => {
    // Use filename-based detection only
    const filenameGenre = detectGenreFromFilename(track.name);
    return filenameGenre;
  };

  const handleAnalyzeWithAI = async () => {
    toast({
      variant: "destructive",
      title: "Feature Disabled",
      description: "AI audio analysis is currently disabled.",
    });
  };

  const onScenesUpdate = useCallback((updatedScenes: Scene[]) => {
      setScenes(updatedScenes);
  }, [setScenes]);

  const handleGenerateWithAI = async () => {
    console.log('handleGenerateWithAI called, isGenerating:', promptGeneration.isGenerating);
    
    try {
      // Determine prompt type based on video settings
      let promptType: 'image_prompts' | 'video_prompts' = 'image_prompts';
      if (settings?.videoType === 'scenes') {
        promptType = 'video_prompts';
      }
      
      console.log('Calling generateVideoPrompt...');
      const data = await promptGeneration.generateVideoPrompt(settings?.videoType || 'looped-static', currentTrack?.genre);
      console.log('generateVideoPrompt completed, isGenerating:', promptGeneration.isGenerating);
      
      // Update the form with the generated prompt
      form.setValue('videoDescription', data.prompt);
      
      // Update the track descriptions state based on mode
      if (settings?.useSameVideoForAll) {
        // Shared mode: update all tracks with the same description
        const newDescriptions: Record<string, string> = {};
        musicTracks.forEach(track => {
          newDescriptions[track.id] = data.prompt;
        });
        setTrackDescriptions(newDescriptions);
        onTrackDescriptionsUpdate?.(newDescriptions);
      } else if (currentTrack) {
        // Track-specific mode: update only the current track
        setTrackDescriptions(prev => ({
          ...prev,
          [currentTrack.id]: data.prompt
        }));
        onTrackDescriptionsUpdate?.({
          ...trackDescriptions,
          [currentTrack.id]: data.prompt
        });
      }
      
      toast({
        title: "Video Prompt Generated",
        description: `Generated ${data.category} style prompt for video.`,
      });
      
    } catch (error) {
      // Error handling is done in the hook
      console.error('Error generating video prompt:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test component */}
      
      {/* Music Track Title and Navigation */}
      {currentTrack && (
        <div className="relative overflow-hidden bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm rounded-xl border border-border/50 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
          <div className="relative flex items-center justify-between p-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousTrack}
              disabled={currentTrackIndex === 0}
              className={`h-10 w-10 p-0 rounded-full transition-all duration-200 ${
                currentTrackIndex === 0 
                  ? 'opacity-30 cursor-not-allowed' 
                  : 'hover:bg-primary/20 hover:scale-105 active:scale-95'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 text-center px-6">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <h3 className="text-xl font-bold text-foreground tracking-tight truncate max-w-md">
                  {currentTrack.name}
                </h3>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              </div>
              
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
                  Track {currentTrackIndex + 1} of {musicTracks.length}
                </div>
                {!settings?.useSameVideoForAll && !trackDescriptions[currentTrack.id] && (
                  <div className="px-3 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full font-medium">
                    Needs prompt
                  </div>
                )}
                {settings?.useSameVideoForAll && !form.watch("videoDescription") && (
                  <div className="px-3 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full font-medium">
                    Needs prompt
                  </div>
                )}
                {currentTrack.prompt && (
                  <div className="px-3 py-1 bg-muted/50 text-muted-foreground rounded-full italic max-w-xs truncate">
                    "{currentTrack.prompt}"
                  </div>
                )}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextTrack}
              disabled={currentTrackIndex === musicTracks.length - 1}
              className={`h-10 w-10 p-0 rounded-full transition-all duration-200 ${
                currentTrackIndex === musicTracks.length - 1 
                  ? 'opacity-30 cursor-not-allowed' 
                  : 'hover:bg-primary/20 hover:scale-105 active:scale-95'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => {
          const trackGenres = (form as any).trackGenres || {};
          
          // Save current description before submitting
          const currentDescription = form.getValues("videoDescription");
          if (currentDescription && currentTrack) {
            if (settings?.useSameVideoForAll) {
              setMergedDescription(currentDescription);
            } else {
              setTransientTrackDescriptions(prev => ({
                ...prev,
                [currentTrack.id]: currentDescription
              }));
            }
          }
          
          // Determine which descriptions to save to backend
          let descriptionsToSave = trackDescriptions;
          if (settings?.useSameVideoForAll) {
            // When reuse is enabled, save the merged description to all tracks
            const mergedDesc = mergedDescription || currentDescription || "";
            descriptionsToSave = {};
            musicTracks.forEach(track => {
              descriptionsToSave[track.id] = mergedDesc;
            });
          } else {
            // When reuse is disabled, save individual descriptions (merge transient with saved)
            descriptionsToSave = { ...trackDescriptions, ...transientTrackDescriptions };
          }
          
          onSubmit(values, descriptionsToSave, trackGenres);
        })} className="space-y-6">
        
        {/* Hidden music description field */}
        <FormField
          control={form.control}
          name="musicDescription"
          render={({ field }) => (
            <input type="hidden" {...field} />
          )}
        />
        
        {/* Video Description */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Video Description
            {settings?.useSameVideoForAll ? (
              <span className="ml-2 text-sm text-blue-400 font-normal">(Shared for all tracks)</span>
            ) : (
              <span className="ml-2 text-sm text-muted-foreground font-normal">(Track-specific)</span>
            )}
          </label>
          <div className="relative">
            <textarea
              placeholder='e.g., "A seamless loop of a record player spinning on a vintage wooden table, with dust particles dancing in a sunbeam."'
              className="min-h-[200px] resize-none text-base w-full px-3 py-2 pr-14 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              maxLength={500}
              value={settings?.useSameVideoForAll ? watchedVideoDescription : (trackDescriptions[currentTrack?.id || ""] || "")}
              onChange={(e) => {
                const value = e.target.value;
                form.setValue("videoDescription", value);
                saveCurrentDescription(value);
              }}
            />
            {/* AI Generation Button inside textarea */}
            <div className="absolute top-2 right-2">
              <Button
                type="button"
                size="sm"
                onClick={handleGenerateWithAI}
                disabled={promptGeneration.isGenerating}
                className="w-10 h-10 p-0 btn-ai-gradient text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {promptGeneration.isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            </div>
            {/* Character count */}
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-1 rounded">
              {(settings?.useSameVideoForAll ? watchedVideoDescription : (trackDescriptions[currentTrack?.id || ""] || ""))?.length || 0} / 500
            </div>
          </div>
        </div>
      </form>
    </Form>
    </div>
  );
}
