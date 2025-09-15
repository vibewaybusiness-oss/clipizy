import { useState, useEffect } from 'react';

export interface PricingConfig {
  credits_rate: number;
  music_generator: {
    price: number;
    description: string;
  };
  image_generator: {
    minute_rate: number;
    unit_rate: number;
    min: number;
    max: number | null;
    description: string;
  };
  looped_animation_generator: {
    minute_rate: number;
    unit_rate: number;
    min: number;
    max: number | null;
    description: string;
  };
  video_generator: {
    minute_rate: number;
    min: number;
    max: number | null;
    description: string;
  };
}

export function usePricing() {
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/pricing');
        
        if (!response.ok) {
          throw new Error('Failed to fetch pricing configuration');
        }
        
        const data = await response.json();
        setPricing(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching pricing:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, []);

  return { pricing, loading, error };
}
