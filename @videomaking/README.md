# Auto Video Generator

AI-powered video creation tool that automatically generates videos synchronized with music analysis.

## Features

- **Music Analysis**: Peak detection and segment mapping
- **Waveform Visualization**: Real-time music waveform with peak markers
- **Auto Video Generation**: Smart segmentation based on music peaks
- **Reverse Playback**: Complete forward + reverse video cycle
- **Random Assignment**: No consecutive duplicate videos

## Usage

1. Select music file from dropdown
2. Load music analysis
3. Generate video segments automatically
4. Add reverse playback for complete cycle
5. Preview and export final video

## Components

- `AutoVideoGenerator`: Main generation interface
- `EnhancedTimeline`: Timeline with music waveform
- `autoVideoGenerator.ts`: Core generation utilities

## Music Analysis Format

Expects JSON files with peak times, segments, and summary data for automatic video generation.