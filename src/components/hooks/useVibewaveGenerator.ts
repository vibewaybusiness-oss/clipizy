import { useState, useTransition, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/ui/use-toast";
import { ClipizyGeneratorState, Step, GenerationMode, Scene, PromptData, SettingsData, OverviewData } from '../types/clipizy.types';
import { fileToDataUri } from '../utils/clipizy.utils';

const SceneSchema = z.object({
  id: z.number(),
  description: z.string().min(1, "Scene description cannot be empty."),
  startTime: z.number(),
  endTime: z.number(),
  label: z.string(),
});

const PromptSchema = z.object({
  musicDescription: z.string().optional(),
  videoDescription: z.string().optional(),
  scenes: z.array(SceneSchema).optional(),
});

const SettingsSchema = z.object({
  videoType: z.enum(["looped-static", "looped-animated", "scenes"], { required_error: "Please select a video type." }),
  budget: z.array(z.number()).optional(),
  user_price: z.number().optional(),
  videoStyle: z.string().optional(),
  animationStyle: z.string().optional(),
  createIndividualVideos: z.boolean().default(false),
  createCompilation: z.boolean().default(false),
  useSameVideoForAll: z.boolean().default(false),
});

const OverviewSchema = z.object({
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
  audioTransition: z.string().optional(),
  videoTransition: z.string().optional(),
});

export const useClipizyGenerator = () => {
  const [step, setStep] = useState<Step>("UPLOAD");
  const [generationMode, setGenerationMode] = useState<GenerationMode>("upload");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [generatedVideoUri, setGeneratedVideoUri] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [prompts, setPrompts] = useState<PromptData | null>(null);
  const [musicPrompt, setMusicPrompt] = useState("");
  const [vibeFile, setVibeFile] = useState<File | null>(null);
  const [channelAnimationFile, setChannelAnimationFile] = useState<File | null>(null);

  const [isGeneratingVideo, startGeneratingVideo] = useTransition();
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
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
      videoType: "looped-static",
      budget: [100],
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
      overviewForm.setValue('videoDescription', prompts.videoDescription || '');
    }
  }, [step, prompts, overviewForm]);

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
    const currentBudget = settingsForm.getValues("budget")?.[0] || 1;
    const settingsWithDefaults = {
      ...values,
      budget: values.budget || [currentBudget],
    };
    setSettings(settingsWithDefaults);
    setStep("PROMPT");
  };

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
  };

  const handleGenerateMusic = async (options?: { duration: number; model: string }) => {
    toast({
      variant: "destructive",
      title: "Feature Disabled",
      description: "Music generation is currently disabled.",
    });
  };

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

  return {
    // State
    step,
    generationMode,
    audioFile,
    audioUrl,
    audioDuration,
    generatedVideoUri,
    settings,
    prompts,
    musicPrompt,
    vibeFile,
    channelAnimationFile,
    isGeneratingVideo,
    isGeneratingMusic,
    audioRef,
    
    // Forms
    promptForm,
    settingsForm,
    overviewForm,
    
    // Actions
    setStep,
    setGenerationMode,
    setAudioFile,
    setMusicPrompt,
    setVibeFile,
    setChannelAnimationFile,
    handleAudioFileChange,
    handleSettingsSubmit,
    onPromptSubmit,
    onOverviewSubmit,
    handleGenerateMusic,
    handleReset,
    fileToDataUri,
  };
};
