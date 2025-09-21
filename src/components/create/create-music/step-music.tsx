"use client";

import React, { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Upload, X } from "lucide-react";
import { FileUploadArea } from "./file-upload-area";
import { usePromptGeneration } from "@/hooks/use-prompt-generation";
import type { MusicTrack, GenerationMode } from "@/types/music-clip";

interface StepUploadProps {
  musicPrompt: string;
  setMusicPrompt: (prompt: string) => void;
  musicTracksToGenerate: number;
  setMusicTracksToGenerate: (count: number) => void;
  musicGenerationPrice: number;
  onAudioFileChange: (files: File[]) => void;
  onGenerateMusic: (options?: { duration: number; model: string }, isInstrumental?: boolean) => void;
  onOpenGenreSelector: () => void;
  onContinue: () => void;
  canContinue: boolean;
  vibeFile: File | null;
  onVibeFileChange: (file: File | null) => void;
}

export function StepUpload({
  musicPrompt,
  setMusicPrompt,
  musicTracksToGenerate,
  setMusicTracksToGenerate,
  musicGenerationPrice,
  onAudioFileChange,
  onGenerateMusic,
  onOpenGenreSelector,
  onContinue,
  canContinue,
  vibeFile,
  onVibeFileChange
}: StepUploadProps) {
  const musicPromptRef = useRef<HTMLTextAreaElement | null>(null);
  const vibeFileRef = useRef<HTMLInputElement | null>(null);
  const promptGeneration = usePromptGeneration();


  const handleGenerateClick = () => {
    console.log('StepUpload: handleGenerateClick called', { musicPrompt, musicTracksToGenerate });
    onGenerateMusic(undefined, false);
  };

  const handleVibeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    onVibeFileChange(file || null);
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="bg-card border border-border flex-1 flex flex-col">
        <CardContent className="space-y-6 flex flex-col p-6">
          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Multiple Tracks Support</p>
                <p>Create or upload multiple music tracks. Each track can be used to generate individual videos, or you can create a compilation video from all tracks. Tracks are saved in the list on the right.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 flex-1 flex flex-col">
            {/* Upload Area */}
            <FileUploadArea
              onFileChange={onAudioFileChange}
              accept="audio/*"
              multiple={true}
              className=""
            >
              <div className="flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer border-2 border-dashed border-border hover:border-muted-foreground/50 transition-all duration-300 bg-muted/30 hover:bg-muted/50 group">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 mx-auto">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <p className="font-semibold text-foreground text-lg mb-2 text-center">Click to upload</p>
                <p className="text-sm text-foreground/70 text-center">MP3, WAV, M4A, etc.</p>
              </div>
            </FileUploadArea>

            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-border"></div>
              <span className="px-6 text-sm text-foreground/70 font-medium">OR</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            {/* Music Description */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Describe your music</label>
              <div className="relative">
                <textarea
                  ref={musicPromptRef}
                  placeholder='e.g., "Generate a music track, it should be a mystical gamelan ensemble piece at 70 BPM featuring metallophones, resonant gongs, and bamboo flutes. The track should feel ceremonial and meditative."'
                  className="min-h-[120px] resize-none text-base w-full px-3 py-2 pr-14 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  minLength={10}
                  maxLength={500}
                />
                {/* AI Generation Button inside textarea */}
                <div className="absolute top-2 right-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={onOpenGenreSelector}
                    disabled={promptGeneration.isGenerating}
                    className="w-10 h-10 p-0 btn-ai-gradient text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {promptGeneration.isGenerating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {/* Character count */}
                <div className="absolute bottom-2 right-2 text-xs text-foreground/70 bg-background/80 px-1 rounded">
                  {musicPrompt.length} / 500
                </div>
              </div>

            </div>

            {/* Vibe File Upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Vibe Reference (Optional)</label>
              <div className="relative">
                <label htmlFor="vibe-upload" className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 text-sm text-foreground/70 cursor-pointer hover:bg-muted/70 transition-colors border border-border">
                  <Upload className="w-4 h-4"/>
                  <span className="flex-1">{vibeFile ? vibeFile.name : 'Upload a file for the vibe (image, audio, etc.)'}</span>
                  {vibeFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onVibeFileChange(null);
                        if (vibeFileRef.current) {
                          vibeFileRef.current.value = '';
                        }
                      }}
                      className="h-6 w-6 p-0 hover:bg-muted-foreground/20"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                  <input id="vibe-upload" ref={vibeFileRef} type="file" className="hidden" onChange={handleVibeFileChange} />
                </label>
              </div>
            </div>

            <Button
              className="w-full h-12 text-base font-semibold btn-ai-gradient text-white disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGenerateClick}
              disabled={musicPrompt.length < 10 || promptGeneration.isGenerating}
            >
              {promptGeneration.isGenerating ? (
                <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              {promptGeneration.isGenerating ? 'Generating...' : `Generate Music (${musicGenerationPrice} credits)`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
