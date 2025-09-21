"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { MusicAnalysisVisualizer } from './music-analysis-visualizer';
import { StepPrompt } from './step-overview';
import { SegmentList } from './segment-list';

interface OverviewLayoutProps {
  // Form props
  form: any;
  settings: any;
  audioFile: File | null;
  audioDuration: number;
  musicTracks: any[];
  selectedTrackId: string | null;
  onTrackSelect: (track: any) => void;
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
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
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
        <div className="space-y-8">
          
          {/* THREE COLUMN LAYOUT */}
          <div className="grid grid-cols-12 gap-6 w-full h-[800px]">
            
            {/* LEFT COLUMN - SEGMENT LIST (30%) */}
            <div className="col-span-3">
              <SegmentList
                segments={analysisData?.segments || []}
                selectedSegment={selectedSegment}
                onSegmentSelect={setSelectedSegment}
                analysisData={analysisData}
                onSegmentFocus={(segmentIndex: number) => {
                  // Focus on segment in visualizer
                  if (analysisData?.segments?.[segmentIndex]) {
                    const segment = analysisData.segments[segmentIndex];
                    const segmentCenter = segment.start_time + (segment.duration / 2);
                    // This will be handled by the visualizer component
                  }
                }}
              />
            </div>

            {/* CENTER COLUMN - MUSIC ANALYSIS VISUALIZER (60%) */}
            <div className="col-span-7">
              <Card className="bg-card border border-border shadow-lg h-full">
                <CardContent className="p-0 h-full">
                  <div className="h-full overflow-hidden">
                    <MusicAnalysisVisualizer 
                      analysisData={analysisData}
                      audioFile={audioFile}
                      selectedSegment={selectedSegment}
                      onSegmentFocus={(segmentIndex: number) => setSelectedSegment(segmentIndex)}
                      musicDescription={form.watch("videoDescription") || ""}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN - MUSIC TRACKS (10%) */}
            <div className="col-span-2">
              <Card className="bg-card border border-border shadow-lg h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold">Tracks</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {musicTracks.length} track{musicTracks.length !== 1 ? 's' : ''}
                  </p>
                </CardHeader>
                <CardContent className="pt-0 h-full">
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {musicTracks.map((track) => (
                      <div
                        key={track.id}
                        className={`p-2 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedTrackId === track.id
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-primary/50 hover:shadow-sm'
                        }`}
                        onClick={() => onTrackSelect(track)}
                      >
                        <div className="flex flex-col items-center space-y-1">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span className="text-primary font-bold text-xs">♪</span>
                          </div>
                          <div className="text-center">
                            <h4 className="font-semibold text-foreground truncate text-xs">
                              {track.name || 'Track'}
                            </h4>
                            <p className="text-muted-foreground text-xs">
                              {track.duration ? `${Math.floor(track.duration / 60)}:${Math.floor(track.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                            </p>
                          </div>
                          {selectedTrackId === track.id && (
                            <Badge variant="secondary" className="px-1 py-0.5 text-xs">✓</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
