#!/usr/bin/env python3
"""
Comprehensive test suite for Music Analyzer Integration
Tests all endpoints and functionality
"""

import sys
import os
import json
import tempfile
import asyncio
from pathlib import Path
from datetime import datetime

# Add the api directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from fastapi import FastAPI
import numpy as np
import librosa

# Import the router directly
exec(open('../routers/music_analysis_router.py').read())

class MusicAnalyzerIntegrationTest:
    """Comprehensive test suite for music analyzer integration"""
    
    def __init__(self):
        self.app = FastAPI()
        self.app.include_router(router)
        self.client = TestClient(self.app)
        self.test_results = {
            "test_timestamp": datetime.now().isoformat(),
            "test_suite": "Music Analyzer Integration",
            "version": "1.0.0",
            "tests": {},
            "summary": {
                "total_tests": 0,
                "passed": 0,
                "failed": 0,
                "success_rate": 0.0
            }
        }
    
    def create_test_audio_file(self, duration=5.0, sample_rate=44100, frequency=440.0):
        """Create a test audio file for testing"""
        # Generate a simple sine wave
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        audio_data = np.sin(2 * np.pi * frequency * t) * 0.5
        
        # Add some variation to make it more interesting
        audio_data += np.sin(2 * np.pi * frequency * 2 * t) * 0.2
        audio_data += np.random.normal(0, 0.05, len(audio_data))
        
        # Convert to 16-bit PCM
        audio_data = (audio_data * 32767).astype(np.int16)
        
        return audio_data, sample_rate
    
    def save_test_audio(self, audio_data, sample_rate, filename="test_audio.wav"):
        """Save test audio data to a temporary file"""
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        
        # Write WAV file header and data
        import wave
        with wave.open(temp_file.name, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_data.tobytes())
        
        return temp_file.name
    
    def run_test(self, test_name, test_func):
        """Run a single test and record results"""
        print(f"🧪 Running test: {test_name}")
        try:
            result = test_func()
            self.test_results["tests"][test_name] = {
                "status": "PASSED",
                "result": result,
                "error": None
            }
            self.test_results["summary"]["passed"] += 1
            print(f"✅ {test_name}: PASSED")
            return True
        except Exception as e:
            self.test_results["tests"][test_name] = {
                "status": "FAILED",
                "result": None,
                "error": str(e)
            }
            self.test_results["summary"]["failed"] += 1
            print(f"❌ {test_name}: FAILED - {e}")
            return False
        finally:
            self.test_results["summary"]["total_tests"] += 1
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = self.client.get("/api/music-analysis/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "music-analysis"
        return data
    
    def test_genres_endpoint(self):
        """Test genres endpoint"""
        response = self.client.get("/api/music-analysis/genres")
        assert response.status_code == 200
        data = response.json()
        assert "genres" in data
        assert "total_count" in data
        assert len(data["genres"]) > 0
        assert data["total_count"] == len(data["genres"])
        return data
    
    def test_analysis_types_endpoint(self):
        """Test analysis types endpoint"""
        response = self.client.get("/api/music-analysis/analysis-types")
        assert response.status_code == 200
        data = response.json()
        assert "analysis_types" in data
        assert "comprehensive" in data["analysis_types"]
        assert "simple" in data["analysis_types"]
        assert "peaks" in data["analysis_types"]
        return data
    
    def test_file_upload_validation(self):
        """Test file upload validation"""
        # Test with no file
        response = self.client.post("/api/music-analysis/analyze/simple")
        assert response.status_code == 422
        
        # Test with invalid file type
        response = self.client.post(
            "/api/music-analysis/analyze/simple",
            files={"file": ("test.txt", "This is not an audio file", "text/plain")}
        )
        assert response.status_code == 400
        
        return {"validation_tests": "passed"}
    
    def test_simple_analysis_with_audio(self):
        """Test simple analysis with actual audio file"""
        # Create test audio
        audio_data, sample_rate = self.create_test_audio_file(duration=3.0)
        temp_file = self.save_test_audio(audio_data, sample_rate)
        
        try:
            # Test simple analysis
            with open(temp_file, 'rb') as f:
                response = self.client.post(
                    "/api/music-analysis/analyze/simple",
                    files={"file": ("test_audio.wav", f, "audio/wav")}
                )
            
            assert response.status_code == 200
            data = response.json()
            
            # Validate response structure
            assert "file_path" in data
            assert "original_filename" in data
            assert "file_size" in data
            assert "metadata" in data
            assert "features" in data
            assert "descriptors" in data
            assert "analysis_timestamp" in data
            
            # Validate features
            features = data["features"]
            assert "duration" in features
            assert "tempo" in features
            assert "spectral_centroid" in features
            assert "rms_energy" in features
            assert "harmonic_ratio" in features
            
            # Validate descriptors
            assert len(data["descriptors"]) > 0
            
            return data
            
        finally:
            # Clean up
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    def test_comprehensive_analysis_with_audio(self):
        """Test comprehensive analysis with actual audio file"""
        # Create test audio
        audio_data, sample_rate = self.create_test_audio_file(duration=3.0)
        temp_file = self.save_test_audio(audio_data, sample_rate)
        
        try:
            # Test comprehensive analysis
            with open(temp_file, 'rb') as f:
                response = self.client.post(
                    "/api/music-analysis/analyze/comprehensive",
                    files={"file": ("test_audio.wav", f, "audio/wav")}
                )
            
            assert response.status_code == 200
            data = response.json()
            
            # Validate response structure
            assert "file_path" in data
            assert "original_filename" in data
            assert "file_size" in data
            assert "metadata" in data
            assert "features" in data
            assert "genre_scores" in data
            assert "predicted_genre" in data
            assert "confidence" in data
            assert "peak_analysis" in data
            assert "analysis_timestamp" in data
            
            # Validate features
            features = data["features"]
            assert "duration" in features
            assert "tempo" in features
            assert "spectral_centroid" in features
            assert "rms_energy" in features
            assert "harmonic_ratio" in features
            assert "onset_rate" in features
            assert "key" in features
            assert "time_signature" in features
            
            # Validate genre analysis
            assert len(data["genre_scores"]) > 0
            assert data["predicted_genre"] is not None
            assert 0 <= data["confidence"] <= 100
            
            # Validate peak analysis
            peak_analysis = data["peak_analysis"]
            assert "peak_times" in peak_analysis
            assert "peak_scores" in peak_analysis
            assert "total_peaks" in peak_analysis
            assert "analysis_duration" in peak_analysis
            
            return data
            
        finally:
            # Clean up
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    def test_peak_detection_with_audio(self):
        """Test peak detection with actual audio file"""
        # Create test audio with varying intensity
        audio_data, sample_rate = self.create_test_audio_file(duration=5.0)
        
        # Add some variation to create peaks
        for i in range(0, len(audio_data), sample_rate):
            if i + sample_rate < len(audio_data):
                audio_data[i:i+sample_rate//2] *= 2.0  # Create peaks
        
        temp_file = self.save_test_audio(audio_data, sample_rate)
        
        try:
            # Test peak detection
            with open(temp_file, 'rb') as f:
                response = self.client.post(
                    "/api/music-analysis/analyze/peaks",
                    files={"file": ("test_audio.wav", f, "audio/wav")},
                    params={"min_peaks": 2, "min_gap_seconds": 1.0}
                )
            
            assert response.status_code == 200
            data = response.json()
            
            # Validate response structure
            assert "file_path" in data
            assert "original_filename" in data
            assert "file_size" in data
            assert "peak_analysis" in data
            assert "parameters" in data
            assert "analysis_timestamp" in data
            
            # Validate peak analysis
            peak_analysis = data["peak_analysis"]
            assert "peak_times" in peak_analysis
            assert "peak_scores" in peak_analysis
            assert "total_peaks" in peak_analysis
            assert "analysis_duration" in peak_analysis
            
            # Validate parameters
            params = data["parameters"]
            assert params["min_peaks"] == 2
            assert params["min_gap_seconds"] == 1.0
            
            return data
            
        finally:
            # Clean up
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    def test_file_path_analysis(self):
        """Test file path analysis endpoint"""
        # Create test audio
        audio_data, sample_rate = self.create_test_audio_file(duration=2.0)
        temp_file = self.save_test_audio(audio_data, sample_rate)
        
        try:
            # Test with valid file path
            response = self.client.post(
                "/api/music-analysis/analyze/file-path",
                params={"file_path": temp_file, "analysis_type": "simple"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "file_path" in data
            assert data["file_path"] == temp_file
            
            return data
            
        finally:
            # Clean up
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    def test_file_path_validation(self):
        """Test file path validation"""
        # Test with non-existent file
        response = self.client.post(
            "/api/music-analysis/analyze/file-path",
            params={"file_path": "nonexistent.wav", "analysis_type": "simple"}
        )
        assert response.status_code == 404
        
        # Test with invalid analysis type
        response = self.client.post(
            "/api/music-analysis/analyze/file-path",
            params={"file_path": "test.wav", "analysis_type": "invalid"}
        )
        assert response.status_code == 400
        
        return {"validation_tests": "passed"}
    
    def run_all_tests(self):
        """Run all tests and generate comprehensive report"""
        print("🚀 Starting Music Analyzer Integration Tests")
        print("=" * 60)
        
        # Run all tests
        tests = [
            ("health_endpoint", self.test_health_endpoint),
            ("genres_endpoint", self.test_genres_endpoint),
            ("analysis_types_endpoint", self.test_analysis_types_endpoint),
            ("file_upload_validation", self.test_file_upload_validation),
            ("simple_analysis_with_audio", self.test_simple_analysis_with_audio),
            ("comprehensive_analysis_with_audio", self.test_comprehensive_analysis_with_audio),
            ("peak_detection_with_audio", self.test_peak_detection_with_audio),
            ("file_path_analysis", self.test_file_path_analysis),
            ("file_path_validation", self.test_file_path_validation),
        ]
        
        for test_name, test_func in tests:
            self.run_test(test_name, test_func)
            print()
        
        # Calculate success rate
        total = self.test_results["summary"]["total_tests"]
        passed = self.test_results["summary"]["passed"]
        self.test_results["summary"]["success_rate"] = (passed / total * 100) if total > 0 else 0
        
        # Print summary
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {self.test_results['summary']['failed']}")
        print(f"Success Rate: {self.test_results['summary']['success_rate']:.1f}%")
        
        if self.test_results["summary"]["success_rate"] == 100:
            print("🎉 ALL TESTS PASSED!")
        else:
            print("⚠️  Some tests failed. Check the detailed results.")
        
        return self.test_results

def main():
    """Main function to run the test suite"""
    test_suite = MusicAnalyzerIntegrationTest()
    results = test_suite.run_all_tests()
    
    # Save results to JSON file
    output_file = "api/tests/music_analyzer_integration_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n📄 Detailed results saved to: {output_file}")
    
    return results

if __name__ == "__main__":
    main()
