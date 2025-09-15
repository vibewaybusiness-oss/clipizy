"use client";

import React from 'react';
import { VideoMaker } from './components/VideoMaker';
import { VideoProject, ExportFormat } from './types';
import { createRunPodIntegration } from './integrations/runpod-integration';
import { createOllamaIntegration } from './integrations/ollama-integration';

// Example integration with the main Vibewave project
export function VibewaveVideoEditor() {
  const runpod = createRunPodIntegration();
  const ollama = createOllamaIntegration();

  const handleProjectChange = async (project: VideoProject) => {
    // Auto-save project to backend
    try {
      await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleSave = async (project: VideoProject) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      
      if (response.ok) {
        console.log('Project saved successfully');
      }
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleExport = async (project: VideoProject, format: ExportFormat) => {
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
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleAIAnalysis = async (audioUrl: string, project: VideoProject) => {
    try {
      // Use Ollama for local AI analysis
      const analysis = await ollama.analyzeAudio(audioUrl);
      console.log('Audio analysis:', analysis);
      
      // Generate video prompts based on analysis
      const prompts = await ollama.generateVideoPrompts(project);
      console.log('Generated prompts:', prompts);
    } catch (error) {
      console.error('AI analysis failed:', error);
    }
  };

  return (
    <div className="h-screen">
      <VideoMaker
        onProjectChange={handleProjectChange}
        onSave={handleSave}
        onExport={handleExport}
        className="h-full"
      />
    </div>
  );
}

// Example usage in a Next.js page
export default function VideoEditorPage() {
  return (
    <div className="min-h-screen bg-background">
      <VibewaveVideoEditor />
    </div>
  );
}
