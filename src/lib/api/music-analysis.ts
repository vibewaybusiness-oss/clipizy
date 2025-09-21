import type { MusicTrack } from '@/types/music-clip';

export interface MusicAnalysisResult {
  trackId: string;
  analysis: {
    duration: number;
    tempo: number;
    segments_sec: number[];
    beat_times_sec: number[];
    downbeats_sec: number[];
    debug: {
      method: string;
      num_segments: number;
      segment_lengths: number[];
    };
    title: string;
    audio_features: {
      duration: number;
      tempo: number;
      spectral_centroid: number;
      rms_energy: number;
      harmonic_ratio: number;
      onset_rate: number;
    };
    music_descriptors: string[];
    segments: Array<{
      segment_index: number;
      start_time: number;
      end_time: number;
      duration: number;
      features: {
        duration: number;
        tempo: number;
        spectral_centroid: number;
        rms_energy: number;
        harmonic_ratio: number;
        onset_rate: number;
        start_time: number;
        end_time: number;
      };
      descriptors: string[];
    }>;
    segment_analysis: Array<{
      segment_index: number;
      start_time: number;
      end_time: number;
      duration: number;
      features: {
        duration: number;
        tempo: number;
        spectral_centroid: number;
        rms_energy: number;
        harmonic_ratio: number;
        onset_rate: number;
        start_time: number;
        end_time: number;
      };
      descriptors: string[];
    }>;
  };
  error?: string;
}

// Helper functions for mock analysis
function generateMockBeatTimes(duration: number, tempo: number): number[] {
  const beatInterval = 60 / tempo; // seconds per beat
  const beats: number[] = [];
  for (let time = 0; time < duration; time += beatInterval) {
    beats.push(time);
  }
  return beats;
}

function generateMockDownbeats(duration: number, tempo: number): number[] {
  const beatInterval = 60 / tempo; // seconds per beat
  const downbeats: number[] = [];
  for (let time = 0; time < duration; time += beatInterval * 4) { // Every 4 beats
    downbeats.push(time);
  }
  return downbeats;
}

export class MusicAnalysisAPI {
  private baseUrl = '/api/music-analysis';

