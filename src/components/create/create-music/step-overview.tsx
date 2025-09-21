"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";

import { Form, FormField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, ChevronLeft, ChevronRight, Play, Pause, ZoomIn, ZoomOut, RotateCcw, Music, BarChart3, Clock, Volume2 } from "lucide-react";
import { PromptSchema, SettingsSchema, Scene } from "@/components/clipizi-generator";
import WaveformVisualizer from "@/components/waveform-visualizer";
import { usePromptGeneration } from "@/hooks/use-prompt-generation";
import type { MusicTrack } from "@/types/music-clip";
import { cn } from "@/lib/utils";

interface MusicAnalysisData {
  file_path: string;
  metadata: {
    title: string;
    artist: string;
    album: string;
    genre: string;
    year: string;
    duration: number;
    bitrate: number;
    sample_rate: number;
    channels: number;
    file_size: number;
    file_type: string;
  };
  features: {
    duration: number;
    tempo: number;
    spectral_centroid: number;
    rms_energy: number;
    harmonic_ratio: number;
    onset_rate: number;
    key: string;
    time_signature: string;
  };
  genre_scores: Record<string, number>;
  predicted_genre: string;
  confidence: number;
  peak_analysis: {
    peak_times: number[];
    peak_scores: number[];
    total_peaks: number;
    analysis_duration: number;
  };
  analysis_timestamp: string;
  segments_sec: number[];
  segments: Array<{
    segment_index: number;
    start_time: number;
    end_time: number;
    duration: number;
    features: any;
    descriptors: any[];
  }>;
  segment_analysis: Array<{
    segment_index: number;
    start_time: number;
    end_time: number;
    duration: number;
    features: any;
    descriptors: any[];
  }>;
  beat_times_sec: number[];
  downbeats_sec: number[];
  tempo: number;
  duration: number;
  debug: {
    method: string;
    num_segments: number;
    segment_lengths: number[];
  };
  original_filename: string;
  file_size: number;
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
  onSharedDescriptionUpdate?: (description: string) => void;
  onPromptsUpdate?: (values: z.infer<typeof PromptSchema>) => void;
  trackDescriptions?: Record<string, string>;
  initialTrackDescriptions?: Record<string, string>;
  analysisData?: MusicAnalysisData | null;
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
  onSharedDescriptionUpdate,
  onPromptsUpdate,
  trackDescriptions: propTrackDescriptions,
  initialTrackDescriptions,
  analysisData,
}: StepPromptProps) {
  const waveformVisualizerRef = useRef<{ generateWaveformImage: () => string | null }>(null);
  const [trackDescriptions, setTrackDescriptions] = useState<Record<string, string>>(initialTrackDescriptions || {});
  
  // Transient storage for individual track descriptions (frontend only)
  const [transientTrackDescriptions, setTransientTrackDescriptions] = useState<Record<string, string>>({});
  // Merged description for when reuse is enabled
  const [mergedDescription, setMergedDescription] = useState<string>("");
  const promptGeneration = usePromptGeneration();

  // Music analysis visualizer state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomStart, setZoomStart] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Watch once per render to avoid multiple subscriptions
  const watchedVideoDescription = form.watch("videoDescription") || "";

  // Shallow equality check to prevent redundant state updates
  const areDescriptionsEqual = useCallback((a: Record<string, string>, b: Record<string, string>) => {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  }, []);

  // Music analysis visualizer helper functions
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const generateWaveformData = useCallback(() => {
    if (!analysisData) return [];
    
    const duration = analysisData.duration || 0;
    const samples = Math.floor(duration * 50); // 50 samples per second
    const data: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      const time = (i / samples) * duration;
      
      // Find nearby peaks for this time
      const nearbyPeaks = (analysisData.peak_analysis?.peak_times || []).filter(
        peakTime => Math.abs(peakTime - time) < 0.5
      );
      
      if (nearbyPeaks.length > 0) {
        // Use peak intensity for waveform height
        const peakIndex = (analysisData.peak_analysis?.peak_times || []).indexOf(nearbyPeaks[0]);
        const peakScore = (analysisData.peak_analysis?.peak_scores || [])[peakIndex] || 0;
        data.push(Math.min(peakScore / 4, 1)); // Normalize peak scores
      } else {
        // Generate base waveform based on RMS energy and tempo
        const baseLevel = (analysisData.features?.rms_energy || 0) * 0.3;
        const tempoVariation = Math.sin(time * (analysisData.features?.tempo || 120) / 60 * Math.PI * 2) * 0.2;
        data.push(Math.max(0, baseLevel + tempoVariation + Math.random() * 0.1));
      }
    }
    
    return data;
  }, [analysisData]);

  const waveformData = generateWaveformData();

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData.length) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Calculate visible range based on zoom
    const totalDuration = analysisData?.duration || 0;
    const visibleDuration = totalDuration / zoomLevel;
    const startTime = zoomStart;
    const endTime = Math.min(startTime + visibleDuration, totalDuration);
    
    const startSample = Math.floor((startTime / totalDuration) * waveformData.length);
    const endSample = Math.floor((endTime / totalDuration) * waveformData.length);
    const visibleSamples = endSample - startSample;
    
    if (visibleSamples <= 0) return;
    
    const barWidth = width / visibleSamples;
    const centerY = height / 2;
    
    // Colors
    const waveColor = '#3b82f6';
    const peakColor = '#ef4444';
    const segmentColor = '#10b981';
    const progressColor = '#8b5cf6';
    const beatColor = '#f59e0b';
    
    // Draw waveform bars
    for (let i = startSample; i < endSample; i++) {
      const x = (i - startSample) * barWidth;
      const barHeight = waveformData[i] * height * 0.8;
      
      // Check if this is a peak
      const time = (i / waveformData.length) * totalDuration;
      const isPeak = (analysisData?.peak_analysis?.peak_times || []).some(
        peakTime => Math.abs(peakTime - time) < 0.1
      );
      
      // Check if this is a beat
      const isBeat = (analysisData?.beat_times_sec || []).some(
        beatTime => Math.abs(beatTime - time) < 0.05
      );
      
      ctx.fillStyle = isPeak ? peakColor : (isBeat ? beatColor : waveColor);
      ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 1), barHeight);
    }
    
    // Draw segments
    (analysisData?.segments_sec || []).forEach((segmentTime, index) => {
      if (segmentTime >= startTime && segmentTime <= endTime) {
        const x = ((segmentTime - startTime) / visibleDuration) * width;
        ctx.strokeStyle = segmentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        
        // Segment label
        ctx.fillStyle = segmentColor;
        ctx.font = '12px sans-serif';
        ctx.fillText(`S${index + 1}`, x + 2, 15);
      }
    });
    
    // Draw playhead
    if (currentTime >= startTime && currentTime <= endTime) {
      const playheadX = ((currentTime - startTime) / visibleDuration) * width;
      ctx.strokeStyle = progressColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
    
  }, [waveformData, analysisData, currentTime, zoomLevel, zoomStart]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !analysisData) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    
    const totalDuration = analysisData.duration;
    const visibleDuration = totalDuration / zoomLevel;
    const clickedTime = zoomStart + (x / width) * visibleDuration;
    
    // Find which segment was clicked
    const clickedSegment = analysisData.segments.find(
      segment => clickedTime >= segment.start_time && clickedTime <= segment.end_time
    );
    
    if (clickedSegment) {
      setSelectedSegment(clickedSegment.segment_index);
      // Zoom into this segment
      setZoomStart(clickedSegment.start_time);
      setZoomLevel(totalDuration / (clickedSegment.duration * 2));
    }
    
    // Update audio time
    if (audioRef.current) {
      audioRef.current.currentTime = clickedTime;
      setCurrentTime(clickedTime);
    }
  }, [analysisData, zoomLevel, zoomStart]);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart(event.clientX);
  }, []);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !analysisData) return;
    
    const deltaX = event.clientX - dragStart;
    const totalDuration = analysisData.duration;
    const visibleDuration = totalDuration / zoomLevel;
    const deltaTime = (deltaX / (canvasRef.current?.width || 1)) * visibleDuration;
    
    setZoomStart(Math.max(0, Math.min(zoomStart - deltaTime, totalDuration - visibleDuration)));
    setDragStart(event.clientX);
  }, [isDragging, dragStart, analysisData, zoomLevel, zoomStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setZoomStart(0);
    setSelectedSegment(null);
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev * 2, 20));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev / 2, 1));
  }, []);

  // Audio controls
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Load appropriate descriptions when component mounts or mode changes
  useEffect(() => {
    if (settings?.useSameVideoForAll) {
      // Reuse mode: load shared description into form field
      // The shared description should be passed via the form's videoDescription field
      // This is handled by the parent component when switching modes
      console.log('StepPrompt: Reuse mode - using form videoDescription:', watchedVideoDescription);
    } else {
      // Individual mode: load individual descriptions for each track
      if (propTrackDescriptions && !areDescriptionsEqual(trackDescriptions, propTrackDescriptions)) {
        console.log('StepPrompt: Individual mode - loading track descriptions:', propTrackDescriptions);
        setTrackDescriptions(propTrackDescriptions);
        onTrackDescriptionsUpdate?.(propTrackDescriptions);
      }
    }
  }, [settings?.useSameVideoForAll, propTrackDescriptions, watchedVideoDescription, trackDescriptions, areDescriptionsEqual, onTrackDescriptionsUpdate]);

  // Check if all descriptions are filled
  const areAllDescriptionsFilled = () => {
    if (settings?.useSameVideoForAll) {
      // When reuse is enabled, only check the shared description
      return watchedVideoDescription.trim().length > 0;
    } else {
      // When reuse is disabled, check all individual track descriptions
      return musicTracks.every(track => {
        const description = propTrackDescriptions?.[track.id] || 
                          track.videoDescription || 
                          trackDescriptions[track.id] || 
                          transientTrackDescriptions[track.id] || 
                          "";
        return description.trim().length > 0;
      });
    }
  };

  // Monitor isGenerating state changes
  useEffect(() => {
    // isGenerating state changed
  }, [promptGeneration.isGenerating]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Draw waveform when dependencies change
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

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
    console.log('saveCurrentDescription called:', {
      description: description.substring(0, 50) + '...',
      useSameVideoForAll: settings?.useSameVideoForAll,
      currentTrackId: currentTrack?.id,
      descriptionLength: description.length
    });
    
    if (settings?.useSameVideoForAll) {
      // When "Reuse clips" is enabled, update the shared description in form
      console.log('Saving to shared description');
      form.setValue("videoDescription", description, { shouldValidate: true, shouldDirty: true });
      setMergedDescription(description);

      // Update the shared description state
      onSharedDescriptionUpdate?.(description);

      // Also update all tracks with the same description for visual feedback
      const newDescriptions: Record<string, string> = {};
      musicTracks.forEach(track => {
        newDescriptions[track.id] = description;
      });
      console.log('Updating all tracks with shared description:', newDescriptions);
      setTrackDescriptions(newDescriptions);
      onTrackDescriptionsUpdate?.(newDescriptions);
    } else if (currentTrack) {
      // When "Reuse clips" is disabled, save track-specific description
      console.log('Saving to individual track description for:', currentTrack.id);
      setTransientTrackDescriptions(prev => ({
        ...prev,
        [currentTrack.id]: description
      }));
      
      const newDescriptions = {
        ...trackDescriptions,
        [currentTrack.id]: description
      };
      console.log('Updating individual track description:', newDescriptions);
      setTrackDescriptions(newDescriptions);
      onTrackDescriptionsUpdate?.(newDescriptions);
    }
  };


  // Get current description (track-specific or shared)
  const getCurrentDescription = () => {
    if (settings?.useSameVideoForAll) {
      // When "Reuse clips" is enabled, use the form field value as shared description
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
    console.log('StepPrompt mode change effect:', { 
      useSameVideoForAll: settings?.useSameVideoForAll,
      currentTrackId: currentTrack?.id,
      sharedDescription: watchedVideoDescription,
      trackDescriptions: Object.keys(trackDescriptions).length
    });
    
    if (settings?.useSameVideoForAll) {
      // Switching to shared mode: use the form field value as shared description
      const formDesc = form.getValues("videoDescription") || "";
      console.log('Switching to shared mode with form description:', formDesc);
      
      // Clear all individual track descriptions for visual feedback
      const newTrackDescriptions: Record<string, string> = {};
      musicTracks.forEach(track => {
        newTrackDescriptions[track.id] = formDesc;
      });
      if (!areDescriptionsEqual(trackDescriptions, newTrackDescriptions)) {
        console.log('Updating track descriptions for shared mode:', newTrackDescriptions);
        setTrackDescriptions(newTrackDescriptions);
        onTrackDescriptionsUpdate?.(newTrackDescriptions);
      }
    } else {
      // Switching to track-specific mode: restore individual descriptions
      if (currentTrack) {
        const trackDescription = transientTrackDescriptions[currentTrack.id] || trackDescriptions[currentTrack.id] || "";
        console.log('Switching to individual mode for track:', currentTrack.id, 'with description:', trackDescription);
        form.setValue("videoDescription", trackDescription, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [settings?.useSameVideoForAll, currentTrack, trackDescriptions, musicTracks, form, onTrackDescriptionsUpdate, areDescriptionsEqual, transientTrackDescriptions, watchedVideoDescription]);
  
  const scenes = form.watch('scenes') ?? [];
  const setScenes = useCallback((newScenes: Scene[]) => {
      form.setValue('scenes', newScenes, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  const handleGenerateWithAI = async () => {
    
    try {
      // Determine prompt type based on video settings
      let promptType: 'image_prompts' | 'video_prompts' = 'image_prompts';
      if (settings?.videoType === 'scenes') {
        promptType = 'video_prompts';
      }
      
      const data = await promptGeneration.generateVideoPrompt(settings?.videoType || 'looped-static', currentTrack?.genre);
      
      // Update the form with the generated prompt
      form.setValue('videoDescription', data.prompt);
      
      // Save the description to the appropriate state (shared or individual)
      saveCurrentDescription(data.prompt);
      
      // Also update the prompts state directly for immediate validation
      const currentFormValues = form.getValues();
      onPromptsUpdate?.(currentFormValues);
      
      console.log('AI generated prompt saved:', data.prompt);
      
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
    <div className="space-y-6 w-full max-w-none">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Create Your Music Video</h2>
        <p className="text-muted-foreground">
          {settings?.useSameVideoForAll ? (
            "Describe the visual style you want for all your music tracks"
          ) : (
            "Describe the visual style you want for this specific track"
          )}
        </p>
      </div>

      {/* Test component */}
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
          render={({ field }: { field: any }) => (
            <input type="hidden" {...field} />
          )}
        />
        
        {/* Video Description */}
        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Video Description</h3>
          </div>
          <div className="relative">
            <textarea
              placeholder='e.g., "A seamless loop of a record player spinning on a vintage wooden table, with dust particles dancing in a sunbeam."'
              className="min-h-[200px] resize-none text-base w-full px-3 py-2 pr-14 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              maxLength={1500}
              value={settings?.useSameVideoForAll ? watchedVideoDescription : (propTrackDescriptions?.[currentTrack?.id || ""] || musicTracks.find(t => t.id === currentTrack?.id)?.videoDescription || trackDescriptions[currentTrack?.id || ""] || "")}
              onChange={(e) => {
                const value = e.target.value;
                form.setValue("videoDescription", value);
                
                if (settings?.useSameVideoForAll) {
                  // When in reuse mode, update the shared description
                  onSharedDescriptionUpdate?.(value);
                } else {
                  // When in individual mode, update the current track description
                  saveCurrentDescription(value);
                }
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
            <div className="absolute bottom-2 right-2 text-xs text-foreground/70 bg-background/80 px-1 rounded">
              {(settings?.useSameVideoForAll ? watchedVideoDescription : (propTrackDescriptions?.[currentTrack?.id || ""] || musicTracks.find(t => t.id === currentTrack?.id)?.videoDescription || trackDescriptions[currentTrack?.id || ""] || ""))?.length || 0} / 1500
            </div>
          </div>
        </div>
      </form>
    </Form>


    </div>
  );
}