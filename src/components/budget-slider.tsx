
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { SimpleSlider } from "@/components/ui/simple-slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getScenesInfo } from "@/components/vibewave-generator";
import { usePricing } from "@/hooks/use-pricing";
import { PricingConfig } from "@/contexts/pricing-context";
import { usePricingService } from "@/hooks/use-pricing-service";
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


// Calculate cost per unit based on video type using the new pricing service
const getCostPerUnit = (videoType: string, trackCount: number, totalDuration: number, trackDurations: number[], pricingService: any, reuseVideo: boolean = false) => {
  try {
    const totalMinutes = totalDuration / 60;
    
    if (videoType === 'looped-static') {
      const units = reuseVideo ? 1 : trackCount;
      const price = pricingService.calculateImagePrice(units, totalMinutes);
      return price.credits;
    } else if (videoType === 'looped-animated') {
      const units = reuseVideo ? 1 : trackCount;
      const price = pricingService.calculateLoopedAnimationPrice(units, totalMinutes);
      return price.credits;
    } else if (videoType === 'scenes') {
      const longestTrackMinutes = Math.max(...trackDurations) / 60;
      const videoDuration = reuseVideo ? longestTrackMinutes : totalMinutes;
      const price = pricingService.calculateVideoPrice(videoDuration);
      return price.credits;
    }
  } catch (error) {
    console.error('Error calculating cost:', error);
  }
  
  return 100; // Default to 100 credits
};

// Calculate budget value from number of units
const getBudgetFromUnits = (units: number, videoType: string, trackCount: number, totalDuration: number, trackDurations: number[], pricingService: any, reuseVideo: boolean = false) => {
  const costPerUnit = getCostPerUnit(videoType, trackCount, totalDuration, trackDurations, pricingService, reuseVideo);
  return Math.round(units * costPerUnit);
};

// Calculate number of units from budget
const getUnitsFromBudget = (budget: number, videoType: string, trackCount: number, totalDuration: number, trackDurations: number[], pricingService: any, reuseVideo: boolean = false) => {
  const costPerUnit = getCostPerUnit(videoType, trackCount, totalDuration, trackDurations, pricingService, reuseVideo);
  return Math.floor(budget / costPerUnit);
};

