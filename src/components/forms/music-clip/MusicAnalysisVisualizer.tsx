"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Music, Clock, Volume2 } from "lucide-react";

interface MusicAnalysisData {
  analysis_timestamp?: number;
  [key: string]: any;
}

interface MusicAnalysisVisualizerProps {
  analysisData: MusicAnalysisData;
  audioFile: File | null;
  className?: string;
}

export function MusicAnalysisVisualizer({
  analysisData,
  audioFile,
  className = ""
}: MusicAnalysisVisualizerProps) {
  if (!analysisData) {
    return (
      <div className={`p-4 text-center text-muted-foreground ${className}`}>
        <Music className="w-8 h-8 mx-auto mb-2" />
        <p>No analysis data available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Music Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Duration</span>
              </div>
              <p className="text-2xl font-bold">
                {analysisData.duration ? `${Math.round(analysisData.duration)}s` : 'N/A'}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                <span className="text-sm font-medium">BPM</span>
              </div>
              <p className="text-2xl font-bold">
                {analysisData.bpm || analysisData.tempo || 'N/A'}
              </p>
            </div>
          </div>

          {analysisData.genre && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Genre</span>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(analysisData.genre) 
                  ? analysisData.genre.map((g: string, index: number) => (
                      <Badge key={index} variant="secondary">{g}</Badge>
                    ))
                  : <Badge variant="secondary">{analysisData.genre}</Badge>
                }
              </div>
            </div>
          )}

          {analysisData.mood && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Mood</span>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(analysisData.mood)
                  ? analysisData.mood.map((m: string, index: number) => (
                      <Badge key={index} variant="outline">{m}</Badge>
                    ))
                  : <Badge variant="outline">{analysisData.mood}</Badge>
                }
              </div>
            </div>
          )}

          {analysisData.key && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Key</span>
              <Badge variant="secondary">{analysisData.key}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
