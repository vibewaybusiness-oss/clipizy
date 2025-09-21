"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { MusicAnalysisVisualizer } from './music-analysis-visualizer';
import { StepPrompt } from './step-overview';

interface OverviewLayoutProps {
  // Form props
  form: any;
  settings: any;
  audioFile: File | null;
  audioDuration: number;
  musicTracks: any[];
  selectedTrackId: string | null;
  onTrackSelect: (trackId: string) => void;
  onSubmit: (values: any, descriptions: any, trackGenres: any) => void;
  onBack: () => void;
  fileToDataUri: (file: File) => Promise<string>;
  toast: any;
  onTrackDescriptionsUpdate: (descriptions: Record<string, string>) => void;
  onSharedDescriptionUpdate: (description: string) => void;
  onPromptsUpdate: (prompts: any) => void;
  trackDescriptions: Record<string, string>;
  analysisData: any;
  
  // Navigation props
  canContinue: boolean;
  onContinue: () => void;
  continueText: string;
}

export function OverviewLayout({
  form,
  settings,
  audioFile,
  audioDuration,
  musicTracks,
  selectedTrackId,
  onTrackSelect,
  onSubmit,
  onBack,
  fileToDataUri,
  toast,
  onTrackDescriptionsUpdate,
  onSharedDescriptionUpdate,
  onPromptsUpdate,
  trackDescriptions,
  analysisData,
  canContinue,
  onContinue,
  continueText
}: OverviewLayoutProps) {
  return (
    <div className="min-h-screen bg-background w-full">
      {/* HEADER */}
      <div className="border-b border-border bg-card w-full">
        <div className="w-full px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard/create"
                className="flex items-center space-x-2 text-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Create</span>
              </Link>
            </div>
            
            <div className="flex-1 flex justify-center">
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-foreground">1</span>
                  </div>
                  <span className="text-sm font-medium text-primary">Music</span>
                </div>
                <div className="w-16 h-0.5 bg-primary"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-foreground">2</span>
                  </div>
                  <span className="text-sm font-medium text-primary">Video</span>
                </div>
                <div className="w-16 h-0.5 bg-primary"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-foreground">3</span>
                  </div>
                  <span className="text-sm font-medium text-primary">Settings</span>
                </div>
                <div className="w-16 h-0.5 bg-primary"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-foreground">4</span>
                  </div>
                  <span className="text-sm font-medium text-primary">Overview</span>
                </div>
              </div>
            </div>
            
            <Badge className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg flex items-center space-x-2">
              <span>♪</span>
              <span>Music Clip Creator</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="w-full px-8 py-12">
        <div className="space-y-12">
          
          {/* TWO COLUMN LAYOUT */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 w-full">
            
            {/* LEFT COLUMN - VIDEO DESCRIPTION FORM */}
            <div className="space-y-8">
              <Card className="bg-card border border-border shadow-lg">
                <CardHeader className="pb-6">
                  <CardTitle className="text-3xl font-bold">Video Description</CardTitle>
                  <p className="text-lg text-muted-foreground">
                    Provide a detailed description of how you want your music video to look
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <StepPrompt
                    form={form}
                    settings={settings}
                    audioFile={audioFile}
                    audioDuration={audioDuration}
                    musicTracks={musicTracks}
                    selectedTrackId={selectedTrackId}
                    onTrackSelect={onTrackSelect}
                    onSubmit={onSubmit}
                    onBack={onBack}
                    fileToDataUri={fileToDataUri}
                    toast={toast}
                    onTrackDescriptionsUpdate={onTrackDescriptionsUpdate}
                    onSharedDescriptionUpdate={onSharedDescriptionUpdate}
                    onPromptsUpdate={onPromptsUpdate}
                    trackDescriptions={trackDescriptions}
                    analysisData={null} // We'll show this separately
                  />
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN - MUSIC TRACKS */}
            <div className="space-y-8">
              <Card className="bg-card border border-border shadow-lg">
                <CardHeader className="pb-6">
                  <CardTitle className="text-3xl font-bold">Music Tracks</CardTitle>
                  <p className="text-lg text-muted-foreground">
                    {musicTracks.length} track{musicTracks.length !== 1 ? 's' : ''} loaded
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-6">
                    {musicTracks.map((track) => (
                      <div
                        key={track.id}
                        className={`p-6 rounded-xl border cursor-pointer transition-all duration-200 ${
                          selectedTrackId === track.id
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-primary/50 hover:shadow-sm'
                        }`}
                        onClick={() => onTrackSelect(track.id)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <span className="text-primary font-bold text-lg">♪</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate text-lg">
                              {track.name || 'Untitled Track'}
                            </h4>
                            <p className="text-muted-foreground">
                              {track.duration ? `${Math.floor(track.duration / 60)}:${Math.floor(track.duration % 60).toString().padStart(2, '0')}` : 'Unknown duration'}
                            </p>
                          </div>
                          {selectedTrackId === track.id && (
                            <Badge variant="secondary" className="px-3 py-1">Selected</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* MUSIC ANALYSIS VISUALIZATION - FULL WIDTH */}
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-foreground">Music Analysis</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                AI-powered analysis of your music track to optimize video generation
              </p>
            </div>
            
            <div className="w-full bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
              <MusicAnalysisVisualizer 
                analysisData={analysisData}
                audioFile={audioFile}
              />
            </div>
          </div>

          {/* BOTTOM NAVIGATION */}
          <div className="flex items-center justify-between pt-12 border-t border-border">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center space-x-2 px-6 py-3 text-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </Button>
            
            <Button
              onClick={onContinue}
              disabled={!canContinue}
              className={`flex items-center space-x-2 text-white px-8 py-3 text-lg font-semibold ${
                canContinue ? 'btn-ai-gradient' : 'bg-muted text-foreground/50 cursor-not-allowed'
              }`}
            >
              <span>{continueText}</span>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
