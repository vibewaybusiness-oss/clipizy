"use client";

import { useVibewaveGenerator } from '../../hooks/useVibewaveGenerator';
import { StepSettings } from '../StepSettings';
import { StepPrompt } from '../StepPrompt';
import { StepOverview } from '../StepVideo';
import { StepGenerating } from '../StepGenerating';
import { StepPreview } from '../StepPreview';

export default function VibewaveGenerator() {
  const {
    step,
    audioFile,
    audioDuration,
    settings,
    prompts,
    channelAnimationFile,
    setChannelAnimationFile,
    isGeneratingVideo,
    promptForm,
    settingsForm,
    overviewForm,
    handleAudioFileChange,
    handleSettingsSubmit,
    onPromptSubmit,
    onOverviewSubmit,
    handleReset,
    fileToDataUri,
  } = useVibewaveGenerator();

  const renderStep = () => {
    switch (step) {
      case "UPLOAD":
        return (
          <div className="w-full p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Upload Audio</h2>
            <p className="text-muted-foreground mb-6">Please upload an audio file to get started.</p>
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
        );
      case "SETTINGS":
        return (
          <StepSettings
            form={settingsForm}
            audioDuration={audioDuration}
            totalDuration={audioDuration}
            trackCount={1}
            trackDurations={[audioDuration]}
            onSubmit={handleSettingsSubmit}
            onBack={handleReset}
          />
        );
      case "PROMPT":
        return (
          <StepPrompt
            form={promptForm}
            settings={settings}
            audioFile={audioFile}
            audioDuration={audioDuration}
            onSubmit={onPromptSubmit}
            onBack={() => {/* Handle back */}}
            fileToDataUri={fileToDataUri}
            toast={() => {/* Handle toast */}}
          />
        );
      case "OVERVIEW":
        return (
          <StepOverview
            form={overviewForm}
            settings={settings}
            prompts={prompts}
            channelAnimationFile={channelAnimationFile}
            setChannelAnimationFile={setChannelAnimationFile}
            onSubmit={onOverviewSubmit}
            onBack={() => {/* Handle back */}}
            isGeneratingVideo={isGeneratingVideo}
            toast={() => {/* Handle toast */}}
          />
        );
      case "GENERATING":
        return <StepGenerating />;
      case "PREVIEW":
        return (
          <StepPreview
            videoUri={null}
            onReset={handleReset}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl">
      {renderStep()}
    </div>
  );
}
