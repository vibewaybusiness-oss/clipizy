"""
Analysis service for music, video, and image analysis
"""
import json
import os
from typing import Dict, Any, Optional, List
import sys
import os
import numpy as np
import librosa
from mutagen import File as MutagenFile

# Add the workflows/analyzer directory to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
analyzer_dir = os.path.join(current_dir, '..', 'workflows', 'analyzer')
sys.path.insert(0, analyzer_dir)

try:
    from music_analyzer import analyze_audio_bytes
except ImportError:
    # Fallback: try direct import
    import importlib.util
    spec = importlib.util.spec_from_file_location("music_analyzer", os.path.join(analyzer_dir, "music_analyzer.py"))
    music_analyzer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(music_analyzer)
    analyze_audio_bytes = music_analyzer.analyze_audio_bytes

class AnalysisService:
    """Service for analyzing media files"""
    
    def __init__(self):
        pass
    
    def extract_title(self, file_path: str) -> str:
        """Extract title from metadata or filename"""
        try:
            audio_file = MutagenFile(file_path)
            if audio_file is not None:
                if 'TIT2' in audio_file:
                    return str(audio_file['TIT2'][0])
                elif 'TITLE' in audio_file:
                    return str(audio_file['TITLE'][0])
            
            filename = os.path.basename(file_path)
            name_without_ext = os.path.splitext(filename)[0]
            title = name_without_ext.replace('_', ' ').replace('-', ' ')
            return ' '.join(word.capitalize() for word in title.split())
            
        except Exception:
            filename = os.path.basename(file_path)
            name_without_ext = os.path.splitext(filename)[0]
            title = name_without_ext.replace('_', ' ').replace('-', ' ')
            return ' '.join(word.capitalize() for word in title.split())
    
    def analyze_audio_features(self, y: np.ndarray, sr: int) -> Dict[str, Any]:
        """Extract essential audio features from audio data"""
        try:
            features = {}
            
            # Basic features
            features['duration'] = len(y) / sr
            
            # Tempo
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            features['tempo'] = float(tempo)
            
            # Spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            features['spectral_centroid'] = float(np.mean(spectral_centroids))
            
            # Energy
            rms = librosa.feature.rms(y=y)[0]
            features['rms_energy'] = float(np.mean(rms))
            
            # Harmonic/Percussive separation
            harmonic, percussive = librosa.effects.hpss(y)
            features['harmonic_ratio'] = float(np.sum(harmonic**2) / (np.sum(harmonic**2) + np.sum(percussive**2)))
            
            # Onset detection
            onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
            features['onset_rate'] = len(onset_frames) / (len(y) / sr)
            
            return features
            
        except Exception as e:
            print(f"Error analyzing audio: {e}")
            return {}
    
    def generate_music_descriptors(self, features: Dict[str, Any]) -> List[str]:
        """Generate human-readable music descriptors including Long MA characteristics"""
        descriptors = []
        
        tempo = features.get('tempo', 0)
        energy = features.get('rms_energy', 0)
        harmonic_ratio = features.get('harmonic_ratio', 0)
        spectral_centroid = features.get('spectral_centroid', 0)
        
        # Long MA characteristics
        ma_long_mean = features.get('ma_long_mean', 0)
        ma_long_stability = features.get('ma_long_stability', 0)
        ma_long_trend = features.get('ma_long_trend', 0)
        ma_long_range = features.get('ma_long_range', 0)
        ma_long_energy_high = features.get('ma_long_energy_high', 0)
        
        # Tempo description
        if tempo < 60:
            descriptors.append("Very slow tempo (ballad-like, ambient)")
        elif tempo < 80:
            descriptors.append("Slow tempo (relaxed, chill)")
        elif tempo < 120:
            descriptors.append("Moderate tempo (walking pace, comfortable)")
        elif tempo < 140:
            descriptors.append("Up-tempo (energetic, driving)")
        else:
            descriptors.append("Fast tempo (very energetic, intense)")
        
        # Energy description (using both RMS and Long MA)
        if energy < 0.05 and ma_long_mean < -25:
            descriptors.append("Very low energy (quiet, ambient, meditative)")
        elif energy < 0.1 and ma_long_mean < -20:
            descriptors.append("Low energy (soft, gentle, relaxed)")
        elif energy < 0.2 and ma_long_mean < -15:
            descriptors.append("Medium energy (balanced, moderate)")
        elif energy < 0.3 and ma_long_mean < -10:
            descriptors.append("High energy (loud, dynamic, exciting)")
        else:
            descriptors.append("Very high energy (intense, powerful, aggressive)")
        
        # Long MA stability description
        if ma_long_stability > 1.0:
            descriptors.append("Highly stable energy profile (consistent, steady)")
        elif ma_long_stability > 0.5:
            descriptors.append("Stable energy profile (relatively consistent)")
        elif ma_long_stability > 0.2:
            descriptors.append("Moderately variable energy (some fluctuations)")
        else:
            descriptors.append("Highly variable energy (dynamic, fluctuating)")
        
        # Long MA trend description
        if ma_long_trend > 0.2:
            descriptors.append("Building energy trend (crescendo, intensifying)")
        elif ma_long_trend > 0.05:
            descriptors.append("Slight energy increase (gentle build-up)")
        elif ma_long_trend < -0.2:
            descriptors.append("Fading energy trend (diminuendo, calming)")
        elif ma_long_trend < -0.05:
            descriptors.append("Slight energy decrease (gentle fade)")
        else:
            descriptors.append("Stable energy trend (consistent level)")
        
        # Long MA range description
        if ma_long_range > 10:
            descriptors.append("High energy range (very dynamic, wide variation)")
        elif ma_long_range > 5:
            descriptors.append("Moderate energy range (some dynamic variation)")
        else:
            descriptors.append("Low energy range (consistent level)")
        
        # Harmonic content
        if harmonic_ratio > 0.8:
            descriptors.append("Highly harmonic (very melodic, tonal, musical)")
        elif harmonic_ratio > 0.6:
            descriptors.append("Harmonic (melodic, tonal)")
        elif harmonic_ratio > 0.4:
            descriptors.append("Mixed harmonic/percussive (balanced)")
        elif harmonic_ratio > 0.2:
            descriptors.append("Percussive (rhythmic, beat-focused)")
        else:
            descriptors.append("Highly percussive (very rhythmic, minimal melody)")
        
        # Frequency content
        if spectral_centroid < 1000:
            descriptors.append("Low frequency content (bass-heavy, warm, deep)")
        elif spectral_centroid < 2000:
            descriptors.append("Mid-low frequency content (warm, full-bodied)")
        elif spectral_centroid < 4000:
            descriptors.append("Mid frequency content (balanced, natural)")
        else:
            descriptors.append("High frequency content (bright, crisp, airy)")
        
        return descriptors
    
    def analyze_music(self, file_path: str) -> Dict[str, Any]:
        """Analyze music file and return analysis results"""
        try:
            # Extract title
            title = self.extract_title(file_path)
            
            # Read audio file as bytes
            with open(file_path, 'rb') as audio_file:
                audio_data = audio_file.read()
            
            # Load audio for feature analysis
            y, sr = librosa.load(file_path, sr=22050)
            
            # Analyze using the music analyzer
            result = analyze_audio_bytes(
                data=audio_data,
                create_plot=False,  # No visualization, just return dictionary
                audio_file=os.path.basename(file_path),
                use_beat_energy=True,
                short_ma_beats=4,
                long_ma_beats=16,
                min_gap_seconds=11.0
            )
            
            # Add title to result
            result['title'] = title
            
            # Analyze overall audio features
            overall_features = self.analyze_audio_features(y, sr)
            result['audio_features'] = overall_features
            
            # Generate music descriptors for overall track
            overall_descriptors = self.generate_music_descriptors(overall_features)
            result['music_descriptors'] = overall_descriptors
            
            # Create actual segments from boundary points
            segments_sec = result.get('segments_sec', [])
            segments = []
            segment_analysis = []
            
            for i in range(len(segments_sec) - 1):
                start_time = segments_sec[i]
                end_time = segments_sec[i + 1]
                
                # Create segment object
                segment = {
                    'segment_index': i,
                    'start_time': start_time,
                    'end_time': end_time,
                    'duration': end_time - start_time
                }
                segments.append(segment)
                
                # Extract segment audio for analysis
                start_frame = int(start_time * sr)
                end_frame = int(end_time * sr)
                segment_audio = y[start_frame:end_frame]
                
                if len(segment_audio) > 0:
                    # Analyze segment features
                    segment_features = self.analyze_audio_features(segment_audio, sr)
                    segment_features['start_time'] = start_time
                    segment_features['end_time'] = end_time
                    segment_features['duration'] = end_time - start_time
                    
                    # Generate descriptors for segment
                    segment_descriptors = self.generate_music_descriptors(segment_features)
                    
                    # Add analysis to segment
                    segment['features'] = segment_features
                    segment['descriptors'] = segment_descriptors
                    
                    segment_analysis.append(segment)
            
            # Replace segments_sec with actual segments
            result['segments'] = segments
            result['segment_analysis'] = segment_analysis
            
            # Keep segments_sec for backward compatibility
            result['segments_sec'] = segments_sec
            
            # Return the enhanced analysis result dictionary
            return result
            
        except FileNotFoundError:
            return {"error": f"Audio file not found: {file_path}"}
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            return {"error": f"Analysis failed: {str(e)}", "traceback": error_details}
    
    def analyze_video(self, file_path: str) -> Dict[str, Any]:
        """Analyze video file and return analysis results"""
        # Placeholder implementation
        return {
            "duration": 30,
            "fps": 30,
            "resolution": "1920x1080",
            "aspect_ratio": "16:9",
            "color_palette": ["#FF0000", "#00FF00", "#0000FF"],
            "motion_level": 0.6,
            "brightness": 0.7,
            "contrast": 0.8
        }
    
    def analyze_image(self, file_path: str) -> Dict[str, Any]:
        """Analyze image file and return analysis results"""
        # Placeholder implementation
        return {
            "width": 1920,
            "height": 1080,
            "aspect_ratio": "16:9",
            "color_palette": ["#FF0000", "#00FF00", "#0000FF"],
            "brightness": 0.7,
            "contrast": 0.8,
            "saturation": 0.6,
            "dominant_colors": ["#FF0000", "#00FF00"]
        }
    
    def generate_music_description(self, analysis_result: Dict[str, Any]) -> str:
        """Generate a description based on music analysis"""
        tempo = analysis_result.get("tempo", 120)
        genre = analysis_result.get("genre", "unknown")
        mood = analysis_result.get("mood", "neutral")
        
        return f"A {mood} {genre} track with a tempo of {tempo} BPM"
    
    def generate_video_description(self, analysis_result: Dict[str, Any]) -> str:
        """Generate a description based on video analysis"""
        duration = analysis_result.get("duration", 0)
        resolution = analysis_result.get("resolution", "unknown")
        motion_level = analysis_result.get("motion_level", 0)
        
        motion_desc = "high motion" if motion_level > 0.5 else "low motion"
        return f"A {duration}s video at {resolution} resolution with {motion_desc}"
    
    def generate_image_description(self, analysis_result: Dict[str, Any]) -> str:
        """Generate a description based on image analysis"""
        width = analysis_result.get("width", 0)
        height = analysis_result.get("height", 0)
        brightness = analysis_result.get("brightness", 0.5)
        
        brightness_desc = "bright" if brightness > 0.7 else "dark" if brightness < 0.3 else "moderate"
        return f"A {width}x{height} {brightness_desc} image"

# Global instance
analysis_service = AnalysisService()
