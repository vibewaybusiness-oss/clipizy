import { BaseApiClient } from './base';
import { z } from "zod";
import { PricingConfig } from "@/contexts/pricing-context";
import { getBackendUrl } from '@/lib/config';

export interface PriceResult {
  usd: number;
  credits: number;
}

export interface CreditsBalance {
  current_balance: number;
  total_earned: number;
  total_spent: number;
  recent_transactions: CreditsTransaction[];
}

export interface CreditsTransaction {
  id: string;
  user_id: string;
  transaction_type: 'earned' | 'spent' | 'purchased' | 'refunded' | 'bonus' | 'admin_adjustment';
  amount: number;
  balance_after: number;
  description?: string;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
}

export interface CreditsSpendRequest {
  amount: number;
  description: string;
  reference_id?: string;
  reference_type?: string;
}

export interface CreditsPurchaseRequest {
  amount_dollars: number;
  payment_method_id?: string;
}

export interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount_cents: number;
  credits_purchased: number;
  status: string;
}

export class PricingService extends BaseApiClient {
  private static instance: PricingService;
  private config: PricingConfig | null = null;
  private configPromise: Promise<PricingConfig> | null = null;

  constructor() {
    super(getBackendUrl());
  }

  public static getInstance(): PricingService {
    if (!PricingService.instance) {
      PricingService.instance = new PricingService();
    }
    return PricingService.instance;
  }

  // PRICING CONFIGURATION
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
    try {
      return await this.configPromise;
    } catch (error) {
      console.warn('Using fallback pricing config due to API error');
      return this.getFallbackConfig();
    }
  }

  private getFallbackConfig(): PricingConfig {
    return {
      credits_rate: 20,
      music_generator: {
        "stable-audio": {
          price: 0.5,
          description: "Generate a music track based on the description."
        },
        "clipizy-model": {
          price: 1.0,
          description: "Generate a music track based on the description."
        }
      },
      image_generator: {
        "clipizy-model": {
          minute_rate: 0.10,
          unit_rate: 0.50,
          min: 3,
          max: null,
          description: "Generate an image based on the description."
        }
      },
      looped_animation_generator: {
        "clipizy-model": {
          minute_rate: 0.11,
          unit_rate: 1,
          min: 3,
          max: null,
          description: "Generate a looping animation based on the description."
        }
      },
      video_generator: {
        "clipizy-model": {
          "video-duration": 5,
          minute_rate: 10,
          min: 20,
          max: null,
          description: "Generate a video based on the description."
        }
      }
    };
  }

  private async fetchConfig(): Promise<PricingConfig> {
    try {
      const response = await fetch('/api/pricing/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      if (!response.ok) {
        console.warn(`Pricing API not available (${response.status}): ${response.statusText}. Using fallback config.`);
        throw new Error(`Failed to fetch pricing config: ${response.statusText}`);
      }
      const config = await response.json();
      this.config = config;
      return config;
    } catch (error) {
      console.warn('Error fetching pricing config, using fallback:', error);
      const fallbackConfig = this.getFallbackConfig();
      this.config = fallbackConfig;
      return fallbackConfig;
    }
  }

  // CREDITS MANAGEMENT
  async getBalance(): Promise<CreditsBalance> {
    try {
      return await this.get<CreditsBalance>('/credits/balance');
    } catch (error) {
      console.error('Error fetching credits balance:', error);
      throw error;
    }
  }

  async getTransactions(limit: number = 50): Promise<CreditsTransaction[]> {
    try {
      return await this.get<CreditsTransaction[]>(`/credits/transactions?limit=${limit}`);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async spendCredits(spendRequest: CreditsSpendRequest): Promise<{ message: string; transaction_id: string; new_balance: number }> {
    try {
      return await this.post<{ message: string; transaction_id: string; new_balance: number }>('/credits/spend', spendRequest);
    } catch (error) {
      console.error('Error spending credits:', error);
      throw error;
    }
  }

  async purchaseCredits(purchaseRequest: CreditsPurchaseRequest): Promise<PaymentIntentResponse> {
    try {
      return await this.post<PaymentIntentResponse>('/credits/purchase', purchaseRequest);
    } catch (error) {
      console.error('Error purchasing credits:', error);
      throw error;
    }
  }

  async canAfford(amount: number): Promise<{ can_afford: boolean; amount_requested: number; current_balance: number }> {
    try {
      return await this.get<{ can_afford: boolean; amount_requested: number; current_balance: number }>(`/credits/can-afford/${amount}`);
    } catch (error) {
      console.error('Error checking affordability:', error);
      throw error;
    }
  }

  // PRICING CALCULATIONS
  private toCredits(dollars: number, creditsRate: number): number {
    return Math.ceil(dollars * creditsRate);
  }

  async calculateMusicPrice(numTracks: number, model: 'stable-audio' | 'clipizy-model' = 'stable-audio'): Promise<PriceResult> {
    const config = await this.getConfig();
    const modelConfig = config.music_generator[model];
    const price = numTracks * modelConfig.price;
    return {
      usd: Math.round(price * 100) / 100,
      credits: this.toCredits(price, config.credits_rate)
    };
  }

  async calculateImagePrice(numUnits: number, totalMinutes: number, model: 'clipizy-model' = 'clipizy-model'): Promise<PriceResult> {
    const config = await this.getConfig();
    const modelConfig = config.image_generator[model];
    const base = (numUnits * modelConfig.unit_rate) + (totalMinutes * modelConfig.minute_rate);
    const price = Math.max(base, modelConfig.min);
    return {
      usd: Math.round(price * 100) / 100,
      credits: this.toCredits(price, config.credits_rate)
    };
  }

  async calculateLoopedAnimationPrice(numUnits: number, totalMinutes: number, model: 'clipizy-model' = 'clipizy-model'): Promise<PriceResult> {
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

  async calculateVideoPrice(durationMinutes: number, model: 'clipizy-model' = 'clipizy-model'): Promise<PriceResult> {
    const config = await this.getConfig();
    const modelConfig = config.video_generator[model];
    const base = durationMinutes * modelConfig.minute_rate;
    const price = Math.max(base, modelConfig.min);
    return {
      usd: Math.round(price * 100) / 100,
      credits: this.toCredits(price, config.credits_rate)
    };
  }

  // BUDGET CALCULATION
  async calculateBudget(settings: {
    videoType: string;
    trackCount: number;
    trackDurations: number[];
    useSameVideoForAll: boolean;
    model?: string;
  }): Promise<number> {
    const totalMinutes = settings.trackDurations.reduce((sum, duration) => sum + duration, 0) / 60;
    const longestTrackMinutes = Math.max(...settings.trackDurations) / 60;
    const model = settings.model as 'clipizy-model' || 'clipizy-model';

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

export const pricingService = PricingService.getInstance();
