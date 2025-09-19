"use client";

import { useState, useCallback } from 'react';
import { PricingConfig } from '@/contexts/pricing-context';

interface PricingCalculation {
  totalCost: number;
  breakdown: {
    baseCost: number;
    durationCost: number;
    sceneCost: number;
  };
}

export function usePricingService() {
  const [loading, setLoading] = useState(false);

  const calculatePricing = useCallback(async (
    config: PricingConfig,
    duration: number, // in minutes
    sceneCount: number = 1
  ): Promise<PricingCalculation> => {
    setLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const baseCost = config.basePrice;
      const durationCost = duration * config.pricePerMinute;
      const sceneCost = sceneCount * config.pricePerScene;
      const totalCost = baseCost + durationCost + sceneCost;
      
      return {
        totalCost: Math.max(totalCost, config.minBudget),
        breakdown: {
          baseCost,
          durationCost,
          sceneCost,
        },
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const getDefaultPricingConfig = useCallback((): PricingConfig => {
    return {
      basePrice: 5.00,
      pricePerMinute: 2.00,
      pricePerScene: 1.50,
      maxBudget: 100.00,
      minBudget: 5.00,
    };
  }, []);

  const validateBudget = useCallback((budget: number, config: PricingConfig): boolean => {
    return budget >= config.minBudget && budget <= config.maxBudget;
  }, []);

  return {
    calculatePricing,
    getDefaultPricingConfig,
    validateBudget,
    loading,
  };
}
