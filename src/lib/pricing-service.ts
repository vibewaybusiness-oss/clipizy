import { z } from "zod";
import { PricingConfig } from "@/contexts/pricing-context";

export interface PriceResult {
  usd: number;
  credits: number;
}

class PricingService {
  private config: PricingConfig | null = null;
  private configPromise: Promise<PricingConfig> | null = null;

  setConfig(config: PricingConfig) {
    this.config = config;
  }

  async getConfig(): Promise<PricingConfig> {
    if (this.config) {
      return this.config;
    }

    if (this.configPromise) {
      return this.configPromise;
    }

    this.configPromise = this.fetchConfig();
    return this.configPromise;
  }

  private async fetchConfig(): Promise<PricingConfig> {
    try {
      const response = await fetch('/api/pricing/config');
      if (!response.ok) {
        throw new Error(`Failed to fetch pricing config: ${response.statusText}`);
      }
      const config = await response.json();
      this.config = config;
      return config;
    } catch (error) {
      console.error('Error fetching pricing config:', error);
      // Return default config as fallback
      const defaultConfig: PricingConfig = {
        credits_rate: 20,
        music_generator: {
          "stable-audio": {
            price: 0.5,
            description: "Generate a music track based on the description."
          },
          "clipizi-model": {
            price: 1.0,
            description: "Generate a music track based on the description."
          }
        },
        image_generator: {
          "clipizi-model": {
            minute_rate: 0.10,
            unit_rate: 0.50,
            min: 3,
            max: null,
            description: "Generate an image based on the description."
          }
        },
        looped_animation_generator: {
          "clipizi-model": {
            minute_rate: 0.11,
            unit_rate: 1,
            min: 3,
            max: null,
            description: "Generate a looping animation based on the description."
          }
        },
        video_generator: {
          "clipizi-model": {
            "video-duration": 5,
            minute_rate: 10,
            min: 20,
            max: null,
            description: "Generate a video based on the description."
          }
        }
      };
      this.config = defaultConfig;
      return defaultConfig;
    }
  }

  private toCredits(dollars: number, creditsRate: number): number {
    return Math.ceil(dollars * creditsRate);
  }

  async calculateMusicPrice(numTracks: number, model: 'stable-audio' | 'clipizi-model' = 'stable-audio'): Promise<PriceResult> {
    const config = await this.getConfig();
    const modelConfig = config.music_generator[model];
    const price = numTracks * modelConfig.price;
    return {
      usd: Math.round(price * 100) / 100,
      credits: this.toCredits(price, config.credits_rate)
    };
  }

  async calculateImagePrice(numUnits: number, totalMinutes: number, model: 'clipizi-model' = 'clipizi-model'): Promise<PriceResult> {
    const config = await this.getConfig();
    const modelConfig = config.image_generator[model];
    const base = (numUnits * modelConfig.unit_rate) + (totalMinutes * modelConfig.minute_rate);
    const price = Math.max(base, modelConfig.min);
    return {
      usd: Math.round(price * 100) / 100,
      credits: this.toCredits(price, config.credits_rate)
    };
  }

  async calculateLoopedAnimationPrice(numUnits: number, totalMinutes: number, model: 'clipizi-model' = 'clipizi-model'): Promise<PriceResult> {
    const config = await this.getConfig();
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

  async calculateVideoPrice(durationMinutes: number, model: 'clipizi-model' = 'clipizi-model'): Promise<PriceResult> {
    const config = await this.getConfig();
    const modelConfig = config.video_generator[model];
    const base = durationMinutes * modelConfig.minute_rate;
    const price = Math.max(base, modelConfig.min);
    return {
      usd: Math.round(price * 100) / 100,
      credits: this.toCredits(price, config.credits_rate)
    };
  }

  // Helper function to calculate budget based on settings
  async calculateBudget(settings: {
    videoType: string;
    trackCount: number;
    trackDurations: number[];
    useSameVideoForAll: boolean;
    model?: string;
  }): Promise<number> {
    const totalMinutes = settings.trackDurations.reduce((sum, duration) => sum + duration, 0) / 60;
    const longestTrackMinutes = Math.max(...settings.trackDurations) / 60;
    const model = settings.model as 'clipizi-model' || 'clipizi-model';

    switch (settings.videoType) {
      case 'looped-static':
        const imageUnits = settings.useSameVideoForAll ? 1 : settings.trackCount;
        const imagePrice = await this.calculateImagePrice(imageUnits, totalMinutes, model);
        return imagePrice.credits;

      case 'looped-animation':
        const animationUnits = settings.useSameVideoForAll ? 1 : settings.trackCount;
        const animationPrice = await this.calculateLoopedAnimationPrice(animationUnits, totalMinutes, model);
        return animationPrice.credits;

      case 'video':
        const videoDuration = settings.useSameVideoForAll ? longestTrackMinutes : totalMinutes;
        const videoPrice = await this.calculateVideoPrice(videoDuration, model);
        return videoPrice.credits;

      default:
        return 100; // Default fallback
    }
  }
}

export const pricingService = new PricingService();
