"use client";

import React, { useState, useCallback } from 'react';
import { VideoMaker } from '../../../../@videomaking/components/VideoMaker';
import { VideoProject, ExportFormat } from '../../../../@videomaking/types';
import { createRunPodIntegration } from '../../../../@videomaking/integrations/runpod-integration';
import { createOllamaIntegration } from '../../../../@videomaking/integrations/ollama-integration';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Square, 
  Download, 
  Save, 
  Upload,
  Settings,
  Palette,
  Scissors,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';

export default function VideoMakingPage() {
  const [project, setProject] = useState<VideoProject>({
    id: 'new-project',
    name: 'Untitled Project',
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    duration: 30,
    resolution: { width: 1920, height: 1080, name: '1080p' },
    frameRate: 30,
    clips: [],
    audioTracks: [],
    effects: [],
    transitions: [],
    keyframes: [],
    settings: {
      resolution: { width: 1920, height: 1080, name: '1080p' },
      frameRate: 30,
      aspectRatio: '16:9',
      backgroundColor: '#000000',
      audioSampleRate: 44100,
      audioChannels: 2
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Initialize integrations
  const runpod = createRunPodIntegration();
  const ollama = createOllamaIntegration();

  const handleProjectChange = useCallback(async (updatedProject: VideoProject) => {
    setProject(updatedProject);
    
    // Auto-save project to backend
    try {
      await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });
    } catch (error) {
      console.error('Failed to auto-save project:', error);
    }
  }, []);

  const handleSave = useCallback(async (project: VideoProject) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      
      if (response.ok) {
        setLastSaved(new Date());
        console.log('Project saved successfully');
      }
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleExport = useCallback(async (project: VideoProject, format: ExportFormat) => {
    setIsLoading(true);
    try {
      // Use RunPod for AI-powered video generation
      const videoUrl = await runpod.generateVideo(
        `Create a music video with these clips: ${project.clips.map(c => c.name).join(', ')}`,
        project
      );

      // Process with effects
      const processedUrl = await runpod.processVideo(videoUrl, project.effects);

      // Export final video
      const exportUrl = await runpod.exportVideo(project, format);

      console.log('Video exported successfully:', exportUrl);
      alert(`Video exported successfully! Download link: ${exportUrl}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [runpod]);

  const handleAIGeneration = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use Ollama for AI analysis and generation
      const analysis = await ollama.analyzeAudio('/audio/sample.wav');
      console.log('Audio analysis:', analysis);
      
      // Generate video prompts based on analysis
      const prompts = await ollama.generateVideoPrompts(project);
      console.log('Generated prompts:', prompts);
      
      // Generate effects
      const effects = await ollama.generateEffects(project);
      console.log('Generated effects:', effects);
      
      alert('AI analysis completed! Check the console for details.');
    } catch (error) {
      console.error('AI generation failed:', error);
      alert('AI generation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [ollama, project]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* COMPACT HEADER */}
      <div className="border-b bg-muted/30 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Video Editor</h1>
            <p className="text-xs text-muted-foreground">
              Professional video editing with AI-powered features
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {lastSaved && (
              <Badge variant="outline" className="text-xs">
                Saved: {lastSaved.toLocaleTimeString()}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAIGeneration}
              disabled={isLoading}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              AI Generate
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* COMPACT STATS */}
      <div className="px-4 py-2 border-b bg-muted/20 flex-shrink-0">
        <div className="grid grid-cols-4 gap-2">
          <div className="flex items-center space-x-2 text-xs">
            <Layers className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Clips:</span>
            <span className="font-semibold">{project.clips.length}</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <Palette className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Effects:</span>
            <span className="font-semibold">{project.effects.length}</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <Play className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-semibold">{project.duration}s</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <Zap className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Resolution:</span>
            <span className="font-semibold">{project.settings.resolution.name}</span>
          </div>
        </div>
      </div>

      {/* VIDEO MAKER INTERFACE */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <VideoMaker
          project={project}
          onProjectChange={handleProjectChange}
          onSave={handleSave}
          onExport={handleExport}
          className="h-full"
        />
      </div>

      {/* LOADING OVERLAY */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="font-medium">Processing...</p>
                <p className="text-sm text-muted-foreground">Please wait while we process your request</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
