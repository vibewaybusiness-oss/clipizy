"use server";

import { analyzeAudioForDescriptions } from "@/ai/flows/analyze-audio-for-descriptions";
import { analyzeAudioForScenes } from "@/ai/flows/analyze-audio-for-scenes";
import { generateMusicVideoFromPrompt } from "@/ai/flows/generate-music-video-from-prompt";
import { StableAudio2Client } from "../../backendOLD/stable-audio-2/client";
import { z } from "zod";

const AnalyzeAudioSchema = z.object({
  audioDataUri: z.string().startsWith("data:audio/"),
});

export async function analyzeAudioAction(values: z.infer<typeof AnalyzeAudioSchema>) {
  const validatedFields = AnalyzeAudioSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid audio data.",
    };
  }
  
  try {
    const result = await analyzeAudioForDescriptions({ audioDataUri: validatedFields.data.audioDataUri });
    return {
      success: true,
      analysis: result,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Failed to analyze audio. Please try again.",
    };
  }
}

const AnalyzeAudioForScenesSchema = z.object({
    audioDataUri: z.string().startsWith("data:audio/"),
    waveformImageDataUri: z.string().startsWith("data:image/"),
    peakTimes: z.array(z.number()),
});

export async function analyzeAudioForScenesAction(values: z.infer<typeof AnalyzeAudioForScenesSchema>) {
    const validatedFields = AnalyzeAudioForScenesSchema.safeParse(values);
    if (!validatedFields.success) {
        return {
            success: false,
            error: "Invalid input for scene analysis.",
        };
    }
    try {
        const result = await analyzeAudioForScenes(validatedFields.data);
        return {
            success: true,
            analysis: result,
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            error: "Failed to analyze audio for scenes. Please try again.",
        };
    }
}


const GenerateVideoSchema = z.object({
  prompt: z.string().min(1),
});

export async function generateVideoAction(values: z.infer<typeof GenerateVideoSchema>) {
    const validatedFields = GenerateVideoSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            error: "Invalid prompt.",
        };
    }

    try {
        const result = await generateMusicVideoFromPrompt({ prompt: validatedFields.data.prompt });
        return {
            success: true,
            videoDataUri: result.videoDataUri,
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            error: "Failed to generate video. Please try again.",
        };
    }
}

const GenerateMusicSchema = z.object({
  prompt: z.string().min(10, "Music description must be at least 10 characters"),
  duration: z.number().min(5).max(60).default(20),
  output_format: z.enum(["mp3", "wav", "flac"]).default("mp3"),
  model: z.enum(["stable-audio-2.5", "stable-audio-2"]).default("stable-audio-2.5"),
});

export async function generateMusicAction(values: z.infer<typeof GenerateMusicSchema>) {
    const validatedFields = GenerateMusicSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            error: "Invalid music generation parameters.",
        };
    }

    try {
        const apiKey = process.env.STABILITY_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Stability AI API key not configured. Please contact support.",
            };
        }

        const client = new StableAudio2Client({ apiKey });
        const result = await client.textToAudio(validatedFields.data);

        if (!result.success) {
            return {
                success: false,
                error: result.error || "Failed to generate music.",
            };
        }

        if (!result.audio) {
            return {
                success: false,
                error: "No audio data received from API.",
            };
        }

        const audioDataUri = `data:audio/${validatedFields.data.output_format};base64,${result.audio.toString('base64')}`;
        
        return {
            success: true,
            audioDataUri,
            duration: validatedFields.data.duration,
        };
    } catch (error) {
        console.error("Music generation error:", error);
        return {
            success: false,
            error: "Failed to generate music. Please try again.",
        };
    }
}
