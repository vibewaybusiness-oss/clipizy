"use client";

import React, { useState } from 'react';
import { VideoMaker } from '../components/VideoMaker';
import { VideoProject, ExportFormat } from '../types';
import { Button } from '@/app/dashboard/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/dashboard/components/ui/card';
import { Badge } from '@/app/dashboard/components/ui/badge';
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
  Layers
} from 'lucide-react';

export default function VideoMakerDemo() {
  const [project, setProject] = useState<VideoProject>({
    id: 'demo-project',
    name: 'Demo Video Project',
    description: 'A demonstration of the videomaking interface',
    createdAt: new Date(),
    updatedAt: new Date(),
    duration: 30,
    resolution: { width: 1920, height: 1080, name: '1080p' },
    frameRate: 30,
    clips: [
      {
        id: 'clip-1',
        name: 'Hero Video',
        type: 'video',
        source: '/media/hero_section.mp4',
        startTime: 0,
        duration: 10,
        endTime: 10,
        layer: 0,
        effects: [],
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 },
        opacity: 1
      },
      {
        id: 'clip-2',
        name: 'Background Music',
        type: 'audio',
        source: '/audio/background_music.wav',
        startTime: 0,
        duration: 30,
        endTime: 30,
        layer: 1,
        effects: [],
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 },
        opacity: 1,
        volume: 0.8,
        muted: false
      }
    ],
    audioTracks: [],
    effects: [
      {
        id: 'effect-1',
        name: 'Brightness',
        type: 'brightness',
        enabled: true,
        parameters: { amount: 1.1 }
      }
    ],
    transitions: [],
    settings: {
      resolution: { width: 1920, height: 1080, name: '1080p' },
      frameRate: 30,
      aspectRatio: '16:9',
      backgroundColor: '#000000',
      audioSampleRate: 44100,
      audioChannels: 2
    }
  });

  const handleProjectChange = (updatedProject: VideoProject) => {
    setProject(updatedProject);
    console.log('Project updated:', updatedProject);
  };

  const handleSave = (project: VideoProject) => {
    console.log('Saving project:', project);
    // In a real app, this would save to a database
    alert('Project saved successfully!');
  };

  const handleExport = (project: VideoProject, format: ExportFormat) => {
    console.log('Exporting project:', project, 'with format:', format);
    // In a real app, this would trigger the export process
    alert(`Exporting video as ${format.name}...`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Videomaking Interface Demo</h1>
              <p className="text-muted-foreground">
                Advanced video editing with AI-powered features
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">Demo Mode</Badge>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES OVERVIEW */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Play className="w-4 h-4 mr-2" />
                Real-time Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Smooth playback with real-time rendering and preview controls.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Layers className="w-4 h-4 mr-2" />
                Multi-track Editing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Unlimited layers with drag-and-drop timeline editing.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Professional Effects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Advanced visual and audio effects with real-time preview.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Multiple Export Formats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Export to various formats optimized for different platforms.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* PROJECT INFO */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{project.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <p className="font-medium">{project.duration}s</p>
              </div>
              <div>
                <span className="text-muted-foreground">Resolution:</span>
                <p className="font-medium">{project.settings.resolution.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Frame Rate:</span>
                <p className="font-medium">{project.settings.frameRate} fps</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VIDEO MAKER INTERFACE */}
      <div className="h-screen">
        <VideoMaker
          project={project}
          onProjectChange={handleProjectChange}
          onSave={handleSave}
          onExport={handleExport}
          className="h-full"
        />
      </div>
    </div>
  );
}
