"use client";

import { useState, useCallback } from 'react';

interface PromptGenerationOptions {
  genre?: string;
  mood?: string;
  style?: string;
  theme?: string;
  duration?: number;
  sceneCount?: number;
  customPrompt?: string;
}

interface GeneratedPrompt {
  id: string;
  prompt: string;
  type: 'visual' | 'audio' | 'scene';
  confidence: number;
  metadata: {
    genre?: string;
    mood?: string;
    style?: string;
    theme?: string;
  };
  createdAt: Date;
}

interface PromptGenerationState {
  generatedPrompts: GeneratedPrompt[];
  loading: boolean;
  error: string | null;
}

export function usePromptGeneration() {
  const [state, setState] = useState<PromptGenerationState>({
    generatedPrompts: [],
    loading: false,
    error: null,
  });

  const generatePrompt = useCallback(async (options: PromptGenerationOptions) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // TODO: Replace with actual AI prompt generation API
      // For now, generate mock prompts based on options
      const mockPrompts: GeneratedPrompt[] = [];
      
      // Generate visual prompt
      const visualPrompt = generateVisualPrompt(options);
      mockPrompts.push({
        id: `visual-${Date.now()}`,
        prompt: visualPrompt,
        type: 'visual',
        confidence: 0.85,
        metadata: {
          genre: options.genre,
          mood: options.mood,
          style: options.style,
          theme: options.theme,
        },
        createdAt: new Date(),
      });

      // Generate scene prompts if sceneCount is specified
      if (options.sceneCount && options.sceneCount > 1) {
        for (let i = 0; i < options.sceneCount; i++) {
          const scenePrompt = generateScenePrompt(options, i + 1);
          mockPrompts.push({
            id: `scene-${i + 1}-${Date.now()}`,
            prompt: scenePrompt,
            type: 'scene',
            confidence: 0.80,
            metadata: {
              genre: options.genre,
              mood: options.mood,
              style: options.style,
              theme: options.theme,
            },
            createdAt: new Date(),
          });
        }
      }

      setState(prev => ({
        ...prev,
        generatedPrompts: [...prev.generatedPrompts, ...mockPrompts],
        loading: false,
      }));

      return mockPrompts;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to generate prompts',
        loading: false,
      }));
      throw error;
    }
  }, []);

  const generateVisualPrompt = (options: PromptGenerationOptions): string => {
    const parts = [];
    
    if (options.style) {
      parts.push(`${options.style} style`);
    }
    
    if (options.mood) {
      parts.push(`${options.mood} mood`);
    }
    
    if (options.theme) {
      parts.push(`${options.theme} theme`);
    }
    
    if (options.genre) {
      parts.push(`${options.genre} music video`);
    }
    
    if (options.customPrompt) {
      parts.push(options.customPrompt);
    }
    
    // Default fallback
    if (parts.length === 0) {
      parts.push('dynamic music video with vibrant colors and smooth transitions');
    }
    
    return parts.join(', ');
  };

  const generateScenePrompt = (options: PromptGenerationOptions, sceneNumber: number): string => {
    const basePrompt = generateVisualPrompt(options);
    return `Scene ${sceneNumber}: ${basePrompt} with unique visual elements and transitions`;
  };

  const clearPrompts = useCallback(() => {
    setState(prev => ({ ...prev, generatedPrompts: [] }));
  }, []);

  const deletePrompt = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      generatedPrompts: prev.generatedPrompts.filter(prompt => prompt.id !== id),
    }));
  }, []);

  const updatePrompt = useCallback((id: string, updates: Partial<GeneratedPrompt>) => {
    setState(prev => ({
      ...prev,
      generatedPrompts: prev.generatedPrompts.map(prompt =>
        prompt.id === id ? { ...prompt, ...updates } : prompt
      ),
    }));
  }, []);

  const getPromptsByType = useCallback((type: 'visual' | 'audio' | 'scene') => {
    return state.generatedPrompts.filter(prompt => prompt.type === type);
  }, [state.generatedPrompts]);

  return {
    ...state,
    generatePrompt,
    clearPrompts,
    deletePrompt,
    updatePrompt,
    getPromptsByType,
  };
}
