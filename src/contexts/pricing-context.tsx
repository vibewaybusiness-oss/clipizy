'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface PricingConfig {
  credits_rate: number;
  music_generator: {
    "stable-audio": {
      price: number;
      description: string;
    };
    "vibewave-model": {
      price: number;
      description: string;
    };
  };
  image_generator: {
    "vibewave-model": {
      minute_rate: number;
      unit_rate: number;
      min: number;
      max: number | null;
      description: string;
    };
  };
  looped_animation_generator: {
    "vibewave-model": {
      minute_rate: number;
      unit_rate: number;
      min: number;
      max: number | null;
      description: string;
    };
  };
  video_generator: {
    "vibewave-model": {
      "video-duration": number;
      minute_rate: number;
      min: number;
      max: number | null;
      description: string;
    };
  };
}

interface PricingContextType {
  pricing: PricingConfig | null;
  loading: boolean;
  error: string | null;
  refreshPricing: () => Promise<void>;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

const DEFAULT_PRICING: PricingConfig = {
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

interface PricingProviderProps {
  children: ReactNode;
}

export function PricingProvider({ children }: PricingProviderProps) {
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/pricing');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pricing config: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPricing(data);
    } catch (err) {
      console.error('Error fetching pricing:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPricing(DEFAULT_PRICING);
    } finally {
      setLoading(false);
    }
  };

  const refreshPricing = async () => {
    await fetchPricing();
  };

  useEffect(() => {
    if (!isInitialized) {
      fetchPricing();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const value: PricingContextType = {
    pricing,
    loading,
    error,
    refreshPricing
  };

  return (
    <PricingContext.Provider value={value}>
      {children}
    </PricingContext.Provider>
  );
}

export function usePricingContext() {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error('usePricingContext must be used within a PricingProvider');
  }
  return context;
}
