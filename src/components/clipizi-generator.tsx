"use client";

import * as z from "zod";

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
  videoDescription: z.string().optional(),
  scenes: z.array(SceneSchema).optional(),
});

export const SettingsSchema = z.object({
    videoType: z.enum(["looped-static", "looped-animated", "scenes"], { required_error: "Please select a video type." }),
    budget: z.array(z.number()).optional(),
    user_price: z.number().optional(),
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
    audioTransition: z.string().optional(),
    videoTransition: z.string().optional(),
});

export type Step = "UPLOAD" | "SETTINGS" | "PROMPT" | "OVERVIEW" | "GENERATING" | "PREVIEW";
export type GenerationMode = "upload" | "generate";

export const calculateLoopedBudget = (
    totalDurationSeconds: number, 
    trackCount: number, 
    pricingService: any,
    reuseVideo: boolean = false,
    videoType: 'looped-static' | 'looped-animated' = 'looped-static'
): number => {
    const totalMinutes = totalDurationSeconds / 60;
    const units = reuseVideo ? 1 : trackCount;
    
    if (videoType === 'looped-static') {
        const price = pricingService.calculateImagePrice(units, totalMinutes, 'clipizi-model');
        return price.credits;
    } else if (videoType === 'looped-animated') {
        const price = pricingService.calculateLoopedAnimationPrice(units, totalMinutes, 'clipizi-model');
        return price.credits;
    }
    
    return 100;
};

export const calculateScenesBudget = (
    totalDurationSeconds: number,
    trackDurations: number[],
    pricingService: any,
    reuseVideo: boolean = false
): number => {
    const totalMinutes = totalDurationSeconds / 60;
    const longestTrackMinutes = Math.max(...trackDurations) / 60;
    const videoDuration = reuseVideo ? longestTrackMinutes : totalMinutes;
    
    const price = pricingService.calculateVideoPrice(videoDuration, 'clipizi-model');
    return price.credits;
};

export const getScenesInfo = (
    totalDurationSeconds: number,
    trackDurations: number[],
    reuseVideo: boolean = false
) => {
    const totalScenes = Math.ceil(totalDurationSeconds / 7.5);
    const numberOfVideos = trackDurations.length || 1;
    const scenesPerVideo = reuseVideo ? totalScenes : Math.ceil(totalScenes / numberOfVideos);
    const actualNumberOfVideos = reuseVideo ? 1 : numberOfVideos;
    
    return {
        scenesPerVideo,
        numberOfVideos: actualNumberOfVideos,
        totalScenes
    };
};
