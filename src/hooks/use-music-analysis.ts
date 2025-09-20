import { useState, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';
import { musicAnalysisAPI } from '@/lib/api/music-analysis';
import type { MusicTrack } from '@/types/music-clip';

export interface AnalysisData {
  music: Record<string, any>;
  analyzed_at: string;
  total_tracks: number;
  successful_analyses: number;
  failed_analyses: number;
}

export function useMusicAnalysis(projectId?: string | null) {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(() => {
    if (typeof window !== 'undefined' && projectId) {
      const saved = localStorage.getItem(`musicClip_${projectId}_analysis`);
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<Record<string, 'pending' | 'analyzing' | 'completed' | 'failed'>>({});
  const { toast } = useToast();

  // Save analysis data to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId && analysisData) {
      localStorage.setItem(`musicClip_${projectId}_analysis`, JSON.stringify(analysisData));
    }
  }, [analysisData, projectId]);

  // Check which tracks need analysis
  const getTracksNeedingAnalysis = useCallback((tracks: MusicTrack[]): MusicTrack[] => {
    if (!analysisData) return tracks;
    
    return tracks.filter(track => {
      // Track needs analysis if:
      // 1. It has a file (can be analyzed)
      // 2. It doesn't have analysis data in the stored analysis
      return track.file && !analysisData.music[track.id];
    });
  }, [analysisData]);

  // Analyze tracks that need analysis
  const analyzeMissingTracks = useCallback(async (tracks: MusicTrack[]): Promise<void> => {
    const tracksToAnalyze = getTracksNeedingAnalysis(tracks);
    
    if (tracksToAnalyze.length === 0) {
      console.log('No tracks need analysis');
      return;
    }

    console.log(`Found ${tracksToAnalyze.length} tracks that need analysis:`, tracksToAnalyze.map(t => t.name));

    try {
      setIsAnalyzing(true);
      
      // Initialize progress tracking
      const progress: Record<string, 'pending' | 'analyzing' | 'completed' | 'failed'> = {};
      tracksToAnalyze.forEach(track => {
        progress[track.id] = 'pending';
      });
      setAnalysisProgress(progress);

      // Start analysis
      const analysisResults = await musicAnalysisAPI.analyzeTracksInParallel(tracksToAnalyze);
      
      // Update progress
      analysisResults.forEach(result => {
        progress[result.trackId] = result.error ? 'failed' : 'completed';
      });
      setAnalysisProgress(progress);

      // Update analysis data
      const newAnalysisData: AnalysisData = {
        music: {
          ...(analysisData?.music || {}),
          ...analysisResults.reduce((acc, result) => {
            if (!result.error) {
              acc[result.trackId] = result.analysis;
            }
            return acc;
          }, {} as Record<string, any>)
        },
        analyzed_at: new Date().toISOString(),
        total_tracks: (analysisData?.total_tracks || 0) + tracksToAnalyze.length,
        successful_analyses: (analysisData?.successful_analyses || 0) + analysisResults.filter(r => !r.error).length,
        failed_analyses: (analysisData?.failed_analyses || 0) + analysisResults.filter(r => r.error).length
      };

      setAnalysisData(newAnalysisData);

      const successCount = analysisResults.filter(r => !r.error).length;
      const failCount = analysisResults.filter(r => r.error).length;

      if (successCount > 0) {
        toast({
          title: "Music Analysis Complete",
          description: `Successfully analyzed ${successCount} track(s). ${failCount > 0 ? `${failCount} failed.` : ''}`,
        });
      }

      if (failCount > 0) {
        console.error('Some tracks failed analysis:', analysisResults.filter(r => r.error));
      }

    } catch (error) {
      console.error('Music analysis failed:', error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Failed to analyze music tracks. Please try again.",
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress({});
    }
  }, [analysisData, getTracksNeedingAnalysis, toast]);

  // Get analysis for a specific track
  const getTrackAnalysis = useCallback((trackId: string) => {
    return analysisData?.music[trackId] || null;
  }, [analysisData]);

  // Check if a track has analysis data
  const hasTrackAnalysis = useCallback((trackId: string) => {
    return !!(analysisData?.music[trackId]);
  }, [analysisData]);

  // Clear analysis data
  const clearAnalysisData = useCallback(() => {
    setAnalysisData(null);
    if (typeof window !== 'undefined' && projectId) {
      localStorage.removeItem(`musicClip_${projectId}_analysis`);
    }
  }, [projectId]);

  // Update analysis data (for when loading from backend)
  const updateAnalysisData = useCallback((newData: AnalysisData) => {
    setAnalysisData(newData);
  }, []);

  return {
    analysisData,
    isAnalyzing,
    analysisProgress,
    getTracksNeedingAnalysis,
    analyzeMissingTracks,
    getTrackAnalysis,
    hasTrackAnalysis,
    clearAnalysisData,
    updateAnalysisData
  };
}
