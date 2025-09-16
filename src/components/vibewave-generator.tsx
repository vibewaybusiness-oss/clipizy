
"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { usePricing, type PricingConfig } from "@/hooks/use-pricing";
import { analyzeAudioAction, generateVideoAction, generateMusicAction } from "@/app/actions";

import { StepUpload } from "@/components/generator/step-upload";
import { StepSettings } from "@/components/generator/step-settings";
import { StepPrompt } from "@/components/generator/step-prompt";
import { StepOverview } from "@/components/generator/step-overview";
import { StepGenerating } from "@/components/generator/step-generating";
import { StepPreview } from "@/components/generator/step-preview";

export type Step = "UPLOAD" | "SETTINGS" | "PROMPT" | "OVERVIEW" | "GENERATING" | "PREVIEW";
export type GenerationMode = "upload" | "generate";

export const SceneSchema = z.object({
    id: z.number(),
    description: z.string().min(1, "Scene description cannot be empty."),
    startTime: z.number(),
    endTime: z.number(),
    label: z.string(),
});
export type Scene = z.infer<typeof SceneSchema>;

export const PromptSchema = z.object({
  musicDescription: z.string().optional(),
  videoDescription: z.string().min(10, "Video description is too short.").max(500, "Video description is too long."),
  scenes: z.array(SceneSchema).optional(),
});

export const SettingsSchema = z.object({
    videoType: z.enum(["looped-static", "looped-animated", "scenes"], { required_error: "Please select a video type." }),
    budget: z.array(z.number()).optional(),
    videoStyle: z.string().optional(),
    animationStyle: z.string().optional(),
    createIndividualVideos: z.boolean().default(false),
    createCompilation: z.boolean().default(false),
    useSameVideoForAll: z.boolean().default(false),
});

export const OverviewSchema = z.object({
    channelAnimationFile: z.any().optional(),
    animationHasAudio: z.boolean(),
    startAudioDuringAnimation: z.boolean(),
    introAnimationFile: z.any().optional(),
    outroAnimationFile: z.any().optional(),
    playMusicDuringIntro: z.boolean(),
    playMusicDuringOutro: z.boolean(),
    videoDescription: z.string().min(10, "Video description is too short.").max(500, "Video description is too long."),
    audioVisualizerEnabled: z.boolean(),
    audioVisualizerPositionV: z.string().optional(),
    audioVisualizerPositionH: z.string().optional(),
    audioVisualizerSize: z.string().optional(),
    audioVisualizerType: z.string().optional(),
});


// Helper function to convert dollars to credits and round up to nearest 5
const convertToCredits = (dollars: number, creditsRate: number): number => {
    const credits = dollars * creditsRate;
    return Math.ceil(credits / 5) * 5; // Round up to nearest 5
};

export const calculateLoopedBudget = (
    totalDurationSeconds: number, 
    trackCount: number, 
    pricing: PricingConfig | null,
    reuseVideo: boolean = false,
    videoType: 'looped-static' | 'looped-animated' = 'looped-static'
) => {
    if (!pricing) return 100; // Default fallback if pricing not loaded
    
    if (totalDurationSeconds === 0) return convertToCredits(5, pricing.credits_rate); // Minimum in credits
    
    const durationMinutes = totalDurationSeconds / 60;
    const config = videoType === 'looped-static' 
        ? pricing.image_generator 
        : pricing.looped_animation_generator;
    
    // Number of images/animations needed
    const unitCount = reuseVideo ? 1 : trackCount;
    
    // Calculate price: (units × unit_rate) + (duration × minute_rate)
    const unitCost = unitCount * config.unit_rate;
    const durationCost = durationMinutes * config.minute_rate;
    const calculatedPrice = unitCost + durationCost;
    
    // Apply min/max constraints
    let finalPrice = Math.max(calculatedPrice, config.min);
    if (config.max !== null) {
        finalPrice = Math.min(finalPrice, config.max);
    }
    
    // Convert to credits and round up to nearest 5
    return convertToCredits(finalPrice, pricing.credits_rate);
};

