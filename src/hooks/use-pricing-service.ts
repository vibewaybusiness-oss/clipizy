'use client';

import { useEffect } from 'react';
import { usePricing } from '@/contexts/pricing-context';
import { pricingService } from '@/lib/pricing-service';

export function usePricingService() {
  const { pricing } = usePricing();

  useEffect(() => {
    if (pricing) {
      pricingService.setConfig(pricing);
    }
  }, [pricing]);

  return pricingService;
}
