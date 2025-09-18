'use client';

import { useEffect } from 'react';
import { usePricingContext } from '@/contexts/pricing-context';
import { pricingService } from '@/lib/pricing-service';

export function usePricingService() {
  const { pricing } = usePricingContext();

  useEffect(() => {
    if (pricing) {
      pricingService.setConfig(pricing);
    }
  }, [pricing]);

  return pricingService;
}