export const calculateScenesBudget = (
    totalDurationSeconds: number,
    trackDurations: number[],
    pricing: PricingConfig | null,
    reuseVideo: boolean = false
) => {
    if (!pricing) return 100; // Default fallback if pricing not loaded
    
    if (totalDurationSeconds === 0) return convertToCredits(5, pricing.credits_rate); // Minimum in credits
    
    const config = pricing.video_generator;
    
    // Calculate total scenes across all videos: duration / 7.5 seconds per scene
    const totalScenes = Math.ceil(totalDurationSeconds / 7.5);
    
    // Number of videos (tracks)
    const numberOfVideos = trackDurations.length || 1;
    
    // When reusing video, create 1 video with all scenes
    // When not reusing, distribute scenes across multiple videos
    const scenesPerVideo = reuseVideo ? totalScenes : Math.ceil(totalScenes / numberOfVideos);
    const actualNumberOfVideos = reuseVideo ? 1 : numberOfVideos;
    
    // Calculate price: scenes per video × number of videos × duration per scene × minute_rate
    // Each scene is 7.5 seconds = 0.125 minutes
    const durationPerSceneMinutes = 7.5 / 60; // 0.125 minutes per scene
    const totalSceneDurationMinutes = scenesPerVideo * actualNumberOfVideos * durationPerSceneMinutes;
    const calculatedPrice = totalSceneDurationMinutes * config.minute_rate;
    
    // Apply minimum constraint
    const finalPrice = Math.max(calculatedPrice, config.min);
    
    // Convert to credits and round up to nearest 5
    return convertToCredits(finalPrice, pricing.credits_rate);
};

export const getScenesInfo = (
    totalDurationSeconds: number,
    trackDurations: number[],
    reuseVideo: boolean = false
) => {
    // Calculate total scenes across all videos: duration / 7.5 seconds per scene
    const totalScenes = Math.ceil(totalDurationSeconds / 7.5);
    
    // Number of videos (tracks)
    const numberOfVideos = trackDurations.length || 1;
    
    // When reusing video, create 1 video with all scenes
    // When not reusing, distribute scenes across multiple videos
    const scenesPerVideo = reuseVideo ? totalScenes : Math.ceil(totalScenes / numberOfVideos);
    const actualNumberOfVideos = reuseVideo ? 1 : numberOfVideos;
    
    return {
        scenesPerVideo,
        numberOfVideos: actualNumberOfVideos,
        totalScenes
    };
};


