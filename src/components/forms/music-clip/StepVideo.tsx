"use client";

import React, { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsSchema } from "@/components/forms/music-clip/ClipiziGenerator";
import { BudgetSlider } from "./BudgetSlider";
import { SelectionModal } from "./SelectionModal";
import { ChevronRight, X, Video, Upload, FileVideo, Volume2, Film } from "lucide-react";
import { useToast } from "@/hooks/ui/use-toast";

type StepVideoProps = {
  form: UseFormReturn<z.infer<typeof SettingsSchema>>;
  audioDuration: number;
  totalDuration: number;
  trackCount: number;
  trackDurations: number[];
  onSubmit: (values: z.infer<typeof SettingsSchema>) => void;
  onBack: () => void;
  hideNavigation?: boolean;
  onReuseVideoToggle?: (enabled: boolean) => void;
};

export function StepVideo({ 
  form, 
  audioDuration, 
  totalDuration, 
  trackCount, 
  trackDurations, 
  onSubmit, 
  onBack, 
  hideNavigation = false, 
  onReuseVideoToggle 
}: StepVideoProps) {
  // Ensure videoType is set to default if not already set
  React.useEffect(() => {
    const currentVideoType = form.getValues("videoType");
    console.log("StepVideo useEffect - current videoType:", currentVideoType);
    if (!currentVideoType) {
      console.log("Setting default videoType to looped-static");
      form.setValue("videoType", "looped-static");
    }
  }, [form]);

  // Force set default value on component mount
  React.useEffect(() => {
    console.log("StepVideo mount - forcing default videoType");
    form.setValue("videoType", "looped-static");
  }, []);

  // Debug effect to log form values
  React.useEffect(() => {
    const formValues = form.getValues();
    console.log("StepVideo form values:", formValues);
  }, [form]);

  // Ensure default value is set on every render
  const currentVideoType = form.getValues("videoType");
  if (!currentVideoType) {
    console.log("StepVideo render - setting default videoType");
    form.setValue("videoType", "looped-static");
  }

  // Force re-render when form values change
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const subscription = form.watch(() => forceUpdate());
    return () => subscription.unsubscribe();
  }, [form]);
  const [showVideoTypeSelector, setShowVideoTypeSelector] = useState(false);
  const [showVideoStyleSelector, setShowVideoStyleSelector] = useState(false);
  const [showAnimationStyleSelector, setShowAnimationStyleSelector] = useState(false);
  const [showVideoAnimationTypeSelector, setShowVideoAnimationTypeSelector] = useState(false);
  const [showAudioVisualizerSelector, setShowAudioVisualizerSelector] = useState(false);
  const [showAudioTransitionSelector, setShowAudioTransitionSelector] = useState(false);
  const [showVideoTransitionSelector, setShowVideoTransitionSelector] = useState(false);
  const [introAnimationFile, setIntroAnimationFile] = useState<File | null>(null);
  const [outroAnimationFile, setOutroAnimationFile] = useState<File | null>(null);
  
  const { toast } = useToast();
  const audioVisualizerEnabled = form.watch("audioVisualizerEnabled") || false;

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowVideoTypeSelector(false);
        setShowVideoStyleSelector(false);
        setShowAnimationStyleSelector(false);
        setShowVideoAnimationTypeSelector(false);
        setShowAudioVisualizerSelector(false);
        setShowAudioTransitionSelector(false);
        setShowVideoTransitionSelector(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

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
      <Form {...form}>
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-5">
            {/* Video Type Section - Top, Outside Columns */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Video Type</h3>
              </div>
              
              <FormField
                control={form.control}
                name="videoType"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-14 text-left font-normal btn-secondary-hover"
                        onClick={() => setShowVideoTypeSelector(true)}
                      >
                        <div className="flex items-center space-x-3">
                          <Video className="w-6 h-6 text-muted-foreground" />
                          <div>
                            {field.value ? (
                              <span className="text-sm">
                                {field.value === "scenes" && "Scenes"}
                                {field.value === "looped-animated" && "Looped animation"}
                                {field.value === "looped-static" && "Looped static"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">Select video type</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </Button>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT COLUMN - Video Style, Audio Visualizer, and Transitions */}
              <div className="space-y-5">
                {/* Video Style Section */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Video Style</h3>
                  </div>
                  <FormField
                    control={form.control}
                    name="videoStyle"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between h-14 text-left font-normal btn-secondary-hover"
                            onClick={() => setShowVideoStyleSelector(true)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-pink-500"></div>
                              <div>
                                {field.value ? (
                                  <span className="text-sm">{field.value}</span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Select video style</span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </Button>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Transition Section */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Transitions</h3>
                  </div>

                  <div className="space-y-3">
                    {/* Audio Transition */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold">Audio</h4>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-14 text-left font-normal btn-secondary-hover"
                        onClick={() => setShowAudioTransitionSelector(true)}
                      >
                        <div className="flex items-center space-x-3">
                          <Volume2 className="w-5 h-5 text-muted-foreground" />
                          <div>
                            {form.watch("audioTransition") ? (
                              <span className="text-sm">
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
                              <span className="text-muted-foreground text-sm">Select audio transition</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>

                    {/* Video Transition */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold">Video</h4>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-14 text-left font-normal btn-secondary-hover"
                        onClick={() => setShowVideoTransitionSelector(true)}
                      >
                        <div className="flex items-center space-x-3">
                          <Film className="w-5 h-5 text-muted-foreground" />
                          <div>
                            {form.watch("videoTransition") ? (
                              <span className="text-sm">
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
                              <span className="text-muted-foreground text-sm">Select video transition</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  <SelectionModal
                    isOpen={showAudioTransitionSelector}
                    onClose={() => setShowAudioTransitionSelector(false)}
                    title="Choose Audio Transition"
                    description="Select the type of audio transition you want to apply."
                    showSidebar={true}
                    options={[
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
                    ]}
                    selectedValue={form.watch("audioTransition") || ""}
                    onSelect={(value) => form.setValue("audioTransition", value)}
                    gridCols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    maxWidth="max-w-6xl"
                    sidebarContent={
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <FormLabel className="text-xs font-semibold">Transition Settings</FormLabel>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              Audio transitions help create smooth connections between different parts of your music.
                            </p>
                          </div>
                        </div>
                      </div>
                    }
                  />

                  <SelectionModal
                    isOpen={showVideoTransitionSelector}
                    onClose={() => setShowVideoTransitionSelector(false)}
                    title="Choose Video Transition"
                    description="Select the type of video transition you want to apply."
                    showSidebar={true}
                    options={[
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
                    ]}
                    selectedValue={form.watch("videoTransition") || ""}
                    onSelect={(value) => form.setValue("videoTransition", value)}
                    gridCols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    maxWidth="max-w-6xl"
                    sidebarContent={
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <FormLabel className="text-xs font-semibold">Transition Settings</FormLabel>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              Video transitions create smooth visual connections between different scenes or clips.
                            </p>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
              {/* RIGHT COLUMN - Video Style and Transitions */}
              <div className="space-y-5">

                {/* Audio Visualizer Section */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Audio Visualizer</h3>
                  </div>
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-14 text-left font-normal btn-secondary-hover"
                      onClick={() => setShowAudioVisualizerSelector(true)}
                    >
                      <div className="flex items-center space-x-3">
                        <Volume2 className="w-5 h-5 text-muted-foreground" />
                        <div>
                          {form.watch("audioVisualizerType") ? (
                            <span className="text-sm">
                              {[
                                { id: "none", name: "None" },
                                { id: "bars", name: "Bars" },
                                { id: "waves", name: "Waves" },
                                { id: "spectra", name: "Spectra" },
                                { id: "circles", name: "Circles" }
                              ].find(s => s.id === form.watch("audioVisualizerType"))?.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Select visualizer type</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Button>

                    <SelectionModal
                      isOpen={showAudioVisualizerSelector}
                      onClose={() => setShowAudioVisualizerSelector(false)}
                      title="Choose Audio Visualizer"
                      description="Select the type of audio visualizer you want to add to your video."
                      options={[
                        {
                          id: "none",
                          name: "None",
                          description: "No audio visualizer",
                          icon: "🚫",
                          gradient: "from-gray-500/20 to-gray-600/20"
                        },
                        {
                          id: "bars",
                          name: "Bars",
                          description: "Classic frequency bars",
                          icon: "📊",
                          gradient: "from-blue-500/20 to-cyan-500/20"
                        },
                        {
                          id: "waves",
                          name: "Waves",
                          description: "Smooth wave visualization",
                          icon: "🌊",
                          gradient: "from-green-500/20 to-teal-500/20"
                        },
                        {
                          id: "spectra",
                          name: "Spectra",
                          description: "Full spectrum analyzer",
                          icon: "🌈",
                          gradient: "from-indigo-500/20 to-purple-500/20"
                        },
                        {
                          id: "circles",
                          name: "Circles",
                          description: "Circular frequency display",
                          icon: "⭕",
                          gradient: "from-orange-500/20 to-red-500/20"
                        }
                      ]}
                      selectedValue={form.watch("audioVisualizerType") || ""}
                      onSelect={(value) => {
                        form.setValue("audioVisualizerType", value);
                        form.setValue("audioVisualizerEnabled", value !== "none");
                        if (value !== "none") {
                          form.setValue("audioVisualizerSize", "medium");
                          form.setValue("audioVisualizerPositionV", "center");
                          form.setValue("audioVisualizerPositionH", "center");
                          form.setValue("audioVisualizerMirroring", "top");
                        }
                      }}
                      maxWidth="max-w-7xl"
                      showSidebar={form.watch("audioVisualizerType") !== "none" && form.watch("audioVisualizerType") !== ""}
                      form={form}
                      sidebarContent={
                        <div className="space-y-4">
                          {/* Size Section */}
                          <div className="space-y-3">
                            <FormLabel className="text-xs font-semibold">Size</FormLabel>
                            <FormField
                              control={form.control}
                              name="audioVisualizerSize"
                              render={({ field }: { field: any }) => (
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

                          {/* Position Sections */}
                          <div className="space-y-4">
                            {/* Vertical Position */}
                            <div className="space-y-3">
                              <FormLabel className="text-xs font-semibold">Vertical position</FormLabel>
                              <FormField
                                control={form.control}
                                name="audioVisualizerPositionV"
                                render={({ field }: { field: any }) => (
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

                            {/* Horizontal Position */}
                            <div className="space-y-3">
                              <FormLabel className="text-xs font-semibold">Horizontal position</FormLabel>
                              <FormField
                                control={form.control}
                                name="audioVisualizerPositionH"
                                render={({ field }: { field: any }) => (
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

                          {/* Mirroring */}
                          <div className="space-y-3">
                            <FormLabel className="text-xs font-semibold">Mirroring</FormLabel>
                            <FormField
                              control={form.control}
                              name="audioVisualizerMirroring"
                              render={({ field }: { field: any }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger><SelectValue placeholder="Select mirroring" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="top">Top</SelectItem>
                                      <SelectItem value="bottom">Bottom</SelectItem>
                                      <SelectItem value="both">Both</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      }
                    />
                  </div>

                </div>

                {/* Video Options Section */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Video Options</h3>
                  </div>
                  <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="createIndividualVideos"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <div
                          className="flex items-center space-x-4 px-4 py-4 rounded-lg border border-border bg-card hover-white-alpha transition-colors duration-200 group cursor-pointer"
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
                          <div className="flex-1 space-y-2">
                            <FormLabel className={`text-sm cursor-pointer ${
                              field.value ? 'text-foreground' : 'text-muted-foreground'
                            } group-hover:text-foreground`}>
                            Generate separate videos for each track
                            </FormLabel>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="createCompilation"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <div
                          className="flex items-center space-x-4 px-4 py-4 rounded-lg border border-border bg-card hover-white-alpha transition-colors duration-200 group cursor-pointer"
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
                          <div className="flex-1 space-y-2">
                            <FormLabel className={`text-sm cursor-pointer ${
                              field.value ? 'text-foreground' : 'text-muted-foreground'
                            } group-hover:text-foreground`}>
                            Generate a compilation video with all tracks
                            </FormLabel>
                        </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="useSameVideoForAll"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <div
                          className="flex items-center space-x-4 px-4 py-4 rounded-lg border border-border bg-card hover-white-alpha transition-colors duration-200 group cursor-pointer"
                          onClick={() => {
                            const newValue = !field.value;
                            field.onChange(newValue);
                            onReuseVideoToggle?.(newValue);
                          }}
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
                          <div className="flex-1 space-y-2">
                            <FormLabel className={`text-sm cursor-pointer ${
                              field.value ? 'text-foreground' : 'text-muted-foreground'
                            } group-hover:text-foreground`}>
                            Apply the same video description to all tracks
                            </FormLabel>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                  </div>
                </div>
              </div>

            </div>

            {/* Animation Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column - Intro Animation */}
                <div className="col-span-12 md:col-span-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <h4 className="text-sm font-semibold">Intro Animation</h4>
                  </div>
                  <FormField
                    control={form.control}
                    name="introAnimationFile"
                    render={() => (
                      <FormItem>
                        <FormControl>
                          <label htmlFor="intro-animation-upload" className={`flex flex-col items-center justify-center p-6 rounded-xl cursor-pointer border-2 border-dashed transition-all duration-300 group  ${
                            introAnimationFile
                              ? 'border-primary bg-primary/5 '
                              : 'border-border hover:border-primary/50 bg-muted/30 hover-white-alpha'
                          }`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 ${
                              introAnimationFile ? 'bg-muted-foreground/20' : 'bg-primary/10'
                            }`}>
                              {introAnimationFile ? <FileVideo className="w-5 h-5 text-muted-foreground" /> : <Upload className="w-5 h-5 text-primary" />}
                            </div>
                            <p className="font-semibold text-foreground text-sm mb-1 text-center">
                              {introAnimationFile ? (introAnimationFile.name.length > 15 ? introAnimationFile.name.substring(0, 15) + '...' : introAnimationFile.name) : 'Click to upload'}
                            </p>
                            <p className="text-xs text-muted-foreground text-center">MP4, MOV, AVI, etc.</p>
                            <Input id="intro-animation-upload" type="file" accept="video/*" className="hidden" onChange={handleIntroAnimationFileChange} />
                          </label>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Middle Column - Outro Animation */}
                <div className="col-span-12 md:col-span-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <h4 className="text-sm font-semibold">Outro Animation</h4>
                  </div>
                  <FormField
                    control={form.control}
                    name="outroAnimationFile"
                    render={() => (
                      <FormItem>
                        <FormControl>
                          <label htmlFor="outro-animation-upload" className={`flex flex-col items-center justify-center p-6 rounded-xl cursor-pointer border-2 border-dashed transition-all duration-300 group  ${
                            outroAnimationFile
                              ? 'border-accent bg-accent/5 '
                              : 'border-border hover:border-accent/50 bg-muted/30 hover-white-alpha'
                          }`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 ${
                              outroAnimationFile ? 'bg-accent/20' : 'bg-accent/10'
                            }`}>
                              {outroAnimationFile ? <FileVideo className="w-5 h-5 text-accent" /> : <Upload className="w-5 h-5 text-accent" />}
                            </div>
                            <p className="font-semibold text-foreground text-sm mb-1 text-center">
                              {outroAnimationFile ? (outroAnimationFile.name.length > 15 ? outroAnimationFile.name.substring(0, 15) + '...' : outroAnimationFile.name) : 'Click to upload'}
                            </p>
                            <p className="text-xs text-muted-foreground text-center">MP4, MOV, AVI, etc.</p>
                            <Input id="outro-animation-upload" type="file" accept="video/*" className="hidden" onChange={handleOutroAnimationFileChange} />
                          </label>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Right Column - Animation Options */}
                <div className="col-span-12 md:col-span-6 space-y-3">
                  <h4 className="text-sm font-semibold">Animation Options</h4>
                  
                  {/* Intro Animation Options */}
                  <FormField
                    control={form.control}
                    name="playMusicDuringIntro"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <div
                          className={`flex items-center space-x-4 p-4 rounded-lg border border-border bg-card transition-colors duration-200 group ${
                            introAnimationFile 
                              ? 'hover-white-alpha cursor-pointer' 
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                          onClick={() => introAnimationFile && field.onChange(!field.value)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            field.value && introAnimationFile
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground'
                          }`}>
                            {field.value && introAnimationFile && (
                              <div className="w-2 h-2 bg-background rounded-sm" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <FormLabel className={`text-sm cursor-pointer ${
                              field.value && introAnimationFile ? 'text-foreground' : 'text-muted-foreground'
                            } group-hover:text-foreground/80`}>
                              Play the main music track during the intro
                            </FormLabel>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Outro Animation Options */}
                  <FormField
                    control={form.control}
                    name="playMusicDuringOutro"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <div
                          className={`flex items-center space-x-4 p-4 rounded-lg border border-border bg-card transition-colors duration-200 group ${
                            outroAnimationFile 
                              ? 'hover-white-alpha cursor-pointer' 
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                          onClick={() => outroAnimationFile && field.onChange(!field.value)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            field.value && outroAnimationFile
                              ? 'bg-accent border-accent'
                              : 'border-muted-foreground'
                          }`}>
                            {field.value && outroAnimationFile && (
                              <div className="w-2 h-2 bg-background rounded-sm" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <FormLabel className={`text-sm cursor-pointer ${
                              field.value && outroAnimationFile ? 'text-foreground' : 'text-muted-foreground'
                            } group-hover:text-foreground/80`}>
                              Play the main music track during the outro
                            </FormLabel>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>


          </div>

          {!hideNavigation && (
            <div className="mt-5 pt-5 border-t border-border">
              {/* Budget Section in Navigation */}
              <div className="space-y-4 mb-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Budget</h3>
                  <p className="text-sm text-muted-foreground">Set your budget for video generation</p>
                </div>
                <BudgetSlider
                  videoType={form.watch("videoType") || "looped-static"}
                  audioDuration={audioDuration}
                  value={form.watch("budget") || [100]}
                  onValueChange={(value) => {
                    form.setValue("budget", value);
                    form.setValue("user_price", value[0]);
                  }}
                  totalDuration={totalDuration}
                  trackCount={trackCount}
                  trackDurations={trackDurations}
                  reuseVideo={form.watch("useSameVideoForAll") || false}
                />
              </div>
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={onBack}>
                  Back
                </Button>
                <Button type="submit" className="btn-ai-gradient text-white" onClick={form.handleSubmit(onSubmit)}>
                  Save & Continue
                </Button>
              </div>
            </div>
          )}
        </div>
      </Form>

      {/* Video Type Selector Modal */}
      {showVideoTypeSelector && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setShowVideoTypeSelector(false)}>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="bg-background rounded-xl max-w-5xl w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Choose Video Type</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Select the type of video that best fits your content style.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowVideoTypeSelector(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Scenes Card */}
                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                      form.watch("videoType") === "scenes"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover-white-alpha"
                    }`}
                    onClick={() => {
                      form.setValue("videoType", "scenes");
                      setShowVideoTypeSelector(false);
                    }}
                  >
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="w-full h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-purple-400/30"></div>
                          <div className="relative z-10 text-center space-y-1">
                            <div className="text-3xl">🎬</div>
                            <div className="text-lg font-bold text-white drop-shadow-lg">Scenes</div>
                          </div>
                          <div className="absolute inset-0 bg-black/20"></div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-bold text-lg">Scenes</h3>
                        <p className="text-muted-foreground text-sm">
                          Dynamic video scenes that change and evolve with your music, creating a cinematic experience.
                        </p>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            <span className="text-xs">Multiple scene transitions</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            <span className="text-xs">Music-synchronized changes</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            <span className="text-xs">Cinematic storytelling</span>
                          </div>
                        </div>

                        <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Best for:</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">Music videos, storytelling content, dynamic presentations</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Looped Animation Card */}
                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                      form.watch("videoType") === "looped-animated"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover-white-alpha"
                    }`}
                    onClick={() => {
                      form.setValue("videoType", "looped-animated");
                      setShowVideoTypeSelector(false);
                    }}
                  >
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="w-full h-32 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-lg flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-green-400/30 to-teal-400/30"></div>
                          <div className="relative z-10 text-center space-y-1">
                            <div className="text-3xl">🌀</div>
                            <div className="text-lg font-bold text-white drop-shadow-lg">Looped Animation</div>
                          </div>
                          <div className="absolute inset-0 bg-black/20"></div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-bold text-lg">Looped Animation</h3>
                        <p className="text-muted-foreground text-sm">
                          Smooth animated loops that repeat seamlessly, perfect for continuous background visuals.
                        </p>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span className="text-xs">Seamless loop transitions</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span className="text-xs">Smooth animations</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span className="text-xs">Continuous motion</span>
                          </div>
                        </div>

                        <div className="mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Best for:</p>
                          <p className="text-xs text-green-600 dark:text-green-400">Background visuals, ambient content, continuous playlists</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Looped Static Card */}
                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                      form.watch("videoType") === "looped-static"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover-white-alpha"
                    }`}
                    onClick={() => {
                      form.setValue("videoType", "looped-static");
                      setShowVideoTypeSelector(false);
                    }}
                  >
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="w-full h-32 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-400/30 to-red-400/30"></div>
                          <div className="relative z-10 text-center space-y-1">
                            <div className="text-3xl">🖼️</div>
                            <div className="text-lg font-bold text-white drop-shadow-lg">Looped Static</div>
                          </div>
                          <div className="absolute inset-0 bg-black/20"></div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-bold text-lg">Looped Static</h3>
                        <p className="text-muted-foreground text-sm">
                          Static images that loop seamlessly, providing a clean and minimal visual experience.
                        </p>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                            <span className="text-xs">Clean static visuals</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                            <span className="text-xs">Minimal distractions</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                            <span className="text-xs">Focus on audio</span>
                          </div>
                        </div>

                        <div className="mt-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">Best for:</p>
                          <p className="text-xs text-orange-600 dark:text-orange-400">Podcasts, audio-focused content, minimal designs</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Style Selector Modal */}
      {showVideoStyleSelector && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setShowVideoStyleSelector(false)}>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="bg-background rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold">Choose Video Style</h2>
                    <p className="text-muted-foreground mt-2">
                      Select a visual style that matches your content's mood and aesthetic.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowVideoStyleSelector(false)}
                    className="h-10 w-10"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      id: "cinematic",
                      name: "Cinematic",
                      description: "Movie-like quality with dramatic lighting",
                      icon: "🎬",
                      gradient: "from-gray-800/20 to-gray-900/20",
                      preview: "Professional film aesthetics with depth and atmosphere"
                    },
                    {
                      id: "abstract",
                      name: "Abstract",
                      description: "Artistic and non-representational visuals",
                      icon: "🎨",
                      gradient: "from-purple-500/20 to-pink-500/20",
                      preview: "Creative geometric patterns and flowing shapes"
                    },
                    {
                      id: "minimalist",
                      name: "Minimalist",
                      description: "Clean, simple, and uncluttered design",
                      icon: "⚪",
                      gradient: "from-gray-100/20 to-gray-200/20",
                      preview: "Focus on essential elements with plenty of white space"
                    },
                    {
                      id: "vibrant",
                      name: "Vibrant",
                      description: "Bold colors and energetic visuals",
                      icon: "🌈",
                      gradient: "from-yellow-500/20 to-orange-500/20",
                      preview: "Bright, saturated colors that pop and energize"
                    },
                    {
                      id: "dark",
                      name: "Dark",
                      description: "Moody and atmospheric with dark tones",
                      icon: "🌙",
                      gradient: "from-gray-700/20 to-gray-800/20",
                      preview: "Mysterious and sophisticated dark aesthetic"
                    },
                    {
                      id: "retro",
                      name: "Retro",
                      description: "Nostalgic vintage-inspired visuals",
                      icon: "📺",
                      gradient: "from-amber-500/20 to-orange-500/20",
                      preview: "Classic 80s and 90s inspired design elements"
                    }
                  ].map((style) => (
                    <div
                      key={style.id}
                      className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                        form.watch("videoStyle") === style.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover-white-alpha"
                      }`}
                      onClick={() => {
                        form.setValue("videoStyle", style.id);
                        setShowVideoStyleSelector(false);
                      }}
                    >
                      <div className="space-y-4">
                        <div className="relative">
                          <div className={`w-full h-32 bg-gradient-to-br ${style.gradient} rounded-lg flex items-center justify-center`}>
                            <span className="text-4xl">{style.icon}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-bold text-lg">{style.name}</h3>
                          <p className="text-sm text-muted-foreground">{style.description}</p>

                          <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground italic">"{style.preview}"</p>
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

      {/* Animation Style Selector Modal */}
      {showAnimationStyleSelector && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setShowAnimationStyleSelector(false)}>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="bg-background rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold">Choose Animation Style</h2>
                    <p className="text-muted-foreground mt-2">
                      Select how your animations should move and transition.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAnimationStyleSelector(false)}
                    className="h-10 w-10"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      id: "smooth",
                      name: "Smooth",
                      description: "Fluid and elegant transitions",
                      icon: "🌊",
                      gradient: "from-blue-500/20 to-cyan-500/20",
                      preview: "Buttery smooth movements with natural easing"
                    },
                    {
                      id: "bouncy",
                      name: "Bouncy",
                      description: "Playful and energetic animations",
                      icon: "⚡",
                      gradient: "from-yellow-500/20 to-orange-500/20",
                      preview: "Spring-like effects with fun bounce physics"
                    },
                    {
                      id: "fluid",
                      name: "Fluid",
                      description: "Organic and flowing motion",
                      icon: "💧",
                      gradient: "from-teal-500/20 to-green-500/20",
                      preview: "Water-like movements that feel natural"
                    },
                    {
                      id: "sharp",
                      name: "Sharp",
                      description: "Precise and snappy transitions",
                      icon: "⚡",
                      gradient: "from-red-500/20 to-pink-500/20",
                      preview: "Quick, precise movements with clear timing"
                    },
                    {
                      id: "gentle",
                      name: "Gentle",
                      description: "Soft and subtle animations",
                      icon: "🌸",
                      gradient: "from-pink-500/20 to-purple-500/20",
                      preview: "Delicate movements that don't distract"
                    },
                    {
                      id: "dynamic",
                      name: "Dynamic",
                      description: "Fast-paced and energetic",
                      icon: "🚀",
                      gradient: "from-indigo-500/20 to-purple-500/20",
                      preview: "High-energy animations that grab attention"
                    }
                  ].map((style) => (
                    <div
                      key={style.id}
                      className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                        form.watch("animationStyle") === style.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover-white-alpha"
                      }`}
                      onClick={() => {
                        form.setValue("animationStyle", style.id);
                        setShowAnimationStyleSelector(false);
                      }}
                    >
                      <div className="space-y-4">
                        <div className="relative">
                          <div className={`w-full h-32 bg-gradient-to-br ${style.gradient} rounded-lg flex items-center justify-center`}>
                            <span className="text-4xl">{style.icon}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-bold text-lg">{style.name}</h3>
                          <p className="text-sm text-muted-foreground">{style.description}</p>

                          <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground italic">"{style.preview}"</p>
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
  );
}
