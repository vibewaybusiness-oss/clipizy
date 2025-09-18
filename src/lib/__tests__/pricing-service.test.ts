import { pricingService } from '../pricing-service';

// Mock fetch for testing
global.fetch = jest.fn();

describe('PricingService', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate music price correctly', async () => {
    const mockConfig = {
      credits_rate: 20,
      music_generator: { price: 0.5, description: 'Generate music' }
    };
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockConfig
    });

    const result = await pricingService.calculateMusicPrice(3);
    
    expect(result.usd).toBe(1.5); // 3 * 0.5
    expect(result.credits).toBe(30); // 1.5 * 20
  });

  it('should calculate image price correctly', async () => {
    const mockConfig = {
      credits_rate: 20,
      image_generator: { 
        minute_rate: 0.10, 
        unit_rate: 0.50, 
        min: 3, 
        max: null,
        description: 'Generate image' 
      }
    };
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockConfig
    });

    const result = await pricingService.calculateImagePrice(2, 5); // 2 units, 5 minutes
    
    // Base: (2 * 0.50) + (5 * 0.10) = 1.0 + 0.5 = 1.5
    // Min: max(1.5, 3) = 3
    expect(result.usd).toBe(3);
    expect(result.credits).toBe(60); // 3 * 20
  });

  it('should calculate looped animation price correctly', async () => {
    const mockConfig = {
      credits_rate: 20,
      looped_animation_generator: { 
        minute_rate: 0.11, 
        unit_rate: 1, 
        min: 3, 
        max: 60,
        description: 'Generate animation' 
      }
    };
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockConfig
    });

    const result = await pricingService.calculateLoopedAnimationPrice(1, 10); // 1 unit, 10 minutes
    
    // Base: (1 * 1) + (10 * 0.11) = 1 + 1.1 = 2.1
    // Min: max(2.1, 3) = 3
    // Max: min(3, 60) = 3
    expect(result.usd).toBe(3);
    expect(result.credits).toBe(60); // 3 * 20
  });

  it('should calculate video price correctly', async () => {
    const mockConfig = {
      credits_rate: 20,
      video_generator: { 
        minute_rate: 10, 
        min: 20, 
        max: null,
        description: 'Generate video' 
      }
    };
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockConfig
    });

    const result = await pricingService.calculateVideoPrice(2.5); // 2.5 minutes
    
    // Base: 2.5 * 10 = 25
    // Min: max(25, 20) = 25
    expect(result.usd).toBe(25);
    expect(result.credits).toBe(500); // 25 * 20
  });

  it('should handle API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    const result = await pricingService.calculateMusicPrice(1);
    
    // Should fallback to default config
    expect(result.usd).toBe(0.5);
    expect(result.credits).toBe(10);
  });
});
