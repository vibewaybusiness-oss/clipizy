
"use client";

import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Film, Upload, FileVideo, ChevronRight, X, Volume2, Video, ChevronLeft } from "lucide-react";
import { OverviewSchema, PromptSchema, SettingsSchema } from "@/components/forms/generators/ClipizyGenerator";

type StepOverviewProps = {
  form: UseFormReturn<z.infer<typeof OverviewSchema>>;
  settings: z.infer<typeof SettingsSchema> | null;
  prompts: z.infer<typeof PromptSchema> | null;
  channelAnimationFile: File | null;
  setChannelAnimationFile: (file: File | null) => void;
  onSubmit: (values: z.infer<typeof OverviewSchema>) => void;
  onBack: () => void;
  isGeneratingVideo: boolean;
  toast: (options: { variant?: "default" | "destructive" | null; title: string; description: string }) => void;
};

export function StepOverview({
  form,
  settings,
  prompts,
  channelAnimationFile,
  setChannelAnimationFile,
  onSubmit,
  onBack,
  isGeneratingVideo,
  toast
}: StepOverviewProps) {
  const audioVisualizerEnabled = form.watch("audioVisualizerEnabled");
  const [showAudioVisualizerSelector, setShowAudioVisualizerSelector] = useState(false);
  const [showAudioTransitionSelector, setShowAudioTransitionSelector] = useState(false);
  const [showVideoTransitionSelector, setShowVideoTransitionSelector] = useState(false);
  const [introAnimationFile, setIntroAnimationFile] = useState<File | null>(null);
  const [outroAnimationFile, setOutroAnimationFile] = useState<File | null>(null);

  const handleChannelAnimationFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a video file.",
        });
        return;
      }
      setChannelAnimationFile(file);
    }
  };

  const handleIntroAnimationFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a video file.",
        });
        return;
      }
      setIntroAnimationFile(file);
      form.setValue('introAnimationFile', file);
    }
  };

  const handleOutroAnimationFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a video file.",
        });
        return;
      }
      setOutroAnimationFile(file);
      form.setValue('outroAnimationFile', file);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="w-full animate-fade-in-up bg-background/50 flex-1 flex flex-col border-border">
        <CardContent className="flex-1 flex flex-col p-6">
        <Form {...form}>
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-8">
              {/* Channel Animation Section - 2 Side by Side */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-bold text-xl text-foreground">Channel Animation</h3>
                  <p className="text-sm text-muted-foreground">Upload intro and outro animations for your video</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Intro Animation */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <h4 className="font-semibold text-base text-foreground">Intro Animation</h4>
                    </div>
                    <FormField
                      control={form.control}
                      name="introAnimationFile"
                      render={() => (
                        <FormItem>
                          <FormLabel>Upload Intro Animation</FormLabel>
                          <FormControl>
                            <label htmlFor="intro-animation-upload" className={`flex flex-col items-center justify-center p-8 rounded-xl cursor-pointer border-2 border-dashed transition-all duration-300 group  ${
                              introAnimationFile
                                ? 'border-primary bg-primary/5 '
                                : 'border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50'
                            }`}>
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ${
                                introAnimationFile ? 'bg-muted-foreground/20' : 'bg-primary/10'
                              }`}>
                                {introAnimationFile ? <FileVideo className="w-6 h-6 text-muted-foreground" /> : <Upload className="w-6 h-6 text-primary" />}
                              </div>
                              <p className="font-semibold text-foreground text-base mb-2">
                                {introAnimationFile ? introAnimationFile.name : 'Click to upload'}
                              </p>
                              <p className="text-sm text-muted-foreground">MP4, MOV, AVI, etc.</p>
                              <Input id="intro-animation-upload" type="file" accept="video/*" className="hidden" onChange={handleIntroAnimationFileChange} />
                            </label>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Outro Animation */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <h4 className="font-semibold text-base text-foreground">Outro Animation</h4>
                    </div>
                    <FormField
                      control={form.control}
                      name="outroAnimationFile"
                      render={() => (
                        <FormItem>
                          <FormLabel>Upload Outro Animation</FormLabel>
                          <FormControl>
                            <label htmlFor="outro-animation-upload" className={`flex flex-col items-center justify-center p-8 rounded-xl cursor-pointer border-2 border-dashed transition-all duration-300 group  ${
                              outroAnimationFile
                                ? 'border-accent bg-accent/5 '
                                : 'border-border hover:border-accent/50 bg-muted/30 hover:bg-muted/50'
                            }`}>
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ${
                                outroAnimationFile ? 'bg-accent/20' : 'bg-accent/10'
                              }`}>
                                {outroAnimationFile ? <FileVideo className="w-6 h-6 text-accent" /> : <Upload className="w-6 h-6 text-accent" />}
                              </div>
                              <p className="font-semibold text-foreground text-base mb-2">
                                {outroAnimationFile ? outroAnimationFile.name : 'Click to upload'}
                              </p>
                              <p className="text-sm text-muted-foreground">MP4, MOV, AVI, etc.</p>
                              <Input id="outro-animation-upload" type="file" accept="video/*" className="hidden" onChange={handleOutroAnimationFileChange} />
                            </label>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

              {/* Intro Animation Options */}
              {introAnimationFile && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/30 ml-2">
                  <FormField
                    control={form.control}
                    name="playMusicDuringIntro"
                    render={({ field }) => (
                      <FormItem>
                        <div
                          className="flex items-center space-x-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors duration-200 group cursor-pointer"
                          onClick={() => field.onChange(!field.value)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            field.value
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground'
                          }`}>
                            {field.value && (
                              <div className="w-2 h-2 bg-background rounded-sm" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <FormLabel className="text-base font-medium group-hover:text-foreground cursor-pointer">
                              Play music during intro animation
                            </FormLabel>
                            <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                              Continue playing the main music track during the intro
                            </p>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Outro Animation Options */}
              {outroAnimationFile && (
                <div className="space-y-4 pl-4 border-l-2 border-accent/30 ml-2">
                  <FormField
                    control={form.control}
                    name="playMusicDuringOutro"
                    render={({ field }) => (
                      <FormItem>
                        <div
                          className="flex items-center space-x-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors duration-200 group cursor-pointer"
                          onClick={() => field.onChange(!field.value)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            field.value
                              ? 'bg-accent border-accent'
                              : 'border-muted-foreground'
                          }`}>
                            {field.value && (
                              <div className="w-2 h-2 bg-background rounded-sm" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <FormLabel className="text-base font-medium group-hover:text-foreground cursor-pointer">
                              Play music during outro animation
                            </FormLabel>
                            <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                              Continue playing the main music track during the outro
                            </p>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border/50"></div>

            {/* Audio Visualizer Section */}
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-bold text-xl text-foreground">Audio Visualizer</h3>
                <p className="text-sm text-muted-foreground">Add a dynamic visualizer to your video</p>
              </div>
              <div className="space-y-3">

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between h-12 text-left font-normal btn-secondary-hover"
                  onClick={() => setShowAudioVisualizerSelector(true)}
                >
                  <div className="flex items-center space-x-3">
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      {form.watch("audioVisualizerType") ? (
                        <span>
                          {[
                            { id: "none", name: "None" },
                            { id: "bar", name: "Bar" },
                            { id: "wave", name: "Wave" },
                            { id: "credits", name: "Credits" },
                            { id: "circle", name: "Circle" },
                            { id: "spectrum", name: "Spectrum" },
                            { id: "minimal", name: "Minimal" }
                          ].find(s => s.id === form.watch("audioVisualizerType"))?.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Select visualizer type</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>

                {/* Full Screen Audio Visualizer Selector */}
                {showAudioVisualizerSelector && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setShowAudioVisualizerSelector(false)}>
                    <div className="flex items-center justify-center min-h-screen p-4">
                      <div
                        className="bg-background rounded-2xl  max-w-6xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-8">
                          <div className="flex items-center justify-between mb-8">
                            <div>
                              <h2 className="text-3xl font-bold">Choose Audio Visualizer</h2>
                              <p className="text-muted-foreground mt-2">
                                Select the type of audio visualizer you want to add to your video.
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowAudioVisualizerSelector(false)}
                              className="h-10 w-10"
                            >
                              <X className="h-6 w-6" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                              {
                                id: "none",
                                name: "None",
                                description: "No audio visualizer",
                                icon: "🚫",
                                gradient: "from-gray-500/20 to-gray-600/20",
                                preview: "Clean video without any audio visualization overlay."
                              },
                              {
                                id: "bar",
                                name: "Bar",
                                description: "Classic frequency bars",
                                icon: "📊",
                                gradient: "from-blue-500/20 to-cyan-500/20",
                                preview: "Vertical bars that dance to the beat of your music."
                              },
                              {
                                id: "wave",
                                name: "Wave",
                                description: "Smooth wave visualization",
                                icon: "🌊",
                                gradient: "from-green-500/20 to-teal-500/20",
                                preview: "Flowing waves that respond to the audio frequencies."
                              },
                              {
                                id: "credits",
                                name: "Credits",
                                description: "Dynamic point particles",
                                icon: "✨",
                                gradient: "from-purple-500/20 to-pink-500/20",
                                preview: "Floating particles that react to the music's rhythm."
                              },
                              {
                                id: "circle",
                                name: "Circle",
                                description: "Circular frequency display",
                                icon: "⭕",
                                gradient: "from-orange-500/20 to-red-500/20",
                                preview: "Concentric circles that pulse with the audio."
                              },
                              {
                                id: "spectrum",
                                name: "Spectrum",
                                description: "Full spectrum analyzer",
                                icon: "🌈",
                                gradient: "from-indigo-500/20 to-purple-500/20",
                                preview: "Complete frequency spectrum visualization with colors."
                              },
                              {
                                id: "minimal",
                                name: "Minimal",
                                description: "Clean, simple design",
                                icon: "⚪",
                                gradient: "from-slate-500/20 to-gray-500/20",
                                preview: "Subtle, elegant visualization that doesn't distract."
                              }
                            ].map((type) => (
                              <div
                                key={type.id}
                                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                                  form.watch("audioVisualizerType") === type.id
                                    ? "border-primary bg-primary/5 "
                                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                                }`}
                                onClick={() => {
                                  form.setValue("audioVisualizerType", type.id);
                                  form.setValue("audioVisualizerEnabled", type.id !== "none");
                                  // Set default values when visualizer is selected
                                  if (type.id !== "none") {
                                    form.setValue("audioVisualizerSize", "medium");
                                    form.setValue("audioVisualizerPositionV", "center");
                                    form.setValue("audioVisualizerPositionH", "center");
                                  }
                                  setShowAudioVisualizerSelector(false);
                                }}
                              >
                                <div className="space-y-4">
                                  <div className="relative">
                                    <div className={`w-full h-48 bg-gradient-to-br ${type.gradient} rounded-xl flex items-center justify-center`}>
                                      <span className="text-6xl">{type.icon}</span>
                                    </div>
                                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors rounded-xl"></div>
                                  </div>

                                  <div className="space-y-3">
                                    <h3 className="font-bold text-xl">{type.name}</h3>
                                    <p className="text-muted-foreground">{type.description}</p>

                                    <div className="mt-4 p-3 bg-muted/50 rounded-xl">
                                      <p className="text-sm text-muted-foreground mb-1 font-medium">Preview:</p>
                                      <p className="text-sm italic">"{type.preview}"</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Size & Position Settings - Always visible when visualizer is enabled */}
              {audioVisualizerEnabled && form.watch("audioVisualizerType") !== "none" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Size Section - Left */}
                    <div className="space-y-3">
                      <FormLabel className="text-xs font-semibold">Size</FormLabel>
                      <FormField
                        control={form.control}
                        name="audioVisualizerSize"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="small">Small</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="large">Large</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Vertical Position Section - Center */}
                    <div className="space-y-3">
                      <FormLabel className="text-xs font-semibold">Vertical position</FormLabel>
                      <FormField
                        control={form.control}
                        name="audioVisualizerPositionV"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Vertical" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="top">Top</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="bottom">Bottom</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Horizontal Position Section - Right */}
                    <div className="space-y-3">
                      <FormLabel className="text-xs font-semibold">Horizontal position</FormLabel>
                      <FormField
                        control={form.control}
                        name="audioVisualizerPositionH"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Horizontal" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
               )}
             </div>

             {/* Transition Section */}
             <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-bold text-xl text-foreground">Transition</h3>
                  <p className="text-sm text-muted-foreground">Configure audio and video transitions</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Audio Visualizer Button */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <h4 className="font-semibold text-base text-foreground">Visualizer</h4>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-12 text-left font-normal btn-secondary-hover"
                      onClick={() => setShowAudioVisualizerSelector(true)}
                    >
                      <div className="flex items-center space-x-3">
                        <Volume2 className="w-5 h-5 text-muted-foreground" />
                        <div>
                          {form.watch("audioVisualizerType") ? (
                            <span>
                              {[
                                { id: "none", name: "None" },
                                { id: "bar", name: "Bar" },
                                { id: "wave", name: "Wave" },
                                { id: "credits", name: "Credits" },
                                { id: "circle", name: "Circle" },
                                { id: "spectrum", name: "Spectrum" },
                                { id: "minimal", name: "Minimal" }
                              ].find(s => s.id === form.watch("audioVisualizerType"))?.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Select visualizer type</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Audio Transition */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <h4 className="font-semibold text-base text-foreground">Audio</h4>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-12 text-left font-normal btn-secondary-hover"
                      onClick={() => setShowAudioTransitionSelector(true)}
                    >
                      <div className="flex items-center space-x-3">
                        <Volume2 className="w-5 h-5 text-muted-foreground" />
                        <div>
                          {form.watch("audioTransition") ? (
                            <span>
                              {[
                                { id: "none", name: "None" },
                                { id: "fade", name: "Fade" },
                                { id: "crossfade", name: "Crossfade" },
                                { id: "dissolve", name: "Dissolve" },
                                { id: "wipe", name: "Wipe" },
                                { id: "slide", name: "Slide" },
                                { id: "zoom", name: "Zoom" },
                                { id: "spin", name: "Spin" }
                              ].find(t => t.id === form.watch("audioTransition"))?.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Select audio transition</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Video Transition */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <h4 className="font-semibold text-base text-foreground">Video</h4>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-12 text-left font-normal btn-secondary-hover"
                      onClick={() => setShowVideoTransitionSelector(true)}
                    >
                      <div className="flex items-center space-x-3">
                        <Film className="w-5 h-5 text-muted-foreground" />
                        <div>
                          {form.watch("videoTransition") ? (
                            <span>
                              {[
                                { id: "none", name: "None" },
                                { id: "fade", name: "Fade" },
                                { id: "dissolve", name: "Dissolve" },
                                { id: "wipe", name: "Wipe" },
                                { id: "slide", name: "Slide" },
                                { id: "zoom", name: "Zoom" },
                                { id: "spin", name: "Spin" },
                                { id: "flip", name: "Flip" },
                                { id: "cube", name: "Cube" },
                                { id: "page", name: "Page Turn" }
                              ].find(t => t.id === form.watch("videoTransition"))?.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Select video transition</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                {/* Audio Transition Selector Modal */}
                {showAudioTransitionSelector && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setShowAudioTransitionSelector(false)}>
                    <div className="flex items-center justify-center min-h-screen p-4">
                      <div
                        className="bg-background rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-8">
                          <div className="flex items-center justify-between mb-8">
                            <div>
                              <h2 className="text-3xl font-bold">Choose Audio Transition</h2>
                              <p className="text-muted-foreground mt-2">
                                Select the type of audio transition you want to apply.
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowAudioTransitionSelector(false)}
                              className="h-10 w-10"
                            >
                              <X className="h-6 w-6" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                              {
                                id: "none",
                                name: "None",
                                description: "No audio transition",
                                icon: "🚫",
                                gradient: "from-gray-500/20 to-gray-600/20"
                              },
                              {
                                id: "fade",
                                name: "Fade",
                                description: "Smooth fade in/out",
                                icon: "🌅",
                                gradient: "from-blue-500/20 to-cyan-500/20"
                              },
                              {
                                id: "crossfade",
                                name: "Crossfade",
                                description: "Blend between tracks",
                                icon: "🔄",
                                gradient: "from-green-500/20 to-teal-500/20"
                              },
                              {
                                id: "dissolve",
                                name: "Dissolve",
                                description: "Gradual audio dissolve",
                                icon: "💧",
                                gradient: "from-purple-500/20 to-pink-500/20"
                              },
                              {
                                id: "wipe",
                                name: "Wipe",
                                description: "Directional audio wipe",
                                icon: "🧹",
                                gradient: "from-orange-500/20 to-red-500/20"
                              },
                              {
                                id: "slide",
                                name: "Slide",
                                description: "Sliding audio transition",
                                icon: "📱",
                                gradient: "from-indigo-500/20 to-purple-500/20"
                              },
                              {
                                id: "zoom",
                                name: "Zoom",
                                description: "Zoom-based transition",
                                icon: "🔍",
                                gradient: "from-yellow-500/20 to-orange-500/20"
                              },
                              {
                                id: "spin",
                                name: "Spin",
                                description: "Rotational transition",
                                icon: "🌀",
                                gradient: "from-pink-500/20 to-rose-500/20"
                              }
                            ].map((transition) => (
                              <div
                                key={transition.id}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                                  form.watch("audioTransition") === transition.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                                }`}
                                onClick={() => {
                                  form.setValue("audioTransition", transition.id);
                                  setShowAudioTransitionSelector(false);
                                }}
                              >
                                <div className="space-y-3">
                                  <div className={`w-full h-24 bg-gradient-to-br ${transition.gradient} rounded-lg flex items-center justify-center`}>
                                    <span className="text-3xl">{transition.icon}</span>
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-lg">{transition.name}</h3>
                                    <p className="text-sm text-muted-foreground">{transition.description}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Transition Selector Modal */}
                {showVideoTransitionSelector && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setShowVideoTransitionSelector(false)}>
                    <div className="flex items-center justify-center min-h-screen p-4">
                      <div
                        className="bg-background rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-8">
                          <div className="flex items-center justify-between mb-8">
                            <div>
                              <h2 className="text-3xl font-bold">Choose Video Transition</h2>
                              <p className="text-muted-foreground mt-2">
                                Select the type of video transition you want to apply.
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowVideoTransitionSelector(false)}
                              className="h-10 w-10"
                            >
                              <X className="h-6 w-6" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                              {
                                id: "none",
                                name: "None",
                                description: "No video transition",
                                icon: "🚫",
                                gradient: "from-gray-500/20 to-gray-600/20"
                              },
                              {
                                id: "fade",
                                name: "Fade",
                                description: "Smooth fade in/out",
                                icon: "🌅",
                                gradient: "from-blue-500/20 to-cyan-500/20"
                              },
                              {
                                id: "dissolve",
                                name: "Dissolve",
                                description: "Gradual video dissolve",
                                icon: "💧",
                                gradient: "from-green-500/20 to-teal-500/20"
                              },
                              {
                                id: "wipe",
                                name: "Wipe",
                                description: "Directional video wipe",
                                icon: "🧹",
                                gradient: "from-purple-500/20 to-pink-500/20"
                              },
                              {
                                id: "slide",
                                name: "Slide",
                                description: "Sliding video transition",
                                icon: "📱",
                                gradient: "from-orange-500/20 to-red-500/20"
                              },
                              {
                                id: "zoom",
                                name: "Zoom",
                                description: "Zoom-based transition",
                                icon: "🔍",
                                gradient: "from-indigo-500/20 to-purple-500/20"
                              },
                              {
                                id: "spin",
                                name: "Spin",
                                description: "Rotational transition",
                                icon: "🌀",
                                gradient: "from-yellow-500/20 to-orange-500/20"
                              },
                              {
                                id: "flip",
                                name: "Flip",
                                description: "3D flip transition",
                                icon: "🔄",
                                gradient: "from-pink-500/20 to-rose-500/20"
                              },
                              {
                                id: "cube",
                                name: "Cube",
                                description: "3D cube rotation",
                                icon: "🧊",
                                gradient: "from-cyan-500/20 to-blue-500/20"
                              },
                              {
                                id: "page",
                                name: "Page Turn",
                                description: "Book page flip effect",
                                icon: "📖",
                                gradient: "from-amber-500/20 to-yellow-500/20"
                              }
                            ].map((transition) => (
                              <div
                                key={transition.id}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                                  form.watch("videoTransition") === transition.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                                }`}
                                onClick={() => {
                                  form.setValue("videoTransition", transition.id);
                                  setShowVideoTransitionSelector(false);
                                }}
                              >
                                <div className="space-y-3">
                                  <div className={`w-full h-24 bg-gradient-to-br ${transition.gradient} rounded-lg flex items-center justify-center`}>
                                    <span className="text-3xl">{transition.icon}</span>
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-lg">{transition.name}</h3>
                                    <p className="text-sm text-muted-foreground">{transition.description}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </Form>
        </CardContent>
      </Card>
    </div>
  );
}
