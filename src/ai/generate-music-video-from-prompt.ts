'use server';
/**
 * @fileOverview Generates a music video from a text prompt.
 *
 * - generateMusicVideoFromPrompt - A function that generates a music video from a text prompt.
 * - GenerateMusicVideoFromPromptInput - The input type for the generateMusicVideoFromPrompt function.
 * - GenerateMusicVideoFromPromptOutput - The return type for the generateMusicVideoFromPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { MediaPart } from 'genkit';

const GenerateMusicVideoFromPromptInputSchema = z.object({
  prompt: z.string().describe('A text prompt describing the visual theme and style for the music video.'),
});

export type GenerateMusicVideoFromPromptInput = z.infer<typeof GenerateMusicVideoFromPromptInputSchema>;

const GenerateMusicVideoFromPromptOutputSchema = z.object({
  videoDataUri: z.string().describe('The generated music video as a data URI.'),
});

export type GenerateMusicVideoFromPromptOutput = z.infer<typeof GenerateMusicVideoFromPromptOutputSchema>;

export async function generateMusicVideoFromPrompt(input: GenerateMusicVideoFromPromptInput): Promise<GenerateMusicVideoFromPromptOutput> {
  return generateMusicVideoFromPromptFlow(input);
}

const generateMusicVideoFromPromptFlow = ai.defineFlow(
  {
    name: 'generateMusicVideoFromPromptFlow',
    inputSchema: GenerateMusicVideoFromPromptInputSchema,
    outputSchema: GenerateMusicVideoFromPromptOutputSchema,
  },
  async input => {
    let { operation } = await ai.generate({
      model: googleAI.model('veo-2.0-generate-001'),
      prompt: input.prompt,
      config: {
        durationSeconds: 5,
        aspectRatio: '16:9',
      },
    });

    if (!operation) {
      throw new Error('Expected the model to return an operation');
    }

    // Wait until the operation completes. Note that this may take some time, maybe even up to a minute. Design the UI accordingly.
    while (!operation.done) {
      operation = await ai.checkOperation(operation);
      // Sleep for 5 seconds before checking again.
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (operation.error) {
      throw new Error('failed to generate video: ' + operation.error.message);
    }

    const video = operation.output?.message?.content.find((p) => !!p.media);
    if (!video) {
      throw new Error('Failed to find the generated video');
    }

    const videoDataUri = await downloadVideo(video);

    return {
      videoDataUri: videoDataUri,
    };
  }
);

async function downloadVideo(video: MediaPart): Promise<string> {
  const fetch = (await import('node-fetch')).default;
  // Add API key before fetching the video.
  const videoDownloadResponse = await fetch(
    `${video.media!.url}&key=${process.env.GEMINI_API_KEY}`
  );
  if (
    !videoDownloadResponse ||
    videoDownloadResponse.status !== 200 ||
    !videoDownloadResponse.body
  ) {
    throw new Error('Failed to fetch video');
  }

  const buffer = await videoDownloadResponse.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:video/mp4;base64,${base64}`;
}
