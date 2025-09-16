
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SimpleSlider } from "@/app/dashboard/components/ui/simple-slider";
import { Input } from "@/app/dashboard/components/ui/input";
import { cn } from "@/lib/utils";
import { CONFIG } from "@/lib/config";
import { calculateLoopedBudget, calculateScenesBudget, getScenesInfo } from "@/app/dashboard/components/vibewave-generator";
import { usePricing, type PricingConfig } from "@/hooks/use-pricing";
import { HelpCircle } from "lucide-react";

type BudgetSliderProps = {
  videoType: "looped-static" | "looped-animated" | "scenes";
  audioDuration: number; // in seconds
  value: number[];
  onValueChange: (value: number[]) => void;
  totalDuration?: number;
  trackCount?: number;
  trackDurations?: number[];
  reuseVideo?: boolean;
};


// Calculate cost per unit based on video type using the same logic as vibewave-generator
const getCostPerUnit = (videoType: string, trackCount: number, totalDuration: number, trackDurations: number[], pricing: PricingConfig | null, reuseVideo: boolean = false) => {
  if (!pricing) return 100; // Default to 100 credits if pricing not loaded
  
  if (videoType === 'looped-static' || videoType === 'looped-animated') {
    // For static/animated, this is the total cost, not per unit
    return calculateLoopedBudget(totalDuration, trackCount, pricing, reuseVideo, videoType as 'looped-static' | 'looped-animated');
  } else if (videoType === 'scenes') {
    // For scenes, calculate the maximum cost (all scenes distributed across videos)
    const totalScenes = Math.ceil(totalDuration / 7.5);
    const numberOfVideos = trackDurations.length || 1;
    const maxScenesPerVideo = Math.ceil(totalScenes / numberOfVideos);
    const durationPerSceneMinutes = 7.5 / 60; // 0.125 minutes per scene
    const costPerScene = durationPerSceneMinutes * pricing.video_generator.minute_rate;
    const maxCost = maxScenesPerVideo * costPerScene * numberOfVideos;
    return Math.round(maxCost * pricing.credits_rate);
  }
  
  return 100; // Default to 100 credits
};

// Calculate budget value from number of units
const getBudgetFromUnits = (units: number, videoType: string, trackCount: number, totalDuration: number, trackDurations: number[], pricing: PricingConfig | null, reuseVideo: boolean = false) => {
  const costPerUnit = getCostPerUnit(videoType, trackCount, totalDuration, trackDurations, pricing, reuseVideo);
  return Math.round(units * costPerUnit);
};

// Calculate number of units from budget
const getUnitsFromBudget = (budget: number, videoType: string, trackCount: number, totalDuration: number, trackDurations: number[], pricing: PricingConfig | null, reuseVideo: boolean = false) => {
  const costPerUnit = getCostPerUnit(videoType, trackCount, totalDuration, trackDurations, pricing, reuseVideo);
  return Math.floor(budget / costPerUnit);
};

// Calculate number of videos that can be created based on budget
const calculateVideoCount = (budget: number, videoType: string, trackCount: number, totalDuration: number, trackDurations: number[], pricing: PricingConfig | null, reuseVideo: boolean = false) => {
  const units = getUnitsFromBudget(budget, videoType, trackCount, totalDuration, trackDurations, pricing, reuseVideo);
  
  if (videoType === 'scenes') {
    // For scenes, when reusing video, we create 1 video with all scenes
    // When not reusing, we create multiple videos
    return reuseVideo ? 1 : units;
  }
  
  return units;
};

// Get slider value based on number of units (0-100 maps to minUnits-maxUnits)
const getSliderValueFromUnits = (units: number, minUnits: number, maxUnits: number) => {
  if (units <= minUnits) return 0;
  if (units >= maxUnits) return 100;
  if (maxUnits === minUnits) return 0;
  return Math.round(((units - minUnits) / (maxUnits - minUnits)) * 100);
};

