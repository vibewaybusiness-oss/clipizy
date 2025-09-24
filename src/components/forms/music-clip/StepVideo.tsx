"use client";

import React, { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsSchema } from "@/components/forms/music-clip/ClipiziGenerator";
import { BudgetSlider } from "./BudgetSlider";
import { SelectionModal } from "./SelectionModal";
import {
  ChevronRight,
  X,
  Video,
  Upload,
  FileVideo,
  Volume2,
  Film,
} from "lucide-react";
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
  onReuseVideoToggle,
}: StepVideoProps) {
  const [showVideoTypeSelector, setShowVideoTypeSelector] = useState(false);
  const [showVideoStyleSelector, setShowVideoStyleSelector] = useState(false);
  const [showAnimationStyleSelector, setShowAnimationStyleSelector] =
    useState(false);
  const [showAudioVisualizerSelector, setShowAudioVisualizerSelector] =
    useState(false);
  const [showAudioTransitionSelector, setShowAudioTransitionSelector] =
    useState(false);
  const [showVideoTransitionSelector, setShowVideoTransitionSelector] =
    useState(false);
  const [introAnimationFile, setIntroAnimationFile] = useState<File | null>(
    null
  );
  const [outroAnimationFile, setOutroAnimationFile] = useState<File | null>(
    null
  );

  const { toast } = useToast();

  // Ensure videoType default
  useEffect(() => {
    const currentVideoType = form.getValues("videoType");
    if (!currentVideoType) {
      form.setValue("videoType", "looped-static");
    }
  }, [form]);

  // Watch form to trigger re-render
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  useEffect(() => {
    const subscription = form.watch(() => forceUpdate());
    return () => subscription.unsubscribe();
  }, [form]);

  // Escape closes modals
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowVideoTypeSelector(false);
        setShowVideoStyleSelector(false);
        setShowAnimationStyleSelector(false);
        setShowAudioVisualizerSelector(false);
        setShowAudioTransitionSelector(false);
        setShowVideoTransitionSelector(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleIntroAnimationFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      form.setValue("introAnimationFile", file);
    }
  };

  const handleOutroAnimationFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      form.setValue("outroAnimationFile", file);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Form {...form}>
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-5">
            {/* TOP SECTION - Video Type, Style, Visualizer (3 columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Video Type */}
              <div className="space-y-3">
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

              {/* Video Style */}
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

              {/* Audio Visualizer */}
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
            </div>

            {/* VIDEO OPTIONS SECTION - 3 columns */}
            <div className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Video Options</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

            {/* TRANSITIONS SECTION - 2 columns */}
            <div className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Transitions</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                              { id: "slide", name: "Slide" }
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
                              { id: "zoom", name: "Zoom" }
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

              {/* Transition Modals */}
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

                    {/* Intro Audio Transition */}
                    {introAnimationFile && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <FormLabel className="text-xs font-semibold">Intro Audio Transition</FormLabel>
                        </div>
                        <FormField
                          control={form.control}
                          name="introAudioTransition"
                          render={({ field }: { field: any }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Select intro audio transition" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="fade">Fade</SelectItem>
                                  <SelectItem value="crossfade">Crossfade</SelectItem>
                                  <SelectItem value="dissolve">Dissolve</SelectItem>
                                  <SelectItem value="wipe">Wipe</SelectItem>
                                  <SelectItem value="slide">Slide</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Outro Audio Transition */}
                    {outroAnimationFile && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-accent rounded-full"></div>
                          <FormLabel className="text-xs font-semibold">Outro Audio Transition</FormLabel>
                        </div>
                        <FormField
                          control={form.control}
                          name="outroAudioTransition"
                          render={({ field }: { field: any }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Select outro audio transition" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="fade">Fade</SelectItem>
                                  <SelectItem value="crossfade">Crossfade</SelectItem>
                                  <SelectItem value="dissolve">Dissolve</SelectItem>
                                  <SelectItem value="wipe">Wipe</SelectItem>
                                  <SelectItem value="slide">Slide</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
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

                        {/* Intro Video Transition */}
                        {introAnimationFile && (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                              <FormLabel className="text-xs font-semibold">Intro Video Transition</FormLabel>
                            </div>
                            <FormField
                              control={form.control}
                              name="introTransition"
                              render={({ field }: { field: any }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger><SelectValue placeholder="Select intro video transition" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      <SelectItem value="fade">Fade</SelectItem>
                                      <SelectItem value="dissolve">Dissolve</SelectItem>
                                      <SelectItem value="wipe">Wipe</SelectItem>
                                      <SelectItem value="slide">Slide</SelectItem>
                                      <SelectItem value="zoom">Zoom</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {/* Outro Video Transition */}
                        {outroAnimationFile && (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-accent rounded-full"></div>
                              <FormLabel className="text-xs font-semibold">Outro Video Transition</FormLabel>
                            </div>
                            <FormField
                              control={form.control}
                              name="outroTransition"
                              render={({ field }: { field: any }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger><SelectValue placeholder="Select outro video transition" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      <SelectItem value="fade">Fade</SelectItem>
                                      <SelectItem value="dissolve">Dissolve</SelectItem>
                                      <SelectItem value="wipe">Wipe</SelectItem>
                                      <SelectItem value="slide">Slide</SelectItem>
                                      <SelectItem value="zoom">Zoom</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    }
                  />

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

          {/* ===== FOOTER SECTION ===== */}
          <div className="mt-5 pt-5 border-t border-border">
            <div className="space-y-4 mb-6">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Budget</h3>
                <p className="text-sm text-muted-foreground">
                  Set your budget for video generation
                </p>
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

            {!hideNavigation && (
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="flex items-center space-x-2"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span>Back</span>
                </Button>
                <Button
                  type="submit"
                  className="btn-ai-gradient text-white"
                  onClick={form.handleSubmit(onSubmit)}
                >
                  Save & Continue
                </Button>
              </div>
            )}
          </div>
        </div>
      </Form>

      {/* ===== MODALS (Video Type, Style, Animation Style, Transitions) ===== */}
      {/* Keep your existing modal JSX here, just ensure no duplicates */}
    </div>
  );
}
