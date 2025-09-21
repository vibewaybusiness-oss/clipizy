"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Film, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface StepGeneratingProps {
  onBack?: () => void;
  onComplete?: () => void;
  isGenerating?: boolean;
  progress?: number;
  status?: string;
  error?: string;
}

export function StepGenerating({
  onBack,
  onComplete,
  isGenerating = true,
  progress = 0,
  status = "Generating your video...",
  error
}: StepGeneratingProps) {
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isGenerating && !error) {
      const interval = setInterval(() => {
        setCurrentProgress(prev => {
          if (prev >= 100) {
            setIsComplete(true);
            setCurrentStatus("Generation complete!");
            clearInterval(interval);
            return 100;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isGenerating, error]);

  useEffect(() => {
    if (isComplete && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onComplete]);

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="w-8 h-8 text-red-500" />;
    if (isComplete) return <CheckCircle className="w-8 h-8 text-green-500" />;
    return <Loader2 className="w-8 h-8 text-primary animate-spin" />;
  };

  const getStatusColor = () => {
    if (error) return "text-red-500";
    if (isComplete) return "text-green-500";
    return "text-primary";
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="bg-card border border-border shadow-lg flex-1 flex flex-col">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <Film className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Step 5: Generating</CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Creating your amazing video content
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 flex-1 flex flex-col justify-center">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              {getStatusIcon()}
            </div>

            <div className="space-y-2">
              <h3 className={`text-xl font-semibold ${getStatusColor()}`}>
                {error ? "Generation Failed" : currentStatus}
              </h3>
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
            </div>

            {!error && (
              <div className="space-y-4">
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(currentProgress, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {Math.round(Math.min(currentProgress, 100))}% complete
                </p>
              </div>
            )}

            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Processing your audio</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Film className="w-4 h-4" />
                <span>Generating video scenes</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Finalizing output</span>
              </div>
            </div>
          </div>

          {error && onBack && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={onBack}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <span>Try Again</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
