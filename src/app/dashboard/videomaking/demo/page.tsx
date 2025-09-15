"use client";

import React, { useState } from 'react';
import { VideoMaker } from '../../../../../@videomaking/components/VideoMaker';
import { VideoProject } from '../../../../../@videomaking/types';
import { Button } from '@/app/dashboard/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/dashboard/components/ui/card';
import { Badge } from '@/app/dashboard/components/ui/badge';
import { 
  Play, 
  Music, 
  Video, 
  Zap,
  ArrowRight,
  Info
} from 'lucide-react';

export default function VideoMakingDemoPage() {
  const [project, setProject] = useState<VideoProject>({
    id: 'demo-project',
    name: 'Auto Video Generator Demo',
    description: 'Automatically generate videos based on music analysis',
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

  const [isGenerating, setIsGenerating] = useState(false);

  const handleProjectChange = (updatedProject: VideoProject) => {
    setProject(updatedProject);
  };

  const handleSave = (project: VideoProject) => {
    console.log('Saving project:', project);
  };

  const handleExport = (project: VideoProject, format: any) => {
    console.log('Exporting project:', project, format);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* HEADER */}
      <div className="border-b bg-muted/30 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center space-x-2">
              <Zap className="w-6 h-6 text-primary" />
              <span>Auto Video Generator</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-powered video creation with music synchronization
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              Demo Mode
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGenerating(!isGenerating)}
              disabled={isGenerating}
            >
              <Play className="w-4 h-4 mr-1" />
              {isGenerating ? 'Generating...' : 'Start Demo'}
            </Button>
          </div>
        </div>
      </div>

      {/* FEATURES OVERVIEW */}
      <div className="px-4 py-3 border-b bg-muted/20 flex-shrink-0">
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center space-x-2 text-sm">
            <Music className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Music Analysis:</span>
            <span className="font-semibold">Peak Detection</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Video className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Video Segments:</span>
            <span className="font-semibold">Auto-Generated</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <ArrowRight className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Playback:</span>
            <span className="font-semibold">Forward + Reverse</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">AI Features:</span>
            <span className="font-semibold">Smart Sync</span>
          </div>
        </div>
      </div>

      {/* MAIN INTERFACE */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <VideoMaker
          project={project}
          onProjectChange={handleProjectChange}
          onSave={handleSave}
          onExport={handleExport}
          className="h-full"
        />
      </div>

      {/* INFO PANEL */}
      <div className="px-4 py-2 border-t bg-muted/20 flex-shrink-0">
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Info className="w-3 h-3" />
                <span>How it works:</span>
              </div>
              <span>1. Load music analysis → 2. Generate video segments → 3. Add reverse playback → 4. Export final video</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}