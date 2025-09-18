import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

interface PromptGenerationOptions {
  promptType: 'music' | 'image_prompts' | 'video_prompts';
  categories?: string[];
  instrumental?: boolean;
  source?: 'json';
}

export function usePromptGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generatePrompt = useCallback(async (options: PromptGenerationOptions) => {
    console.log('generatePrompt called, setting isGenerating to true');
    setIsGenerating(true);
    
    try {
      const params = new URLSearchParams({
        prompt_type: options.promptType,
        source: options.source || 'json',
      });
      
      if (options.instrumental !== undefined) {
        params.append('instrumental', options.instrumental.toString());
      }
      
      if (options.categories && options.categories.length > 0) {
        params.append('categories', options.categories.join(','));
      }

      console.log('Making API call to:', `/api/prompts/random?${params.toString()}`);
      const response = await fetch(`/api/prompts/random?${params.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch prompt: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API response received:', data);
      
      if (!data.prompt) {
        throw new Error('No prompt received from server');
      }
      
      return data;
      
    } catch (error) {
      console.error('Error generating prompt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: `Failed to generate prompt: ${errorMessage}`,
      });
      throw error;
    } finally {
      console.log('generatePrompt completed, setting isGenerating to false');
      setIsGenerating(false);
    }
  }, [toast]);

  const generateMusicDescription = useCallback(async (genre?: string, isInstrumental?: boolean) => {
    return generatePrompt({
      promptType: 'music',
      categories: genre ? [genre] : undefined,
      instrumental: isInstrumental || false,
    });
  }, [generatePrompt]);

  const generateVideoPrompt = useCallback(async (videoType: string, genre?: string) => {
    let promptType: 'image_prompts' | 'video_prompts' = 'image_prompts';
    
    if (videoType === 'scenes') {
      promptType = 'video_prompts';
    }
    
    return generatePrompt({
      promptType,
      categories: genre ? [genre] : undefined,
    });
  }, [generatePrompt]);

  return {
    isGenerating,
    generatePrompt,
    generateMusicDescription,
    generateVideoPrompt,
  };
}