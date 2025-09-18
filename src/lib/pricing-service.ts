import { z } from "zod";
import { PricingConfig } from "@/contexts/pricing-context";

export interface PriceResult {
  usd: number;
  credits: number;
}

class PricingService {
  private config: PricingConfig | null = null;

  setConfig(config: PricingConfig) {
    this.config = config;
  }

  getConfig(): PricingConfig {
    if (!this.config) {
      // Return default config if not initialized yet
      return {
        credits_rate: 20,
        music_generator: {
          "stable-audio": {
            price: 0.5,
            description: "Generate a music track based on the description."
          },
          "vibewave-model": {
            price: 1.0,
            description: "Generate a music track based on the description."
          }
        },
        image_generator: {
          "vibewave-model": {
            minute_rate: 0.10,
            unit_rate: 0.50,
            min: 3,
            max: null,
            description: "Generate an image based on the description."
          }
        },
        looped_animation_generator: {
          "vibewave-model": {
            minute_rate: 0.11,
            unit_rate: 1,
            min: 3,
            max: null,
            description: "Generate a looping animation based on the description."
          }
        },
        video_generator: {
          "vibewave-model": {
            "video-duration": 5,
            minute_rate: 10,
            min: 20,
            max: null,
            description: "Generate a video based on the description."
          }
        }
      };
    }
    return this.config;
  }

  private toCredits(dollars: number, creditsRate: number): number {
    return Math.ceil(dollars * creditsRate);
  }

  calculateMusicPrice(numTracks: number, model: 'stable-audio' | 'vibewave-model' = 'stable-audio'): PriceResult {
    const config = this.getConfig();
    const modelConfig = config.music_generator[model];
    const price = numTracks * modelConfig.price;
    return {
      usd: Math.round(price * 100) / 100,
      credits: this.toCredits(price, config.credits_rate)
    };
  }

  calculateImagePrice(numUnits: number, totalMinutes: number, model: 'vibewave-model' = 'vibewave-model'): PriceResult {
    const config = this.getConfig();
    const modelConfig = config.image_generator[model];
    const base = (numUnits * modelConfig.unit_rate) + (totalMinutes * modelConfig.minute_rate);
    const price = Math.max(base, modelConfig.min);
    return {
      usd: Math.round(price * 100) / 100,
      credits: this.toCredits(price, config.credits_rate)
    };
  }

  calculateLoopedAnimationPrice(numUnits: number, totalMinutes: number, model: 'vibewave-model' = 'vibewave-model'): PriceResult {
    const config = this.getConfig();
    const modelConfig = config.looped_animation_generator[model];
    const base = (numUnits * modelConfig.unit_rate) + (totalMinutes * modelConfig.minute_rate);
    let price = Math.max(base, modelConfig.min);
    if (modelConfig.max) {
      price = Math.min(price, modelConfig.max);
    }
    return {
      usd: Math.round(price * 100) / 100,
      credits: this.toCredits(price, config.credits_rate)
    };
  }

  calculateVideoPrice(durationMinutes: number, model: 'vibewave-model' = 'vibewave-model'): PriceResult {
    const config = this.getConfig();
    const modelConfig = config.video_generator[model];
    const base = durationMinutes * modelConfig.minute_rate;
    const price = Math.max(base, modelConfig.min);
    return {
      usd: Math.round(price * 100) / 100,
      credits: this.toCredits(price, config.credits_rate)
    };
  }

  // Helper function to calculate budget based on settings
  calculateBudget(settings: {
    videoType: string;
    trackCount: number;
    trackDurations: number[];
    useSameVideoForAll: boolean;
    model?: string;
  }): number {
    const totalMinutes = settings.trackDurations.reduce((sum, duration) => sum + duration, 0) / 60;
    const longestTrackMinutes = Math.max(...settings.trackDurations) / 60;
    const model = settings.model as 'vibewave-model' || 'vibewave-model';

    switch (settings.videoType) {
      case 'looped-static':
        const imageUnits = settings.useSameVideoForAll ? 1 : settings.trackCount;
        const imagePrice = this.calculateImagePrice(imageUnits, totalMinutes, model);
        return imagePrice.credits;

      case 'looped-animation':
        const animationUnits = settings.useSameVideoForAll ? 1 : settings.trackCount;
        const animationPrice = this.calculateLoopedAnimationPrice(animationUnits, totalMinutes, model);
        return animationPrice.credits;

      case 'video':
        const videoDuration = settings.useSameVideoForAll ? longestTrackMinutes : totalMinutes;
        const videoPrice = this.calculateVideoPrice(videoDuration, model);
        return videoPrice.credits;

      default:
        return 100; // Default fallback
    }
  }
}

export const pricingService = new PricingService();
