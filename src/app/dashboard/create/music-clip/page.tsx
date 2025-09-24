"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { MusicLogo } from "@/components/common/music-logo";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMusicClipOrchestrator } from "@/hooks";
import { StepUpload } from "@/components/forms/music-clip/StepMusic";
import { StepVideo } from "@/components/forms/music-clip/StepVideo";
import { OverviewLayout } from "@/components/forms/music-clip/StepOverview";
import { GenreSelector } from "@/components/forms/music-clip/GenreSelector";
import { TimelineHeader } from "@/components/common/timeline-header";
import { TrackCard } from "@/components/forms/music-clip/TrackCard";
import { formatDuration, getTotalDuration, fileToDataUri } from "@/utils/music-clip-utils";
import { useToast } from "@/hooks/ui/use-toast";
import { ClipizyLoading } from "@/components/ui/clipizy-loading";
import type { MusicTrack } from "@/types/domains/music";

const MusicClipPage = React.memo(function MusicClipPage() {
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get('projectId');
  const isNewProject = searchParams.get('new') !== null;
  const { toast } = useToast();

  // Use the orchestrator hook to manage all the complex logic
  const {
    // State
    user,
    authLoading,
    projectId,
    musicTracks,
    musicClipState,
    audioPlayback,
    dragAndDrop,
    musicAnalysis,
    promptGeneration,
    pricingService,
    projectManagement,
    trackValidity,
    musicAnalysisData,
    isLoadingAnalysisData,
    musicGenerationPrice,
    
    // Actions
    handleGenerateMusic,
    handleGenerateMusicPrompt,
    handleGenreSelect,
    handleRandomGenerate,
    handleAudioFileChange,
    handleTrackSelect,
    handlePlayPause,
    handleTrackRemove,
    handleTrackReorder,
    handleSettingsSubmit,
    handleReuseVideoToggle,
    onPromptSubmit,
    onPromptSubmitForm,
    onOverviewSubmit,
    handleContinue,
    handleBack,
    handleTrackDescriptionsUpdate,
    handleSharedDescriptionUpdate,
    loadAnalysisData,
    
    // Computed values
    areAllTracksValid,
    canContinue,
    continueText
  } = useMusicClipOrchestrator({
    urlProjectId,
    isNewProject
  });

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClipizyLoading message="Loading..." size="lg" />
      </div>
    );
  }

  // Don't render the main content if user is not authenticated
  if (!user) {
    return null;
  }

  // Step 4 is now handled in the main layout below

  return (
    <>

      <div className="h-screen bg-background flex flex-col">
        {/* HEADER */}
        <div className="border-b border-border bg-card flex-shrink-0">
          <div className="max-w-7xl mx-auto px-8 py-2">
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
                <TimelineHeader
                  currentStep={musicClipState.state.currentStep}
                  maxReachedStep={musicClipState.state.maxReachedStep}
                  totalSteps={3}
                  onStepClick={(step) => {
                    if (step <= musicClipState.state.maxReachedStep) {
                      musicClipState.actions.setCurrentStep(step as 1 | 2 | 3);
                    }
                  }}
                />
              </div>

              <div className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg flex items-center space-x-2">
                <MusicLogo className="w-4 h-4" />
                <span>Music Clip Creator</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 w-full min-h-0 flex flex-col">
          <div className={`flex-1 flex flex-col space-y-4 min-h-0 mx-auto px-8 py-4 w-full ${
            musicClipState.state.currentStep === 3 ? '' : 'max-w-7xl'
          }`}>
            <div className={`flex-1 grid gap-6 min-h-0 w-full items-stretch ${
              musicClipState.state.currentStep === 3 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-4'
            }`}>
              {/* LEFT SIDE - STEP CONTENT */}
              <div className={`flex flex-col h-full min-h-0 ${
                musicClipState.state.currentStep === 3 ? 'col-span-1' : 'col-span-1 lg:col-span-3'
              }`}>
                {musicClipState.state.currentStep === 1 && (
                  <div className="flex flex-col h-full">
                    <Card className="bg-card border border-border flex-1 flex flex-col">
                      <CardContent className="flex-1 flex flex-col p-6">
                        <StepUpload
                          musicPrompt={musicClipState.state.musicPrompt}
                          setMusicPrompt={musicClipState.actions.setMusicPrompt}
                          musicTracksToGenerate={musicClipState.state.musicTracksToGenerate}
                          setMusicTracksToGenerate={musicClipState.actions.setMusicTracksToGenerate}
                          musicGenerationPrice={musicGenerationPrice}
                          onAudioFileChange={handleAudioFileChange}
                          onGenerateMusic={handleGenerateMusic}
                          onOpenGenreSelector={() => musicClipState.actions.setShowGenreSelector(true)}
                          onContinue={musicClipState.actions.handleContinue}
                          canContinue={musicTracks.musicTracks.length > 0 && musicTracks.selectedTrackId !== null}
                          vibeFile={musicClipState.state.vibeFile}
                          onVibeFileChange={musicClipState.actions.setVibeFile}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {musicClipState.state.currentStep === 2 && (
                  <div className="flex flex-col h-full">
                    <Card className="bg-card border border-border flex-1 flex flex-col">
                      <CardContent className="flex-1 flex flex-col p-6">
                        <StepVideo
                          form={musicClipState.forms.settingsForm}
                          audioDuration={musicClipState.state.audioDuration}
                          totalDuration={getTotalDuration(musicTracks.musicTracks)}
                          trackCount={musicTracks.musicTracks.length}
                          trackDurations={musicTracks.musicTracks.map((track: any) => track.duration)}
                          onSubmit={handleSettingsSubmit}
                          onBack={() => musicClipState.actions.setCurrentStep(1)}
                          hideNavigation={true}
                          onReuseVideoToggle={handleReuseVideoToggle}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {musicClipState.state.currentStep === 3 && (
                  <div className="flex flex-col h-full w-full">
                    <OverviewLayout
                      form={musicClipState.forms.overviewForm}
                      audioFile={musicClipState.state.audioFile}
                      audioDuration={musicClipState.state.audioDuration}
                      musicTracks={musicTracks.musicTracks}
                      selectedTrackId={musicClipState.state.selectedTrackId}
                      onTrackSelect={(track: MusicTrack) => musicClipState.actions.setSelectedTrackId(track.id)}
                      settings={musicClipState.state.settings}
                      onSubmit={onOverviewSubmit}
                      onBack={() => musicClipState.actions.setCurrentStep(2)}
                      fileToDataUri={fileToDataUri}
                      toast={toast}
                      canContinue={true}
                      onContinue={() => musicClipState.actions.setCurrentStep(4)}
                      continueText="Continue"
                      fullWidth={true}
                    />
                  </div>
                )}
              </div>

              {/* RIGHT SIDE - TRACKS PANEL */}
              <div
                className={`hidden lg:flex flex-col h-full lg:col-span-1 min-h-0 transition-all duration-300 ${
                  musicClipState.state.currentStep === 3 ? 'hidden' : ''
                } ${dragAndDrop.state.isDragOver ? 'scale-[1.02]' : ''}`}
                onDragEnter={(e) => dragAndDrop.actions.handleDragEnter(e, dragAndDrop.state.isTrackReordering)}
                onDragOver={(e) => dragAndDrop.actions.handleDragOver(e, dragAndDrop.state.isTrackReordering)}
                onDragLeave={(e) => dragAndDrop.actions.handleDragLeave(e, dragAndDrop.state.isTrackReordering)}
                onDrop={(e) => {
                  dragAndDrop.actions.handleDrop(e, dragAndDrop.state.isTrackReordering);
                  
                  const files = Array.from(e.dataTransfer.files);
                  const audioFiles = files.filter(file => file.type.startsWith('audio/'));
                  
                  if (audioFiles.length === 0) {
                    console.log('Invalid files - please drop audio files only');
                    return;
                  }
                  
                  handleAudioFileChange(audioFiles);
                }}
              >
                <Card className={`bg-card border flex-1 flex flex-col min-h-0 transition-all duration-300 ${
                  dragAndDrop.state.isDragOver
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border'
                }`}>
                  <CardContent className="flex-1 flex flex-col min-h-0 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Music className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            Music Tracks
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {musicTracks.musicTracks.length} track{musicTracks.musicTracks.length !== 1 ? 's' : ''} loaded
                          </p>
                        </div>
                      </div>
                      {musicTracks.musicTracks.length > 0 && (
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Total Duration</div>
                          <div className="text-sm font-semibold text-primary">
                            {formatDuration(getTotalDuration(musicTracks.musicTracks))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-h-0">
                      {musicTracks.musicTracks.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                              <Music className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                No tracks loaded
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Upload or generate music to get started
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 h-full overflow-y-auto">
                          {musicTracks.musicTracks.map((track: any) => (
                            <TrackCard
                              key={track.id}
                              track={track}
                              isSelected={musicTracks.selectedTrackIds.includes(track.id)}
                              isPlaying={audioPlayback.currentlyPlayingId === track.id && audioPlayback.isPlaying}
                              hasDescription={!!trackValidity[track.id]}
                              onSelect={handleTrackSelect}
                              onPlayPause={handlePlayPause}
                              onRemove={handleTrackRemove}
                              selectionIndex={musicTracks.selectedTrackIds.includes(track.id) ? musicTracks.selectedTrackIds.indexOf(track.id) : undefined}
                              totalSelected={musicTracks.selectedTrackIds.length}
                              onDragStart={(e) => dragAndDrop.actions.handleDragStart(e, track.id)}
                              onDragOver={(e) => dragAndDrop.actions.handleTrackDragOver(e, track.id)}
                              onDrop={(e) => {
                                const result = dragAndDrop.actions.handleTrackDrop(e, track.id);
                                if (result && 'fromId' in result) {
                                  handleTrackReorder(result.fromId, result.toId, result.position);
                                }
                              }}
                              onDragEnd={dragAndDrop.actions.handleDragEnd}
                              isDragging={dragAndDrop.state.draggedTrackId === track.id}
                              isDragOver={dragAndDrop.state.dragOverTrackId === track.id}
                              dropPosition={dragAndDrop.state.dragOverTrackId === track.id ? dragAndDrop.state.dropPosition : null}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

          </div>
        </div>

        {/* NAVIGATION BUTTONS - FULL WIDTH */}
        {(() => {
          // Show navigation buttons if we have tracks OR if we're continuing an existing project
          const hasTracks = musicTracks.musicTracks.length > 0 && musicTracks.selectedTrackId;
          const isContinuingProject = projectManagement.state.currentProjectId && !isNewProject;
          const shouldShow = (hasTracks || isContinuingProject) && musicClipState.state.currentStep <= 4;
          
          console.log('Button state check:', {
            tracksLength: musicTracks.musicTracks.length,
            selectedTrackId: musicTracks.selectedTrackId,
            currentStep: musicClipState.state.currentStep,
            hasTracks,
            isContinuingProject,
            currentProjectId: projectManagement.state.currentProjectId,
            isNewProject,
            shouldShow
          });
          return shouldShow;
        })() && (
          <div className="flex-shrink-0 bg-background border-t border-border w-full">
            <div className="max-w-7xl mx-auto px-8 py-4">
              <div className="flex items-center justify-between w-full">
                  <Button
                    variant="outline"
                    onClick={(e: any) => {
                      if (musicClipState.state.currentStep > 1) {
                        musicClipState.actions.handleBack();
                      } else {
                        handleBack(e);
                      }
                    }}
                    className="h-10 flex items-center justify-center space-x-2 text-foreground border-border hover:bg-muted hover:text-foreground"
                    disabled={musicClipState.state.currentStep === 1 && musicTracks.musicTracks.length === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </Button>

                  {musicClipState.state.currentStep === 1 && (() => {
                    // Allow continue if we have tracks OR if we're continuing an existing project
                    // For continuing projects, we don't need selectedTrackId to be set
                    const hasTracks = musicTracks.musicTracks.length > 0;
                    const hasSelectedTrack = musicTracks.selectedTrackId !== null;
                    const isContinuingProject = projectManagement.state.currentProjectId && !isNewProject;
                    const isDisabled = !hasTracks && !isContinuingProject;
                    
                    console.log('Step 1 button state:', {
                      tracksLength: musicTracks.musicTracks.length,
                      selectedTrackId: musicTracks.selectedTrackId,
                      hasTracks,
                      hasSelectedTrack,
                      isContinuingProject,
                      currentProjectId: projectManagement.state.currentProjectId,
                      isNewProject,
                      isDisabled
                    });
                    
                    return (
                      <Button
                        onClick={handleContinue}
                        className={`flex items-center space-x-2 text-white ${
                          (hasTracks && hasSelectedTrack) || isContinuingProject ? 'btn-ai-gradient' : 'bg-muted text-foreground/50 cursor-not-allowed'
                        }`}
                        disabled={isDisabled}
                      >
                        <span>Save & Continue</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    );
                  })()}

                  {musicClipState.state.currentStep === 2 && (() => {
                    const isValid = musicClipState.forms.settingsForm.formState.isValid;
                    const errors = musicClipState.forms.settingsForm.formState.errors;
                    const values = musicClipState.forms.settingsForm.getValues();
                    
                    // Check if we have the required videoType field
                    const hasRequiredFields = values.videoType && values.videoType !== '';
                    
                    console.log('Step 2 button state:', {
                      isValid,
                      hasRequiredFields,
                      errors,
                      values,
                      videoType: values.videoType
                    });
                    
                    // Use hasRequiredFields as fallback if form validation is slow
                    const canContinue = isValid || hasRequiredFields;
                    
                    return (
                      <Button
                        onClick={() => musicClipState.forms.settingsForm.handleSubmit(handleSettingsSubmit)()}
                        className={`flex items-center space-x-2 text-white ${
                          canContinue ? 'btn-ai-gradient' : 'bg-muted text-foreground/50 cursor-not-allowed'
                        }`}
                        disabled={!canContinue}
                      >
                        <span>Save & Continue</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    );
                  })()}

                  {musicClipState.state.currentStep === 3 && (
                    <Button
                      onClick={async () => {
                        console.log('=== MUSIC CLIP STEP 3 CONTINUE BUTTON CLICKED ===');
                        
                        // Set navigation loading state
                        musicClipState.actions.setIsNavigating(true);

                        // Navigate to step 4 (analysis was already done in step 2)
                        console.log('Navigating to step 4 (analysis already completed in step 2)...');
                        musicClipState.actions.setCurrentStep(4);
                        
                        // Reset navigation state after a short delay
                        setTimeout(() => {
                          musicClipState.actions.setIsNavigating(false);
                        }, 500);
                      }}
                      className="flex items-center space-x-2 text-white btn-ai-gradient"
                      disabled={musicClipState.state.isGeneratingVideo || musicClipState.state.isNavigating}
                    >
                      {musicClipState.state.isNavigating ? (
                        <>
                          <ClipizyLoading message="" size="sm" />
                        </>
                      ) : (
                        <>
                          <span>Save & Continue</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  )}

                  {musicClipState.state.currentStep === 4 && (
                    <Button
                      onClick={() => {
                        console.log('=== MUSIC CLIP STEP 4 CONTINUE BUTTON CLICKED ===');
                        const formValues = musicClipState.forms.overviewForm.getValues();
                        onOverviewSubmit(formValues);
                      }}
                      className="flex items-center space-x-2 text-white btn-ai-gradient"
                      disabled={musicClipState.state.isGeneratingVideo || musicClipState.state.isNavigating}
                    >
                      <span>Generate Video</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* Genre Selector Modal */}
        <GenreSelector
          isOpen={musicClipState.state.showGenreSelector}
          onClose={() => musicClipState.actions.setShowGenreSelector(false)}
          onSelectGenre={handleGenreSelect}
          onGenerateRandom={handleRandomGenerate}
        />

      </div>
    </>
  );
}, (prevProps: any, nextProps: any) => {
  // Custom comparison function - since this component has no props, it should never re-render
  // unless the component is actually unmounted and remounted
  return true; // Always return true to prevent re-renders based on props
});

export default function MusicClipPageRoute() {
  return <MusicClipPage />;
}
