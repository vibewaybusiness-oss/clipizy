"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Form, FormField } from "@/components/ui/form";
import { Music, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { SegmentList } from './SegmentList';
import { PromptSchema, SettingsSchema, Scene } from "@/components/forms/music-clip/ClipiziGenerator";
import { usePromptGeneration } from "@/hooks/ai/use-prompt-generation";
import type { MusicTrack } from "@/types/domains/music";
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

interface OverviewLayoutProps {
  // Form props
  form: UseFormReturn<z.infer<typeof PromptSchema>>;
  settings: z.infer<typeof SettingsSchema> | null;
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

  
  // Layout props
  fullWidth?: boolean;
}

export function OverviewLayout({
  form,
  settings,
  onSubmit,
  onBack,
  fileToDataUri,
  toast,
  onTrackDescriptionsUpdate,
  onSharedDescriptionUpdate,
  onPromptsUpdate,
  trackDescriptions: propTrackDescriptions,
  analysisData,
  fullWidth = false
}: OverviewLayoutProps) {
  
  // Debug logging for analysis data
  console.log('OverviewLayout render:', {
    hasAnalysisData: !!analysisData,
    duration: analysisData?.duration,
    segments: analysisData?.segments?.length,
    isFallback: analysisData?.debug?.method === 'fallback'
  });
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

  // Step-overview state
  const [trackDescriptions, setTrackDescriptions] = useState<Record<string, string>>(propTrackDescriptions || {});
  const [transientTrackDescriptions, setTransientTrackDescriptions] = useState<Record<string, string>>({});
  const [mergedDescription, setMergedDescription] = useState<string>("");
  const promptGeneration = usePromptGeneration();

  // Watch form values
  const watchedVideoDescription = form.watch("videoDescription") || "";

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };


  // Step-overview helper functions
  const areDescriptionsEqual = useCallback((a: Record<string, string>, b: Record<string, string>) => {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  }, []);

  const areAllDescriptionsFilled = () => {
    if (settings?.useSameVideoForAll) {
      return watchedVideoDescription.trim().length > 0;
    } else {
      return true; // For now, always return true since we don't have track-specific logic
    }
  };

  const saveCurrentDescription = (description: string) => {
    if (settings?.useSameVideoForAll) {
      form.setValue("videoDescription", description, { shouldValidate: true, shouldDirty: true });
      setMergedDescription(description);
      onSharedDescriptionUpdate?.(description);
    }
  };

  const getCurrentDescription = () => {
    if (settings?.useSameVideoForAll) {
      return form.watch("videoDescription") || "";
    }
    return "";
  };

  const handleGenerateWithAI = async () => {
    try {
      let promptType: 'image_prompts' | 'video_prompts' = 'image_prompts';
      if (settings?.videoType === 'scenes') {
        promptType = 'video_prompts';
      }

      const data = await promptGeneration.generateVideoPrompt(settings?.videoType || 'looped-static');

      form.setValue('videoDescription', data.prompt);
      saveCurrentDescription(data.prompt);

      const currentFormValues = form.getValues();
      onPromptsUpdate?.(currentFormValues);

      toast({
        title: "Video Prompt Generated",
        description: "Generated AI prompt for video.",
      });

    } catch (error) {
      console.error('Error generating video prompt:', error);
    }
  };


  // Step-overview useEffect hooks
  useEffect(() => {
    if (settings?.useSameVideoForAll) {
      console.log('OverviewLayout: Reuse mode - using form videoDescription:', watchedVideoDescription);
    } else {
      if (propTrackDescriptions && !areDescriptionsEqual(trackDescriptions, propTrackDescriptions)) {
        console.log('OverviewLayout: Individual mode - loading track descriptions:', propTrackDescriptions);
        setTrackDescriptions(propTrackDescriptions);
        onTrackDescriptionsUpdate?.(propTrackDescriptions);
      }
    }
  }, [settings?.useSameVideoForAll, propTrackDescriptions, watchedVideoDescription, areDescriptionsEqual, onTrackDescriptionsUpdate, trackDescriptions]);

  const handleFormSubmit = (values: z.infer<typeof PromptSchema>) => {
    const trackGenres = (form as any).trackGenres || {};

    // Save current description before submitting
    const currentDescription = form.getValues("videoDescription");
    if (currentDescription && settings?.useSameVideoForAll) {
      setMergedDescription(currentDescription);
    }

    // Determine which descriptions to save to backend
    let descriptionsToSave: Record<string, string> = trackDescriptions || {};
    if (settings?.useSameVideoForAll) {
      const mergedDesc = mergedDescription || currentDescription || "";
      descriptionsToSave = { "shared": mergedDesc };
    }

    onSubmit(values, descriptionsToSave, trackGenres);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="h-full w-full flex flex-col"
      >
        <div className="h-full flex flex-col space-y-6">

          {/* TWO COLUMN LAYOUT */}
          <div className="grid grid-cols-12 gap-8 w-full h-full">

            {/* LEFT COLUMN - SEGMENT LIST (40%) */}
            <div className="col-span-5 h-full flex flex-col">
              <SegmentList
                segments={analysisData?.segments || []}
                selectedSegment={selectedSegment}
                onSegmentSelect={setSelectedSegment}
                analysisData={analysisData}
                onSegmentFocus={(segmentIndex: number) => {
                  // Focus on segment in visualizer
                  if (analysisData?.segments?.[segmentIndex]) {
                    const segment = analysisData.segments[segmentIndex];
                    const segmentCenter = segment.start_time + (segment.duration / 2);
                    // This will be handled by the visualizer component
                  }
                }}
              />
            </div>

            {/* RIGHT COLUMN - AUDIO DATA (60%) */}
            <div className="col-span-7 h-full flex flex-col">
              <Card className="bg-card border border-border shadow-lg h-full flex flex-col">
                <CardContent className="p-6 h-full flex flex-col overflow-hidden">
                  {!analysisData ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">
                          Loading audio analysis...
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          If this takes too long, the visualization will use fallback data
                        </p>
                        <div className="flex flex-col space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('Manual fallback data trigger - reloading page');
                              window.location.reload();
                            }}
                            className="mt-2"
                          >
                            Use Fallback Data
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              console.log('Force minimal data for testing');
                              // This will be handled by the parent component
                              window.dispatchEvent(new CustomEvent('forceFallbackData'));
                            }}
                          >
                            Force Test Data
                          </Button>
                          <div className="text-xs text-muted-foreground/50 mt-2 p-2 bg-muted/20 rounded">
                            <div>Debug Info:</div>
                            <div>Has Analysis Data: {analysisData ? 'Yes' : 'No'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col">
                      {/* Header with track info */}
                      <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border flex-shrink-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                              <Music className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-bold">{analysisData.metadata?.title || 'Unknown Track'}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {analysisData.metadata?.artist || 'Unknown Artist'} • {formatTime(analysisData.duration || 0)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold">
                              {analysisData.predicted_genre || 'Unknown'}
                            </Badge>
                            <Badge variant="outline" className="px-3 py-1 text-sm font-semibold">
                              {(analysisData.features?.tempo || analysisData.tempo || 120).toFixed(0)} BPM
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Audio Features Summary */}
                      <div className="px-4 py-3 flex-1 flex flex-col min-h-0">
                        <CardTitle className="text-lg font-bold mb-3 text-center">Audio Features</CardTitle>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between items-center py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-semibold">{formatTime(analysisData.features?.duration || analysisData.duration || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Tempo:</span>
                            <span className="font-semibold">{(analysisData.features?.tempo || analysisData.tempo || 120).toFixed(1)} BPM</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Energy:</span>
                            <span className="font-semibold">{(analysisData.features?.rms_energy || 0).toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Harmonic Ratio:</span>
                            <span className="font-semibold">{(analysisData.features?.harmonic_ratio || 0).toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-border/50">
                            <span className="text-muted-foreground">Total Segments:</span>
                            <span className="font-semibold">{analysisData.segments?.length || 0}</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-muted-foreground">Avg Duration:</span>
                            <span className="font-semibold">{formatTime((analysisData.duration || 0) / Math.max(analysisData.segments?.length || 1, 1))}</span>
                          </div>
                        </div>

                        {/* Video Description */}
                        <div className="mt-6">
                          <h4 className="text-sm font-bold text-foreground mb-2">Video Description</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Provide a detailed description of how you want your music video to look
                          </p>
                          <div className="relative">
                            <textarea
                              placeholder='e.g., "A seamless loop of a record player spinning on a vintage wooden table, with dust particles dancing in a sunbeam."'
                              className="min-h-[120px] resize-none text-sm w-full px-3 py-2 pr-14 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              maxLength={1500}
                              value={settings?.useSameVideoForAll ? watchedVideoDescription : getCurrentDescription()}
                              onChange={(e) => {
                                const value = e.target.value;
                                form.setValue("videoDescription", value);

                                if (settings?.useSameVideoForAll) {
                                  onSharedDescriptionUpdate?.(value);
                                } else {
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
                                className="w-8 h-8 p-0 btn-ai-gradient text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {promptGeneration.isGenerating ? (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                            {/* Character count */}
                            <div className="absolute bottom-2 right-2 text-xs text-foreground/70 bg-background/80 px-1 rounded">
                              {(settings?.useSameVideoForAll ? watchedVideoDescription : getCurrentDescription())?.length || 0} / 1500
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>


          </div>


        </div>


        {/* Hidden music description field */}
        <FormField
          control={form.control}
          name="musicDescription"
          render={({ field }: { field: any }) => (
            <input type="hidden" {...field} />
          )}
        />
      </form>
    </Form>
  );
}
