"use client";

import React, { useState, useCallback, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/dashboard/components/ui/form";
import { Textarea } from "@/app/dashboard/components/ui/textarea";
import { Button } from "@/app/dashboard/components/ui/button";
import { Sparkles, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { PromptSchema, SettingsSchema, Scene } from "@/app/dashboard/components/vibewave-generator";
import { analyzeAudioForScenesAction } from "@/app/actions";
import WaveformVisualizer from "../waveform-visualizer";
import { AnalyzeAudioForScenesOutput } from "@/ai/flows/analyze-audio-for-scenes";

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
  const [analysisResult, setAnalysisResult] = useState<AnalyzeAudioForScenesOutput | null>(null);
  const [analysisAccepted, setAnalysisAccepted] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
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
    // First try filename-based detection
    const filenameGenre = detectGenreFromFilename(track.name);
    if (filenameGenre !== 'Unknown') {
      console.log(`Detected genre from filename: ${filenameGenre}`);
      return filenameGenre;
    }

    try {
      const audioDataUri = await fileToDataUri(track.file);
      
      const response = await fetch('/api/backend/workflows/create_music/analyzer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioDataUri }),
      });
      
      if (!response.ok) {
        console.warn(`Analysis failed with status ${response.status}, using fallback`);
        return 'Unknown';
      }
      
      const result = await response.json();
      
      if (result.success && result.analysis) {
        return result.analysis.predicted_genre || 'Unknown';
      }
      
      return 'Unknown';
    } catch (error) {
      console.warn('Genre analysis error, using fallback:', error);
      return 'Unknown';
    }
  };

  const handleAnalyzeWithAI = async () => {
    const trackToAnalyze = currentTrack || (audioFile ? { file: audioFile, duration: audioDuration } : null);
    if (!trackToAnalyze) return;

    setAnalysisAccepted(false);
    setAnalysisResult(null);

    try {
        // Create evenly spaced scenes as a simple alternative to peak detection
        const sceneCount = Math.max(3, Math.min(8, Math.floor(trackToAnalyze.duration / 15))); // 3-8 scenes, ~15s each
        const sceneDuration = trackToAnalyze.duration / sceneCount;
        
        const newScenes = Array.from({ length: sceneCount }, (_, index) => ({
          id: Date.now() + index,
          startTime: index * sceneDuration,
          endTime: (index + 1) * sceneDuration,
          label: `Scene ${index + 1}`,
          description: ``, // AI will fill this
        }));
        setScenes(newScenes);

        // Wait a bit for the waveform visualizer to process the new track
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Hook 2: Waveform Image Generation
        let waveformImageDataUri = null;
        let retries = 0;
        const maxRetries = 3;
        
        while (!waveformImageDataUri && retries < maxRetries) {
          try {
            waveformImageDataUri = waveformVisualizerRef.current?.generateWaveformImage();
            if (!waveformImageDataUri) {
              retries++;
              if (retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          } catch (error) {
            console.error('Waveform generation error:', error);
            retries++;
            if (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
        
        if (!waveformImageDataUri) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not generate waveform image. Please ensure the audio is fully loaded and try again.' });
          return;
        }

        // Hook 3: AI Call for Descriptions
        const audioDataUri = await fileToDataUri(trackToAnalyze.file);

        const result = await analyzeAudioForScenesAction({
            audioDataUri,
            waveformImageDataUri,
            peakTimes: newScenes.map(scene => scene.startTime),
        });

        if (result.success && result.analysis) {
            setAnalysisResult(result.analysis);
            form.setValue("videoDescription", result.analysis.videoTheme);
            saveCurrentDescription(result.analysis.videoTheme);
            
            // Trigger form validation to update the continue button state
            await form.trigger(["videoDescription"]);
            
            const updatedScenesWithDesc = newScenes.map((scene, index) => {
                const sceneAnalysis = result.analysis?.scenes[index];
                return {
                    ...scene,
                    label: sceneAnalysis?.part || `Scene ${index + 1}`,
                    description: sceneAnalysis?.description || `A scene for the ${sceneAnalysis?.part || 'music'}.`,
                };
            });
            setScenes(updatedScenesWithDesc);
        } else {
            toast({
              variant: "destructive",
              title: "AI Analysis Failed",
              description: result.error || "Could not generate a description from the audio.",
            });
        }
    } catch (e) {
        console.error(e);
        toast({
            variant: "destructive",
            title: "Error Analyzing File",
            description: "Could not process the audio file for analysis.",
        });
    }
  };

  const onScenesUpdate = useCallback((updatedScenes: Scene[]) => {
      setScenes(updatedScenes);
      // If user moves a marker, they have implicitly accepted the analysis
      if (analysisResult && !analysisAccepted) {
          setAnalysisAccepted(true);
      }
  }, [analysisResult, analysisAccepted, setScenes]);

  const handleGenerateWithAI = async () => {
    setIsGeneratingAI(true);
    
    try {
      // Add 2 second delay for loading animation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Load the AI random prompts
      const response = await fetch('/api/backend/workflows/create_music/generator/ai_random');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AI data received:', data);
      
      // Generate video description based on video type
      const videoType = settings?.videoType || 'scenes';
      let videoPrompts = [];
      let videoCategory = '';
      
      if (videoType === 'looped-static') {
        // For static images, use image_prompts
        const imagePromptsData = data.image_prompts || {};
        const prefix = data.image_prompts_prefix || '';
        
        if (typeof imagePromptsData === 'object' && !Array.isArray(imagePromptsData)) {
          // Handle categorized structure
          const categories = Object.keys(imagePromptsData);
          const randomCategory = categories[Math.floor(Math.random() * categories.length)];
          const categoryPrompts = imagePromptsData[randomCategory] || [];
          videoPrompts = categoryPrompts.map((prompt: string) => prefix + prompt);
        } else {
          // Handle array structure
          videoPrompts = (imagePromptsData || []).map((prompt: string) => prefix + prompt);
        }
        videoCategory = 'image_prompts';
      } else if (videoType === 'looped-animated') {
        // For animated loops, use image_prompts with looped prefix
        const imagePromptsData = data.image_prompts || {};
        const prefix = data.looped_video_prompts_prefix || '';
        
        if (typeof imagePromptsData === 'object' && !Array.isArray(imagePromptsData)) {
          // Handle categorized structure
          const categories = Object.keys(imagePromptsData);
          const randomCategory = categories[Math.floor(Math.random() * categories.length)];
          const categoryPrompts = imagePromptsData[randomCategory] || [];
          videoPrompts = categoryPrompts.map((prompt: string) => prefix + prompt);
        } else {
          // Handle array structure
          videoPrompts = (imagePromptsData || []).map((prompt: string) => prefix + prompt);
        }
        videoCategory = 'looped_video_prompts';
      } else {
        // For regular videos (scenes), use video_prompts
        videoPrompts = data.video_prompts || [];
        videoCategory = 'video_prompts';
        const prefix = data.video_prompts_prefix || '';
        videoPrompts = videoPrompts.map((prompt: string) => prefix + prompt);
      }
      
      console.log('Video type:', videoType, 'Video prompts:', videoPrompts, 'Length:', videoPrompts.length);
      
      if (videoPrompts.length === 0) {
        throw new Error(`No ${videoCategory} prompts available`);
      }
      
      if (settings?.useSameVideoForAll) {
        // Generate one description for all tracks
        const randomVideoPrompt = videoPrompts[Math.floor(Math.random() * videoPrompts.length)];
        console.log('Generated AI prompt (shared):', randomVideoPrompt, 'Length:', randomVideoPrompt?.length);
        
        // Set videoDescription only (musicDescription is optional and only set when AI music is generated)
        form.setValue("videoDescription", randomVideoPrompt, { shouldValidate: true, shouldDirty: true });
        
        // Force re-render by updating the form state
        await form.trigger(["videoDescription"]);
        console.log('Form validation result:', form.formState.isValid, 'Video description:', form.getValues("videoDescription"));
        
        toast({
          title: "AI Generated",
          description: `Generated ${videoCategory.replace('_', ' ')} description for all tracks!`,
        });
      } else {
        // Generate unique descriptions for each track using genre-based prompts
        const newTrackDescriptions: Record<string, string> = {};
        const usedPrompts = new Set<string>();
        
        // First, analyze tracks that don't have genre information
        const tracksToAnalyze = musicTracks.filter(track => !track.genre && !track.isGenerated);
        const genreAnalysisPromises = tracksToAnalyze.map(async (track) => {
          const detectedGenre = await analyzeTrackGenre(track);
          return { trackId: track.id, genre: detectedGenre };
        });
        
        const genreResults = await Promise.all(genreAnalysisPromises);
        
        // Update tracks with detected genres
        const genreMap = new Map(genreResults.map(result => [result.trackId, result.genre]));
        
        for (const track of musicTracks) {
          let selectedPrompt = '';
          let attempts = 0;
          const maxAttempts = 50; // Prevent infinite loop
          
          // Get the track's genre (existing or newly detected)
          const trackGenre = track.genre || genreMap.get(track.id);
          
          // Try to get a unique prompt for this track
          while (attempts < maxAttempts) {
            let candidatePrompts = videoPrompts;
            
            // If track has a genre and we have genre-specific prompts, use them
            if (trackGenre && data.music_prompts && data.music_prompts[trackGenre]) {
              const genrePrompts = data.music_prompts[trackGenre];
              if (Array.isArray(genrePrompts) && genrePrompts.length > 0) {
                // Use genre-specific prompts for video descriptions
                candidatePrompts = genrePrompts.map((prompt: string) => {
                  // Convert music prompt to video prompt format
                  return prompt.replace(/^Generate (a|an) /i, 'Create a video with ')
                    .replace(/track at \d+ BPM/i, 'music')
                    .replace(/\.$/, '') + ' playing in the background.';
                });
              }
            }
            
            // If no genre-specific prompts or we've used them all, fall back to general prompts
            if (candidatePrompts.length === 0) {
              candidatePrompts = videoPrompts;
            }
            
            const randomIndex = Math.floor(Math.random() * candidatePrompts.length);
            const candidatePrompt = candidatePrompts[randomIndex];
            
            if (!usedPrompts.has(candidatePrompt)) {
              selectedPrompt = candidatePrompt;
              usedPrompts.add(candidatePrompt);
              break;
            }
            
            attempts++;
          }
          
          // If we couldn't find a unique prompt, use a random one
          if (!selectedPrompt) {
            selectedPrompt = videoPrompts[Math.floor(Math.random() * videoPrompts.length)];
          }
          
          newTrackDescriptions[track.id] = selectedPrompt;
        }
        
        // Update all track descriptions
        setTrackDescriptions(prev => ({
          ...prev,
          ...newTrackDescriptions
        }));
        
        // Create genre map for tracks that were analyzed
        const trackGenres: Record<string, string> = {};
        genreResults.forEach(result => {
          if (result.genre) {
            trackGenres[result.trackId] = result.genre;
          }
        });
        
        // Update current track's form value
        if (currentTrack) {
          const prompt = newTrackDescriptions[currentTrack.id];
          console.log('Generated AI prompt for track:', currentTrack.id, prompt, 'Length:', prompt?.length);
          
          // Set videoDescription only (musicDescription is optional and only set when AI music is generated)
          form.setValue("videoDescription", prompt, { shouldValidate: true, shouldDirty: true });
          
          // Force re-render by updating the form state
          await form.trigger(["videoDescription"]);
          console.log('Form validation result:', form.formState.isValid, 'Video description:', form.getValues("videoDescription"));
        }
        
        toast({
          title: "AI Generated",
          description: `Generated unique ${videoCategory.replace('_', ' ')} descriptions for all ${musicTracks.length} tracks!`,
        });
        
        // Store genre information for form submission
        (form as any).trackGenres = trackGenres;
      }
      
      // Trigger form validation to update the continue button state
      await form.trigger(["videoDescription"]);
      
    } catch (error) {
      console.error('Error generating AI prompt:', error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate AI description. Please try again.",
      });
    } finally {
      setIsGeneratingAI(false);
    }
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
                    disabled={isGeneratingAI}
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
                    disabled={isGeneratingAI}
                    className="w-12 h-12 p-0 btn-ai-gradient text-white flex items-center justify-center"
                  >
                    {isGeneratingAI ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
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
