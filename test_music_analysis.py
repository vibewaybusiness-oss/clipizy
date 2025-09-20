#!/usr/bin/env python3
"""
Test script for music analysis functionality
"""

import requests
import json
import os
import sys

# Add the api directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))

def test_music_analysis_api():
    """Test the music analysis API endpoint"""
    base_url = "http://localhost:8000"  # Adjust if your API runs on a different port
    
    # Test health check
    print("Testing music analysis health check...")
    try:
        response = requests.get(f"{base_url}/api/music-analysis/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check failed with error: {e}")
        return False
    
    # Test analysis with a sample file (if available)
    sample_audio_path = "Epic Festival Electronic Anthem.wav"
    if os.path.exists(sample_audio_path):
        print(f"\nTesting music analysis with {sample_audio_path}...")
        try:
            with open(sample_audio_path, 'rb') as f:
                files = {'file': f}
                response = requests.post(f"{base_url}/api/music-analysis/analyze/comprehensive", files=files)
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Music analysis successful")
                print(f"Duration: {result.get('duration', 'N/A')} seconds")
                print(f"Tempo: {result.get('tempo', 'N/A')} BPM")
                print(f"Segments: {len(result.get('segments_sec', [])) - 1}")
                print(f"Title: {result.get('title', 'N/A')}")
                return True
            else:
                print(f"❌ Music analysis failed: {response.status_code}")
                print(f"Error: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Music analysis failed with error: {e}")
            return False
    else:
        print(f"⚠️  Sample audio file not found: {sample_audio_path}")
        print("Skipping analysis test...")
        return True

def test_project_analysis_api():
    """Test the project analysis API endpoints"""
    base_url = "http://localhost:8000"
    
    # Test project analysis endpoints
    print("\nTesting project analysis API...")
    
    # Create a test project first
    test_project_data = {
        "name": "Test Music Analysis Project",
        "type": "music-clip"
    }
    
    try:
        # Create project
        response = requests.post(f"{base_url}/api/music-clip/projects/", json=test_project_data)
        if response.status_code == 200:
            project = response.json()
            project_id = project['project_id']
            print(f"✅ Created test project: {project_id}")
            
            # Test updating analysis data
            analysis_data = {
                "music": {
                    "test_track_1": {
                        "duration": 120.5,
                        "tempo": 128.0,
                        "segments_sec": [0.0, 30.0, 60.0, 90.0, 120.5],
                        "title": "Test Track 1"
                    }
                },
                "analyzed_at": "2024-01-01T00:00:00Z",
                "total_tracks": 1,
                "successful_analyses": 1,
                "failed_analyses": 0
            }
            
            # Update analysis
            response = requests.put(f"{base_url}/api/music-clip/projects/{project_id}/analysis", json=analysis_data)
            if response.status_code == 200:
                print("✅ Analysis data updated successfully")
                
                # Get analysis data
                response = requests.get(f"{base_url}/api/music-clip/projects/{project_id}/analysis")
                if response.status_code == 200:
                    result = response.json()
                    print("✅ Analysis data retrieved successfully")
                    print(f"Analysis keys: {list(result.get('analysis', {}).keys())}")
                    
                    # Clean up - delete test project
                    response = requests.delete(f"{base_url}/api/music-clip/projects/{project_id}")
                    if response.status_code == 200:
                        print("✅ Test project cleaned up")
                    else:
                        print(f"⚠️  Failed to clean up test project: {response.status_code}")
                    
                    return True
                else:
                    print(f"❌ Failed to get analysis data: {response.status_code}")
                    return False
            else:
                print(f"❌ Failed to update analysis data: {response.status_code}")
                print(f"Error: {response.text}")
                return False
        else:
            print(f"❌ Failed to create test project: {response.status_code}")
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Project analysis test failed with error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Music Analysis Implementation")
    print("=" * 50)
    
    # Test music analysis API
    analysis_success = test_music_analysis_api()
    
    # Test project analysis API
    project_success = test_project_analysis_api()
    
    print("\n" + "=" * 50)
    if analysis_success and project_success:
        print("🎉 All tests passed! Music analysis implementation is working correctly.")
    else:
        print("❌ Some tests failed. Please check the implementation.")
        sys.exit(1)
