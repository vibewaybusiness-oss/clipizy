#!/usr/bin/env python3
"""
Simple test script to verify music analysis works
"""
import os
import sys
import tempfile
from pathlib import Path

# Add the api directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "api"))

async def test_music_analysis():
    """Test music analysis without database dependencies"""
    try:
        # Import the music analyzer service
        from api.services.music_analyzer_service import music_analyzer_service
        
        print("✅ Music analyzer service imported successfully")
        
        # Create a simple test audio file (silence)
        import numpy as np
        import librosa
        
        # Generate 5 seconds of silence at 22050 Hz
        duration = 5.0
        sample_rate = 22050
        silence = np.zeros(int(duration * sample_rate))
        
        # Save as temporary WAV file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            import soundfile as sf
            sf.write(tmp_file.name, silence, sample_rate)
            temp_file_path = tmp_file.name
        
        try:
            print(f"🔧 Testing music analysis with temporary file: {temp_file_path}")
            
            # Test simple analysis
            result = await music_analyzer_service.analyze_music_simple(temp_file_path)
            print("✅ Simple music analysis completed successfully")
            print(f"   Duration: {result.get('features', {}).get('duration', 'N/A')} seconds")
            print(f"   Tempo: {result.get('features', {}).get('tempo', 'N/A')} BPM")
            
            # Test comprehensive analysis
            result = await music_analyzer_service.analyze_music_comprehensive(temp_file_path)
            print("✅ Comprehensive music analysis completed successfully")
            print(f"   Duration: {result.get('duration', 'N/A')} seconds")
            print(f"   Tempo: {result.get('tempo', 'N/A')} BPM")
            print(f"   Segments: {len(result.get('segments_sec', []))}")
            
            return True
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        print(f"❌ Music analysis test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import asyncio
    print("🧪 Testing music analysis functionality...")
    success = asyncio.run(test_music_analysis())
    if success:
        print("🎉 Music analysis test passed!")
    else:
        print("💥 Music analysis test failed!")
