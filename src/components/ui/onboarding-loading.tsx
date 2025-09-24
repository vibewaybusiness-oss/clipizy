"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Sparkles, Zap, Database, Cloud } from "lucide-react";

interface OnboardingLoadingProps {
  message?: string;
  isVisible: boolean;
}

export function OnboardingLoading({ 
  message = "Setting up your workspace...", 
  isVisible 
}: OnboardingLoadingProps) {
  if (!isVisible) return null;

  const steps = [
    {
      icon: Database,
      text: "Creating your project database",
      delay: 0
    },
    {
      icon: Cloud,
      text: "Setting up cloud storage",
      delay: 500
    },
    {
      icon: Music,
      text: "Preparing audio processing",
      delay: 1000
    },
    {
      icon: Sparkles,
      text: "Initializing AI features",
      delay: 1500
    },
    {
      icon: Zap,
      text: "Almost ready!",
      delay: 2000
    }
  ];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 bg-card border border-border shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Animated Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center animate-pulse">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-2 rounded-full border-2 border-primary/20 animate-spin">
                  <div className="w-full h-full rounded-full border-2 border-transparent border-t-primary"></div>
                </div>
              </div>
            </div>

            {/* Main Message */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Welcome to Clipizy!
              </h2>
              <p className="text-sm text-muted-foreground">
                {message}
              </p>
            </div>

            {/* Animated Steps */}
            <div className="space-y-3">
              {steps.map((step, index) => (
                <OnboardingStep
                  key={index}
                  icon={step.icon}
                  text={step.text}
                  delay={step.delay}
                />
              ))}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full animate-pulse"></div>
            </div>

            {/* Encouraging Message */}
            <p className="text-xs text-muted-foreground">
              This only happens once! Your workspace will be ready in a moment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface OnboardingStepProps {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  delay: number;
}

function OnboardingStep({ icon: Icon, text, delay }: OnboardingStepProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`flex items-center space-x-3 transition-all duration-500 ${
      isVisible 
        ? 'opacity-100 translate-x-0' 
        : 'opacity-0 -translate-x-4'
    }`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300 ${
        isVisible 
          ? 'bg-primary text-white' 
          : 'bg-muted text-muted-foreground'
      }`}>
        <Icon className="w-3 h-3" />
      </div>
      <span className={`text-sm transition-colors duration-300 ${
        isVisible 
          ? 'text-foreground' 
          : 'text-muted-foreground'
      }`}>
        {text}
      </span>
    </div>
  );
}
