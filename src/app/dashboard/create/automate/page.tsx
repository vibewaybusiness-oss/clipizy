"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/dashboard/components/ui/card";
import { Badge } from "@/app/dashboard/components/ui/badge";
import { Button } from "@/app/dashboard/components/ui/button";
import { Music, Sparkles, ArrowLeft, ChevronLeft, ChevronRight, Upload, Loader2, Film, Zap, Mail } from "lucide-react";
import { MusicLogo } from "@/app/dashboard/components/music-logo";
import Link from "next/link";
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
  const [generatedVideoUri, setGeneratedVideoUri] = useState<string | null>(null);
  const [settings, setSettings] = useState<z.infer<typeof SettingsSchema> | null>(null);
  const [prompts, setPrompts] = useState<z.infer<typeof PromptSchema> | null>(null);
  const [channelAnimationFile, setChannelAnimationFile] = useState<File | null>(null);
  
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

  const onPromptSubmit = (values: z.infer<typeof PromptSchema>) => {
    setPrompts(values);
    setCurrentStep(4);
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
  };

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
        <div className="flex-1 max-w-7xl mx-auto px-8 py-4 overflow-hidden">
        <div className="h-full flex flex-col space-y-4">
          <div className={`flex-1 grid gap-6 min-h-0 ${currentStep === 1 ? 'grid-cols-1 xl:grid-cols-2 w-auto' : 'grid-cols-1 xl:grid-cols-2'}`}>
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
                    <WaveformVisualizer
                      ref={waveformRef}
                      audioFile={audioFile}
                      scenes={scenes}
                      onScenesUpdate={setScenes}
                      showSceneControls={currentStep === 3 && showSceneControls}
                      onResetScenes={handleResetScenes}
                      musicTitle={audioFile?.name}
                    />
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
      )}
    </div>
  );
}

