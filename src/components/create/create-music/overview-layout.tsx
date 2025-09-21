"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Form, FormField } from "@/components/ui/form";
import { ArrowLeft, ChevronRight, Music, Play, Pause, ZoomIn, ZoomOut, RotateCcw, Clock, BarChart3, Volume2, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { SegmentList } from './segment-list';
import { PromptSchema, SettingsSchema, Scene } from "@/components/clipizi-generator";
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

interface OverviewLayoutProps {
  // Form props
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

  // Navigation props
  canContinue: boolean;
  onContinue: () => void;
  continueText: string;
}

export function OverviewLayout({
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
  analysisData,
  canContinue,
  onContinue,
  continueText
}: OverviewLayoutProps) {
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

  // Music analysis visualizer state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomStart, setZoomStart] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const generateWaveformData = useCallback(() => {
    if (!analysisData) return [];

    const duration = analysisData.duration || 0;
    const samples = Math.floor(duration * 50); // 50 samples per second
    const data: number[] = [];

    for (let i = 0; i < samples; i++) {
      const time = (i / samples) * duration;

      // Generate simplified waveform based on RMS energy and tempo
      const baseLevel = (analysisData.features?.rms_energy || 0) * 0.4;
      const tempoVariation = Math.sin(time * (analysisData.features?.tempo || 120) / 60 * Math.PI * 2) * 0.3;
      const randomVariation = Math.random() * 0.15;
      data.push(Math.max(0, Math.min(1, baseLevel + tempoVariation + randomVariation)));
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
    const segmentColor = '#10b981';
    const progressColor = '#8b5cf6';

    // Draw waveform bars
    for (let i = startSample; i < endSample; i++) {
      const x = (i - startSample) * barWidth;
      const barHeight = waveformData[i] * height * 0.8;

      ctx.fillStyle = waveColor;
      ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 1), barHeight);
    }

    // Draw segments
    (analysisData?.segments_sec || []).forEach((segmentTime: number, index: number) => {
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
    const clickTime = zoomStart + (x / width) * visibleDuration;

    setCurrentTime(Math.max(0, Math.min(clickTime, totalDuration)));

    if (audioRef.current) {
      audioRef.current.currentTime = clickTime;
    }
  }, [analysisData, zoomLevel, zoomStart]);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart(event.clientX);
  }, []);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !analysisData) return;

    const deltaX = event.clientX - dragStart;
    const sensitivity = 0.5;
    const deltaTime = (deltaX / (containerRef.current?.offsetWidth || 1)) * (analysisData.duration / zoomLevel) * sensitivity;

    setZoomStart(Math.max(0, Math.min(zoomStart - deltaTime, analysisData.duration - (analysisData.duration / zoomLevel))));
    setDragStart(event.clientX);
  }, [isDragging, dragStart, analysisData, zoomLevel, zoomStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev * 1.5, 20));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev / 1.5, 1));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setZoomStart(0);
  }, []);

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
      return musicTracks.every(track => {
        const description = trackDescriptions?.[track.id] ||
                          track.videoDescription ||
                          trackDescriptions?.[track.id] ||
                          transientTrackDescriptions[track.id] ||
                          "";
        return description.trim().length > 0;
      });
    }
  };

  const saveCurrentDescription = (description: string) => {
    if (settings?.useSameVideoForAll) {
      form.setValue("videoDescription", description, { shouldValidate: true, shouldDirty: true });
      setMergedDescription(description);
      onSharedDescriptionUpdate?.(description);

      const newDescriptions: Record<string, string> = {};
      musicTracks.forEach(track => {
        newDescriptions[track.id] = description;
      });
      setTrackDescriptions(newDescriptions);
      onTrackDescriptionsUpdate?.(newDescriptions);
    } else {
      const currentTrack = musicTracks.find(track => track.id === selectedTrackId);
      if (currentTrack) {
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
    }
  };

  const getCurrentDescription = () => {
    if (settings?.useSameVideoForAll) {
      return form.watch("videoDescription") || "";
    }
    const currentTrack = musicTracks.find(track => track.id === selectedTrackId);
    if (currentTrack) {
      return transientTrackDescriptions[currentTrack.id] || trackDescriptions?.[currentTrack.id] || "";
    }
    return "";
  };

  const handleGenerateWithAI = async () => {
    try {
      let promptType: 'image_prompts' | 'video_prompts' = 'image_prompts';
      if (settings?.videoType === 'scenes') {
        promptType = 'video_prompts';
      }

      const currentTrack = musicTracks.find(track => track.id === selectedTrackId);
      const data = await promptGeneration.generateVideoPrompt(settings?.videoType || 'looped-static', currentTrack?.genre);

      form.setValue('videoDescription', data.prompt);
      saveCurrentDescription(data.prompt);

      const currentFormValues = form.getValues();
      onPromptsUpdate?.(currentFormValues);

      toast({
        title: "Video Prompt Generated",
        description: `Generated ${data.category} style prompt for video.`,
      });

    } catch (error) {
      console.error('Error generating video prompt:', error);
    }
  };

  // Audio controls
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

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

  // Update form when track changes (only for track-specific mode)
  React.useEffect(() => {
    const currentTrack = musicTracks.find(track => track.id === selectedTrackId);
    if (currentTrack && !settings?.useSameVideoForAll) {
      const description = transientTrackDescriptions[currentTrack.id] || trackDescriptions?.[currentTrack.id] || "";
      const currentFormValue = form.getValues("videoDescription");
      if (currentFormValue !== description) {
        form.setValue("videoDescription", description, { shouldValidate: true, shouldDirty: true });
      }
    } else if (currentTrack && settings?.useSameVideoForAll) {
      const description = mergedDescription || form.getValues("videoDescription") || "";
      const currentFormValue = form.getValues("videoDescription");
      if (currentFormValue !== description) {
        form.setValue("videoDescription", description, { shouldValidate: true, shouldDirty: true });
      }
    } else if (!currentTrack) {
      const currentFormValue = form.getValues("videoDescription");
      if (currentFormValue !== "") {
        form.setValue("videoDescription", "", { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [selectedTrackId, settings?.useSameVideoForAll, transientTrackDescriptions, trackDescriptions, mergedDescription, form, musicTracks]);

  // Handle mode changes between shared and track-specific
  React.useEffect(() => {
    if (settings?.useSameVideoForAll) {
      const formDesc = form.getValues("videoDescription") || "";
      const newTrackDescriptions: Record<string, string> = {};
      musicTracks.forEach(track => {
        newTrackDescriptions[track.id] = formDesc;
      });
      if (!areDescriptionsEqual(trackDescriptions, newTrackDescriptions)) {
        setTrackDescriptions(newTrackDescriptions);
        onTrackDescriptionsUpdate?.(newTrackDescriptions);
      }
    } else {
      const currentTrack = musicTracks.find(track => track.id === selectedTrackId);
      if (currentTrack) {
        const trackDescription = transientTrackDescriptions[currentTrack.id] || trackDescriptions?.[currentTrack.id] || "";
        form.setValue("videoDescription", trackDescription, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [settings?.useSameVideoForAll, selectedTrackId, trackDescriptions, musicTracks, form, onTrackDescriptionsUpdate, areDescriptionsEqual, transientTrackDescriptions]);

  const handleFormSubmit = (values: z.infer<typeof PromptSchema>) => {
    const trackGenres = (form as any).trackGenres || {};

    // Save current description before submitting
    const currentDescription = form.getValues("videoDescription");
    if (currentDescription) {
      if (settings?.useSameVideoForAll) {
        setMergedDescription(currentDescription);
      } else {
        const currentTrack = musicTracks.find(track => track.id === selectedTrackId);
        if (currentTrack) {
          setTransientTrackDescriptions(prev => ({
            ...prev,
            [currentTrack.id]: currentDescription
          }));
        }
      }
    }

    // Determine which descriptions to save to backend
    let descriptionsToSave: Record<string, string> = trackDescriptions || {};
    if (settings?.useSameVideoForAll) {
      const mergedDesc = mergedDescription || currentDescription || "";
      descriptionsToSave = {};
      musicTracks.forEach(track => {
        descriptionsToSave[track.id] = mergedDesc;
      });
    } else {
      descriptionsToSave = { ...(trackDescriptions || {}), ...transientTrackDescriptions };
    }

    onSubmit(values, descriptionsToSave, trackGenres);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="h-screen bg-background w-full flex flex-col"
      >
      {/* HEADER */}
      <div className="border-b border-border bg-card w-full">
        <div className="w-full px-8 py-6">
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
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-foreground">1</span>
                  </div>
                  <span className="text-sm font-medium text-primary">Music</span>
                </div>
                <div className="w-16 h-0.5 bg-primary"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-foreground">2</span>
                  </div>
                  <span className="text-sm font-medium text-primary">Video</span>
                </div>
                <div className="w-16 h-0.5 bg-primary"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-foreground">3</span>
                  </div>
                  <span className="text-sm font-medium text-primary">Settings</span>
                </div>
                <div className="w-16 h-0.5 bg-primary"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-foreground">4</span>
                  </div>
                  <span className="text-sm font-medium text-primary">Overview</span>
                </div>
              </div>
            </div>

            <Badge className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg flex items-center space-x-2">
              <span>♪</span>
              <span>Music Clip Creator</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 w-full px-8 py-6 overflow-hidden">
        <div className="h-full flex flex-col">

          {/* THREE COLUMN LAYOUT */}
          <div className="grid grid-cols-12 gap-6 w-full flex-1 min-h-0">

            {/* LEFT COLUMN - SEGMENT LIST (30%) */}
            <div className="col-span-3 flex flex-col">
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

            {/* CENTER COLUMN - MUSIC ANALYSIS VISUALIZER (60%) */}
            <div className="col-span-7 flex flex-col">
              <Card className="bg-card border border-border shadow-lg flex-1 flex flex-col">
                <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                    {!analysisData ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm text-muted-foreground">
                            Analyzing your music to create the visualization...
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col">
                        {/* Header with track info */}
                        <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                                <Music className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-bold">{analysisData.metadata.title}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  {analysisData.metadata.artist} • {formatTime(analysisData.duration || 0)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold">
                                {analysisData.predicted_genre}
                              </Badge>
                              <Badge variant="outline" className="px-3 py-1 text-sm font-semibold">
                                {(analysisData.features.tempo || 120).toFixed(0)} BPM
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Main visualization */}
                        <div className="px-4 py-3 flex-1 flex flex-col min-h-0">
                          <div className="flex items-center justify-end mb-3">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={zoomOut}
                                disabled={zoomLevel <= 1}
                                className="px-3 py-1 h-8"
                              >
                                <ZoomOut className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={zoomIn}
                                disabled={zoomLevel >= 20}
                                className="px-3 py-1 h-8"
                              >
                                <ZoomIn className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={resetZoom}
                                className="px-3 py-1 h-8"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Audio controls */}
                          <div className="flex items-center space-x-4 mb-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={togglePlayPause}
                              disabled={!audioFile}
                              className="px-4 py-2 h-8"
                            >
                              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                            <div className="flex-1">
                              <Progress
                                value={(currentTime / analysisData.duration) * 100}
                                className="h-2"
                              />
                            </div>
                            <span className="text-sm font-medium text-foreground min-w-[100px] text-right">
                              {formatTime(currentTime)} / {formatTime(analysisData.duration)}
                            </span>
                          </div>

                          {/* Waveform canvas */}
                          <div
                            ref={containerRef}
                            className="relative border border-border rounded-lg overflow-hidden bg-gradient-to-b from-muted/10 to-muted/20 shadow-inner flex-1 min-h-0"
                          >
                            <canvas
                              ref={canvasRef}
                              className="w-full h-full cursor-pointer"
                              onClick={handleCanvasClick}
                              onMouseDown={handleCanvasMouseDown}
                              onMouseMove={handleCanvasMouseMove}
                              onMouseUp={handleCanvasMouseUp}
                              onMouseLeave={handleCanvasMouseUp}
                            />

                            {/* Legend */}
                            <div className="absolute top-2 left-2 flex items-center space-x-4 text-xs font-medium">
                              <div className="flex items-center space-x-1 bg-background/80 px-2 py-1 rounded">
                                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                <span>Waveform</span>
                              </div>
                              <div className="flex items-center space-x-1 bg-background/80 px-2 py-1 rounded">
                                <div className="w-3 h-3 bg-green-500 rounded"></div>
                                <span>Segments</span>
                              </div>
                            </div>
                          </div>

                          {/* Zoom info */}
                          <div className="text-center text-muted-foreground text-xs mt-2">
                            <span className="font-medium">Zoom: {zoomLevel.toFixed(1)}x</span>
                            <span className="mx-2">•</span>
                            <span>{formatTime(zoomStart)} - {formatTime(Math.min(zoomStart + analysisData.duration / zoomLevel, analysisData.duration))}</span>
                          </div>
                        </div>

                        {/* Segment details */}
                        {selectedSegment !== null && analysisData.segments[selectedSegment] && (
                          <div className="px-4 py-3 border-t border-border">
                            <Card className="w-full">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">
                                  Segment {analysisData.segments[selectedSegment].segment_index + 1} Analysis
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                  {formatTime(analysisData.segments[selectedSegment].start_time)} - {formatTime(analysisData.segments[selectedSegment].end_time)}
                                  ({formatTime(analysisData.segments[selectedSegment].duration)})
                                </p>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-xs font-medium">Duration</span>
                                    </div>
                                    <p className="text-lg font-bold">{formatTime(analysisData.segments[selectedSegment].duration)}</p>
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-1">
                                      <Volume2 className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-xs font-medium">Energy</span>
                                    </div>
                                    <p className="text-lg font-bold">
                                      {analysisData.segments[selectedSegment].features?.rms_energy?.toFixed(3) || 'N/A'}
                                    </p>
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-1">
                                      <Music className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-xs font-medium">Tempo</span>
                                    </div>
                                    <p className="text-lg font-bold">
                                      {analysisData.segments[selectedSegment].features?.tempo?.toFixed(0) || analysisData.features.tempo.toFixed(0)} BPM
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Overall analysis summary */}
                        <div className="px-4 py-3 bg-gradient-to-r from-muted/5 to-muted/10 border-t border-border flex-shrink-0">
                          <CardTitle className="text-lg font-bold mb-3 text-center">Analysis Summary</CardTitle>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <h4 className="text-sm font-bold text-foreground">Audio Features</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between items-center py-1 border-b border-border/50">
                                  <span className="text-muted-foreground">Duration:</span>
                                  <span className="font-semibold">{formatTime(analysisData.features.duration)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-border/50">
                                  <span className="text-muted-foreground">Tempo:</span>
                                  <span className="font-semibold">{analysisData.features.tempo.toFixed(1)} BPM</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-border/50">
                                  <span className="text-muted-foreground">Energy:</span>
                                  <span className="font-semibold">{analysisData.features.rms_energy.toFixed(3)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-border/50">
                                  <span className="text-muted-foreground">Harmonic Ratio:</span>
                                  <span className="font-semibold">{analysisData.features.harmonic_ratio.toFixed(3)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-border/50">
                                  <span className="text-muted-foreground">Total Segments:</span>
                                  <span className="font-semibold">{analysisData.segments.length}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-muted-foreground">Avg Duration:</span>
                                  <span className="font-semibold">{formatTime(analysisData.duration / analysisData.segments.length)}</span>
                                </div>

                              </div>
                            </div>

                            {/* Video Description */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-bold text-foreground">Video Description</h4>
                              <p className="text-sm text-muted-foreground">
                                Provide a detailed description of how you want your music video to look
                              </p>
                              <div className="space-y-3">
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
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* RIGHT COLUMN - MUSIC TRACKS (10%) */}
            <div className="col-span-2 flex flex-col">
              <Card className="bg-card border border-border shadow-lg flex-1 flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold">Tracks</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {musicTracks.length} track{musicTracks.length !== 1 ? 's' : ''}
                  </p>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col">
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {musicTracks.map((track) => (
                      <div
                        key={track.id}
                        className={`p-2 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedTrackId === track.id
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-primary/50 hover:shadow-sm'
                        }`}
                        onClick={() => onTrackSelect(track)}
                      >
                        <div className="flex flex-col items-center space-y-1">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span className="text-primary font-bold text-xs">♪</span>
                          </div>
                          <div className="text-center">
                            <h4 className="font-semibold text-foreground truncate text-xs">
                              {track.name || 'Track'}
                            </h4>
                            <p className="text-muted-foreground text-xs">
                              {track.duration ? `${Math.floor(track.duration / 60)}:${Math.floor(track.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                            </p>
                          </div>
                          {selectedTrackId === track.id && (
                            <Badge variant="secondary" className="px-1 py-0.5 text-xs">✓</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* BOTTOM NAVIGATION */}
          <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center space-x-2 px-6 py-3 text-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </Button>

            <Button
              onClick={onContinue}
              disabled={!canContinue}
              className={`flex items-center space-x-2 text-white px-8 py-3 text-lg font-semibold ${
                canContinue ? 'btn-ai-gradient' : 'bg-muted text-foreground/50 cursor-not-allowed'
              }`}
            >
              <span>{continueText}</span>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Hidden audio element */}
        {audioFile && audioFile instanceof File && (
          <audio
            ref={audioRef}
            src={URL.createObjectURL(audioFile as File)}
            preload="metadata"
          />
        )}

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
