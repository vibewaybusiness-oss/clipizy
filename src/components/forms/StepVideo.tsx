
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BudgetSlider } from "@/components/forms/BudgetSlider";
import { SettingsSchema } from "@/components/forms/generators/ClipizyGenerator";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Palette, Plus, X, Video } from "lucide-react";
import { SelectionModal } from "@/components/ui/selection-modal";
import { usePricing } from "@/hooks/commerce/use-pricing";
import { usePricingService } from "@/hooks/commerce/use-pricing-service";

type StepSettingsProps = {
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

export function StepSettings({ form, audioDuration, totalDuration, trackCount, trackDurations, onSubmit, onBack, hideNavigation = false, onReuseVideoToggle }: StepSettingsProps) {
  // Watch only specific fields to avoid unnecessary subscriptions/renders
  const videoType = form.watch("videoType");
  const videoStyle = form.watch("videoStyle");
  const reuseVideo = form.watch("useSameVideoForAll");

  // No useEffect needed - validation will be handled directly in the click handler

  const [customStyleName, setCustomStyleName] = useState("");
  const [customStyleDescription, setCustomStyleDescription] = useState("");
  const [showVideoTypeSelector, setShowVideoTypeSelector] = useState(false);
  const [isStyleSheetOpen, setIsStyleSheetOpen] = useState(false);

  // Use dynamic pricing
  const { pricing } = usePricing();
  const pricingService = usePricingService();

  // Calculate dynamic pricing for each video type
  const [videoTypeCosts, setVideoTypeCosts] = useState({ loopedVideoCost: 100, scenesVideoCost: 200 });

  useEffect(() => {
    const calculateCosts = async () => {
      if (!pricing) {
        setVideoTypeCosts({ loopedVideoCost: 100, scenesVideoCost: 200 });
        return;
      }

      try {
        const totalMinutes = totalDuration / 60;
        const longestTrackMinutes = Math.max(...trackDurations) / 60;

        // Calculate for looped-static (same as looped-animated for display purposes)
        const loopedUnits = reuseVideo ? 1 : trackCount;
        const loopedImagePrice = await pricingService.calculateImagePrice(loopedUnits, totalMinutes, 'clipizy-model');
        const loopedAnimationPrice = await pricingService.calculateLoopedAnimationPrice(loopedUnits, totalMinutes, 'clipizy-model');

        // Calculate for scenes
        const scenesDuration = reuseVideo ? longestTrackMinutes : totalMinutes;
        const scenesPrice = await pricingService.calculateVideoPrice(scenesDuration, 'clipizy-model');

        setVideoTypeCosts({
          loopedVideoCost: Math.min(loopedImagePrice.credits, loopedAnimationPrice.credits),
          scenesVideoCost: scenesPrice.credits
        });
      } catch (error) {
        console.error('Error calculating video type costs:', error);
        setVideoTypeCosts({ loopedVideoCost: 100, scenesVideoCost: 200 });
      }
    };

    calculateCosts();
  }, [pricing, totalDuration, trackCount, trackDurations, reuseVideo, pricingService]);

  return (
    <div className="w-full animate-fade-in-up">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <FormLabel className="text-lg font-semibold">Video graphics & style</FormLabel>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Graphics Type Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between h-16 text-left font-normal btn-secondary-hover group"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowVideoTypeSelector(true);
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-muted/20 to-muted-foreground/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Video className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {videoType ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground truncate">
                            {videoType === "looped-static" && "Static Image"}
                            {videoType === "looped-animated" && "Animated Loop"}
                            {videoType === "scenes" && "Video with Scenes"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {videoType === "looped-static" && "A single static image that matches your audio".substring(0, 50) + "..."}
                            {videoType === "looped-animated" && "A seamless looping video animation".substring(0, 50) + "..."}
                            {videoType === "scenes" && "Multiple scenes with complex storytelling".substring(0, 50) + "..."}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="font-semibold text-muted-foreground">Select a video type</div>
                          <div className="text-sm text-muted-foreground">Choose the type of graphics for your video</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>

                {/* Style Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between h-16 text-left font-normal btn-secondary-hover group"
                  onClick={() => setIsStyleSheetOpen(true)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-muted/20 to-muted-foreground/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Palette className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {videoStyle ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground truncate">
                            {videoStyle === "custom"
                              ? customStyleName || "Custom Style"
                              : [
                                  { id: "minimalist", name: "Minimalist", icon: "✨" },
                                  { id: "vintage", name: "Vintage", icon: "📼" },
                                  { id: "abstract", name: "Abstract", icon: "🎨" },
                                  { id: "cinematic", name: "Cinematic", icon: "🎬" },
                                  { id: "cyberpunk", name: "Cyberpunk", icon: "🌃" },
                                  { id: "animated", name: "Animated", icon: "🎭" },
                                  { id: "noir", name: "Noir", icon: "🌑" },
                                  { id: "pastel", name: "Pastel", icon: "🌸" },
                                  { id: "neon", name: "Neon", icon: "💡" },
                                  { id: "none", name: "None", icon: "⚪" }
                                ].find(s => s.id === videoStyle)?.name
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {videoStyle === "custom"
                              ? "Custom visual style"
                              : (() => {
                                  const description = [
                                    { id: "minimalist", description: "Clean, simple design with minimal elements and lots of white space" },
                                    { id: "vintage", description: "Retro, nostalgic aesthetic with warm tones and film grain effects" },
                                    { id: "abstract", description: "Artistic, non-representational visuals with bold colors and shapes" },
                                    { id: "cinematic", description: "Professional, movie-like quality with dramatic lighting and composition" },
                                    { id: "cyberpunk", description: "Neon-lit, dystopian future with electric colors and urban decay" },
                                    { id: "animated", description: "Dynamic, animated graphics with fluid motion and vibrant colors" },
                                    { id: "noir", description: "Dark, high-contrast black and white with dramatic shadows" },
                                    { id: "pastel", description: "Soft, muted color palette with gentle tones and dreamy atmosphere" },
                                    { id: "neon", description: "Bright, electric colors with glowing effects and high saturation" },
                                    { id: "none", description: "No specific style applied - use default settings" }
                                  ].find(s => s.id === videoStyle)?.description;
                                  return description ? description.substring(0, 40) + "..." : "";
                                })()
                            }
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="font-semibold text-muted-foreground">Select a style</div>
                          <div className="text-sm text-muted-foreground">Choose the visual style for your video</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
                </Button>
              </div>

              {/* Full Screen Video Type Selector */}
              <SelectionModal
                isOpen={showVideoTypeSelector}
                onClose={() => setShowVideoTypeSelector(false)}
                title="Choose Video Type"
                subtitle="Select the type of video you want to create for your music."
                options={[
                  {
                    id: "looped-static",
                    name: "Static Image",
                    description: "A single static image that matches your audio",
                    icon: "🖼️",
                    gradient: "from-blue-500/20 to-slate-500/20",
                    cost: videoTypeCosts.loopedVideoCost,
                    preview: "A picture of a mountain landscape at sunrise with soft golden light and mist rolling over the peaks."
                  },
                  {
                    id: "looped-animated",
                    name: "Animated Loop",
                    description: "A seamless looping video animation",
                    icon: "🎬",
                    gradient: "from-green-500/20 to-cyan-500/20",
                    cost: videoTypeCosts.loopedVideoCost,
                    preview: "An endless loop of glowing neon waves smoothly flowing across the screen."
                  },
                  {
                    id: "scenes",
                    name: "Video with Scenes",
                    description: "Multiple scenes with complex storytelling",
                    icon: "🎭",
                    gradient: "from-orange-500/20 to-red-500/20",
                    cost: videoTypeCosts.scenesVideoCost,
                    preview: "A cinematic music video of a lifeless geometric world, with surreal physics."
                  }
                ]}
                selectedId={videoType}
                onSelect={(id) => {
                  console.log('Video type selected:', id);
                  form.setValue("videoType", id as any);
                  form.trigger("videoType");
                  setShowVideoTypeSelector(false);
                  console.log('Form videoType after setValue:', form.getValues("videoType"));
                }}
                showCost={true}
                costConversionRate={1}
              />

              {/* Full Screen Style Selector Modal */}
              {isStyleSheetOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setIsStyleSheetOpen(false)}>
                  <div className="flex items-center justify-center min-h-screen p-4">
                    <div
                      className="bg-background rounded-3xl  max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between p-8 border-b border-border">
                        <div>
                          <h2 className="text-3xl font-bold text-foreground">Choose Your Style</h2>
                          <p className="text-muted-foreground mt-2">
                            Select the visual style that best matches your creative vision
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsStyleSheetOpen(false)}
                          className="h-12 w-12 rounded-full hover:bg-muted"
                        >
                          <X className="h-6 w-6" />
                        </Button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 overflow-y-auto p-8">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {[
                            { id: "minimalist", name: "Minimalist", keyword: "Clean", description: "Clean, simple design with minimal elements and lots of white space", icon: "✨", gradient: "from-gray-500/20 to-slate-500/20" },
                            { id: "vintage", name: "Vintage", keyword: "Retro", description: "Retro, nostalgic aesthetic with warm tones and film grain effects", icon: "📼", gradient: "from-amber-500/20 to-orange-500/20" },
                            { id: "abstract", name: "Abstract", keyword: "Artistic", description: "Artistic, non-representational visuals with bold colors and shapes", icon: "🎨", gradient: "from-slate-500/20 to-pink-500/20" },
                            { id: "cinematic", name: "Cinematic", keyword: "Dramatic", description: "Professional, movie-like quality with dramatic lighting and composition", icon: "🎬", gradient: "from-red-500/20 to-orange-500/20" },
                            { id: "cyberpunk", name: "Cyberpunk", keyword: "Neon", description: "Neon-lit, dystopian future with electric colors and urban decay", icon: "🌃", gradient: "from-pink-500/20 to-slate-500/20" },
                            { id: "animated", name: "Animated", keyword: "Dynamic", description: "Dynamic, animated graphics with fluid motion and vibrant colors", icon: "🎭", gradient: "from-pink-500/20 to-rose-500/20" },
                            { id: "noir", name: "Noir", keyword: "Dark", description: "Dark, high-contrast black and white with dramatic shadows", icon: "🌑", gradient: "from-gray-800/20 to-black/20" },
                            { id: "pastel", name: "Pastel", keyword: "Soft", description: "Soft, muted color palette with gentle tones and dreamy atmosphere", icon: "🌸", gradient: "from-pink-200/20 to-blue-200/20" },
                            { id: "neon", name: "Neon", keyword: "Bright", description: "Bright, electric colors with glowing effects and high saturation", icon: "💡", gradient: "from-cyan-400/20 to-pink-400/20" },
                            { id: "none", name: "None", keyword: "Default", description: "No specific style applied - use default settings", icon: "⚪", gradient: "from-gray-100/20 to-gray-200/20" }
                          ].map((style) => (
                            <div
                              key={style.id}
                              className={`group relative aspect-square p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                                videoStyle === style.id
                                  ? "border-muted-foreground bg-muted/50  ring-2 ring-muted-foreground/20"
                                  : "border-border hover:border-muted-foreground/50 hover:bg-muted/30 "
                              }`}
                              onClick={() => {
                                form.setValue("videoStyle", style.id);
                                form.trigger("videoStyle");
                                setIsStyleSheetOpen(false);
                              }}
                            >
                              {/* Selection Indicator */}
                              {videoStyle === style.id && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-muted-foreground rounded-full flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                </div>
                              )}

                              <div className="h-full flex flex-col">
                                {/* Icon Container */}
                                <div className={`flex-1 bg-gradient-to-br ${style.gradient} rounded-lg flex items-center justify-center relative overflow-hidden mb-2`}>
                                  <span className="text-3xl">{style.icon}</span>
                                </div>

                                {/* Content */}
                                <div className="space-y-1">
                                  <h3 className="font-bold text-sm text-foreground text-center truncate">{style.name}</h3>

                                  {/* Keyword */}
                                  <div className="flex justify-center">
                                    <span className="px-2 py-0.5 bg-muted/50 text-xs font-medium text-muted-foreground rounded-full">
                                      {style.keyword}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Custom Style Section */}
                        <div className="mt-8 pt-8 border-t border-border">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h3 className="text-xl font-semibold text-foreground">Custom Style</h3>
                              <p className="text-muted-foreground">Create your own unique visual style</p>
                            </div>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-12 px-6 flex items-center space-x-3 btn-secondary-hover"
                                >
                                  <Plus className="w-5 h-5" />
                                  <span>Create Custom</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>Create Custom Style</DialogTitle>
                                  <DialogDescription>
                                    Define your own unique style with a custom name and description.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="custom-style-name">Style Name</Label>
                                    <Input
                                      id="custom-style-name"
                                      placeholder="e.g., Cyberpunk Neon"
                                      value={customStyleName}
                                      onChange={(e) => setCustomStyleName(e.target.value)}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="custom-style-description">Description</Label>
                                    <Textarea
                                      id="custom-style-description"
                                      placeholder="Describe the visual characteristics of your custom style..."
                                      value={customStyleDescription}
                                      onChange={(e) => setCustomStyleDescription(e.target.value)}
                                      rows={3}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="btn-secondary-hover"
                                    onClick={() => {
                                      setCustomStyleName("");
                                      setCustomStyleDescription("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      if (customStyleName.trim()) {
                                        form.setValue("videoStyle", "custom");
                                        form.trigger("videoStyle");
                                        setIsStyleSheetOpen(false);
                                      }
                                    }}
                                    disabled={!customStyleName.trim()}
                                  >
                                    Create Style
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="videoStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input type="hidden" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Animation Style Options - Only show for animated loops */}
            {videoType === 'looped-animated' && (
              <div className="space-y-4">
                <FormLabel className="text-lg font-semibold">Animation Style</FormLabel>

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="animationStyle"
                    render={({ field }) => (
                      <FormItem>
                        <div
                          className={`flex items-center space-x-4 p-3 rounded-lg border border-border transition-colors duration-200 group cursor-pointer ${
                            field.value === "loop"
                            ? 'bg-blue-50 border-blue-200 dark:bg-[hsl(207_90%_68%_/_0.1)] dark:border-[hsl(207_90%_68%_/_0.6)]'
                            : 'bg-card hover:bg-muted/50'
                          }`}
                          onClick={() => field.onChange("loop")}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            field.value === "loop"
                              ? 'bg-blue-500 border-blue-500 dark:bg-[hsl(207_90%_68%_/_0.6)] dark:border-[hsl(207_90%_68%_/_0.6)]'
                              : 'border-muted-foreground'
                          }`}>
                            {field.value === "loop" && (
                              <div className="w-2 h-2 bg-white rounded-sm" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <FormLabel className="text-base font-medium group-hover:text-foreground cursor-pointer">
                              Loop Video
                            </FormLabel>
                            <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                              Seamless continuous loop
                            </p>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="animationStyle"
                    render={({ field }) => (
                      <FormItem>
                        <div
                          className={`flex items-center space-x-4 p-3 rounded-lg border border-border transition-colors duration-200 group cursor-pointer ${
                            field.value === "boomerang"
                              ? 'bg-blue-50 border-blue-200 dark:bg-[hsl(207_90%_68%_/_0.1)] dark:border-[hsl(207_90%_68%_/_0.6)]'
                              : 'bg-card hover:bg-muted/50'
                          }`}
                          onClick={() => field.onChange("boomerang")}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            field.value === "boomerang"
                              ? 'bg-blue-500 border-blue-500 dark:bg-[hsl(207_90%_68%_/_0.6)] dark:border-[hsl(207_90%_68%_/_0.6)]'
                              : 'border-muted-foreground'
                          }`}>
                            {field.value === "boomerang" && (
                              <div className="w-2 h-2 bg-white rounded-sm" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <FormLabel className="text-base font-medium group-hover:text-foreground cursor-pointer">
                              Boomerang
                            </FormLabel>
                            <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                              Forward then reverse playback
                            </p>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Video Creation Options */}
            <div className="space-y-4">
              <FormLabel className="text-lg font-semibold">Video Creation Options</FormLabel>

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="createIndividualVideos"
                  render={({ field }) => (
                    <FormItem>
                      <div
                        className={`flex items-center space-x-4 p-3 rounded-lg border border-border transition-colors duration-200 group cursor-pointer ${
                          field.value
                            ? 'bg-blue-50 border-blue-200 dark:bg-[hsl(207_90%_68%_/_0.1)] dark:border-[hsl(207_90%_68%_/_0.6)]'
                            : 'bg-card hover:bg-muted/50'
                        }`}
                        onClick={() => field.onChange(!field.value)}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          field.value
                            ? 'bg-blue-500 border-blue-500 dark:bg-[hsl(207_90%_68%_/_0.6)] dark:border-[hsl(207_90%_68%_/_0.6)]'
                            : 'border-muted-foreground'
                        }`}>
                          {field.value && (
                            <div className="w-2 h-2 bg-white rounded-sm" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <FormLabel className="text-base font-medium group-hover:text-foreground cursor-pointer">
                            Create individual videoclips
                          </FormLabel>
                          <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                            Generate a separate video for each music track
                          </p>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="createCompilation"
                  render={({ field }) => (
                    <FormItem>
                      <div
                        className={`flex items-center space-x-4 p-3 rounded-lg border border-border transition-colors duration-200 group cursor-pointer ${
                          field.value
                          ? 'bg-blue-50 border-blue-200 dark:bg-[hsl(207_90%_68%_/_0.1)] dark:border-[hsl(207_90%_68%_/_0.6)]'
                          : 'bg-card hover:bg-muted/50'
                      }`}
                      onClick={() => field.onChange(!field.value)}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        field.value
                          ? 'bg-blue-500 border-blue-500 dark:bg-[hsl(207_90%_68%_/_0.6)] dark:border-[hsl(207_90%_68%_/_0.6)]'
                            : 'border-muted-foreground'
                        }`}>
                          {field.value && (
                            <div className="w-2 h-2 bg-white rounded-sm" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <FormLabel className="text-base font-medium group-hover:text-foreground cursor-pointer">
                            Create a compilation
                          </FormLabel>
                          <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                            Generate a single video combining all tracks
                          </p>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="useSameVideoForAll"
                  render={({ field }) => (
                    <FormItem>
                      <div
                        className={`flex items-center space-x-4 p-3 rounded-lg border border-border transition-colors duration-200 group cursor-pointer ${
                          field.value
                            ? 'bg-blue-50 border-blue-200 dark:bg-[hsl(207_90%_68%_/_0.1)] dark:border-[hsl(207_90%_68%_/_0.6)]'
                            : 'bg-card hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          const newValue = !field.value;
                          field.onChange(newValue);
                          // Call validation update directly after the form field changes
                          if (onReuseVideoToggle) {
                            onReuseVideoToggle(newValue);
                          }
                        }}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          field.value
                            ? 'bg-blue-500 border-blue-500 dark:bg-[hsl(207_90%_68%_/_0.6)] dark:border-[hsl(207_90%_68%_/_0.6)]'
                            : 'border-muted-foreground'
                        }`}>
                          {field.value && (
                            <div className="w-2 h-2 bg-white rounded-sm" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <FormLabel className="text-base font-medium group-hover:text-foreground cursor-pointer">
                            Reuse videoclip
                          </FormLabel>
                          <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                            Apply the same video content to all tracks
                          </p>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <BudgetSlider
                      videoType={videoType}
                      audioDuration={totalDuration}
                      value={field.value || [1]}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Also update the user_price field when budget changes
                        form.setValue("user_price", value[0] || 1);
                      }}
                      totalDuration={totalDuration}
                      trackCount={trackCount}
                      trackDurations={trackDurations}
                      reuseVideo={reuseVideo}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!hideNavigation && (
              <div className="flex justify-between">
                <Button type="button" variant="outline" className="btn-secondary-hover" onClick={onBack}>Back</Button>
                <Button
                  type="submit"
                  className="btn-ai-gradient text-white flex items-center space-x-2"
                >
                  <Video className="w-4 h-4" />
                  <span>Generate Video ({form.getValues('budget')?.[0] || 0} credits)</span>
                </Button>
              </div>
            )}
        </form>
      </Form>
    </div>
  );
}
