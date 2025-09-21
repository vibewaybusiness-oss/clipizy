#!/usr/bin/env python3
"""
Test script for music analysis API
"""
import requests
import os

def test_music_analysis():
    """Test the music analysis API endpoint"""
    
    # Create a simple test audio file
    import numpy as np
    import soundfile as sf
    
    # Generate 2 seconds of random audio
    y = np.random.randn(44100 * 2)
    sf.write('test_audio.wav', y, 44100)
    
    # Test the music analysis endpoint
    url = "http://localhost:8000/api/music-analysis/analyze/comprehensive"
    
    try:
        with open('test_audio.wav', 'rb') as f:
            files = {'file': ('test_audio.wav', f, 'audio/wav')}
            response = requests.post(url, files=files, timeout=60)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Music analysis test passed!")
        else:
            print("❌ Music analysis test failed!")
            
    except Exception as e:
        print(f"❌ Error testing music analysis: {e}")
    finally:
        # Clean up test file
        if os.path.exists('test_audio.wav'):
            os.remove('test_audio.wav')

if __name__ == "__main__":
    test_music_analysis()
