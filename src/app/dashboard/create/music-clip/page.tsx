"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/dashboard/components/ui/card";
import { Badge } from "@/app/dashboard/components/ui/badge";
import { Button } from "@/app/dashboard/components/ui/button";
import { Music, Sparkles, ArrowLeft, ChevronLeft, ChevronRight, Upload, Loader2, Film, Play, Pause, Trash2, Clock, Plus } from "lucide-react";
import { MusicLogo } from "@/app/dashboard/components/music-logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import WaveformVisualizer, { type WaveformVisualizerRef } from "@/app/dashboard/components/waveform-visualizer";
import { StepSettings } from "@/app/dashboard/components/generator/step-settings";
import { StepPrompt } from "@/app/dashboard/components/generator/step-prompt";
import { StepOverview } from "@/app/dashboard/components/generator/step-overview";
import { StepGenerating } from "@/app/dashboard/components/generator/step-generating";
import { StepPreview } from "@/app/dashboard/components/generator/step-preview";
import { TimelineHeader } from "@/app/dashboard/components/timeline-header";
import { 
  Scene, 
  SceneSchema, 
  PromptSchema, 
  SettingsSchema, 
  OverviewSchema,
  calculateLoopedBudget,
  calculateScenesBudget
} from "@/app/dashboard/components/vibewave-generator";
import { useToast } from "@/hooks/use-toast";
import { analyzeAudioAction, generateVideoAction, generateMusicAction } from "@/app/actions";

interface MusicTrack {
  id: string;
  file: File;
  url: string;
  duration: number;
  name: string;
  prompt?: string;
  generatedAt: Date;
}

