'use server';

/**
 * @fileOverview AI flow for analyzing an audio track with predefined segments
 * and generating music descriptions, a theme, and descriptions for each segment.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SceneAnalysisSchema = z.object({
  part: z.string().describe("The musical part of this segment (e.g., Intro, Verse, Chorus, Drop, Bridge, Outro)."),
  description: z.string().max(200).describe("A brief description of the musical feel of this segment."),
});

const AnalyzeAudioForScenesInputSchema = z.object({
  audioDataUri: z.string().describe("The audio track's data URI."),
  waveformImageDataUri: z.string().describe("An image of the audio waveform with scene markers."),
  peakTimes: z.array(z.number()).describe("An array of timestamps in seconds indicating the start of each scene."),
});
export type AnalyzeAudioForScenesInput = z.infer<typeof AnalyzeAudioForScenesInputSchema>;

const AnalyzeAudioForScenesOutputSchema = z.object({
  musicDescription: z.string().max(500).describe('A general description of the music style, mood, and instrumentation.'),
  videoTheme: z.string().max(200).describe('A creative visual concept or theme for a music video that fits the audio.'),
  scenes: z.array(SceneAnalysisSchema).describe("An array of analyses for each scene segment, corresponding to the provided peak times."),
});
export type AnalyzeAudioForScenesOutput = z.infer<typeof AnalyzeAudioForScenesOutputSchema>;


export async function analyzeAudioForScenes(input: AnalyzeAudioForScenesInput): Promise<AnalyzeAudioForScenesOutput> {
  return analyzeAudioForScenesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeAudioForScenesPrompt',
  input: {schema: AnalyzeAudioForScenesInputSchema},
  output: {schema: AnalyzeAudioForScenesOutputSchema},
  prompt: `You are an expert music analyst and creative director.

  Analyze the provided audio track and the waveform image which shows the location of important peaks. The peak times are also provided as an array.

  Your task is to:
  1.  Provide a general description of the music's style, mood, and instrumentation.
  2.  Suggest a high-level, creative theme for a music video that would fit this track.
  3.  For each segment of the audio (from one peak to the next), identify its musical part (e.g., Intro, Verse, Chorus, Drop, Bridge, Outro) and provide a brief description of its feel. The number of scenes in your output must exactly match the number of segments defined by the peak times. A track with N peak times has N-1 segments.

  Audio: {{media url=audioDataUri}}
  Waveform Image with Peaks: {{media url=waveformImageDataUri}}
  Peak Timestamps (seconds): [{{#each peakTimes}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}]

  Provide the output in the specified JSON format.
  `,
});

const analyzeAudioForScenesFlow = ai.defineFlow(
  {
    name: 'analyzeAudioForScenesFlow',
    inputSchema: AnalyzeAudioForScenesInputSchema,
    outputSchema: AnalyzeAudioForScenesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
