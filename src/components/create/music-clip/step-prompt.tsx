"use client";

import React, { useState, useCallback, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { PromptSchema, SettingsSchema, Scene } from "@/components/vibewave-generator";
import WaveformVisualizer from "../waveform-visualizer";

interface MusicTrack {
  id: string;
  file: File;
  url: string;
  duration: number;
  name: string;
  prompt?: string;
  videoDescription?: string;
  generatedAt: Date;
  genre?: string;
  isGenerated?: boolean;
}

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

  // Navigation functions
  const currentTrackIndex = musicTracks.findIndex(track => track.id === selectedTrackId);
  const currentTrack = musicTracks[currentTrackIndex];
  
  const handlePreviousTrack = () => {
    if (currentTrackIndex > 0) {
      // Save current description before switching
      if (currentTrack && !settings?.useSameVideoForAll) {
        const currentDescription = form.getValues("videoDescription");
        if (currentDescription) {
          setTrackDescriptions(prev => ({
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
      if (currentTrack && !settings?.useSameVideoForAll) {
        const currentDescription = form.getValues("videoDescription");
        if (currentDescription) {
          setTrackDescriptions(prev => ({
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
      // When "Reuse clips" is enabled, update the shared description
      form.setValue("videoDescription", description, { shouldValidate: true, shouldDirty: true });
    } else if (currentTrack) {
      // When "Reuse clips" is disabled, save track-specific description
      setTrackDescriptions(prev => ({
        ...prev,
        [currentTrack.id]: description
      }));
    }
  };

  // Update track descriptions when form changes (only for track-specific mode)
  React.useEffect(() => {
    if (!settings?.useSameVideoForAll && currentTrack) {
      const currentDescription = form.getValues("videoDescription");
      if (currentDescription) {
        const newDescriptions = {
          ...trackDescriptions,
          [currentTrack.id]: currentDescription
        };
        setTrackDescriptions(newDescriptions);
        onTrackDescriptionsUpdate?.(newDescriptions);
      }
    }
  }, [form.watch("videoDescription"), currentTrack, settings?.useSameVideoForAll, onTrackDescriptionsUpdate, trackDescriptions]);

  // Get current description (track-specific or shared)
  const getCurrentDescription = () => {
    if (settings?.useSameVideoForAll) {
      // When "Reuse clips" is enabled, use the shared description
      return form.getValues("videoDescription") || "";
    }
    if (currentTrack) {
      // When "Reuse clips" is disabled, use track-specific description
      return trackDescriptions[currentTrack.id] || "";
    }
    return "";
  };

  // Update form when track changes
  React.useEffect(() => {
    if (currentTrack) {
      const description = getCurrentDescription();
      form.setValue("videoDescription", description, { shouldValidate: true, shouldDirty: true });
    } else {
      // Clear description when no track is selected
      form.setValue("videoDescription", "", { shouldValidate: true, shouldDirty: true });
    }
  }, [currentTrack, settings?.useSameVideoForAll, trackDescriptions]);
  
  const scenes = form.watch('scenes') ?? [];
  const setScenes = useCallback((newScenes: Scene[]) => {
      form.setValue('scenes', newScenes, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  const detectGenreFromFilename = (filename: string): string => {
    const filenameLower = filename.toLowerCase();
    
    const genreKeywords = {
      "Ambient": ["ambient", "atmospheric", "ethereal", "drone", "meditative", "chill"],
      "Synthwave / Electronic": ["synth", "electronic", "synthesizer", "retro", "80s", "digital", "techno"],
      "Hip Hop / Trap / Lo-Fi": ["hip hop", "hiphop", "trap", "lo-fi", "lofi", "rap", "beats"],
      "Rock / Metal / Punk": ["rock", "metal", "punk", "grunge", "alternative", "guitar"],
      "Jazz / Blues": ["jazz", "blues", "swing", "bebop", "fusion", "smooth", "saxophone"],
      "Classical / Orchestral": ["classical", "orchestral", "symphony", "chamber", "baroque"],
      "Pop / Indie / Folk": ["pop", "indie", "alternative", "mainstream", "radio", "catchy"],
      "Dance / EDM / Club": ["dance", "edm", "club", "electronic", "beat", "party", "disco"],
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
    toast({
      variant: "destructive",
      title: "Feature Disabled",
      description: "AI prompt generation is currently disabled.",
    });
  };

  return (
    <div className="space-y-6">
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
                    Needs Analysis
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
          onSubmit(values, trackDescriptions, trackGenres);
        })} className="space-y-6">
        
        {/* Hidden music description field */}
        <FormField
          control={form.control}
          name="musicDescription"
          render={({ field }) => (
            <input type="hidden" {...field} />
          )}
        />
        
        <FormField
          control={form.control}
          name="videoDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-white">
                Video Description
                {settings?.useSameVideoForAll ? (
                  <span className="ml-2 text-sm text-blue-400 font-normal">(Shared for all tracks)</span>
                ) : (
                  <span className="ml-2 text-sm text-muted-foreground font-normal">(Track-specific)</span>
                )}
              </FormLabel>
              <FormControl>
                <div className="flex space-x-3">
                  <Textarea
                    placeholder={'e.g., "A seamless loop of a record player spinning on a vintage wooden table, with dust particles dancing in a sunbeam."'}
                    className="min-h-[200px] resize-none flex-1"
                    maxLength={500}
                    value={getCurrentDescription()}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value);
                      saveCurrentDescription(value);
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGenerateWithAI}
                    className="w-12 h-12 p-0 btn-ai-gradient text-white flex items-center justify-center"
                  >
                    <Sparkles className="w-5 h-5" />
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Debug information */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          <div>Form Valid: {form.formState.isValid ? 'Yes' : 'No'}</div>
          <div>Video Description: {form.getValues("videoDescription")?.length || 0} chars</div>
          <div>Errors: {Object.keys(form.formState.errors).length > 0 ? JSON.stringify(form.formState.errors) : 'None'}</div>
        </div>
      </form>
    </Form>
    </div>
  );
}