export default function MusicClipPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [analyzedScenes, setAnalyzedScenes] = useState<Scene[]>([]);
  const [generationMode, setGenerationMode] = useState<"upload" | "generate">("upload");
  const [musicPrompt, setMusicPrompt] = useState("");
  const [vibeFile, setVibeFile] = useState<File | null>(null);
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [showSceneControls, setShowSceneControls] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<1 | 2 | 3 | 4>(1);
  const [generatedVideoUri, setGeneratedVideoUri] = useState<string | null>(null);
  const [settings, setSettings] = useState<z.infer<typeof SettingsSchema> | null>(null);
  const [prompts, setPrompts] = useState<z.infer<typeof PromptSchema> | null>(null);
  const [channelAnimationFile, setChannelAnimationFile] = useState<File | null>(null);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  
  const [isGeneratingVideo, startGeneratingVideo] = useTransition();
  
  const { toast } = useToast();
  const router = useRouter();
  const vibeFileRef = useRef<HTMLInputElement | null>(null);
  const waveformRef = useRef<WaveformVisualizerRef>(null);
  const musicPromptRef = useRef<HTMLTextAreaElement | null>(null);

  const promptForm = useForm<z.infer<typeof PromptSchema>>({
    resolver: zodResolver(PromptSchema),
    defaultValues: {
      musicDescription: "",
      videoDescription: "",
      scenes: [],
    },
  });

  const settingsForm = useForm<z.infer<typeof SettingsSchema>>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
        videoType: "looped-static",
        budget: [100], // Default to 100 credits (5 dollars)
        videoStyle: "none",
        animationStyle: "loop",
        createIndividualVideos: false,
        createCompilation: false,
        useSameVideoForAll: false,
    }
  });

  const overviewForm = useForm<z.infer<typeof OverviewSchema>>({
    resolver: zodResolver(OverviewSchema),
    defaultValues: {
      animationHasAudio: false,
      startAudioDuringAnimation: false,
      introAnimationFile: null,
      outroAnimationFile: null,
      playMusicDuringIntro: false,
      playMusicDuringOutro: false,
      videoDescription: "",
      audioVisualizerEnabled: false,
      audioVisualizerPositionV: "bottom",
      audioVisualizerPositionH: "center",
      audioVisualizerSize: "medium",
      audioVisualizerType: "none",
    }
  });

  // Cleanup audio when leaving the page
  useEffect(() => {
    return () => {
      // Stop all audio playback
      stopAllAudio();
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Global drag and drop handlers to prevent conflicts
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    
    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDragEnd = () => {
      setIsDragOver(false);
      setDragCounter(0);
    };

    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('drop', handleGlobalDrop);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('drop', handleGlobalDrop);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  // Set audio duration when audio file changes
  useEffect(() => {
    if (audioFile) {
        const url = URL.createObjectURL(audioFile);
        setAudioUrl(url);

        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
            setAudioDuration(audio.duration);
            
            // Update the duration in the tracks list
            if (selectedTrackId) {
                setMusicTracks(prev => prev.map(track => 
                    track.id === selectedTrackId 
                        ? { ...track, duration: audio.duration }
                        : track
                ));
            }
        });

        return () => {
            URL.revokeObjectURL(url);
        }
    }
  }, [audioFile, selectedTrackId]);

  // Update overview form when prompts change
  useEffect(() => {
    if (currentStep === 4 && prompts) {
        overviewForm.setValue('videoDescription', prompts.videoDescription);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, prompts]);

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const audioFiles = Array.from(files).filter(file => file.type.startsWith("audio/"));
      
      if (audioFiles.length === 0) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload audio files (e.g., MP3, WAV).",
        });
        return;
      }
      
      // Process each audio file
      audioFiles.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        
        // Create new track object
        const newTrack: MusicTrack = {
          id: `track-${Date.now()}-${Math.random()}`,
          file: file,
          url: url,
          duration: 0, // Will be set by audio element
          name: file.name,
          generatedAt: new Date()
        };
        
        // Add to tracks list
        setMusicTracks(prev => [...prev, newTrack]);
        
        // Set the first file as current audio for preview
        if (index === 0) {
          setAudioFile(file);
          setAudioUrl(url);
          setSelectedTrackId(newTrack.id);
        }
        
        // Load duration for each file
        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
          setMusicTracks(prev => prev.map(track => 
            track.id === newTrack.id 
              ? { ...track, duration: audio.duration }
              : track
          ));
        });
      });
      
      toast({ 
        title: "Audio Files Uploaded!", 
        description: `${audioFiles.length} track(s) have been added to the list.` 
      });
    }
  };

  const handleVibeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVibeFile(file);
    }
  };

  const handleTrackSelect = (track: MusicTrack) => {
    setAudioFile(track.file);
    setAudioUrl(track.url);
    setAudioDuration(track.duration);
    setSelectedTrackId(track.id);
  };

  const stopCurrentAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      // Revoke the blob URL if it was created for this audio
      if (currentAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(currentAudio.src);
      }
      setCurrentAudio(null);
    }
    setIsPlaying(false);
    setCurrentlyPlayingId(null);
  };

  const stopAllAudio = () => {
    // Stop current audio
    stopCurrentAudio();
    
    // Stop waveform audio
    if (waveformRef.current?.stopAudio) {
      waveformRef.current.stopAudio();
    }
    
    // Stop any remaining audio elements in the DOM
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      if (audio instanceof HTMLAudioElement) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
      }
    });
    
    // Force stop any media elements
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach(media => {
      if (media instanceof HTMLMediaElement) {
        media.pause();
        media.currentTime = 0;
        media.src = '';
        media.load();
      }
    });
  };

  const handlePlayPause = (track: MusicTrack) => {
    // If this track is already playing, pause it
    if (currentlyPlayingId === track.id && isPlaying) {
      stopCurrentAudio();
      return;
    }

    // Stop any currently playing audio
    stopCurrentAudio();

    // If clicking the same track that was paused, resume it
    if (currentlyPlayingId === track.id && !isPlaying) {
      if (currentAudio) {
        currentAudio.play();
        setIsPlaying(true);
        return;
      }
    }

    // Start playing the selected track
    // Use the track's file directly to create a new blob URL if needed
    let audioUrl = track.url;
    
    // If the track URL is a blob URL, check if it's still valid
    if (track.url.startsWith('blob:')) {
      // Create a new blob URL from the file to ensure it's valid
      audioUrl = URL.createObjectURL(track.file);
    }
    
    const audio = new Audio(audioUrl);
    setCurrentAudio(audio);
    setCurrentlyPlayingId(track.id);
    
    audio.addEventListener('ended', () => {
      stopCurrentAudio();
    });

    audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      toast({
        variant: "destructive",
        title: "Playback Error",
        description: "Failed to play the audio file. Please try again.",
      });
      stopCurrentAudio();
    });

    audio.addEventListener('loadstart', () => {
      // Audio is starting to load
    });

    audio.addEventListener('canplay', () => {
      // Audio is ready to play
    });

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch((error) => {
      console.error('Audio play failed:', error);
      toast({
        variant: "destructive",
        title: "Playback Error",
        description: "Failed to start playback. The file might be corrupted or in an unsupported format.",
      });
      stopCurrentAudio();
    });
  };

  const handleTrackRemove = (trackId: string) => {
    // Stop audio if the currently playing track is being removed
    if (currentlyPlayingId === trackId) {
      stopCurrentAudio();
    }
    
    setMusicTracks(prev => {
      const newTracks = prev.filter(track => track.id !== trackId);
      if (selectedTrackId === trackId) {
        if (newTracks.length > 0) {
          const nextTrack = newTracks[0];
          handleTrackSelect(nextTrack);
        } else {
          setAudioFile(null);
          setAudioUrl(null);
          setAudioDuration(0);
          setSelectedTrackId(null);
        }
      }
      return newTracks;
    });
    
    toast({
      title: "Track Removed",
      description: "The track has been removed from your list.",
    });
  };

  const handleGenerateMusic = async (options?: { duration: number; model: string }) => {
    if ((!musicPrompt || musicPrompt.length < 10) && !vibeFile) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide a music description (at least 10 characters) or a vibe file.",
      });
      return;
    }
    
    setIsGeneratingMusic(true);
    
    try {
      const result = await generateMusicAction({
        prompt: musicPrompt,
        duration: options?.duration || 20,
        output_format: "mp3",
        model: (options?.model || "stable-audio-2.5") as "stable-audio-2.5" | "stable-audio-2"
      });

      if (result.success && result.audioDataUri) {
        // Convert data URI to File object
        const response = await fetch(result.audioDataUri);
        const audioBlob = await response.blob();
        const generatedFile = new File([audioBlob], `generated-track-${Date.now()}.mp3`, { type: "audio/mp3" });
        
        // Create new track object
        const newTrack: MusicTrack = {
          id: `track-${Date.now()}`,
          file: generatedFile,
          url: result.audioDataUri,
          duration: result.duration || 20,
          name: generatedFile.name,
          prompt: musicPrompt,
          generatedAt: new Date()
        };
        
        // Add to tracks list
        setMusicTracks(prev => [...prev, newTrack]);
        
        // Set as current audio for preview
        setAudioFile(generatedFile);
        setAudioUrl(result.audioDataUri);
        setAudioDuration(result.duration || 20);
        setSelectedTrackId(newTrack.id);
        
        toast({ 
          title: "Music Generated!", 
          description: "Your new track has been added to the list." 
        });
        
        // Clear the prompt for next generation
        setMusicPrompt("");
        setVibeFile(null);
      } else {
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: result.error || "Failed to generate music. Please try again.",
        });
      }
    } catch (error) {
      console.error("Music generation error:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const handleContinue = () => {
    // Navigate to next step
    if (currentStep < 4) {
      const nextStep = (currentStep + 1) as 1 | 2 | 3 | 4;
      setCurrentStep(nextStep);
      setMaxReachedStep(nextStep);
    }
  };

  const handleSettingsSubmit = (values: z.infer<typeof SettingsSchema>) => {
    // Set defaults for budget if not provided
    const currentBudget = settingsForm.getValues("budget")?.[0] || 1;
    const settingsWithDefaults = {
      ...values,
      budget: values.budget || [currentBudget], // Use current form value as default
    };
    setSettings(settingsWithDefaults);
    setCurrentStep(3);
    setMaxReachedStep(3);
  };

  const onPromptSubmit = (values: z.infer<typeof PromptSchema>) => {
    setPrompts(values);
    setCurrentStep(4);
    setMaxReachedStep(4);
  };
  
  const onOverviewSubmit = (values: z.infer<typeof OverviewSchema>) => {
    let videoPrompt = "";
    if (settings?.videoType === 'looped-static' || settings?.videoType === 'looped-animated') {
        const animationType = settings?.videoType === 'looped-animated' && settings?.animationStyle 
          ? ` (${settings.animationStyle === 'boomerang' ? 'boomerang effect - forward then reverse playback' : 'seamless loop'})`
          : '';
        videoPrompt = `Create a single, looping video scene based on this description: "${values.videoDescription}". The style should be ${settings.videoStyle || 'cyberpunk'}${animationType}.`;
    } else {
        videoPrompt = `Create a music video with multiple scenes with the overarching theme of "${prompts?.videoDescription}". The individual scenes are: ${prompts?.scenes?.map(s => s.description).join(", ")}. The style should be ${settings?.videoStyle || 'cyberpunk'}.`;
    }

    let visualizerPrompt = "";
    if (values.audioVisualizerEnabled) {
        visualizerPrompt = ` Include an audio visualizer with these properties: vertical_position=${values.audioVisualizerPositionV}, horizontal_position=${values.audioVisualizerPositionH}, size=${values.audioVisualizerSize}, type=${values.audioVisualizerType}.`
    }
    
    const fullPrompt = `Style: ${settings?.videoStyle === 'none' ? 'default' : settings?.videoStyle || 'default'}. Video Type: ${settings?.videoType}. Budget level: ${settings?.budget?.[0] || 1}. Music: ${prompts?.musicDescription}. Video: ${videoPrompt}. Channel Animation Present: ${!!channelAnimationFile}. ${visualizerPrompt}`;
    
    startGeneratingVideo(async () => {
      const result = await generateVideoAction({ prompt: fullPrompt });
      if (result.success && result.videoDataUri) {
        setGeneratedVideoUri(result.videoDataUri);
        // Video generation completed successfully - could show success message or redirect
        toast({
          title: "Video Generated Successfully!",
          description: "Your music video has been created and is ready for download.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Video Generation Failed",
          description: result.error,
        });
      }
    });
  };


  const handleResetScenes = () => {
    setScenes([...analyzedScenes]);
    toast({
      title: "Scenes Reset",
      description: "Scene markers have been reset to analyzed positions.",
    });
  };

  const handleBack = () => {
    // Always stop all audio playback first
    stopAllAudio();
    
    if (currentStep > 1) {
      // Go to previous step
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    } else {
      // Navigate back to /Create page
      router.push('/dashboard/create');
    }
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  const getTotalDuration = (): number => {
    return musicTracks.reduce((total, track) => total + track.duration, 0);
  };

  const handleReset = () => {
    // Stop all audio playback first
    stopAllAudio();
    
    setCurrentStep(1);
    setMaxReachedStep(1);
    setGenerationMode("upload");
    setAudioFile(null);
    setAudioUrl(null);
    setAudioDuration(0);
    setGeneratedVideoUri(null);
    setSettings(null);
    setPrompts(null);
    promptForm.reset();
    settingsForm.reset();
    overviewForm.reset();
    setMusicPrompt("");
    setVibeFile(null);
    setChannelAnimationFile(null);
    setScenes([]);
    setAnalyzedScenes([]);
    setShowSceneControls(false);
    setMusicTracks([]);
    setSelectedTrackId(null);
    setCurrentlyPlayingId(null);
    setIsPlaying(false);
    setCurrentAudio(null);
  };

  return (
    <>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: rgba(59, 130, 246, 0.7);
        }
      `}</style>
      <div className="h-screen bg-background flex flex-col">
      {/* HEADER */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleBack}
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Create</span>
              </button>
            </div>
            
            <div className="flex-1 flex justify-center">
              <TimelineHeader 
                currentStep={currentStep} 
                maxReachedStep={maxReachedStep}
                totalSteps={4} 
                onStepClick={(step) => {
                  // Only allow navigation to steps that have been reached
                  if (step <= maxReachedStep) {
                    setCurrentStep(step as 1 | 2 | 3 | 4);
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
      <div className="flex-1 max-w-7xl mx-auto px-8 py-4 overflow-hidden">
        <div className="h-full flex flex-col space-y-4">
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0">
          {/* LEFT SIDE - UPLOAD AREA */}
          <div className="flex flex-col xl:col-span-2">
            {currentStep === 1 && (
              <div className="flex flex-col h-full">
                <Card className="bg-card border border-border shadow-lg flex-1 flex flex-col">
                  <CardContent className="space-y-6 flex flex-col p-6">
                {/* Info Banner */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">i</span>
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium mb-1">Multiple Tracks Support</p>
                      <p>Create or upload multiple music tracks. Each track can be used to generate individual videos, or you can create a compilation video from all tracks. Tracks are saved in the list on the right.</p>
                    </div>
                  </div>
                </div>
                
                {currentStep === 1 && (
                  generationMode === "upload" ? (
                  <>
                    <label htmlFor="audio-upload" className="flex flex-col items-center justify-center p-16 rounded-xl cursor-pointer border-2 border-dashed border-border hover:border-muted-foreground/50 transition-all duration-300 bg-muted/30 hover:bg-muted/50 group">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <p className="font-semibold text-foreground text-lg mb-2">Click to upload</p>
                      <p className="text-sm text-muted-foreground">MP3, WAV, M4A, etc.</p>
                      <input id="audio-upload" type="file" accept="audio/*" multiple className="hidden" onChange={handleAudioFileChange} />
                    </label>
                    
                    <div className="flex items-center my-6">
                      <div className="flex-1 h-px bg-border"></div>
                      <span className="px-6 text-sm text-muted-foreground font-medium">OR</span>
                      <div className="flex-1 h-px bg-border"></div>
                    </div>
                    
                    <Button className="w-full h-12 text-base font-semibold btn-ai-gradient text-white" onClick={() => setGenerationMode("generate")}>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Music with AI
                    </Button>
                  </>
                ) : (
                  <div className="space-y-6 flex-1 flex flex-col">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">Describe your music</label>
                      <textarea
                        ref={musicPromptRef}
                        placeholder='e.g., "A lo-fi hip hop beat with a chill, rainy day vibe."'
                        className="min-h-[120px] resize-none text-base w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={musicPrompt}
                        onChange={(e) => setMusicPrompt(e.target.value)}
                        minLength={10}
                      />
                    </div>
                    
                    <label htmlFor="vibe-upload" className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground cursor-pointer hover:bg-muted/70 transition-colors border border-border">
                      <Upload className="w-4 h-4"/>
                      <span className="flex-1">{vibeFile ? vibeFile.name : 'Optional: Upload a file for the vibe (image, audio, etc.)'}</span>
                      <input id="vibe-upload" ref={vibeFileRef} type="file" className="hidden" onChange={handleVibeFileChange} />
                    </label>
                    
                    <Button className="w-full h-12 text-base font-semibold btn-ai-gradient text-white" onClick={() => handleGenerateMusic()} disabled={isGeneratingMusic || (!vibeFile && musicPrompt.length < 10)}>
                      {isGeneratingMusic ? (
                        <div className="w-5 h-5 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
                      ) : (
                        <Sparkles className="w-5 h-5 mr-2" />
                      )}
                      Generate Music with AI
                    </Button>
                    
                    <div className="flex items-center my-6">
                      <div className="flex-1 h-px bg-border"></div>
                      <span className="px-6 text-sm text-muted-foreground font-medium">OR</span>
                      <div className="flex-1 h-px bg-border"></div>
                    </div>
                    
                    <Button variant="outline" className="w-full h-12 text-base font-semibold hover:bg-muted/80" onClick={() => setGenerationMode("upload")}>
                      <Upload className="w-5 h-5 mr-2" />
                      Upload a File Instead
                    </Button>
                  </div>
                )
                )}
                </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 2 && (
              <div className="flex flex-col h-full">
                <Card className="bg-card border border-border shadow-lg flex-1 flex flex-col">
                  <CardContent className="space-y-6 flex-1 flex flex-col p-6">
                    <StepSettings
                      form={settingsForm}
                      audioDuration={audioDuration}
                      totalDuration={getTotalDuration()}
                      trackCount={musicTracks.length}
                      trackDurations={musicTracks.map(track => track.duration)}
                      onSubmit={handleSettingsSubmit}
                      onBack={() => setCurrentStep(1)}
                      hideNavigation={true}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 3 && (
              <div className="flex flex-col h-full">
                <Card className="bg-card border border-border shadow-lg flex-1 flex flex-col">
                  <CardContent className="space-y-6 flex-1 flex flex-col p-6">
                    <StepPrompt
                      form={promptForm}
                      settings={settings}
                      audioFile={audioFile}
                      audioDuration={audioDuration}
                      onSubmit={onPromptSubmit}
                      onBack={() => setCurrentStep(2)}
                      fileToDataUri={fileToDataUri}
                      toast={toast}
                    />
          </CardContent>
        </Card>
              </div>
            )}

            {currentStep === 4 && (
              <div className="flex flex-col h-full">
                <StepOverview
                  form={overviewForm}
                  settings={settings}
                  prompts={prompts}
                  channelAnimationFile={channelAnimationFile}
                  setChannelAnimationFile={setChannelAnimationFile}
                  onSubmit={onOverviewSubmit}
                  onBack={() => setCurrentStep(3)}
                  isGeneratingVideo={isGeneratingVideo}
                  toast={toast}
                />
              </div>
            )}

          </div>

          {/* RIGHT SIDE - DRAG AND DROP AREA */}
          <div 
            className={`flex flex-col h-full xl:col-span-1 transition-all duration-300 ${
              isDragOver ? 'scale-[1.02]' : ''
            }`}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragCounter(prev => prev + 1);
              setIsDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragCounter(prev => {
                const newCount = prev - 1;
                if (newCount === 0) {
                  setIsDragOver(false);
                }
                return newCount;
              });
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
              setDragCounter(0);
              
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
              
              // Process each audio file
              audioFiles.forEach((file, index) => {
                const url = URL.createObjectURL(file);
                const newTrack: MusicTrack = {
                  id: `track-${Date.now()}-${Math.random()}`,
                  file: file,
                  url: url,
                  duration: 0, // Will be updated by the audio element
                  name: file.name,
                  generatedAt: new Date()
                };
                
                setMusicTracks(prev => [...prev, newTrack]);
                
                // Set the first file as selected
                if (index === 0) {
                  setAudioFile(file);
                  setAudioUrl(url);
                  setSelectedTrackId(newTrack.id);
                }
                
                // Load duration for each file
                const audio = new Audio(url);
                audio.addEventListener('loadedmetadata', () => {
                  setMusicTracks(prev => prev.map(track => 
                    track.id === newTrack.id 
                      ? { ...track, duration: audio.duration }
                      : track
                  ));
                });
              });
              
              toast({
                title: "Files Added!",
                description: `${audioFiles.length} audio file(s) added to your tracks.`,
              });
            }}
          >
            <Card className={`bg-card border shadow-lg flex-1 flex flex-col min-h-0 transition-all duration-300 ${
              isDragOver 
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
                        {musicTracks.length} track{musicTracks.length !== 1 ? 's' : ''} loaded
                      </CardDescription>
                    </div>
                  </div>
                  {musicTracks.length > 0 && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Total Duration</div>
                      <div className="text-sm font-semibold text-primary">
                        {formatDuration(getTotalDuration())}
                      </div>
                    </div>
                  )}
                </div>
                
                {musicTracks.length === 0 && (
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-dashed border-border">
                    <p className="text-sm text-muted-foreground text-center">
                      Drag and drop audio files here or use the controls on the left
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                {/* Content Area */}
                <div className="flex-1 min-h-0">
                  {musicTracks.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                      <div className="text-center space-y-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-all duration-300 ${
                          isDragOver ? 'bg-primary/20 scale-110' : 'bg-primary/10'
                        }`}>
                          <Upload className={`w-6 h-6 text-primary transition-all duration-300 ${
                            isDragOver ? 'scale-110' : ''
                          }`} />
                        </div>
                        <div>
                          <p className={`text-sm font-medium transition-colors duration-300 ${
                            isDragOver ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                            {isDragOver ? 'Drop audio files here!' : 'No tracks loaded'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Upload or generate music to get started
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className={`p-3 space-y-2 h-full overflow-y-auto transition-all duration-300 relative custom-scrollbar ${
                        isDragOver ? 'opacity-50' : ''
                      }`}
                      style={{ maxHeight: 'calc(100vh - 400px)' }}
                    >
                      {isDragOver && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg z-10">
                          <div className="text-center space-y-2">
                            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                              <Upload className="w-5 h-5 text-primary" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Drop to add more tracks</p>
                          </div>
                        </div>
                      )}
                      {musicTracks.map((track) => (
                        <div
                          key={track.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 group ${
                            selectedTrackId === track.id
                              ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border hover:border-primary/30 hover:bg-primary/5'
                          }`}
                          onClick={() => handleTrackSelect(track)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                              selectedTrackId === track.id 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                            }`}>
                              <Music className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate text-sm">{track.name}</p>
                              <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-1">
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDuration(track.duration)}</span>
                                </div>
                                {track.prompt && (
                                  <span className="truncate max-w-[120px]">
                                    "{track.prompt}"
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayPause(track);
                                }}
                                className="h-7 w-7 p-0 hover:bg-primary/10"
                              >
                                {currentlyPlayingId === track.id && isPlaying ? (
                                  <Pause className="w-3 h-3" />
                                ) : (
                                  <Play className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTrackRemove(track.id);
                                }}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
          
          {/* NAVIGATION BUTTONS - For all steps */}
          {musicTracks.length > 0 && selectedTrackId && currentStep < 4 && (
            <div className={`pt-2 ${currentStep === 4 ? 'grid grid-cols-1 xl:grid-cols-3 gap-6' : 'flex items-center justify-between'}`}>
              <div className={currentStep === 4 ? 'xl:col-span-2' : ''}>
                <Button 
                  variant="outline" 
                  onClick={handleBack} 
                  className="flex items-center space-x-2 btn-secondary-hover"
                  disabled={currentStep === 1 && musicTracks.length === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </Button>
              </div>
              
              {/* STEP 4 GENERATE BUTTON - Full width of right column */}
              {currentStep === 4 && (
                <div className="xl:col-span-1">
                  <Button 
                    onClick={() => overviewForm.handleSubmit(onOverviewSubmit)()} 
                    className="w-full h-10 text-base font-semibold btn-ai-gradient text-white flex items-center space-x-2"
                    disabled={isGeneratingVideo}
                  >
                    {isGeneratingVideo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Film className="w-4 h-4" />
                    )}
                    <span>Generate Video ({settings?.budget?.[0] || 100} credits)</span>
                  </Button>
                </div>
              )}
              
              {currentStep === 1 && (
                <Button 
                  onClick={handleContinue} 
                  className={`flex items-center space-x-2 text-white ${
                    musicTracks.length > 0 && selectedTrackId ? 'btn-ai-gradient' : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                  disabled={musicTracks.length === 0 || !selectedTrackId}
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
              
              {currentStep === 2 && (
                <Button 
                  onClick={() => settingsForm.handleSubmit(handleSettingsSubmit)()} 
                  className={`flex items-center space-x-2 text-white ${
                    settingsForm.formState.isValid ? 'btn-ai-gradient' : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                  disabled={!settingsForm.formState.isValid}
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
              
              {currentStep === 3 && (
                <Button 
                  onClick={() => promptForm.handleSubmit(onPromptSubmit)()} 
                  className={`flex items-center space-x-2 text-white ${
                    promptForm.formState.isValid ? 'btn-ai-gradient' : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                  disabled={!promptForm.formState.isValid}
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}

