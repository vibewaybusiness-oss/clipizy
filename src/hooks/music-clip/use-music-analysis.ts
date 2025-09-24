import { useState, useCallback, useEffect } from 'react';
import { useToast } from '../ui/use-toast';
import { musicService } from '@/lib/api/music';
import { autoSaveService } from '@/lib/auto-save-service';
import type { MusicTrack } from '@/types/domains';

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

      // Schedule auto-save to backend
      autoSaveService.scheduleSave(projectId, {
        analysisData
      });
    }
  }, [analysisData, projectId]);

  // Check which tracks need analysis
  const getTracksNeedingAnalysis = useCallback((tracks: MusicTrack[]): MusicTrack[] => {
    if (!analysisData) {
      // If no analysis data exists, return all tracks that can be analyzed
      return tracks.filter(track => track.file || track.url);
    }

    return tracks.filter(track => {
      // Track needs analysis if:
      // 1. It has a file OR a URL (can be analyzed)
      // 2. It doesn't have analysis data in the stored analysis
      // 3. OR it has mock/error analysis data that should be retried
      const hasAnalysis = analysisData.music[track.id];
      const isMockAnalysis = hasAnalysis && (
        hasAnalysis.analysis_type === 'mock_error_fallback' ||
        hasAnalysis.analysis_type === 'file_not_found' ||
        hasAnalysis.analysis_type === 'analysis_error' ||
        hasAnalysis.analysis_type === 'mock_blob_url' ||
        hasAnalysis.analysis_type === 'mock_file_path'
      );
      
      return (track.file || track.url) && (!hasAnalysis || isMockAnalysis);
    });
  }, [analysisData]);

  // Analyze tracks that need analysis
  const analyzeMissingTracks = useCallback(async (tracks: MusicTrack[]): Promise<void> => {
    const tracksToAnalyze = getTracksNeedingAnalysis(tracks);

    console.log('=== MUSIC ANALYSIS HOOK DEBUG ===');
    console.log('Total tracks passed to analyzeMissingTracks:', tracks.length);
    console.log('Tracks needing analysis:', tracksToAnalyze.length);
    console.log('Tracks details:', tracksToAnalyze.map(t => ({ 
      id: t.id, 
      name: t.name, 
      hasFile: !!t.file, 
      hasUrl: !!t.url,
      isGenerated: t.isGenerated 
    })));

    if (tracksToAnalyze.length === 0) {
      console.log('No tracks need analysis - either all analyzed or no analyzable tracks');
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Found ${tracksToAnalyze.length} tracks that need analysis:`, tracksToAnalyze.map(t => t.name));
    }

    try {
      setIsAnalyzing(true);

      // Initialize progress tracking
      const progress: Record<string, 'pending' | 'analyzing' | 'completed' | 'failed'> = {};
      tracksToAnalyze.forEach(track => {
        progress[track.id] = 'pending';
      });
      setAnalysisProgress(progress);

      // Start analysis
      if (process.env.NODE_ENV === 'development') {
        console.log(`Hook: Starting analysis for ${tracksToAnalyze.length} tracks`);
      }
      const analysisResults = await musicService.analyzeTracksInParallel(tracksToAnalyze);
      if (process.env.NODE_ENV === 'development') {
        console.log(`Hook: Received ${analysisResults.length} analysis results`);
      }

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
              console.log(`Storing analysis for track ${result.trackId}:`, result.analysis);
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

      console.log('New analysis data being set:', newAnalysisData);
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

  // Clear only mock analysis data, keeping real analysis
  const clearMockAnalysisData = useCallback(() => {
    if (!analysisData) return;
    
    const realAnalysisData: AnalysisData = {
      music: {},
      analyzed_at: analysisData.analyzed_at,
      total_tracks: 0,
      successful_analyses: 0,
      failed_analyses: 0
    };
    
    // Keep only real analysis data, remove mock data
    Object.entries(analysisData.music).forEach(([trackId, analysis]) => {
      const isMockAnalysis = analysis.analysis_type === 'mock_error_fallback' ||
                            analysis.analysis_type === 'file_not_found' ||
                            analysis.analysis_type === 'analysis_error' ||
                            analysis.analysis_type === 'mock_blob_url' ||
                            analysis.analysis_type === 'mock_file_path';
      
      if (!isMockAnalysis) {
        realAnalysisData.music[trackId] = analysis;
        realAnalysisData.total_tracks++;
        if (analysis.analysis_type && !analysis.analysis_type.startsWith('mock_')) {
          realAnalysisData.successful_analyses++;
        }
      }
    });
    
    setAnalysisData(realAnalysisData);
  }, [analysisData]);

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
    clearMockAnalysisData,
    updateAnalysisData
  };
}
