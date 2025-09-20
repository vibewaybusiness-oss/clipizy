# Music Analysis Implementation

## Overview
This implementation adds parallel music analysis functionality to the music-create flow. When users click the "Continue" button from the settings step, the system automatically analyzes all music tracks in parallel before proceeding to the overview step.

## Key Features

### 1. Parallel Music Analysis
- **Location**: `src/lib/api/music-analysis.ts`
- **Function**: `analyzeTracksInParallel()`
- **Behavior**: Analyzes all music tracks simultaneously using `Promise.all()`
- **API Endpoint**: `/api/music-analysis/analyze/comprehensive`

### 2. Analysis Data Structure
The analysis results follow the structure from `epic_festival_segments_structured.json`:
```typescript
interface MusicAnalysisResult {
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
      features: { /* segment features */ };
      descriptors: string[];
    }>;
    segment_analysis: Array<{ /* same as segments */ }>;
  };
  error?: string;
}
```

### 3. Project Storage
- **Backend Storage**: Project's `analysis` field in database
- **Structure**: `analysis.music[trackId] = analysisData`
- **API Endpoints**:
  - `PUT /api/music-clip/projects/{project_id}/analysis` - Update analysis data
  - `GET /api/music-clip/projects/{project_id}/analysis` - Retrieve analysis data
- **Local Storage**: Also saved to localStorage for immediate access

### 4. User Experience
- **Loading State**: Button shows "Analyzing Music..." with spinner during analysis
- **Error Handling**: Graceful fallback if analysis fails
- **Non-blocking**: Analysis runs in background, user can continue if it fails

## Implementation Details

### Frontend Changes

#### 1. Music Analysis API (`src/lib/api/music-analysis.ts`)
```typescript
export class MusicAnalysisAPI {
  async analyzeTrack(track: MusicTrack): Promise<MusicAnalysisResult>
  async analyzeTracksInParallel(tracks: MusicTrack[]): Promise<MusicAnalysisResult[]>
}
```

#### 2. Music Clip State (`src/hooks/use-music-clip-state.ts`)
- Added `isAnalyzingMusic: boolean` state
- Added `setIsAnalyzingMusic: (isAnalyzing: boolean) => void` action

#### 3. Settings Submit Handler (`src/components/music-clip/MusicClipPage.tsx`)
```typescript
const handleSettingsSubmit = async (values: z.infer<typeof SettingsSchema>) => {
  // ... existing settings logic ...
  
  // Start parallel music analysis
  try {
    musicClipState.actions.setIsAnalyzingMusic(true);
    
    const tracksWithFiles = musicTracks.musicTracks.filter(track => track.file);
    if (tracksWithFiles.length > 0) {
      const analysisResults = await musicAnalysisAPI.analyzeTracksInParallel(tracksWithFiles);
      
      // Store analysis data
      const analysisData = {
        music: analysisResults.reduce((acc, result) => {
          if (!result.error) {
            acc[result.trackId] = result.analysis;
          }
          return acc;
        }, {} as Record<string, any>),
        analyzed_at: new Date().toISOString(),
        total_tracks: tracksWithFiles.length,
        successful_analyses: analysisResults.filter(r => !r.error).length,
        failed_analyses: analysisResults.filter(r => r.error).length
      };
      
      // Save to backend and localStorage
      await musicClipAPI.updateProjectAnalysis(projectId, analysisData);
      localStorage.setItem(`musicClip_${projectId}_analysis`, JSON.stringify(analysisData));
    }
  } catch (error) {
    // Handle errors gracefully
  } finally {
    musicClipState.actions.setIsAnalyzingMusic(false);
  }
  
  // Proceed to overview step
  musicClipState.actions.setCurrentStep(3);
};
```

#### 4. UI Updates
- Continue button shows loading state during analysis
- Button is disabled during analysis
- Loading spinner and "Analyzing Music..." text

### Backend Changes

#### 1. Music Analysis Router (`api/routers/music_analysis_router.py`)
- Existing comprehensive analysis endpoint
- Uses `music_analyzer_service.analyze_music_comprehensive()`

#### 2. Music Clip Router (`api/routers/music_clip_router.py`)
- `PUT /projects/{project_id}/analysis` - Update analysis data
- `GET /projects/{project_id}/analysis` - Retrieve analysis data

#### 3. Analysis Service (`api/services/analysis_service.py`)
- Existing `analyze_music()` method
- Uses `music_analyzer.py` for comprehensive analysis

## Data Flow

1. **User clicks Continue** from settings step
2. **Settings are saved** to project and localStorage
3. **Analysis starts** in parallel for all tracks with files
4. **Analysis results** are processed and structured
5. **Data is stored** in project.analysis.music[trackId]
6. **Data is cached** in localStorage for immediate access
7. **User proceeds** to overview step (step 3)

## Error Handling

- **Analysis failures** are logged but don't block the flow
- **Individual track failures** are recorded in the results
- **Network errors** show user-friendly toast messages
- **Graceful degradation** allows users to continue without analysis

## Testing

A test script is provided (`test_music_analysis.py`) that:
- Tests the music analysis API health check
- Tests analysis with sample audio files
- Tests project analysis CRUD operations
- Cleans up test data

## Usage

The implementation is automatic and requires no user intervention. When users:
1. Upload or generate music tracks
2. Configure settings
3. Click "Continue"

The system will automatically analyze all music tracks in parallel before proceeding to the overview step. The analysis data is then available for use in the overview step and subsequent video generation.
