#!/usr/bin/env python3
"""
Test script to verify the new segment structure
"""
import os
import sys
import json

# Add the api directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

from api.services.analysis_service import AnalysisService

def test_segment_structure():
    """Test the new segment structure"""
    service = AnalysisService()
    
    # Path to the audio file
    audio_file = "Epic Festival Electronic Anthem.wav"
    
    print(f"Testing segment structure for: {audio_file}")
    print("=" * 60)
    
    # Check if file exists
    if not os.path.exists(audio_file):
        print(f"Error: File not found: {audio_file}")
        return
    
    # Analyze the audio
    result = service.analyze_music(audio_file)
    
    # Print results
    if 'error' in result:
        print(f"Analysis failed: {result['error']}")
        return
    
    print("Analysis completed successfully!")
    print(f"Title: {result.get('title', 'N/A')}")
    print(f"Duration: {result.get('duration', 'N/A'):.2f} seconds")
    print(f"Number of segments: {len(result.get('segments', []))}")
    
    # Print segment structure
    segments = result.get('segments', [])
    print(f"\nSegment Structure:")
    for i, segment in enumerate(segments):
        print(f"  Segment {i + 1}:")
        print(f"    Index: {segment.get('segment_index', 'N/A')}")
        print(f"    Start: {segment.get('start_time', 0):.2f}s")
        print(f"    End: {segment.get('end_time', 0):.2f}s")
        print(f"    Duration: {segment.get('duration', 0):.2f}s")
        
        # Check if segment has analysis
        if 'features' in segment:
            features = segment['features']
            print(f"    Tempo: {features.get('tempo', 0):.1f} BPM")
            print(f"    Energy: {features.get('rms_energy', 0):.4f}")
            print(f"    Harmonic Ratio: {features.get('harmonic_ratio', 0):.3f}")
        
        if 'descriptors' in segment:
            descriptors = segment['descriptors']
            print(f"    Descriptors: {len(descriptors)} descriptors")
            if descriptors:
                print(f"      - {descriptors[0]}")
                if len(descriptors) > 1:
                    print(f"      - {descriptors[1]}")
        print()
    
    # Save to JSON file
    output_file = "epic_festival_segments_structured.json"
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"Structured results saved to: {output_file}")

if __name__ == "__main__":
    test_segment_structure()