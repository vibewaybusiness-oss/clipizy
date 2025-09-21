#!/usr/bin/env python3
"""
Test script for music analysis API with real audio file
"""
import requests
import os

def test_music_analysis():
    """Test the music analysis API endpoint with a longer audio file"""
    
    # Test the music analysis endpoint
    url = "http://localhost:8000/api/music-analysis/analyze/comprehensive"
    
    try:
        with open('test_long_audio.wav', 'rb') as f:
            files = {'file': ('test_long_audio.wav', f, 'audio/wav')}
            response = requests.post(url, files=files, timeout=120)
        
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
        if os.path.exists('test_long_audio.wav'):
            os.remove('test_long_audio.wav')

if __name__ == "__main__":
    test_music_analysis()
