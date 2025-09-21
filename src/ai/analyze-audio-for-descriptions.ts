'use server';

/**
 * @fileOverview AI flow for analyzing an audio track and generating music and video descriptions.
 *
 * - analyzeAudioForDescriptions - A function that analyzes audio and returns descriptions.
 * - AnalyzeAudioForDescriptionsInput - The input type for the analyzeAudioForDescriptions function.
 * - AnalyzeAudioForDescriptionsOutput - The return type for the analyzeAudioForDescriptions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeAudioForDescriptionsInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio track's data URI, including MIME type and Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeAudioForDescriptionsInput = z.infer<typeof AnalyzeAudioForDescriptionsInputSchema>;

const AnalyzeAudioForDescriptionsOutputSchema = z.object({
  musicDescription: z.string().max(500).describe('A description of the music style, mood, and instrumentation. No more than 500 characters.'),
  videoDescription: z.string().max(200).describe('A creative visual concept for a music video that fits the audio. No more than 200 characters.'),
});
export type AnalyzeAudioForDescriptionsOutput = z.infer<typeof AnalyzeAudioForDescriptionsOutputSchema>;

export async function analyzeAudioForDescriptions(input: AnalyzeAudioForDescriptionsInput): Promise<AnalyzeAudioForDescriptionsOutput> {
  return analyzeAudioForDescriptionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeAudioForDescriptionsPrompt',
  input: {schema: AnalyzeAudioForDescriptionsInputSchema},
  output: {schema: AnalyzeAudioForDescriptionsOutputSchema},
  prompt: `You are an expert music analyst and creative director.

  Analyze the provided audio track and generate two things:
  1. A concise description of the music's style, mood, and instrumentation.
  2. A creative and concise concept for a music video that would visually represent the audio. The concept should describe the visuals, style, and pacing.

  Audio: {{media url=audioDataUri}}

  Provide the descriptions in the specified output format. The video description should be less than 200 characters.`,
});

const analyzeAudioForDescriptionsFlow = ai.defineFlow(
  {
    name: 'analyzeAudioForDescriptionsFlow',
    inputSchema: AnalyzeAudioForDescriptionsInputSchema,
    outputSchema: AnalyzeAudioForDescriptionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
