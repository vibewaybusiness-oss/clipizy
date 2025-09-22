"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Film, Loader2 } from "lucide-react";

interface StepNavigationProps {
  currentStep: 1 | 2 | 3 | 4;
  maxReachedStep: 1 | 2 | 3 | 4;
  musicTracksCount: number;
  selectedTrackId: string | null;
  settingsFormValid: boolean;
  promptFormValid: boolean;
  budget: number;
  isNavigating: boolean;
  onBack: (e?: React.MouseEvent) => void;
  onContinue: () => void;
  onSettingsSubmit: () => void;
  onPromptSubmit: () => void;
  onOverviewSubmit: () => void;
  onStepChange: (step: number) => void;
}

export function StepNavigation({
  currentStep,
  maxReachedStep,
  musicTracksCount,
  selectedTrackId,
  settingsFormValid,
  promptFormValid,
  budget,
  isNavigating,
  onBack,
  onContinue,
  onSettingsSubmit,
  onPromptSubmit,
  onOverviewSubmit,
  onStepChange,
}: StepNavigationProps) {
  if (musicTracksCount === 0 || !selectedTrackId || currentStep >= 4) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className={`${currentStep === 4 ? 'grid grid-cols-1 xl:grid-cols-3 gap-6' : 'flex items-center justify-between'}`}>
          <div className={currentStep === 4 ? 'xl:col-span-2' : ''}>
            <Button
              variant="outline"
              onClick={(e) => {
                if (currentStep > 1) {
                  // Go to previous step
                  onStepChange(currentStep - 1);
                } else {
                  // Go back to previous page
                  onBack(e);
                }
              }}
              className="flex items-center space-x-2 btn-secondary-hover"
              disabled={currentStep === 1 && musicTracksCount === 0}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
          </div>

          {currentStep === 4 && (
            <div className="xl:col-span-1">
              <Button
                onClick={onOverviewSubmit}
                className="w-full h-10 text-base font-semibold btn-ai-gradient text-white flex items-center space-x-2"
              >
                <Film className="w-4 h-4" />
                <span>Generate Video ({budget} credits)</span>
              </Button>
            </div>
          )}

          {currentStep === 1 && (
            <Button
              onClick={onContinue}
              className={`flex items-center space-x-2 text-white ${
                musicTracksCount > 0 && selectedTrackId ? 'btn-ai-gradient' : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
              disabled={musicTracksCount === 0 || !selectedTrackId || isNavigating}
            >
              {isNavigating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}

          {currentStep === 2 && (
            <Button
              onClick={onSettingsSubmit}
              className={`flex items-center space-x-2 text-white ${
                settingsFormValid ? 'btn-ai-gradient' : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
              disabled={!settingsFormValid || isNavigating}
            >
              {isNavigating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}

          {currentStep === 3 && (
            <Button
              onClick={onPromptSubmit}
              className={`flex items-center space-x-2 text-white ${
                promptFormValid ? 'btn-ai-gradient' : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
              disabled={!promptFormValid || isNavigating}
            >
              {isNavigating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>Generate Video ({budget} credits)</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
