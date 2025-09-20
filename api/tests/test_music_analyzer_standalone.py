#!/usr/bin/env python3
"""
Standalone test suite for Music Analyzer Integration
Tests service classes directly without FastAPI dependencies
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

import numpy as np
import librosa

# Import service classes directly
exec(open('../services/music_analyzer_service.py').read())

class MusicAnalyzerStandaloneTest:
    """Standalone test suite for music analyzer service classes"""
    
    def __init__(self):
        self.test_results = {
            "test_timestamp": datetime.now().isoformat(),
            "test_suite": "Music Analyzer Standalone Integration",
            "version": "1.0.0",
            "tests": {},
            "summary": {
                "total_tests": 0,
                "passed": 0,
                "failed": 0,
                "success_rate": 0.0
            }
        }
        
        # Initialize service instances
        self.theory_categorizer = MusicTheoryCategorizer()
        self.simple_analyzer = SimpleMusicAnalyzer()
        self.peak_detector = MusicPeakDetector()
        self.music_service = MusicAnalyzerService()
    
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
    
    def test_music_theory_categorizer_initialization(self):
        """Test MusicTheoryCategorizer initialization"""
        assert len(self.theory_categorizer.genres) > 0
        assert "Jazz / Blues" in self.theory_categorizer.genres
        assert "Ambient" in self.theory_categorizer.genres
        assert len(self.theory_categorizer.genre_characteristics) > 0
        return {"genres_count": len(self.theory_categorizer.genres)}
    
    def test_simple_analyzer_initialization(self):
        """Test SimpleMusicAnalyzer initialization"""
        assert len(self.simple_analyzer.genres) > 0
        assert "Jazz / Blues" in self.simple_analyzer.genres
        return {"genres_count": len(self.simple_analyzer.genres)}
    
    def test_metadata_extraction(self):
        """Test metadata extraction from audio file"""
        # Create test audio
        audio_data, sample_rate = self.create_test_audio_file(duration=3.0)
        temp_file = self.save_test_audio(audio_data, sample_rate)
        
        try:
            metadata = self.theory_categorizer.extract_metadata(temp_file)
            
            # Validate metadata structure
            assert "title" in metadata
            assert "artist" in metadata
            assert "album" in metadata
            assert "duration" in metadata
            assert "file_size" in metadata
            assert "file_type" in metadata
            
            # Validate values
            assert metadata["file_type"] == ".wav"
            assert metadata["file_size"] > 0
            assert metadata["duration"] > 0
            
            return metadata
            
        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    def test_audio_features_extraction(self):
        """Test audio features extraction"""
        # Create test audio
        audio_data, sample_rate = self.create_test_audio_file(duration=3.0)
        temp_file = self.save_test_audio(audio_data, sample_rate)
        
        try:
            features = self.theory_categorizer.analyze_audio_features(temp_file)
            
            # Validate features structure
            assert "duration" in features
            assert "tempo" in features
            assert "spectral_centroid" in features
            assert "rms_energy" in features
            assert "harmonic_ratio" in features
            assert "onset_rate" in features
            assert "key" in features
            assert "time_signature" in features
            
            # Validate values
            assert features["duration"] > 0
            assert features["tempo"] > 0
            assert features["spectral_centroid"] > 0
            assert 0 <= features["rms_energy"] <= 1
            assert 0 <= features["harmonic_ratio"] <= 1
            assert features["onset_rate"] >= 0
            
            return features
            
        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    def test_simple_audio_features(self):
        """Test simple audio features extraction"""
        # Create test audio
        audio_data, sample_rate = self.create_test_audio_file(duration=3.0)
        temp_file = self.save_test_audio(audio_data, sample_rate)
        
        try:
            features = self.simple_analyzer.analyze_audio_features(temp_file)
            
            # Validate features structure
            assert "duration" in features
            assert "tempo" in features
            assert "spectral_centroid" in features
            assert "rms_energy" in features
            assert "harmonic_ratio" in features
            
            # Validate values
            assert features["duration"] > 0
            assert features["tempo"] > 0
            assert features["spectral_centroid"] > 0
            assert 0 <= features["rms_energy"] <= 1
            assert 0 <= features["harmonic_ratio"] <= 1
            
            return features
            
        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    def test_music_descriptors_generation(self):
        """Test music descriptors generation"""
        # Create test audio
        audio_data, sample_rate = self.create_test_audio_file(duration=3.0)
        temp_file = self.save_test_audio(audio_data, sample_rate)
        
        try:
            features = self.simple_analyzer.analyze_audio_features(temp_file)
            descriptors = self.simple_analyzer.generate_music_descriptors(features)
            
            # Validate descriptors
            assert len(descriptors) > 0
            assert all(isinstance(desc, str) for desc in descriptors)
            assert all(len(desc) > 0 for desc in descriptors)
            
            return {"descriptors_count": len(descriptors), "descriptors": descriptors}
            
        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    def test_genre_score_calculation(self):
        """Test genre score calculation"""
        # Create test audio
        audio_data, sample_rate = self.create_test_audio_file(duration=3.0)
        temp_file = self.save_test_audio(audio_data, sample_rate)
        
        try:
            metadata = self.theory_categorizer.extract_metadata(temp_file)
            features = self.theory_categorizer.analyze_audio_features(temp_file)
            genre_scores = self.theory_categorizer.calculate_genre_scores(features, metadata)
            
            # Validate genre scores
            assert len(genre_scores) > 0
            assert all(0 <= score <= 1 for score in genre_scores.values())
            assert all(isinstance(score, float) for score in genre_scores.values())
            
            # Find predicted genre
            predicted_genre = max(genre_scores, key=genre_scores.get)
            confidence = genre_scores[predicted_genre] * 100
            
            return {
                "genre_scores": genre_scores,
                "predicted_genre": predicted_genre,
                "confidence": confidence
            }
            
        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    def test_peak_detection(self):
        """Test peak detection"""
        # Create test audio with varying intensity
        audio_data, sample_rate = self.create_test_audio_file(duration=5.0)
        
        # Add some variation to create peaks
        for i in range(0, len(audio_data), sample_rate):
            if i + sample_rate < len(audio_data):
                audio_data[i:i+sample_rate//2] *= 2.0  # Create peaks
        
        temp_file = self.save_test_audio(audio_data, sample_rate)
        
        try:
            peak_analysis = self.peak_detector.detect_music_peaks(temp_file)
            
            # Validate peak analysis structure
            assert "peak_times" in peak_analysis
            assert "peak_scores" in peak_analysis
            assert "total_peaks" in peak_analysis
            assert "analysis_duration" in peak_analysis
            
            # Validate values
            assert peak_analysis["total_peaks"] >= 0
            assert peak_analysis["analysis_duration"] > 0
            assert len(peak_analysis["peak_times"]) == peak_analysis["total_peaks"]
            assert len(peak_analysis["peak_scores"]) == peak_analysis["total_peaks"]
            
            return peak_analysis
            
        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    async def test_comprehensive_analysis(self):
        """Test comprehensive analysis service"""
        # Create test audio
        audio_data, sample_rate = self.create_test_audio_file(duration=3.0)
        temp_file = self.save_test_audio(audio_data, sample_rate)
        
        try:
            result = await self.music_service.analyze_music_comprehensive(temp_file)
            
            # Validate comprehensive analysis structure
            assert "file_path" in result
            assert "metadata" in result
            assert "features" in result
            assert "genre_scores" in result
            assert "predicted_genre" in result
            assert "confidence" in result
            assert "peak_analysis" in result
            assert "analysis_timestamp" in result
            
            # Validate values
            assert result["predicted_genre"] is not None
            assert 0 <= result["confidence"] <= 100
            assert len(result["genre_scores"]) > 0
            
            return result
            
        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    async def test_simple_analysis_service(self):
        """Test simple analysis service"""
        # Create test audio
        audio_data, sample_rate = self.create_test_audio_file(duration=3.0)
        temp_file = self.save_test_audio(audio_data, sample_rate)
        
        try:
            result = await self.music_service.analyze_music_simple(temp_file)
            
            # Validate simple analysis structure
            assert "file_path" in result
            assert "metadata" in result
            assert "features" in result
            assert "descriptors" in result
            assert "analysis_timestamp" in result
            
            # Validate values
            assert len(result["descriptors"]) > 0
            assert all(isinstance(desc, str) for desc in result["descriptors"])
            
            return result
            
        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    async def test_peak_detection_service(self):
        """Test peak detection service"""
        # Create test audio
        audio_data, sample_rate = self.create_test_audio_file(duration=3.0)
        temp_file = self.save_test_audio(audio_data, sample_rate)
        
        try:
            result = await self.music_service.detect_peaks_only(temp_file)
            
            # Validate peak detection service structure
            assert "file_path" in result
            assert "peak_analysis" in result
            assert "analysis_timestamp" in result
            
            # Validate peak analysis
            peak_analysis = result["peak_analysis"]
            assert "peak_times" in peak_analysis
            assert "peak_scores" in peak_analysis
            assert "total_peaks" in peak_analysis
            assert "analysis_duration" in peak_analysis
            
            return result
            
        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    async def run_all_tests(self):
        """Run all tests and generate comprehensive report"""
        print("🚀 Starting Music Analyzer Standalone Tests")
        print("=" * 60)
        
        # Run synchronous tests
        sync_tests = [
            ("music_theory_categorizer_initialization", self.test_music_theory_categorizer_initialization),
            ("simple_analyzer_initialization", self.test_simple_analyzer_initialization),
            ("metadata_extraction", self.test_metadata_extraction),
            ("audio_features_extraction", self.test_audio_features_extraction),
            ("simple_audio_features", self.test_simple_audio_features),
            ("music_descriptors_generation", self.test_music_descriptors_generation),
            ("genre_score_calculation", self.test_genre_score_calculation),
            ("peak_detection", self.test_peak_detection),
        ]
        
        for test_name, test_func in sync_tests:
            self.run_test(test_name, test_func)
            print()
        
        # Run asynchronous tests
        async_tests = [
            ("comprehensive_analysis", self.test_comprehensive_analysis),
            ("simple_analysis_service", self.test_simple_analysis_service),
            ("peak_detection_service", self.test_peak_detection_service),
        ]
        
        for test_name, test_func in async_tests:
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

async def main():
    """Main function to run the test suite"""
    test_suite = MusicAnalyzerStandaloneTest()
    results = await test_suite.run_all_tests()
    
    # Save results to JSON file
    output_file = "music_analyzer_standalone_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n📄 Detailed results saved to: {output_file}")
    
    return results

if __name__ == "__main__":
    asyncio.run(main())