export default function VibewaveGenerator() {
  const [step, setStep] = useState<Step>("UPLOAD");
  const [generationMode, setGenerationMode] = useState<GenerationMode>("upload");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [generatedVideoUri, setGeneratedVideoUri] = useState<string | null>(null);
  const [settings, setSettings] = useState<z.infer<typeof SettingsSchema> | null>(null);
  const [prompts, setPrompts] = useState<z.infer<typeof PromptSchema> | null>(null);
  const [musicPrompt, setMusicPrompt] = useState("");
  const [vibeFile, setVibeFile] = useState<File | null>(null);
  const [channelAnimationFile, setChannelAnimationFile] = useState<File | null>(null);

  const [isAnalyzing, startAnalyzing] = useTransition();
  const [isGeneratingVideo, startGeneratingVideo] = useTransition();
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { pricing, loading: pricingLoading, error: pricingError } = usePricing();
  const { toast } = useToast();

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
        videoType: "looped-static", // Default to looped-static
        budget: [100], // Default to 100 credits (5 dollars)
        videoStyle: "",
        animationStyle: "",
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

  useEffect(() => {
    if (audioFile) {
        const url = URL.createObjectURL(audioFile);
        setAudioUrl(url);

        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
            setAudioDuration(audio.duration);
        });
        audioRef.current = audio;

        return () => {
            URL.revokeObjectURL(url);
        }
    }
  }, [audioFile]);

  useEffect(() => {
    if (step === 'OVERVIEW' && prompts) {
        overviewForm.setValue('videoDescription', prompts.videoDescription);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, prompts]);


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
      promptForm.reset();
      setStep("SETTINGS");
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
    setStep("PROMPT");
  }

  const onPromptSubmit = (values: z.infer<typeof PromptSchema>) => {
    setPrompts(values);
    setStep("OVERVIEW");
  };
  
  const onOverviewSubmit = (values: z.infer<typeof OverviewSchema>) => {
    setStep("GENERATING");
    
    let videoPrompt = "";
    if (settings?.videoType === 'looped-static' || settings?.videoType === 'looped-animated') {
        const videoTypeText = settings.videoType === 'looped-static' ? 'static image' : 'looping video';
        videoPrompt = `Create a single, ${videoTypeText} scene based on this description: "${values.videoDescription}". The style should be ${settings.videoStyle}.`;
    } else { // scenes
        videoPrompt = `Create a music video with multiple scenes with the overarching theme of "${prompts?.videoDescription}". The individual scenes are: ${prompts?.scenes?.map(s => s.description).join(", ")}. The style should be ${settings?.videoStyle}.`;
    }

    let visualizerPrompt = "";
    if (values.audioVisualizerEnabled) {
        visualizerPrompt = ` Include an audio visualizer with these properties: vertical_position=${values.audioVisualizerPositionV}, horizontal_position=${values.audioVisualizerPositionH}, size=${values.audioVisualizerSize}, type=${values.audioVisualizerType}.`
    }
    
    const fullPrompt = `Style: ${settings?.videoStyle}. Video Type: ${settings?.videoType}. Budget level: ${settings?.budget?.[0] || 1}. Music: ${prompts?.musicDescription}. Video: ${videoPrompt}. Channel Animation Present: ${!!channelAnimationFile}. ${visualizerPrompt}`;
    
    startGeneratingVideo(async () => {
      const result = await generateVideoAction({ prompt: fullPrompt });
      if (result.success && result.videoDataUri) {
        setGeneratedVideoUri(result.videoDataUri);
        setStep("PREVIEW");
      } else {
        toast({
          variant: "destructive",
          title: "Video Generation Failed",
          description: result.error,
        });
        setStep("OVERVIEW");
      }
    });
  }

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
        promptForm.reset();
        setStep("SETTINGS");
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
  }

  const handleReset = () => {
    setStep("UPLOAD");
    setGenerationMode("upload");
    setAudioFile(null);
    setAudioUrl(null);
    setAudioDuration(0);
    if(audioRef.current) {
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
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
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const renderStep = () => {
    switch (step) {
      case "UPLOAD":
        return (
          <StepUpload
            generationMode={generationMode}
            setGenerationMode={setGenerationMode}
            handleAudioFileChange={handleAudioFileChange}
            musicPrompt={musicPrompt}
            setMusicPrompt={setMusicPrompt}
            vibeFile={vibeFile}
            setVibeFile={setVibeFile}
            handleGenerateMusic={handleGenerateMusic}
            isGeneratingMusic={isGeneratingMusic}
          />
        );
      case "SETTINGS":
        return (
          <StepSettings
            form={settingsForm}
            audioDuration={audioDuration}
            totalDuration={audioDuration}
            trackCount={1}
            trackDurations={[audioDuration]}
            onSubmit={handleSettingsSubmit}
            onBack={handleReset}
          />
        );
      case "PROMPT":
        return (
          <StepPrompt
            form={promptForm}
            settings={settings}
            audioFile={audioFile}
            audioDuration={audioDuration}
            onSubmit={onPromptSubmit}
            onBack={() => setStep("SETTINGS")}
            fileToDataUri={fileToDataUri}
            toast={toast}
          />
        );
      case "OVERVIEW":
        return (
          <StepOverview
            form={overviewForm}
            settings={settings}
            prompts={prompts}
            channelAnimationFile={channelAnimationFile}
            setChannelAnimationFile={setChannelAnimationFile}
            onSubmit={onOverviewSubmit}
            onBack={() => setStep("PROMPT")}
            isGeneratingVideo={isGeneratingVideo}
            toast={toast}
          />
        );
      case "GENERATING":
        return <StepGenerating />;
      case "PREVIEW":
        return (
          <StepPreview
            videoUri={generatedVideoUri}
            onReset={handleReset}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl">
      {renderStep()}
    </div>
  );
}
