
"use client";

import { useRef, useState, useMemo } from "react";
import { Input } from "@/app/dashboard/components/ui/input";
import { Button } from "@/app/dashboard/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/dashboard/components/ui/card";
import { Separator } from "@/app/dashboard/components/ui/separator";
import { Textarea } from "@/app/dashboard/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/dashboard/components/ui/select";
import { Label } from "@/app/dashboard/components/ui/label";
import { Upload, Wand2, Loader2, Sparkles, Music, Clock, Settings, HelpCircle } from "lucide-react";
import type { GenerationMode } from "@/app/dashboard/components/vibewave-generator";
import { usePricing } from "@/hooks/use-pricing";

type StepUploadProps = {
    generationMode: GenerationMode;
    setGenerationMode: (mode: GenerationMode) => void;
    handleAudioFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    musicPrompt: string;
    setMusicPrompt: (prompt: string) => void;
    vibeFile: File | null;
    setVibeFile: (file: File | null) => void;
    handleGenerateMusic: (options?: { duration: number; model: string }) => void;
    isGeneratingMusic: boolean;
};

export function StepUpload({
    generationMode,
    setGenerationMode,
    handleAudioFileChange,
    musicPrompt,
    setMusicPrompt,
    vibeFile,
    setVibeFile,
    handleGenerateMusic,
    isGeneratingMusic,
}: StepUploadProps) {
  const vibeFileRef = useRef<HTMLInputElement | null>(null);
  const [duration, setDuration] = useState(20);
  const [model, setModel] = useState("stable-audio-2.5");
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const { pricing, loading: pricingLoading, error: pricingError } = usePricing();
  
  // Calculate music generation cost
  const musicCost = useMemo(() => {
    if (!pricing) return 0;
    return Math.ceil(pricing.music_generator.price * pricing.credits_rate);
  }, [pricing]);

  const handleVibeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVibeFile(file);
    }
  };

  const handleGenerateClick = () => {
    handleGenerateMusic({ duration, model });
  };

  return (
    <Card className="w-full animate-fade-in-up bg-card border border-border shadow-lg">
        <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Music className="w-6 h-6 text-white" />
                </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Step 1: Get Your Music</CardTitle>
            <CardDescription className="text-muted-foreground text-base">Upload your own track or generate one with AI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {generationMode === "upload" ? (
                <>
                    <label htmlFor="audio-upload" className="flex flex-col items-center justify-center p-16 rounded-xl cursor-pointer border-2 border-dashed border-border hover:border-purple-500/50 transition-all duration-300 bg-muted/30 hover:bg-muted/50 group">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <p className="font-semibold text-foreground text-lg mb-2">Click to upload or drag & drop</p>
                        <p className="text-sm text-muted-foreground">MP3, WAV, M4A, etc.</p>
                        <Input id="audio-upload" type="file" accept="audio/*" className="hidden" onChange={handleAudioFileChange} />
                    </label>
                    <div className="flex items-center my-6">
                        <Separator className="flex-1" />
                        <span className="px-6 text-sm text-muted-foreground font-medium">OR</span>
                        <Separator className="flex-1" />
                    </div>
                    <Button variant="outline" className="w-full h-12 text-base font-semibold btn-secondary-hover" onClick={() => setGenerationMode("generate")}>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Music with AI
                    </Button>
                </>
            ) : (
                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground">Describe your music</label>
                        <Textarea
                          placeholder='e.g., "A lo-fi hip hop beat with a chill, rainy day vibe."'
                          className="min-h-[120px] resize-none text-base"
                          value={musicPrompt}
                          onChange={(e) => setMusicPrompt(e.target.value)}
                          minLength={10}
                        />
                    </div>
                    <label htmlFor="vibe-upload" className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground cursor-pointer hover:bg-muted/70 transition-colors border border-border">
                        <Upload className="w-4 h-4"/>
                        <span className="flex-1">{vibeFile ? vibeFile.name : 'Optional: Upload a file for the vibe (image, audio, etc.)'}</span>
                        <Input id="vibe-upload" ref={vibeFileRef} type="file" className="hidden" onChange={handleVibeFileChange} />
                    </label>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Advanced Settings
                            </Button>
                        </div>
                        
                        {showAdvanced && (
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                                <div className="space-y-2">
                                    <Label htmlFor="duration" className="text-sm font-medium flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Duration (seconds)
                                    </Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        min="5"
                                        max="60"
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="model" className="text-sm font-medium">
                                        Model
                                    </Label>
                                    <Select value={model} onValueChange={setModel}>
                                        <SelectTrigger className="text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="stable-audio-2.5">Stable Audio 2.5</SelectItem>
                                            <SelectItem value="stable-audio-2">Stable Audio 2</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Pricing Display */}
                    {!pricingLoading && pricing && (
                        <div className="space-y-4 budget-slider-container">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    <span className="text-muted-foreground">Music Generation Cost</span>
                                    <div className="group relative">
                                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                            {pricing.music_generator.description}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">credits</span>
                                        <Input 
                                            type="number" 
                                            value={musicCost}
                                            readOnly
                                            className="w-32 pl-12 pr-2 text-right font-semibold bg-muted/50"
                                        />
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        (per track)
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <Button className="w-full h-12 text-base font-semibold gradient-primary text-white hover:opacity-90 transition-opacity" onClick={handleGenerateClick} disabled={isGeneratingMusic || (!vibeFile && musicPrompt.length < 10)}>
                        {isGeneratingMusic ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <Sparkles className="w-5 h-5 mr-2" />
                        )}
                        Generate Music with AI
                    </Button>
                    <div className="flex items-center my-6">
                        <Separator className="flex-1" />
                        <span className="px-6 text-sm text-muted-foreground font-medium">OR</span>
                        <Separator className="flex-1" />
                    </div>
                    <Button variant="outline" className="w-full h-12 text-base font-semibold btn-secondary-hover" onClick={() => setGenerationMode("upload")}>
                        <Upload className="w-5 h-5 mr-2" />
                        Upload a File Instead
                    </Button>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
