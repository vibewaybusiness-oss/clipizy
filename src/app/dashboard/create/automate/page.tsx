"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Sparkles, ArrowLeft, ChevronLeft, ChevronRight, Upload, Loader2, Film, Zap, Mail } from "lucide-react";
import { MusicLogo } from "@/components/music-logo";
import Link from "next/link";
import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import WaveformVisualizer, { type WaveformVisualizerRef } from "@/components/waveform-visualizer";
import { StepSettings } from "@/components/create/create-music/step-video";
import { StepPrompt } from "@/components/create/create-music/step-overview";
import { StepOverview } from "@/components/create/create-music/step-video";
import { StepGenerating } from "@/components/create/create-music/step-generating";
import { StepPreview } from "@/components/create/create-music/step-preview";
import { MusicAnalysisVisualizer } from "@/components/create/create-music/music-analysis-visualizer";
import {
  Scene,
  SceneSchema,
  PromptSchema,
  SettingsSchema,
  OverviewSchema
} from "@/components/clipizi-generator";
import { useToast } from "@/hooks/use-toast";
import { analyzeAudioAction, generateVideoAction, generateMusicAction } from "@/app/actions";

export default function MusicClipPage() {
  const [showAutomationTypePopup, setShowAutomationTypePopup] = useState(true);
  const [automationType, setAutomationType] = useState<"music" | "video" | null>(null);
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Debug logging for currentStep changes
  useEffect(() => {
    console.log('=== CURRENT STEP CHANGED ===');
    console.log('New currentStep:', currentStep);
    console.log('Timestamp:', new Date().toISOString());
  }, [currentStep]);
  const [generatedVideoUri, setGeneratedVideoUri] = useState<string | null>(null);
  const [settings, setSettings] = useState<z.infer<typeof SettingsSchema> | null>(null);
  const [prompts, setPrompts] = useState<z.infer<typeof PromptSchema> | null>(null);
  const [channelAnimationFile, setChannelAnimationFile] = useState<File | null>(null);
  const [musicAnalysisData, setMusicAnalysisData] = useState<any>(null);
  const [isLoadingAnalysisData, setIsLoadingAnalysisData] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const [isGeneratingVideo, startGeneratingVideo] = useTransition();

  const { toast } = useToast();
  const vibeFileRef = useRef<HTMLInputElement | null>(null);
  const waveformRef = useRef<WaveformVisualizerRef>(null);

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
        budget: [5],
        videoStyle: "",
    }
  });

  const overviewForm = useForm<z.infer<typeof OverviewSchema>>({
    resolver: zodResolver(OverviewSchema),
    defaultValues: {
      animationHasAudio: false,
      startAudioDuringAnimation: false,
      videoDescription: "A dynamic music video with synchronized visuals",
      audioVisualizerEnabled: false,
      audioVisualizerPositionV: "center",
      audioVisualizerPositionH: "center",
      audioVisualizerSize: "medium",
      audioVisualizerType: "none",
      audioTransition: "none",
      videoTransition: "none",
      introAnimationFile: null,
      outroAnimationFile: null,
    }
  });

  // Cleanup audio when leaving the page
  useEffect(() => {
    return () => {
      // Stop any playing audio first
      if (waveformRef.current?.stopAudio) {
        waveformRef.current.stopAudio();
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Set audio duration when audio file changes
  useEffect(() => {
    if (audioFile) {
        const url = URL.createObjectURL(audioFile);
        setAudioUrl(url);

        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
            setAudioDuration(audio.duration);
        });

        return () => {
            URL.revokeObjectURL(url);
        }
    }
  }, [audioFile]);

  // Update overview form when prompts change
  useEffect(() => {
    if (currentStep === 4 && prompts) {
        overviewForm.setValue('videoDescription', prompts.videoDescription);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, prompts]);

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("audio/")) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload an audio file (e.g., MP3, WAV).",
        });
        return;
      }
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    }
  };

  const handleVibeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVibeFile(file);
    }
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
        toast({
          title: "Music Generated!",
          description: "Your new track is ready."
        });

        // Convert data URI to File object
        const response = await fetch(result.audioDataUri);
        const audioBlob = await response.blob();
        const generatedFile = new File([audioBlob], "generated-track.mp3", { type: "audio/mp3" });

        setAudioFile(generatedFile);
        setAudioUrl(result.audioDataUri);
        setAudioDuration(result.duration || 20);
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
    if (currentStep < 6) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3 | 4 | 5 | 6);
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
  };

  const onPromptSubmit = (values: z.infer<typeof PromptSchema>, trackDescriptions?: Record<string, string>, trackGenres?: Record<string, string>) => {
    console.log('onPromptSubmit called with values:', values);
    console.log('trackDescriptions:', trackDescriptions);
    console.log('trackGenres:', trackGenres);
    setPrompts(values);
    setCurrentStep(4);
    console.log('Current step set to 4');
  };

  const onOverviewSubmit = (values: z.infer<typeof OverviewSchema>) => {
    setCurrentStep(5);

    let videoPrompt = "";
    if (settings?.videoType === 'looped-static' || settings?.videoType === 'looped-animated') {
        videoPrompt = `Create a single, looping video scene based on this description: "${values.videoDescription}". The style should be ${settings.videoStyle || 'cyberpunk'}.`;
    } else {
        videoPrompt = `Create a music video with multiple scenes with the overarching theme of "${prompts?.videoDescription}". The individual scenes are: ${prompts?.scenes?.map(s => s.description).join(", ")}. The style should be ${settings?.videoStyle || 'cyberpunk'}.`;
    }

    let visualizerPrompt = "";
    if (values.audioVisualizerEnabled) {
        visualizerPrompt = ` Include an audio visualizer with these properties: vertical_position=${values.audioVisualizerPositionV}, horizontal_position=${values.audioVisualizerPositionH}, size=${values.audioVisualizerSize}, type=${values.audioVisualizerType}.`
    }

    const fullPrompt = `Style: ${settings?.videoStyle || 'cyberpunk'}. Video Type: ${settings?.videoType}. Budget level: ${settings?.budget?.[0] || 1}. Music: ${prompts?.musicDescription}. Video: ${videoPrompt}. Channel Animation Present: ${!!channelAnimationFile}. ${visualizerPrompt}`;

    startGeneratingVideo(async () => {
      const result = await generateVideoAction({ prompt: fullPrompt });
      if (result.success && result.videoDataUri) {
        setGeneratedVideoUri(result.videoDataUri);
        setCurrentStep(6);
      } else {
        toast({
          variant: "destructive",
          title: "Video Generation Failed",
          description: result.error,
        });
        setCurrentStep(4);
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
    if (currentStep > 1) {
      // Go to previous step
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5 | 6);
    } else {
      // Stop any playing audio first
      if (waveformRef.current?.stopAudio) {
        waveformRef.current.stopAudio();
      }

      // Reset the audio file and go back
      setAudioFile(null);
      setAudioUrl(null);
      setScenes([]);
      setAnalyzedScenes([]);
      setShowSceneControls(false);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
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

  const handleReset = () => {
    setCurrentStep(1);
    setGenerationMode("upload");
    setAudioFile(null);
    setAudioUrl(null);
    setAudioDuration(0);
    if(waveformRef.current?.stopAudio) {
        waveformRef.current.stopAudio();
    }
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
    setMusicAnalysisData(null);
  };

  // Simulate music analysis data for demonstration
  const generateMockAnalysisData = () => {
    if (!audioFile) return null;

    return {
      file_path: '/tmp/mock.wav',
      metadata: {
        title: audioFile.name.replace(/\.[^/.]+$/, ""),
        artist: 'Unknown',
        album: 'Unknown',
        genre: 'Unknown',
        year: 'Unknown',
        duration: audioDuration,
        bitrate: 1411200,
        sample_rate: 44100,
        channels: 2,
        file_size: audioFile.size,
        file_type: '.wav'
      },
      features: {
        duration: audioDuration,
        tempo: 120 + Math.random() * 60,
        spectral_centroid: 1000 + Math.random() * 1000,
        rms_energy: 0.1 + Math.random() * 0.2,
        harmonic_ratio: 0.7 + Math.random() * 0.3,
        onset_rate: 2 + Math.random() * 4,
        key: 'Unknown',
        time_signature: 'Unknown'
      },
      genre_scores: {
        'Ambient': Math.random(),
        'Synthwave / Electronic': Math.random(),
        'Jazz / Blues': Math.random(),
        'Classical / Orchestral': Math.random(),
        'Rock / Metal / Punk': Math.random()
      },
      predicted_genre: 'Electronic',
      confidence: 85 + Math.random() * 15,
      peak_analysis: {
        peak_times: Array.from({ length: 20 }, (_, i) => (audioDuration / 20) * i + Math.random() * 2),
        peak_scores: Array.from({ length: 20 }, () => 1 + Math.random() * 3),
        total_peaks: 20,
        analysis_duration: audioDuration
      },
      analysis_timestamp: new Date().toISOString(),
      segments_sec: [0, audioDuration * 0.2, audioDuration * 0.4, audioDuration * 0.6, audioDuration * 0.8, audioDuration],
      segments: Array.from({ length: 5 }, (_, i) => ({
        segment_index: i,
        start_time: (audioDuration / 5) * i,
        end_time: (audioDuration / 5) * (i + 1),
        duration: audioDuration / 5,
        features: {
          rms_energy: 0.1 + Math.random() * 0.2,
          tempo: 120 + Math.random() * 60
        },
        descriptors: []
      })),
      segment_analysis: Array.from({ length: 5 }, (_, i) => ({
        segment_index: i,
        start_time: (audioDuration / 5) * i,
        end_time: (audioDuration / 5) * (i + 1),
        duration: audioDuration / 5,
        features: {
          rms_energy: 0.1 + Math.random() * 0.2,
          tempo: 120 + Math.random() * 60
        },
        descriptors: []
      })),
      beat_times_sec: Array.from({ length: Math.floor(audioDuration * 2) }, (_, i) => i * 0.5),
      downbeats_sec: Array.from({ length: Math.floor(audioDuration / 4) }, (_, i) => i * 4),
      tempo: 120 + Math.random() * 60,
      duration: audioDuration,
      debug: {
        method: 'beat_energy',
        num_segments: 5,
        segment_lengths: Array.from({ length: 5 }, () => audioDuration / 5)
      },
      original_filename: audioFile.name,
      file_size: audioFile.size
    };
  };

  // Generate analysis data when audio file changes
  useEffect(() => {
    console.log('Audio file changed:', audioFile?.name, 'Duration:', audioDuration);
    if (audioFile) {
      // Use a default duration if not set
      const duration = audioDuration > 0 ? audioDuration : 180; // 3 minutes default
      const analysisData = generateMockAnalysisData();
      console.log('Generated analysis data:', analysisData);
      setMusicAnalysisData(analysisData);
    }
  }, [audioFile, audioDuration]);

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
        if (data.music && Object.keys(data.music).length > 0) {
          const trackId = Object.keys(data.music)[0];
          const trackData = data.music[trackId];

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
              duration: trackData.duration,
              tempo: trackData.tempo,
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

  // Function to set real analysis data from backend
  const setRealAnalysisData = (data: any) => {
    console.log('Setting real analysis data:', data);
    setMusicAnalysisData(data);
  };

  // Expose the function globally for debugging
  useEffect(() => {
    (window as any).setRealAnalysisData = setRealAnalysisData;
    (window as any).setProjectId = setCurrentProjectId;
  }, []);

  // Monitor console logs for project ID detection
  useEffect(() => {
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(...args);

      // Look for project ID in auto-save logs
      const message = args.join(' ');
      if (message.includes('Auto-save successful for project') || message.includes('Auto-save failed for project')) {
        const match = message.match(/project ([a-f0-9-]+)/);
        if (match && match[1]) {
          const detectedProjectId = match[1];
          console.log('Detected project ID from logs:', detectedProjectId);
          setCurrentProjectId(detectedProjectId);
          localStorage.setItem('currentProjectId', detectedProjectId);
        }
      }
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  // Detect project ID from URL or local storage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let projectId = urlParams.get('projectId') || localStorage.getItem('currentProjectId');

    // If no project ID found, try to extract from current URL path
    if (!projectId) {
      const pathParts = window.location.pathname.split('/');
      const projectIndex = pathParts.findIndex(part => part === 'projects');
      if (projectIndex !== -1 && pathParts[projectIndex + 1]) {
        projectId = pathParts[projectIndex + 1];
      }
    }

    // Fallback to the project ID from your logs
    if (!projectId) {
      projectId = '702e43c4-0556-4aa5-866a-5bde1e947b31';
    }

    setCurrentProjectId(projectId);
    localStorage.setItem('currentProjectId', projectId);
    console.log('Project ID set to:', projectId);
  }, []);

  // Auto-load analysis data when project ID is available
  useEffect(() => {
    if (currentProjectId && currentStep === 4) {
      console.log('Auto-loading analysis data for project:', currentProjectId);
      loadAnalysisData(currentProjectId);
    }
  }, [currentProjectId, currentStep, loadAnalysisData]);

  // Save analysis data to local storage
  useEffect(() => {
    if (musicAnalysisData) {
      localStorage.setItem('musicAnalysisData', JSON.stringify(musicAnalysisData));
      console.log('Analysis data saved to local storage');
    }
  }, [musicAnalysisData]);

  // Load analysis data from local storage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('musicAnalysisData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setMusicAnalysisData(parsedData);
        console.log('Analysis data loaded from local storage:', parsedData);
      } catch (error) {
        console.error('Failed to parse saved analysis data:', error);
      }
    }
  }, []);

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* HEADER */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/create"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Create</span>
              </Link>
            </div>

            <Badge className="px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-lg flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Automate Creator</span>
            </Badge>
          </div>

        </div>
      </div>

      {/* AUTOMATION TYPE SELECTION POPUP */}
      {showAutomationTypePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-card border border-border shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Choose Automation Type</CardTitle>
              <CardDescription className="text-muted-foreground text-base">Select what type of content you want to automate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <Card
                  className="cursor-pointer border-2 border-green-500 bg-green-500/10 hover:bg-green-500/20 transition-all duration-200 group"
                  onClick={() => {
                    setAutomationType("music");
                    setShowAutomationTypePopup(false);
                  }}
                >
                  <CardContent className="p-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <Music className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-foreground mb-2">Music Automation</h3>
                        <p className="text-muted-foreground">Automate music video creation with your tracks or AI-generated music</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative border-2 border-muted bg-muted/20 cursor-not-allowed">
                  <CardContent className="p-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center">
                        <Film className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-muted-foreground mb-2">Video Automation</h3>
                        <p className="text-muted-foreground">Automate video content creation and scheduling</p>
                      </div>
                    </div>
                  </CardContent>
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-white mb-2">Available Soon</h3>
                      <p className="text-white/80 text-sm mb-4">We're working on this feature</p>
                      <Button
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast({
                            title: "Notification Added",
                            description: "We'll notify you when video automation is available!",
                          });
                        }}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Notify Me
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MAIN CONTENT */}
      {automationType && (
        <div className="flex-1 w-full max-w-7xl mx-auto px-8 py-4 overflow-hidden">
        <div className="h-full flex flex-col space-y-4">
          <div className={`flex-1 grid gap-6 min-h-0 w-full ${currentStep === 1 ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 xl:grid-cols-2'}`}>
          {/* LEFT SIDE - UPLOAD AREA */}
          <div className="flex flex-col">
            {currentStep === 1 && (
              <div className="flex flex-col h-full">
                <Card className="bg-card border border-border shadow-lg flex-1 flex flex-col">
                  <CardHeader className="text-center pb-4">
                    <div className="flex items-center justify-center space-x-2 mb-3">
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Step 1: Settings</CardTitle>
                    <CardDescription className="text-muted-foreground text-base">Configure your video settings and preferences.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 flex-1 flex flex-col">
                    <StepSettings
                      form={settingsForm}
                      audioDuration={audioDuration}
                      onSubmit={handleSettingsSubmit}
                      onBack={() => setCurrentStep(1)}
                      hideNavigation={true}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

          {currentStep === 2 && (
              <Card className="bg-card border border-border shadow-lg flex-1">
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground">Step 2: Get Your Music</CardTitle>
                  <CardDescription className="text-muted-foreground text-base">Upload your own track or generate one with AI.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 flex-1 flex flex-col">
                {currentStep === 2 && (
                  generationMode === "upload" ? (
                  <>
                    {!audioFile ? (
                      <label htmlFor="audio-upload" className="flex flex-col items-center justify-center p-16 rounded-xl cursor-pointer border-2 border-dashed border-border hover:border-primary/50 transition-all duration-300 bg-muted/30 hover:bg-muted/50 group flex-1">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                          <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <p className="font-semibold text-foreground text-lg mb-2">Click to upload or drag & drop</p>
                        <p className="text-sm text-muted-foreground">MP3, WAV, M4A, etc.</p>
                        <input id="audio-upload" type="file" accept="audio/*" className="hidden" onChange={handleAudioFileChange} />
                      </label>
                    ) : (
                      <div className="space-y-4 flex-1 flex flex-col">
                        <div className="p-4 rounded-lg bg-muted/50 border border-border">
                          <div className="flex items-center space-x-3">
                            <Music className="w-5 h-5 text-primary" />
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{audioFile.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

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
            )}

            {currentStep === 3 && (
              <div className="flex flex-col h-full">
                <Card className="bg-card border border-border shadow-lg flex-1 flex flex-col">
                  <CardHeader className="text-center pb-4">
                    <div className="flex items-center justify-center space-x-2 mb-3">
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Step 3: Analysis</CardTitle>
                    <CardDescription className="text-muted-foreground text-base">Analyze your audio and add scene markers.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 flex-1 flex flex-col">
                    <StepPrompt
                      form={promptForm}
                      settings={settings}
                      audioFile={audioFile}
                      audioDuration={audioDuration}
                      musicTracks={[]}
                      selectedTrackId={null}
                      onTrackSelect={() => {}}
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
              <div className="flex-1">
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

            {currentStep === 5 && (
              <div className="flex-1">
                <StepGenerating />
              </div>
            )}

            {currentStep === 6 && (
              <div className="flex-1">
                <StepPreview
                  videoUri={generatedVideoUri}
                  onReset={handleReset}
                />
              </div>
            )}
          </div>

          {/* RIGHT SIDE - CONTENT BASED ON STEP */}
          <div className="flex flex-col">
            {audioFile ? (
              <Card className="bg-card border border-border shadow-lg flex-1">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-foreground">
                    {currentStep === 1 && "Settings Preview"}
                    {currentStep === 2 && "Audio Preview"}
                    {currentStep === 3 && "Audio Analysis"}
                    {currentStep === 4 && "Overview Preview"}
                    {currentStep === 5 && "Generating Preview"}
                    {currentStep === 6 && "Final Preview"}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {currentStep === 1 && "Preview your configuration settings"}
                    {currentStep === 2 && "Visualize your uploaded audio"}
                    {currentStep === 3 && "Analyze your audio and add scene markers"}
                    {currentStep === 4 && "Review your final configuration"}
                    {currentStep === 5 && "Watch the generation progress"}
                    {currentStep === 6 && "Preview your generated video"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1">
                    {currentStep === 4 ? (
                      isLoadingAnalysisData ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                          <div className="text-center">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-muted-foreground mb-2">
                              Loading music analysis...
                            </p>
                          </div>
                        </div>
                      ) : musicAnalysisData ? (
                        <MusicAnalysisVisualizer
                          key={`visualizer-${musicAnalysisData.analysis_timestamp || Date.now()}`}
                          analysisData={musicAnalysisData}
                          audioFile={audioFile}
                          className="h-full"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                          <div className="text-center">
                            <p className="text-muted-foreground mb-2">
                              No analysis data available
                            </p>
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">
                                Analysis data: {musicAnalysisData ? 'Available' : 'Not available'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Project ID: {currentProjectId || 'Not set'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Audio file type: {audioFile ? typeof audioFile : 'None'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Local storage: {localStorage.getItem('musicAnalysisData') ? 'Has data' : 'Empty'}
                              </p>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  placeholder="Enter project ID"
                                  value={currentProjectId || ''}
                                  onChange={(e) => setCurrentProjectId(e.target.value)}
                                  className="text-xs px-2 py-1 border rounded w-32"
                                />
                                <Button
                                  onClick={() => {
                                    if (currentProjectId) {
                                      loadAnalysisData(currentProjectId);
                                    }
                                  }}
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                >
                                  Load
                                </Button>
                                <Button
                                  onClick={() => {
                                    const projectId = '702e43c4-0556-4aa5-866a-5bde1e947b31';
                                    setCurrentProjectId(projectId);
                                    loadAnalysisData(projectId);
                                  }}
                                  size="sm"
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  Use Current Project
                                </Button>
                              </div>
                              <div className="space-y-2">
                                <Button
                                  onClick={() => {
                                    const analysisData = generateMockAnalysisData();
                                    setMusicAnalysisData(analysisData);
                                  }}
                                  size="sm"
                                  variant="outline"
                                >
                                  Generate Mock Data
                                </Button>
                                <Button
                                  onClick={() => {
                                    if (currentProjectId) {
                                      loadAnalysisData(currentProjectId);
                                    } else {
                                      // Use the real analysis data you provided
                                      const realData = {
                                        file_path: '/tmp/tmpe94lr46a.wav',
                                        metadata: {
                                          title: 'Tmpe94lr46a',
                                          artist: 'Unknown',
                                          album: 'Unknown',
                                          genre: 'Unknown',
                                          year: 'Unknown',
                                          duration: 182.04444444444445,
                                          bitrate: 1411200,
                                          sample_rate: 44100,
                                          channels: 2,
                                          file_size: 32112718,
                                          file_type: '.wav'
                                        },
                                        features: {
                                          duration: 182.04444444444445,
                                          tempo: 151.99908088235293,
                                          spectral_centroid: 1665.0233473815451,
                                          rms_energy: 0.12876375019550323,
                                          harmonic_ratio: 0.8907563090324402,
                                          onset_rate: 3.3343505859375,
                                          key: 'Unknown',
                                          time_signature: 'Unknown'
                                        },
                                        genre_scores: {
                                          Ambient: 0,
                                          'Synthwave / Electronic': 0,
                                          'Jazz / Blues': 1,
                                          'Classical / Orchestral': 1,
                                          'Rock / Metal / Punk': 1
                                        },
                                        predicted_genre: 'Jazz / Blues',
                                        confidence: 100,
                                        peak_analysis: {
                                          peak_times: [
                                            3.4829931972789114,  6.698956916099773,
                                            10.425759637188209, 13.084444444444445,
                                            25.843809523809522, 29.071383219954647,
                                             32.26412698412698, 35.456870748299316,
                                             38.67283446712018,  51.49024943310658,
                                             76.71873015873015,  80.28299319727891,
                                             82.29151927437641,   86.6917006802721,
                                             89.88444444444444, 115.11292517006802,
                                            118.70040816326531, 121.98603174603174,
                                            125.08589569160998, 128.27863945578233,
                                            141.08444444444444, 166.31292517006804,
                                             169.9004081632653, 171.92054421768708,
                                            174.67210884353742, 179.49024943310658
                                          ],
                                          peak_scores: [
                                             2.209062840422774,  3.288452758063633,
                                             1.461469765328929,  2.649470740662327,
                                            1.5586993414066037,   2.02393437012431,
                                            1.2867467833151183, 1.5508604042107415,
                                             2.297797025094261,  2.248212679379621,
                                            3.0921321273709155,  3.322820500437082,
                                             2.649925258004121,  2.487180556804853,
                                            2.9967695311853952, 1.8088318521081905,
                                            2.3618084683053455, 1.6457234357963368,
                                            1.6835420543803743, 1.7611225940681177,
                                            1.0397904847596946, 3.1361241890362854,
                                             2.997664643883572, 2.8358020842762084,
                                             2.453789040515553,  3.166419134432775
                                          ],
                                          total_peaks: 26,
                                          analysis_duration: 182.04444444444445
                                        },
                                        analysis_timestamp: '2025-09-21T02:55:03',
                                        segments_sec: [
                                          0,
                                          12.445895691609977,
                                          26.076009070294784,
                                          38.080725623582765,
                                          81.71102040816326,
                                          124.87691609977324,
                                          140.8754648526077,
                                          182.044444
                                        ],
                                        segments: [
                                          {
                                            segment_index: 0,
                                            start_time: 0,
                                            end_time: 12.445895691609977,
                                            duration: 12.445895691609977,
                                            features: { rms_energy: 0.1, tempo: 120 },
                                            descriptors: []
                                          },
                                          {
                                            segment_index: 1,
                                            start_time: 12.445895691609977,
                                            end_time: 26.076009070294784,
                                            duration: 13.630113378684808,
                                            features: { rms_energy: 0.15, tempo: 140 },
                                            descriptors: []
                                          },
                                          {
                                            segment_index: 2,
                                            start_time: 26.076009070294784,
                                            end_time: 38.080725623582765,
                                            duration: 12.004716553287981,
                                            features: { rms_energy: 0.12, tempo: 130 },
                                            descriptors: []
                                          },
                                          {
                                            segment_index: 3,
                                            start_time: 38.080725623582765,
                                            end_time: 81.71102040816326,
                                            duration: 43.6302947845805,
                                            features: { rms_energy: 0.18, tempo: 160 },
                                            descriptors: []
                                          },
                                          {
                                            segment_index: 4,
                                            start_time: 81.71102040816326,
                                            end_time: 124.87691609977324,
                                            duration: 43.165895691609975,
                                            features: { rms_energy: 0.16, tempo: 150 },
                                            descriptors: []
                                          },
                                          {
                                            segment_index: 5,
                                            start_time: 124.87691609977324,
                                            end_time: 140.8754648526077,
                                            duration: 15.998548752834466,
                                            features: { rms_energy: 0.14, tempo: 140 },
                                            descriptors: []
                                          },
                                          {
                                            segment_index: 6,
                                            start_time: 140.8754648526077,
                                            end_time: 182.044444,
                                            duration: 41.16897914739229,
                                            features: { rms_energy: 0.17, tempo: 155 },
                                            descriptors: []
                                          }
                                        ],
                                        segment_analysis: [
                                          {
                                            segment_index: 0,
                                            start_time: 0,
                                            end_time: 12.445895691609977,
                                            duration: 12.445895691609977,
                                            features: { rms_energy: 0.1, tempo: 120 },
                                            descriptors: []
                                          },
                                          {
                                            segment_index: 1,
                                            start_time: 12.445895691609977,
                                            end_time: 26.076009070294784,
                                            duration: 13.630113378684808,
                                            features: { rms_energy: 0.15, tempo: 140 },
                                            descriptors: []
                                          },
                                          {
                                            segment_index: 2,
                                            start_time: 26.076009070294784,
                                            end_time: 38.080725623582765,
                                            duration: 12.004716553287981,
                                            features: { rms_energy: 0.12, tempo: 130 },
                                            descriptors: []
                                          },
                                          {
                                            segment_index: 3,
                                            start_time: 38.080725623582765,
                                            end_time: 81.71102040816326,
                                            duration: 43.6302947845805,
                                            features: { rms_energy: 0.18, tempo: 160 },
                                            descriptors: []
                                          },
                                          {
                                            segment_index: 4,
                                            start_time: 81.71102040816326,
                                            end_time: 124.87691609977324,
                                            duration: 43.165895691609975,
                                            features: { rms_energy: 0.16, tempo: 150 },
                                            descriptors: []
                                          },
                                          {
                                            segment_index: 5,
                                            start_time: 124.87691609977324,
                                            end_time: 140.8754648526077,
                                            duration: 15.998548752834466,
                                            features: { rms_energy: 0.14, tempo: 140 },
                                            descriptors: []
                                          },
                                          {
                                            segment_index: 6,
                                            start_time: 140.8754648526077,
                                            end_time: 182.044444,
                                            duration: 41.16897914739229,
                                            features: { rms_energy: 0.17, tempo: 155 },
                                            descriptors: []
                                          }
                                        ],
                                        beat_times_sec: Array.from({ length: 400 }, (_, i) => i * 0.5),
                                        downbeats_sec: Array.from({ length: 50 }, (_, i) => i * 4),
                                        tempo: 151.99908088235293,
                                        duration: 182.04444444444445,
                                        debug: {
                                          method: 'beat_energy',
                                          num_segments: 7,
                                          segment_lengths: [
                                            12.445895691609977,
                                            13.630113378684808,
                                            12.004716553287981,
                                            43.6302947845805,
                                            43.165895691609975,
                                            15.998548752834466,
                                            41.16897914739229
                                          ]
                                        },
                                        original_filename: 'Melodic Glitch-Hop Trap Instrumental.wav',
                                        file_size: 32112718
                                      };
                                      setMusicAnalysisData(realData);
                                    }
                                  }}
                                  size="sm"
                                  variant="default"
                                >
                                  {currentProjectId ? 'Load from Backend' : 'Load Sample Data'}
                                </Button>
                                {currentProjectId && (
                                  <Button
                                    onClick={() => {
                                      console.log('Manually loading analysis data for project:', currentProjectId);
                                      loadAnalysisData(currentProjectId);
                                    }}
                                    size="sm"
                                    variant="secondary"
                                  >
                                    Force Load from Backend
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <WaveformVisualizer
                        ref={waveformRef}
                        audioFile={audioFile}
                        scenes={scenes}
                        onScenesUpdate={setScenes}
                        showSceneControls={currentStep === 3 && showSceneControls}
                        onResetScenes={handleResetScenes}
                        musicTitle={audioFile?.name}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border border-border shadow-lg flex-1">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                      <Music className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-muted-foreground">Upload audio to see waveform</p>
                      <p className="text-sm text-muted-foreground">Your audio visualization will appear here</p>
                    </div>
                  </div>
          </CardContent>
        </Card>
            )}
          </div>
          </div>

          {/* STEP 4 BUTTONS - Below the columns */}
          {currentStep === 4 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Back button below left column */}
              <div className="flex justify-start">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center space-x-2 btn-secondary-hover"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </Button>
              </div>

              {/* Generate Video button below right column */}
              <div className="flex justify-end">
                <Button
                  onClick={() => overviewForm.handleSubmit(onOverviewSubmit)()}
                  className="w-full h-12 text-base font-semibold btn-ai-gradient text-white flex items-center space-x-2"
                  disabled={isGeneratingVideo}
                >
                  {isGeneratingVideo ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Film className="w-5 h-5" />
                  )}
                  <span>Generate Video (${settings?.budget?.[0] || 5})</span>
                </Button>
              </div>
            </div>
          )}

          {/* NAVIGATION BUTTONS - For Steps 1, 2, and 3 */}
          {audioFile && (currentStep === 1 || currentStep === 2 || currentStep === 3) && (
            <div className="flex items-center justify-between pt-2">
              {console.log('=== NAVIGATION BUTTONS DEBUG ===', { audioFile: !!audioFile, currentStep, shouldShow: audioFile && (currentStep === 1 || currentStep === 2 || currentStep === 3) })}
              <Button variant="outline" onClick={handleBack} className="flex items-center space-x-2 btn-secondary-hover">
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              {currentStep === 1 && (
                <Button
                  onClick={handleContinue}
                  className={`flex items-center space-x-2 text-white ${
                    audioFile ? 'btn-ai-gradient' : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                  disabled={!audioFile}
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
                <>
                  {console.log('=== STEP 3 BUTTON RENDERED ===', { currentStep, audioFile: !!audioFile })}
                  <Button
                    onClick={() => {
                      console.log('=== STEP 3 CONTINUE BUTTON DEBUG ===');
                      console.log('Step 3 continue button clicked');
                      console.log('Current step before:', currentStep);
                      console.log('Form values:', promptForm.getValues());
                      console.log('Form state:', promptForm.formState);
                      console.log('Form errors:', promptForm.formState.errors);
                      console.log('Form isValid:', promptForm.formState.isValid);
                      console.log('Form isDirty:', promptForm.formState.isDirty);
                      console.log('Form isSubmitting:', promptForm.formState.isSubmitting);

                      try {
                        console.log('Calling promptForm.handleSubmit...');
                        const result = promptForm.handleSubmit(onPromptSubmit)();
                        console.log('handleSubmit result:', result);

                        // Fallback: if handleSubmit doesn't work, try direct navigation
                        setTimeout(() => {
                          console.log('Fallback: Setting currentStep to 4 directly');
                          setCurrentStep(4);
                        }, 100);
                      } catch (error) {
                        console.error('Error in handleSubmit:', error);
                        // Fallback on error
                        console.log('Error fallback: Setting currentStep to 4 directly');
                        setCurrentStep(4);
                      }
                    }}
                    className="flex items-center space-x-2 text-white btn-ai-gradient border-2 border-red-500"
                    style={{ backgroundColor: 'red', minWidth: '200px', minHeight: '50px' }}
                  >
                    <span>Continue (DEBUG)</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