// Get number of units from slider value (0-100 maps to minUnits-maxUnits)
const getUnitsFromSliderValue = (sliderValue: number, minUnits: number, maxUnits: number) => {
  if (sliderValue <= 0) return minUnits;
  if (sliderValue >= 100) return maxUnits;
  return Math.round(minUnits + (sliderValue / 100) * (maxUnits - minUnits));
};

export function BudgetSlider({ 
  videoType, 
  audioDuration, 
  value, 
  onValueChange, 
  totalDuration = 0, 
  trackCount = 1, 
  trackDurations = [], 
  reuseVideo = false 
}: BudgetSliderProps) {
  const { pricing, loading: pricingLoading, error: pricingError } = usePricing();
  
  // Calculate cost based on video type
  const calculatedCost = useMemo(() => {
    return getCostPerUnit(videoType, trackCount, totalDuration, trackDurations, pricing, reuseVideo);
  }, [videoType, trackCount, totalDuration, trackDurations, pricing, reuseVideo]);

  // For scenes, calculate scenes-per-video slider logic
  const totalVideos = trackDurations.length || 1; // Fixed number of videos (music tracks)
  const totalScenes = Math.ceil(totalDuration / 7.5); // Total scenes across all videos
  const minScenesPerVideo = 1; // Minimum 1 scene per video
  // When reusing video, create 1 video with all scenes, otherwise distribute across videos
  const maxScenesPerVideo = reuseVideo ? totalScenes : Math.ceil(totalScenes / totalVideos);
  
  // Calculate cost per scene
  const costPerScene = useMemo(() => {
    if (videoType === 'scenes' && pricing) {
      const durationPerSceneMinutes = 7.5 / 60; // 0.125 minutes per scene
      return Math.round(durationPerSceneMinutes * pricing.video_generator.minute_rate * pricing.credits_rate);
    }
    return 0;
  }, [videoType, pricing]);

  // Use the external value as the source of truth, handle NaN
  const currentValue = value[0] || 0;
  const inputValue = isNaN(currentValue) ? 0 : currentValue;
  
  // For scenes, calculate current scenes per video from budget
  const currentScenesPerVideo = videoType === 'scenes' 
    ? Math.max(minScenesPerVideo, Math.min(maxScenesPerVideo, Math.round(inputValue / (costPerScene * (reuseVideo ? 1 : totalVideos)))))
    : 1;
  
  // For scenes, map scenes per video (1-maxScenesPerVideo) to slider value (0-100)
  const sliderValue = videoType === 'scenes' 
    ? Math.round(((currentScenesPerVideo - minScenesPerVideo) / (maxScenesPerVideo - minScenesPerVideo)) * 100)
    : 0;

  // Set initial budget based on video type (only when pricing is loaded and value is 0 or invalid)
  useEffect(() => {
    if (pricing && (inputValue === 0 || isNaN(inputValue))) {
      if (videoType === 'scenes') {
        // For scenes, use the calculated cost as the maximum value
        onValueChange([calculatedCost]);
      } else {
        // For static/animated, use fixed calculated cost
        onValueChange([calculatedCost]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoType, pricing]);

  
  const handleSliderChange = (newSliderValue: number[]) => {
    if (videoType === 'scenes') {
      // Map slider value (0-100) to scenes per video (1-maxScenesPerVideo)
      const sliderPercent = newSliderValue[0] / 100;
      const newScenesPerVideo = Math.max(minScenesPerVideo, Math.min(maxScenesPerVideo, Math.round(minScenesPerVideo + sliderPercent * (maxScenesPerVideo - minScenesPerVideo))));
      const newBudgetValue = newScenesPerVideo * costPerScene * totalVideos;
      
      // Only update if the value actually changed to prevent infinite loops
      if (Math.abs(newBudgetValue - inputValue) > 1) {
        onValueChange([newBudgetValue]);
      }
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (videoType === 'scenes') {
      const newCredits = Number(event.target.value);
      // Only update if the value actually changed to prevent infinite loops
      if (Math.abs(newCredits - inputValue) > 1) {
        onValueChange([newCredits]);
      }
    }
  }

  const handleInputBlur = () => {
    if (videoType === 'scenes') {
      let budget = inputValue;
      const minBudget = costPerScene * totalVideos; // 1 scene per video
      const maxBudget = calculatedCost; // Use calculated cost as maximum
      
      if (isNaN(budget) || budget < minBudget) budget = minBudget;
      if (budget > maxBudget) budget = maxBudget;
      
      // Snap to nearest scenes per video
      const scenesPerVideo = Math.round(budget / (costPerScene * totalVideos));
      const snappedScenesPerVideo = Math.max(minScenesPerVideo, Math.min(maxScenesPerVideo, scenesPerVideo));
      const snappedBudget = snappedScenesPerVideo * costPerScene * totalVideos;
      
      onValueChange([snappedBudget]);
    }
  }

  // Calculate video count for current budget
  const videoCount = videoType === 'scenes' 
    ? calculateVideoCount(inputValue, videoType, trackCount, totalDuration, trackDurations, pricing, reuseVideo)
    : trackCount; // For static/animated, show track count
  
  // Get scenes info for display
  const scenesInfo = videoType === 'scenes' 
    ? (() => {
        const numberOfVideos = reuseVideo ? 1 : totalVideos; // 1 video when reusing, otherwise number of tracks
        const scenesPerVideo = currentScenesPerVideo; // Current scenes per video from slider
        return {
          scenesPerVideo,
          numberOfVideos,
          totalScenes
        };
      })()
    : null;
  
  // Get video type label
  const getVideoTypeLabel = () => {
    if (videoType === 'looped-static') return 'images';
    if (videoType === 'looped-animated') return 'animation loops';
    if (videoType === 'scenes') {
      // Show "9 videos of x scenes" format
      return `${scenesInfo?.numberOfVideos || 0} videos of ${scenesInfo?.scenesPerVideo || 0} scenes`;
    }
    return 'videos';
  };

  // Show loading state while pricing is being fetched
  if (pricingLoading) {
    return (
      <div className="space-y-4 budget-slider-container">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-muted-foreground">Loading pricing...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if pricing failed to load
  if (pricingError || !pricing) {
    return (
      <div className="space-y-4 budget-slider-container">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-destructive">Error loading pricing</span>
          </div>
        </div>
      </div>
    );
  }

  // For scenes, show slider; for others, show fixed price
  if (videoType === 'scenes') {
    return (
      <div className="space-y-4 budget-slider-container">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-muted-foreground">Your Budget</span>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                Price influences the number of videos created for each type
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">credits</span>
                <Input 
                    type="number" 
                    value={isNaN(inputValue) ? 0 : inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className="w-32 pl-12 pr-2 text-right font-semibold"
                    min={costPerScene * totalVideos}
                    max={calculatedCost}
                    step={costPerScene * totalVideos}
                />
            </div>
            <span className="text-sm text-muted-foreground">
              {videoType === 'scenes' 
                ? `(${scenesInfo?.numberOfVideos || 0} videos of ${scenesInfo?.scenesPerVideo || 0} scenes)`
                : `(${videoCount} ${getVideoTypeLabel()})`
              }
            </span>
          </div>
        </div>
        <div className="relative">
          <SimpleSlider
            value={[sliderValue]}
            onValueChange={handleSliderChange}
            max={100}
            step={1}
          />
        </div>
      </div>
    );
  } else {
    // Fixed pricing for static images and animated loops
    return (
      <div className="space-y-4 budget-slider-container">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-muted-foreground">Calculated Price</span>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                Price is calculated based on duration and video type
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">credits</span>
                <Input 
                    type="number" 
                    value={isNaN(calculatedCost) ? 0 : calculatedCost}
                    readOnly
                    className="w-32 pl-12 pr-2 text-right font-semibold bg-muted/50"
                />
            </div>
            <span className="text-sm text-muted-foreground">
              {`(${videoCount} ${getVideoTypeLabel()})`}
            </span>
          </div>
        </div>
      </div>
    );
  }
}
