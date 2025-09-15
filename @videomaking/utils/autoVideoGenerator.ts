import { VideoProject, VideoClip } from '../types';

export interface MusicAnalysis {
  audio_file: string;
  analysis_timestamp: string;
  total_peaks: number;
  total_segments: number;
  smoothed_peaks: Array<{
    index: number;
    time_seconds: number;
    time_formatted: string;
    score: number;
  }>;
  segments: Array<{
    index: number;
    time_seconds: number;
    time_formatted: string;
    ma_short_gap: number;
    ma_long_gap: number;
    ma_divergence: number;
    combined_gap: number;
    fitted_to_tempo: boolean;
  }>;
  summary: {
    peak_times: number[];
    segment_times: number[];
  };
}

export interface VideoSegment {
  start: number;
  end: number;
  duration: number;
  videoSource: string;
  isReversed?: boolean;
}

export function generateVideoSegments(
  musicAnalysis: MusicAnalysis,
  availableVideos: string[]
): VideoSegment[] {
  const peakTimes = musicAnalysis.summary.peak_times;
  const segments: VideoSegment[] = [];
  
  // Create segments between peaks
  const videoSegments = [];
  for (let i = 0; i < peakTimes.length - 1; i++) {
    videoSegments.push({
      start: peakTimes[i],
      end: peakTimes[i + 1],
      duration: peakTimes[i + 1] - peakTimes[i]
    });
  }

  // Shuffle available videos to ensure random selection
  const shuffledVideos = [...availableVideos].sort(() => Math.random() - 0.5);
  let videoIndex = 0;
  let lastVideoUsed = '';

  videoSegments.forEach((segment, index) => {
    // Ensure we don't use the same video twice in a row
    let selectedVideo = shuffledVideos[videoIndex];
    while (selectedVideo === lastVideoUsed && shuffledVideos.length > 1) {
      videoIndex = (videoIndex + 1) % shuffledVideos.length;
      selectedVideo = shuffledVideos[videoIndex];
    }
    lastVideoUsed = selectedVideo;

    segments.push({
      start: segment.start,
      end: segment.end,
      duration: segment.duration,
      videoSource: selectedVideo,
      isReversed: false
    });

    videoIndex = (videoIndex + 1) % shuffledVideos.length;
  });

  return segments;
}

export function generateReverseSegments(
  originalSegments: VideoSegment[],
  totalDuration: number
): VideoSegment[] {
  return originalSegments.map((segment, index) => ({
    ...segment,
    start: totalDuration + segment.start,
    end: totalDuration + segment.end,
    videoSource: segment.videoSource,
    isReversed: true
  }));
}

export function createVideoClipsFromSegments(
  segments: VideoSegment[],
  project: VideoProject
): VideoClip[] {
  return segments.map((segment, index) => ({
    id: `auto-clip-${segment.isReversed ? 'reverse' : 'forward'}-${index}`,
    name: `${segment.isReversed ? 'Reverse' : 'Forward'} Segment ${index + 1}`,
    type: 'video' as const,
    source: segment.videoSource,
    startTime: segment.start,
    duration: segment.duration,
    endTime: segment.end,
    layer: 0,
    effects: segment.isReversed ? [{
      id: `reverse-effect-${index}`,
      name: 'Reverse',
      type: 'scale' as const,
      enabled: true,
      parameters: { reverse: true }
    }] : [],
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 },
    opacity: 1,
    volume: 1,
    muted: false
  }));
}

export function loadMusicAnalysis(musicFile: string): Promise<MusicAnalysis> {
  return fetch(`/TEST Library/analysis/${musicFile}_analysis.json`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load music analysis: ${response.statusText}`);
      }
      return response.json();
    });
}

export function getAvailableVideos(): string[] {
  const videos = [];
  for (let i = 1; i <= 4; i++) {
    for (let j = 1; j <= 7; j++) {
      videos.push(`/TEST Library/video/video_${i}_${j}.mp4`);
    }
  }
  return videos;
}

export function generateCompleteVideoProject(
  musicAnalysis: MusicAnalysis,
  availableVideos: string[],
  baseProject: VideoProject
): VideoProject {
  // Generate forward segments
  const forwardSegments = generateVideoSegments(musicAnalysis, availableVideos);
  
  // Generate reverse segments
  const totalDuration = Math.max(...musicAnalysis.summary.peak_times);
  const reverseSegments = generateReverseSegments(forwardSegments, totalDuration);
  
  // Combine all segments
  const allSegments = [...forwardSegments, ...reverseSegments];
  
  // Create video clips
  const clips = createVideoClipsFromSegments(allSegments, baseProject);
  
  // Update project
  return {
    ...baseProject,
    clips,
    duration: totalDuration * 2, // Forward + reverse
    audioTracks: [{
      id: 'music-track',
      name: 'Background Music',
      source: `/TEST Library/music/${musicAnalysis.audio_file}`,
      startTime: 0,
      duration: totalDuration * 2,
      volume: 1,
      muted: false,
      effects: []
    }]
  };
}