  async analyzeTrack(track: MusicTrack): Promise<MusicAnalysisResult> {
    try {
      let file: File;

      console.log(`Analyzing track ${track.id}:`, {
        hasFile: !!track.file,
        fileType: typeof track.file,
        fileConstructor: track.file?.constructor?.name,
        isBlob: track.file instanceof Blob,
        isFile: track.file instanceof File,
        hasUrl: !!track.url,
        url: track.url
      });

      if (!track.file || !(track.file instanceof Blob)) {
        // If no file object or invalid file object, try to fetch from URL
        if (!track.url) {
          throw new Error('Neither valid file nor URL available for analysis');
        }

        // Check if it's a blob URL (can't be fetched via HTTP)
        if (track.url.startsWith('blob:')) {
          console.log(`Track has blob URL, using mock analysis: ${track.url}`);
          // Return mock analysis data for blob URLs instead of throwing an error
          return {
            trackId: track.id,
            analysis: {
              duration: track.duration || 30,
              tempo: 120,
              segments_sec: [0, track.duration || 30],
              beat_times_sec: generateMockBeatTimes(track.duration || 30, 120),
              downbeats_sec: generateMockDownbeats(track.duration || 30, 120),
              debug: {
                method: "mock_blob_url",
                num_segments: 1,
                segment_lengths: [track.duration || 30],
                reason: "Blob URL detected - using mock data"
              },
              title: track.name,
              audio_features: {
                duration: track.duration || 30,
                tempo: 120,
                spectral_centroid: 2000 + Math.random() * 1000,
                rms_energy: 0.3 + Math.random() * 0.4,
                harmonic_ratio: 0.5 + Math.random() * 0.3,
                onset_rate: 0.1 + Math.random() * 0.2
              },
              music_descriptors: [
                "Mock analysis - Blob URL detected",
                "Generated track - analysis unavailable",
                "Duration-based estimation"
              ],
              segments: [{
                segment_index: 0,
                start_time: 0,
                end_time: track.duration || 30,
                duration: track.duration || 30,
                features: {
                  duration: track.duration || 30,
                  tempo: 120,
                  spectral_centroid: 2000 + Math.random() * 1000,
                  rms_energy: 0.3 + Math.random() * 0.4,
                  harmonic_ratio: 0.5 + Math.random() * 0.3,
                  onset_rate: 0.1 + Math.random() * 0.2,
                  start_time: 0,
                  end_time: track.duration || 30
                },
                descriptors: ["mock", "blob_url", "generated"]
              }],
              segment_analysis: [{
                segment_index: 0,
                start_time: 0,
                end_time: track.duration || 30,
                duration: track.duration || 30,
                features: {
                  duration: track.duration || 30,
                  tempo: 120,
                  spectral_centroid: 2000 + Math.random() * 1000,
                  rms_energy: 0.3 + Math.random() * 0.4,
                  harmonic_ratio: 0.5 + Math.random() * 0.3,
                  onset_rate: 0.1 + Math.random() * 0.2,
                  start_time: 0,
                  end_time: track.duration || 30
                },
                descriptors: ["mock", "blob_url", "generated"]
              }],
            },
          };
        }

        console.log(`Fetching track from URL for analysis: ${track.url}`);
        
        // Fetch the audio file from URL
        const response = await fetch(track.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio from URL: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        // Create a File object from the blob
        file = new File([blob], track.name, { type: blob.type || 'audio/wav' });
      } else {
        file = track.file;
      }

      console.log(`Starting analysis for track ${track.id} with file:`, file.name, file.type, file.size);

      const formData = new FormData();
      formData.append('file', file);

      const startTime = Date.now();
      console.log(`Making request to ${this.baseUrl}/analyze/comprehensive at ${new Date().toISOString()}`);

      const response = await fetch(`${this.baseUrl}/analyze/comprehensive`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        // Add keepalive to help with connection reuse
        keepalive: true,
      });

      console.log(`Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('Error response data:', errorData);
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON:', jsonError);
          errorData = { error: 'Unknown error' };
        }
        throw new Error(`Analysis failed: ${errorData.error || response.statusText}`);
      }

      const analysis = await response.json();
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`Analysis completed for track ${track.id} in ${duration}ms:`, analysis);

      // Transform the response to match our expected format
      return {
        trackId: track.id,
        analysis: {
          duration: analysis.duration || 0,
          tempo: analysis.tempo || 120,
          segments_sec: analysis.segments_sec || [0, analysis.duration || 0],
          beat_times_sec: analysis.beat_times_sec || [],
          downbeats_sec: analysis.downbeats_sec || [],
          debug: analysis.debug || {
            method: "comprehensive",
            num_segments: 1,
            segment_lengths: [analysis.duration || 0]
          },
          title: analysis.title || track.name,
          audio_features: analysis.audio_features || {
            duration: analysis.duration || 0,
            tempo: analysis.tempo || 120,
            spectral_centroid: 0,
            rms_energy: 0,
            harmonic_ratio: 0,
            onset_rate: 0
          },
          music_descriptors: analysis.music_descriptors || [],
          segments: analysis.segments || [],
          segment_analysis: analysis.segment_analysis || [],
        },
      };
    } catch (error) {
      console.error(`Failed to analyze track ${track.id}:`, error);
      
      // Try fallback analysis using the existing analysis service
      try {
        console.log(`Attempting fallback analysis for track ${track.id}`);
        const fallbackAnalysis = await this.analyzeTrackFallback(track);
        return fallbackAnalysis;
      } catch (fallbackError) {
        console.error(`Fallback analysis also failed for track ${track.id}:`, fallbackError);
        
        // Final fallback: return mock analysis data
        console.log(`Using mock analysis for track ${track.id}`);
        return {
          trackId: track.id,
          analysis: {
            duration: track.duration || 30, // Default to 30 seconds if no duration
            tempo: 120,
            segments_sec: [0, track.duration || 30],
            beat_times_sec: generateMockBeatTimes(track.duration || 30, 120),
            downbeats_sec: generateMockDownbeats(track.duration || 30, 120),
            debug: {
              method: "mock",
              num_segments: 1,
              segment_lengths: [track.duration || 30],
              reason: "Blob URL cannot be analyzed - using mock data"
            },
            title: track.name,
            audio_features: {
              duration: track.duration || 30,
              tempo: 120,
              spectral_centroid: 2000 + Math.random() * 1000, // Random between 2000-3000
              rms_energy: 0.3 + Math.random() * 0.4, // Random between 0.3-0.7
              harmonic_ratio: 0.5 + Math.random() * 0.3, // Random between 0.5-0.8
              onset_rate: 0.1 + Math.random() * 0.2 // Random between 0.1-0.3
            },
            music_descriptors: [
              "Mock analysis - Blob URL detected",
              "Generated track - analysis unavailable",
              "Duration-based estimation"
            ],
            segments: [{
              start: 0,
              end: track.duration || 30,
              confidence: 0.5,
              type: "full_track"
            }],
            segment_analysis: [{
              start: 0,
              end: track.duration || 30,
              tempo: 120,
              energy: 0.5,
              valence: 0.5,
              danceability: 0.5
            }],
          },
        };
      }
    }
  }

  async analyzeTrackFallback(track: MusicTrack): Promise<MusicAnalysisResult> {
    // Fallback analysis using the existing analysis service
    try {
      let dataUri: string;

      console.log(`Fallback analyzing track ${track.id}:`, {
        hasFile: !!track.file,
        fileType: typeof track.file,
        fileConstructor: track.file?.constructor?.name,
        isBlob: track.file instanceof Blob,
        isFile: track.file instanceof File,
        hasUrl: !!track.url,
        url: track.url
      });

      if (!track.file || !(track.file instanceof Blob)) {
        // If no valid file object, try to fetch from URL
        if (!track.url) {
          throw new Error('Neither valid file nor URL available for analysis');
        }

        // Check if it's a blob URL (can't be fetched via HTTP)
        if (track.url.startsWith('blob:')) {
          console.log(`Track has blob URL, using mock analysis for fallback: ${track.url}`);
          // Return mock analysis data for blob URLs instead of throwing an error
          return {
            trackId: track.id,
            analysis: {
              duration: track.duration || 30,
              tempo: 120,
              segments_sec: [0, track.duration || 30],
              beat_times_sec: generateMockBeatTimes(track.duration || 30, 120),
              downbeats_sec: generateMockDownbeats(track.duration || 30, 120),
              debug: {
                method: "fallback_mock",
                num_segments: 1,
                segment_lengths: [track.duration || 30],
                reason: "Blob URL detected - using mock data for fallback"
              },
              title: track.name,
              audio_features: {
                duration: track.duration || 30,
                tempo: 120,
                spectral_centroid: 2000 + Math.random() * 1000,
                rms_energy: 0.3 + Math.random() * 0.4,
                harmonic_ratio: 0.5 + Math.random() * 0.3,
                onset_rate: 0.1 + Math.random() * 0.2
              },
              music_descriptors: [
                "Fallback analysis - Blob URL detected",
                "Generated track - analysis unavailable",
                "Duration-based estimation"
              ],
              segments: [{
                segment_index: 0,
                start_time: 0,
                end_time: track.duration || 30,
                duration: track.duration || 30,
                features: {
                  duration: track.duration || 30,
                  tempo: 120,
                  spectral_centroid: 2000 + Math.random() * 1000,
                  rms_energy: 0.3 + Math.random() * 0.4,
                  harmonic_ratio: 0.5 + Math.random() * 0.3,
                  onset_rate: 0.1 + Math.random() * 0.2,
                  start_time: 0,
                  end_time: track.duration || 30
                },
                descriptors: ["fallback", "blob_url", "mock_data"]
              }],
              segment_analysis: [{
                segment_index: 0,
                start_time: 0,
                end_time: track.duration || 30,
                duration: track.duration || 30,
                features: {
                  duration: track.duration || 30,
                  tempo: 120,
                  spectral_centroid: 2000 + Math.random() * 1000,
                  rms_energy: 0.3 + Math.random() * 0.4,
                  harmonic_ratio: 0.5 + Math.random() * 0.3,
                  onset_rate: 0.1 + Math.random() * 0.2,
                  start_time: 0,
                  end_time: track.duration || 30
                },
                descriptors: ["fallback", "blob_url", "mock_data"]
              }],
            },
          };
        }

        console.log(`Fetching track from URL for fallback analysis: ${track.url}`);
        
        // Fetch the audio file from URL
        const response = await fetch(track.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio from URL: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        // Convert Blob to data URI
        dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // Convert File to data URI for the existing analysis service
        dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(track.file!);
        });
      }

      // Call the existing analysis service
      const response = await fetch('/api/analysis/music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_data: dataUri,
          track_id: track.id
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Fallback analysis failed: ${response.statusText}`);
      }

      const analysis = await response.json();
      
      // Transform to our expected format
      return {
        trackId: track.id,
        analysis: {
          duration: analysis.duration || track.duration || 0,
          tempo: analysis.tempo || 120,
          segments_sec: [0, analysis.duration || track.duration || 0],
          beat_times_sec: [],
          downbeats_sec: [],
          debug: {
            method: "fallback",
            num_segments: 1,
            segment_lengths: [analysis.duration || track.duration || 0]
          },
          title: track.name,
          audio_features: {
            duration: analysis.duration || track.duration || 0,
            tempo: analysis.tempo || 120,
            spectral_centroid: 0,
            rms_energy: 0,
            harmonic_ratio: 0,
            onset_rate: 0
          },
          music_descriptors: [],
          segments: [],
          segment_analysis: [],
        },
      };
    } catch (error) {
      console.error(`Fallback analysis failed for track ${track.id}:`, error);
      throw error;
    }
  }

  async analyzeTracksInParallel(tracks: MusicTrack[]): Promise<MusicAnalysisResult[]> {
    console.log(`Starting parallel analysis for ${tracks.length} tracks`);
    
    // For better parallel processing, we'll use Promise.allSettled to handle individual failures
    // and also add a small delay between requests to avoid overwhelming the server
    const analysisPromises = tracks.map((track, index) => {
      console.log(`Creating promise for track ${index + 1}/${tracks.length}: ${track.id}`);
      
      // Add a small delay to stagger requests slightly (helps with connection limits)
      const delay = index * 100; // 100ms delay between each request start
      
      const promise = new Promise<MusicAnalysisResult>((resolve, reject) => {
        setTimeout(() => {
          console.log(`Starting delayed analysis for track ${track.id} after ${delay}ms delay`);
          this.analyzeTrack(track)
            .then(result => {
              console.log(`Promise for track ${track.id} completed`);
              resolve(result);
            })
            .catch(error => {
              console.log(`Promise for track ${track.id} failed:`, error);
              reject(error);
            });
        }, delay);
      });
      
      return promise;
    });
    
    console.log(`All ${analysisPromises.length} promises created with staggered delays, starting Promise.allSettled...`);
    console.log(`Promise.allSettled started at: ${new Date().toISOString()}`);
    
    try {
      const results = await Promise.allSettled(analysisPromises);
      
      // Process results and handle any failures
      const successfulResults: MusicAnalysisResult[] = [];
      const failedResults: MusicAnalysisResult[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulResults.push(result.value);
        } else {
          console.error(`Track ${tracks[index].id} analysis failed:`, result.reason);
          failedResults.push({
            trackId: tracks[index].id,
            error: result.reason.message || 'Analysis failed'
          } as MusicAnalysisResult);
        }
      });
      
      console.log(`Completed parallel analysis: ${successfulResults.length} successful, ${failedResults.length} failed at: ${new Date().toISOString()}`);
      
      // Return all results (both successful and failed)
      return [...successfulResults, ...failedResults];
    } catch (error) {
      console.error('Error during parallel analysis:', error);
      throw error;
    }
  }
}

export const musicAnalysisAPI = new MusicAnalysisAPI();
