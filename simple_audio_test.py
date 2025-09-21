#!/usr/bin/env python3
"""
Simple test for audio analysis
"""

import os
import sys

# Add the api directory to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
api_dir = os.path.join(current_dir, 'api')
sys.path.insert(0, api_dir)

def test_audio_analysis():
    """Simple test for audio analysis"""
    print("=== SIMPLE AUDIO ANALYSIS TEST ===")
    
    # Check if test file exists
    test_file_path = "test_long.wav"
    if not os.path.exists(test_file_path):
        print(f"ERROR: Test file {test_file_path} not found!")
        return False
    
    print(f"File exists: {os.path.exists(test_file_path)}")
    print(f"File size: {os.path.getsize(test_file_path)} bytes")
    
    try:
        # Test 1: Try to import analysis service
        print("\n--- TEST 1: Import Analysis Service ---")
        from api.services.analysis_service import AnalysisService
        print("✓ Analysis service imported successfully")
        
        # Test 2: Create analysis service instance
        print("\n--- TEST 2: Create Analysis Service Instance ---")
        analysis_service = AnalysisService()
        print("✓ Analysis service instance created")
        
        # Test 3: Try to analyze the audio file
        print("\n--- TEST 3: Analyze Audio File ---")
        print(f"Analyzing: {test_file_path}")
        
        try:
            analysis_result = analysis_service.analyze_music(test_file_path)
            print("✓ Analysis completed")
            
            if "error" in analysis_result:
                print(f"✗ Analysis returned error: {analysis_result['error']}")
                if "traceback" in analysis_result:
                    print(f"Traceback: {analysis_result['traceback']}")
                return False
            else:
                print(f"✓ Analysis successful")
                print(f"  Duration: {analysis_result.get('duration', 0):.2f} seconds")
                print(f"  Tempo: {analysis_result.get('tempo', 0):.1f} BPM")
                print(f"  Segments: {len(analysis_result.get('segments_sec', [])) - 1}")
                return True
                
        except Exception as e:
            print(f"✗ Analysis failed with exception: {e}")
            print(f"Exception type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            return False
            
    except Exception as e:
        print(f"✗ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_audio_analysis()
    if success:
        print("\n✓ ALL TESTS PASSED!")
    else:
        print("\n✗ TESTS FAILED!")
    sys.exit(0 if success else 1)
