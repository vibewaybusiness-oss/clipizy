#!/usr/bin/env python3
"""
Script to process all music files in the TEST Library/music directory
and generate JSON outputs with smoothed peaks and segments.
"""

import os
import sys
import json
from pathlib import Path

# Add the current directory to Python path to import the detector
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from music_peak_detector import detect_music_peaks, analyze_gaps_and_smooth, export_to_json

def process_music_files():
    """Process all music files and generate JSON outputs"""
    
    # Define paths
    music_dir = Path("./TEST Library/music")
    print(os.listdir(os.path.abspath(music_dir)))
    print(os.path.abspath(music_dir))

    output_dir = Path("json_outputs")
    
    # Create output directory if it doesn't exist
    output_dir.mkdir(exist_ok=True)
    
    # Get all music files
    music_files = list(music_dir.glob("*.wav"))
    
    if not music_files:
        print("No music files found in TEST Library/music directory")
        return
    
    print(f"Found {len(music_files)} music files to process")
    print("="*60)
    
    # Process each music file
    all_results = {}
    
    for i, music_file in enumerate(music_files, 1):
        print(f"\nProcessing {i}/{len(music_files)}: {music_file.name}")
        print("-" * 40)
        
        try:
            # Detect peaks
            peak_times, peak_scores, times, rms_db, ma_short, ma_long, score_z, segments = detect_music_peaks(
                str(music_file),
                min_peaks=2,
                max_peaks=None,
                include_boundaries=True
            )
            
            # Apply smoothing
            smoothed_times, smoothed_scores, gap_analysis = analyze_gaps_and_smooth(
                peak_times, peak_scores, significance_threshold=1.5
            )
            
            # Generate output filename
            output_filename = f"{music_file.stem}_analysis.json"
            output_path = output_dir / output_filename
            
            # Export to JSON
            result = export_to_json(
                smoothed_times, 
                smoothed_scores, 
                segments, 
                str(music_file), 
                str(output_path)
            )
            
            # Store result for summary
            all_results[music_file.name] = {
                "file": str(music_file),
                "output": str(output_path),
                "peaks_count": len(smoothed_times),
                "segments_count": len([s for s in segments if s != segments[-1]]),  # Exclude end point
                "duration": float(times[-1]) if len(times) > 0 else 0.0
            }
            
            print(f"✓ Successfully processed {music_file.name}")
            print(f"  - Peaks: {len(smoothed_times)}")
            print(f"  - Segments: {len([s for s in segments if s != segments[-1]])}")
            print(f"  - Duration: {times[-1]:.2f}s")
            print(f"  - Output: {output_path}")
            
        except Exception as e:
            print(f"✗ Error processing {music_file.name}: {str(e)}")
            all_results[music_file.name] = {
                "file": str(music_file),
                "error": str(e),
                "peaks_count": 0,
                "segments_count": 0,
                "duration": 0.0
            }
    
    # Create summary JSON
    summary = {
        "processing_summary": {
            "total_files": len(music_files),
            "successful": len([r for r in all_results.values() if "error" not in r]),
            "failed": len([r for r in all_results.values() if "error" in r]),
            "output_directory": str(output_dir)
        },
        "files": all_results
    }
    
    summary_path = output_dir / "processing_summary.json"
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)
    
    print("\n" + "="*60)
    print("PROCESSING COMPLETE")
    print("="*60)
    print(f"Total files processed: {len(music_files)}")
    print(f"Successful: {summary['processing_summary']['successful']}")
    print(f"Failed: {summary['processing_summary']['failed']}")
    print(f"Output directory: {output_dir}")
    print(f"Summary saved to: {summary_path}")
    
    return summary

if __name__ == "__main__":
    process_music_files()
