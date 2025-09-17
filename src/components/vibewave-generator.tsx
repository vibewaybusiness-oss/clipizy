
"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
// Removed pricing API - using fixed values
// Removed API imports - features disabled
import { StepSettings } from "@/components/create/music-clip/step-settings";
import { StepPrompt } from "@/components/create/music-clip/step-prompt";
import { StepOverview } from "@/components/create/music-clip/step-overview";
import { StepGenerating } from "@/components/create/music-clip/step-generating";
import { StepPreview } from "@/components/create/music-clip/step-preview";

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
    pricing: any = null,
    reuseVideo: boolean = false,
    videoType: 'looped-static' | 'looped-animated' = 'looped-static'
) => {
    // Fixed pricing - no API dependency
    return 100; // Fixed cost for looped videos
};

export const calculateScenesBudget = (
    totalDurationSeconds: number,
    trackDurations: number[],
    pricing: any = null,
    reuseVideo: boolean = false
) => {
    // Fixed pricing - no API dependency
    return 200; // Fixed cost for scenes videos
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

  const [isGeneratingVideo, startGeneratingVideo] = useTransition();
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Removed pricing API - using fixed values
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
    toast({
      variant: "destructive",
      title: "Feature Disabled",
      description: "Video generation is currently disabled.",
    });
  }

  const handleGenerateMusic = async (options?: { duration: number; model: string }) => {
    toast({
      variant: "destructive",
      title: "Feature Disabled",
      description: "Music generation is currently disabled.",
    });
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
          <div className="w-full p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Upload Audio</h2>
            <p className="text-muted-foreground mb-6">Please upload an audio file to get started.</p>
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
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