// Calculate number of videos that can be created based on budget
const calculateVideoCount = (budget: number, videoType: string, trackCount: number, totalDuration: number, trackDurations: number[], pricingService: any, reuseVideo: boolean = false) => {
  const units = getUnitsFromBudget(budget, videoType, trackCount, totalDuration, trackDurations, pricingService, reuseVideo);
  
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
  const pricingService = usePricingService();
  
  // Calculate cost based on video type
  const [calculatedCost, setCalculatedCost] = useState(100);
  
  // Memoize trackDurations to prevent infinite re-renders
  const memoizedTrackDurations = useMemo(() => trackDurations, [trackDurations?.join(',')]);
  
  // Use ref to track previous values and prevent unnecessary updates
  const prevValuesRef = useRef({
    videoType,
    trackCount,
    totalDuration,
    trackDurations: memoizedTrackDurations,
    pricing,
    reuseVideo
  });

  useEffect(() => {
    const updateCost = () => {
      if (pricing) {
        const cost = getCostPerUnit(videoType, trackCount, totalDuration, memoizedTrackDurations, pricingService, reuseVideo);
        // Round up to nearest 5 for scenes
        const roundedCost = videoType === 'scenes' ? Math.ceil(cost / 5) * 5 : cost;
        setCalculatedCost(roundedCost);
      }
    };
    
    // Check if any relevant values have actually changed
    const currentValues = {
      videoType,
      trackCount,
      totalDuration,
      trackDurations: memoizedTrackDurations,
      pricing,
      reuseVideo
    };
    
    const hasChanged = Object.keys(currentValues).some(key => 
      currentValues[key as keyof typeof currentValues] !== prevValuesRef.current[key as keyof typeof prevValuesRef.current]
    );
    
    if (hasChanged) {
      updateCost();
      prevValuesRef.current = currentValues;
    }
  }, [videoType, trackCount, totalDuration, memoizedTrackDurations, pricing, reuseVideo]);

  // For scenes, calculate scenes-per-video slider logic
  const totalVideos = memoizedTrackDurations.length || 1; // Fixed number of videos (music tracks)
  const videoDuration = reuseVideo ? Math.max(...memoizedTrackDurations) / 60 : totalDuration / 60; // Use longest track if reusing, total if not
  const videoDurationFromConfig = (pricing?.video_generator?.['vibewave-model']?.['video-duration'] || 5) / 60; // Get from config and convert to minutes
  const totalScenes = Math.ceil(videoDuration / videoDurationFromConfig); // Total scenes based on video duration
  const minScenesPerVideo = 1; // Minimum 1 scene per video
  const videosToCreate = reuseVideo ? 1 : totalVideos;
  const maxScenesPerVideo = Math.ceil(totalScenes / videosToCreate); // Maximum scenes per video (total scenes ÷ number of videos)
  
  // Calculate cost per scene
  const costPerScene = useMemo(() => {
    if (videoType === 'scenes' && pricing) {
      const modelConfig = pricing.video_generator['vibewave-model'];
      const durationPerSceneMinutes = videoDurationFromConfig; // Already in minutes
      return Math.round(durationPerSceneMinutes * modelConfig.minute_rate * pricing.credits_rate);
    }
    return 0;
  }, [videoType, pricing, videoDurationFromConfig]);

  // Use the external value as the source of truth, handle NaN
  const currentValue = value[0] || 0;
  const inputValue = isNaN(currentValue) ? 0 : currentValue;
  
  // For scenes, calculate current scenes per video from budget
  const currentScenesPerVideo = videoType === 'scenes' 
    ? (inputValue <= 0 || isNaN(inputValue))
      ? maxScenesPerVideo  // Use maximum when no value is set
      : Math.max(minScenesPerVideo, Math.min(maxScenesPerVideo, Math.floor(inputValue / (costPerScene * videosToCreate))))
    : 1;
  
  // For scenes, map scenes per video (1-maxScenesPerVideo) to slider value (0-100)
  // If inputValue is 0 or invalid, start at maximum (100) to show max scenes per video
  const sliderValue = videoType === 'scenes' 
    ? (inputValue <= 0 || isNaN(inputValue)) 
      ? 100  // Start at maximum when no value is set
      : Math.round(((currentScenesPerVideo - minScenesPerVideo) / Math.max(1, maxScenesPerVideo - minScenesPerVideo)) * 100)
    : 0;


  // Set initial budget based on video type and reset when reuseVideo changes
  useEffect(() => {
    if (pricing && calculatedCost > 0) {
      if (videoType === 'scenes') {
        // For scenes, always start with maximum scenes per video
        const maxScenesCost = maxScenesPerVideo * costPerScene * videosToCreate;
        // Round to nearest 5
        const roundedMaxCost = Math.ceil(maxScenesCost / 5) * 5;
        // Only update if the value is significantly different to prevent infinite loops
        if (Math.abs(roundedMaxCost - inputValue) > 1) {
          onValueChange([roundedMaxCost]);
        }
      } else {
        // For non-scenes, only set if no value is set
        if (inputValue === 0 || isNaN(inputValue)) {
          onValueChange([calculatedCost]);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoType, pricing, calculatedCost, maxScenesPerVideo, costPerScene, reuseVideo, totalVideos, videosToCreate]);

  
  const handleSliderChange = (newSliderValue: number[]) => {
    if (videoType === 'scenes') {
      // Map slider value (0-100) to scenes per video (1-maxScenesPerVideo)
      const sliderPercent = newSliderValue[0] / 100;
      const newScenesPerVideo = Math.max(minScenesPerVideo, Math.min(maxScenesPerVideo, Math.round(minScenesPerVideo + sliderPercent * (maxScenesPerVideo - minScenesPerVideo))));
      
      // Calculate budget based on scenes per video
      const newBudgetValue = newScenesPerVideo * costPerScene * videosToCreate;
      
      // Round to nearest 5
      const roundedBudget = Math.ceil(newBudgetValue / 5) * 5;
      
      // Only update if the value actually changed to prevent infinite loops
      if (Math.abs(roundedBudget - inputValue) > 1) {
        onValueChange([roundedBudget]);
      }
    } else {
      // For non-scenes, just update the value directly
      onValueChange(newSliderValue);
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
      const minBudget = costPerScene * videosToCreate; // 1 scene per video
      const maxBudget = calculatedCost; // Use calculated cost as maximum
      
      if (isNaN(budget) || budget < minBudget) budget = minBudget;
      if (budget > maxBudget) budget = maxBudget;
      
      // Snap to nearest scenes per video
      const scenesPerVideo = Math.floor(budget / (costPerScene * videosToCreate));
      const snappedScenesPerVideo = Math.max(minScenesPerVideo, Math.min(maxScenesPerVideo, scenesPerVideo));
      const snappedBudget = snappedScenesPerVideo * costPerScene * videosToCreate;
      
      // Round to nearest 5
      const roundedBudget = Math.ceil(snappedBudget / 5) * 5;
      
      onValueChange([roundedBudget]);
    }
  }

  // Calculate video count for current budget
  const videoCount = videoType === 'scenes' 
    ? calculateVideoCount(inputValue, videoType, trackCount, totalDuration, memoizedTrackDurations, pricingService, reuseVideo)
    : trackCount; // For static/animated, show track count
  
  // Get scenes info for display
  const scenesInfo = videoType === 'scenes' 
    ? (() => {
        const numberOfVideos = videosToCreate; // Use the calculated videos to create
        const scenesPerVideo = currentScenesPerVideo; // Current scenes per video from slider
        return {
          scenesPerVideo,
          numberOfVideos,
          totalScenes: scenesPerVideo * numberOfVideos // Total scenes = scenes per video × number of videos
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
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-xs">
                For scenes: Budget determines how many videos and scenes per video you can create. Higher budget = more scenes per video.
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
                    min={costPerScene * videosToCreate}
                    max={calculatedCost}
                    step={costPerScene * videosToCreate}
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
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-xs">
                <div className="space-y-1">
                  <div><strong>Static/Animated:</strong> (Units × Rate) + (Duration × Rate)</div>
                  <div><strong>Scenes:</strong> Duration × $30/min (min $5)</div>
                  <div>Units = 1 if reusing video, otherwise track count</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {`(${videoCount} ${getVideoTypeLabel()})`}
            </span>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">credits</span>
                <Input 
                    type="number" 
                    value={isNaN(calculatedCost) ? 0 : calculatedCost}
                    readOnly
                    className="w-32 pl-12 pr-2 text-right font-semibold bg-muted/50"
                />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
