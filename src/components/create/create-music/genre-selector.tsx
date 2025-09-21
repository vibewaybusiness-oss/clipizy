"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";

interface GenreSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGenre: (genre: string, isInstrumental: boolean) => void;
  onGenerateRandom: (isInstrumental: boolean) => void;
}

const GENRES = [
  "Ambient",
  "Synthwave / Electronic",
  "Reggae / Dub / Ska",
  "Hip Hop / Rap",
  "Trap",
  "Lo-Fi / House",
  "Classical / Orchestral",
  "Rock / Metal / Punk",
  "Jazz / Blues",
  "World / Folk / Traditional",
  "Latin / Tango / Flamenco",
  "Pop / Indie / Folk",
  "Techno / EDM / Club",
  "World / Regional",
  "Cinematic / Trailer / Score",
  "Children / Playful",
  "Marches / Traditional Ensembles"
];

export function GenreSelector({ isOpen, onClose, onSelectGenre, onGenerateRandom }: GenreSelectorProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(false); // Set to false immediately when popup opens
      setIsGenerating(false); // Reset generating state when popup opens
    }
  }, [isOpen]);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGenreClick = async (genre: string) => {
    console.log('DEBUG: Genre selector - isInstrumental:', isInstrumental);
    setIsGenerating(true);
    try {
      await onSelectGenre(genre, isInstrumental);
      onClose();
    } catch (error) {
      console.error('Error generating prompt:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRandomGenerate = async () => {
    console.log('DEBUG: Random generate - isInstrumental:', isInstrumental);
    setIsGenerating(true);
    try {
      await onGenerateRandom(isInstrumental);
      onClose();
    } catch (error) {
      console.error('Error generating prompt:', error);
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-2xl  max-w-4xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Select Music Genre</h2>
                <p className="text-sm text-muted-foreground">Choose a genre to generate a music description</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">

          {/* Instrumental Checkbox */}
          <div className="mb-6">
            <div
              className="flex items-center space-x-4 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors duration-200 group cursor-pointer"
              onClick={() => {
                console.log('DEBUG: Checkbox clicked - current isInstrumental:', isInstrumental, 'new value:', !isInstrumental);
                setIsInstrumental(!isInstrumental);
              }}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                isInstrumental
                  ? 'bg-muted-foreground border-muted-foreground'
                  : 'border-muted-foreground'
              }`}>
                {isInstrumental && (
                  <svg className="w-3 h-3 text-background" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground cursor-pointer">
                  Generate instrumental music (no lyrics)
                </label>
              </div>
            </div>
          </div>

          {/* Random Generate Button */}
          <div className="mb-6">
            <Button
              onClick={handleRandomGenerate}
              className="w-full h-12 text-base font-semibold btn-ai-gradient text-white flex items-center justify-center space-x-2"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <div className="w-5 h-5 animate-spin border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              <span>{isGenerating ? 'Generating...' : 'Generate Random Genre'}</span>
            </Button>
          </div>

          {/* Genre Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {GENRES.map((genre, index) => (
              <div
                key={genre}
                className="relative"
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                <Button
                  variant="outline"
                  onClick={() => handleGenreClick(genre)}
                  disabled={isGenerating}
                  className={`w-full h-12 text-sm font-medium transition-all duration-300 hover:scale-[1.02]  hover:bg-primary/5 hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isAnimating ? 'animate-fade-in-up' : ''
                  }`}
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 animate-spin border-2 border-muted-foreground border-t-transparent rounded-full" />
                  ) : (
                    <span className="truncate">{genre}</span>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
