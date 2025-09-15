"use client";

import { useState, useCallback, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/dashboard/components/ui/form";
import { Textarea } from "@/app/dashboard/components/ui/textarea";
import { Button } from "@/app/dashboard/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { PromptSchema, SettingsSchema, Scene } from "@/app/dashboard/components/vibewave-generator";
import { analyzeAudioForScenesAction } from "@/app/actions";
import WaveformVisualizer from "../waveform-visualizer";
import { AnalyzeAudioForScenesOutput } from "@/ai/flows/analyze-audio-for-scenes";

type StepPromptProps = {
  form: UseFormReturn<z.infer<typeof PromptSchema>>;
  settings: z.infer<typeof SettingsSchema> | null;
  audioFile: File | null;
  audioDuration: number;
  onSubmit: (values: z.infer<typeof PromptSchema>) => void;
  onBack: () => void;
  fileToDataUri: (file: File) => Promise<string>;
  toast: (options: { variant?: "default" | "destructive" | null; title: string; description: string }) => void;
};

export function StepPrompt({
  form,
  settings,
  audioFile,
  audioDuration,
  onSubmit,
  onBack,
  fileToDataUri,
  toast,
}: StepPromptProps) {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeAudioForScenesOutput | null>(null);
  const [analysisAccepted, setAnalysisAccepted] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const waveformVisualizerRef = useRef<{ generateWaveformImage: () => string | null }>(null);
  
  const scenes = form.watch('scenes') ?? [];
  const setScenes = useCallback((newScenes: Scene[]) => {
      form.setValue('scenes', newScenes, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  const handleAnalyzeWithAI = async () => {
    if (!audioFile) return;

    setAnalysisAccepted(false);
    setAnalysisResult(null);

    try {
        // Create evenly spaced scenes as a simple alternative to peak detection
        const sceneCount = Math.max(3, Math.min(8, Math.floor(audioDuration / 15))); // 3-8 scenes, ~15s each
        const sceneDuration = audioDuration / sceneCount;
        
        const newScenes = Array.from({ length: sceneCount }, (_, index) => ({
          id: Date.now() + index,
          startTime: index * sceneDuration,
          endTime: (index + 1) * sceneDuration,
          label: `Scene ${index + 1}`,
          description: ``, // AI will fill this
        }));
        setScenes(newScenes);

        // Hook 2: Waveform Image Generation
        const waveformImageDataUri = waveformVisualizerRef.current?.generateWaveformImage();
        if (!waveformImageDataUri) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not generate waveform image.' });
          return;
        }

        // Hook 3: AI Call for Descriptions
        const audioDataUri = await fileToDataUri(audioFile);

        const result = await analyzeAudioForScenesAction({
            audioDataUri,
            waveformImageDataUri,
            peakTimes: newScenes.map(scene => scene.startTime),
        });

        if (result.success && result.analysis) {
            setAnalysisResult(result.analysis);
            form.setValue("musicDescription", result.analysis.musicDescription);
            form.setValue("videoDescription", result.analysis.videoTheme);
            
            // Trigger form validation to update the continue button state
            await form.trigger(["musicDescription", "videoDescription"]);
            
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
      const response = await fetch('/backend/workflows/create_music/generator/ai_random');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Generate music description (always from music_prompts)
      const musicPrompts = data.music_prompts || [];
      const randomMusicPrompt = musicPrompts[Math.floor(Math.random() * musicPrompts.length)];
      
      // Generate video description based on video type
      const videoType = settings?.videoType || 'scenes';
      let videoPrompts = [];
      let videoCategory = '';
      
      if (videoType === 'looped-static') {
        // For static images, use image_prompts
        videoPrompts = data.image_prompts || [];
        videoCategory = 'image_prompts';
      } else if (videoType === 'looped-animated') {
        // For animated loops, use looped_video_prompts
        videoPrompts = data.looped_video_prompts || [];
        videoCategory = 'looped_video_prompts';
      } else {
        // For regular videos (scenes), use video_prompts
        videoPrompts = data.video_prompts || [];
        videoCategory = 'video_prompts';
      }
      
      const randomVideoPrompt = videoPrompts[Math.floor(Math.random() * videoPrompts.length)];
      
      // Set both descriptions
      form.setValue("musicDescription", randomMusicPrompt);
      form.setValue("videoDescription", randomVideoPrompt);
      
      // Trigger form validation to update the continue button state
      await form.trigger(["musicDescription", "videoDescription"]);
      
      toast({
        title: "AI Generated",
        description: `Generated music and ${videoCategory.replace('_', ' ')} descriptions!`,
      });
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="musicDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-white">Music Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='e.g., "An upbeat electronic track with a driving beat and ethereal synth melodies."'
                  className="min-h-[100px] resize-none"
                  maxLength={500}
                  disabled={isGeneratingAI}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="videoDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-white">Video Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={'e.g., "A seamless loop of a record player spinning on a vintage wooden table, with dust particles dancing in a sunbeam."'}
                  className="min-h-[100px] resize-none"
                  maxLength={500}
                  disabled={isGeneratingAI}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center space-x-4">
          <div className="flex-1 h-px bg-border"></div>
          <span className="text-sm text-white">Or</span>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        <Button
          type="button"
          className="w-full h-12 text-base font-semibold btn-ai-gradient"
          onClick={handleGenerateWithAI}
          disabled={isGeneratingAI}
        >
          {isGeneratingAI ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5 mr-2" />
          )}
          Generate with AI
        </Button>
      </form>
    </Form>
  );
}
