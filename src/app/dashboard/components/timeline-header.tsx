"use client";

import React from "react";
import { Check } from "lucide-react";

interface TimelineStep {
  id: number;
  title: string;
  description: string;
}

interface TimelineHeaderProps {
  currentStep: number;
  maxReachedStep: number;
  totalSteps: number;
  onStepClick: (step: number) => void;
}

const steps: TimelineStep[] = [
  { id: 1, title: "Music", description: "Get your music" },
  { id: 2, title: "Settings", description: "Configure options" },
  { id: 3, title: "Analysis", description: "Analyze audio" },
  { id: 4, title: "Overview", description: "Review details" }
];

export function TimelineHeader({ currentStep, maxReachedStep, totalSteps, onStepClick }: TimelineHeaderProps) {
  return (
    <div className="flex items-center space-x-3">
      {/* Timeline Steps */}
      {steps.slice(0, totalSteps).map((step, index) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        const isReached = step.id <= maxReachedStep;
        const isUpcoming = step.id > maxReachedStep;
        
        return (
          <React.Fragment key={step.id}>
            {/* Step Bubble */}
            <div 
              className={`flex flex-col items-center space-y-1 group ${
                isReached ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              }`}
              onClick={() => {
                if (isReached) {
                  onStepClick(step.id);
                }
              }}
            >
              <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? "bg-primary text-primary-foreground hover:bg-primary/80"
                      : isCurrent
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : isReached
                      ? "bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                      : "bg-muted/50 text-muted-foreground/50"
                  }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-semibold">{step.id}</span>
                )}
              </div>
              <div className="text-center">
                <div
                  className={`text-xs font-medium transition-colors duration-300 ${
                    isCurrent 
                      ? "text-foreground" 
                      : isCompleted
                      ? "text-muted-foreground group-hover:text-foreground"
                      : isReached
                      ? "text-muted-foreground group-hover:text-foreground"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {step.title}
                </div>
              </div>
            </div>
            
            {/* Connector Line */}
            {index < totalSteps - 1 && (
              <div
                className={`h-0.5 w-8 transition-colors duration-300 ${
                  step.id <= maxReachedStep ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
