"""
Music analysis service for CPU-based processing
"""
import librosa
import numpy as np
import json
import os
import tempfile
from typing import Dict, Any, Optional, List
import logging
try:
    from ..config import settings
except ImportError:
    from config import settings

logger = logging.getLogger(__name__)


class AnalysisService:
    def __init__(self):
        self.sample_rate = 22050  # Standard sample rate for analysis
        self.hop_length = 512
        self.n_fft = 2048

    def analyze_music(self, file_path: str) -> Dict[str, Any]:
        """
        Comprehensive music analysis using librosa
        """
        try:
            logger.info(f"Starting music analysis for: {file_path}")
            
            # Load audio file
            y, sr = librosa.load(file_path, sr=self.sample_rate)
            duration = len(y) / sr
            
            # Basic audio features
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=self.hop_length)
            tempo = float(tempo)
            
            # Spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=self.hop_length)[0]
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, hop_length=self.hop_length)[0]
            zero_crossing_rate = librosa.feature.zero_crossing_rate(y, hop_length=self.hop_length)[0]
            
            # MFCC features
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=self.hop_length)
            
            # Chroma features
            chroma = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=self.hop_length)
            
            # Tonnetz features
            tonnetz = librosa.feature.tonnetz(y=librosa.effects.harmonic(y), sr=sr)
            
            # Rhythm analysis
            onset_frames = librosa.onset.onset_detect(y=y, sr=sr, hop_length=self.hop_length)
            onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=self.hop_length)
            
            # Energy analysis
            rms = librosa.feature.rms(y=y, hop_length=self.hop_length)[0]
            
            # Dynamic range
            dynamic_range = float(np.max(rms) - np.min(rms))
            
            # Key detection
            chroma_mean = np.mean(chroma, axis=1)
            key = self._detect_key(chroma_mean)
            
            # Genre classification (simplified)
            genre = self._classify_genre(tempo, spectral_centroids, mfccs)
            
            # Mood analysis
            mood = self._analyze_mood(tempo, spectral_centroids, rms, dynamic_range)
            
            # Beat tracking
            beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=self.hop_length)[1]
            beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=self.hop_length)
            
            # Structure analysis
            structure = self._analyze_structure(y, sr, beat_frames)
            
            analysis_result = {
                "basic_info": {
                    "duration": float(duration),
                    "sample_rate": int(sr),
                    "tempo": tempo,
                    "key": key,
                    "genre": genre,
                    "mood": mood
                },
                "rhythm": {
                    "beats": beat_times.tolist(),
                    "beat_frames": beat_frames.tolist(),
                    "onsets": onset_times.tolist(),
                    "onset_frames": onset_frames.tolist()
                },
                "spectral": {
                    "spectral_centroid_mean": float(np.mean(spectral_centroids)),
                    "spectral_centroid_std": float(np.std(spectral_centroids)),
                    "spectral_rolloff_mean": float(np.mean(spectral_rolloff)),
                    "spectral_rolloff_std": float(np.std(spectral_rolloff)),
                    "zero_crossing_rate_mean": float(np.mean(zero_crossing_rate)),
                    "zero_crossing_rate_std": float(np.std(zero_crossing_rate))
                },
                "mfcc": {
                    "mfcc_mean": mfccs.mean(axis=1).tolist(),
                    "mfcc_std": mfccs.std(axis=1).tolist()
                },
                "energy": {
                    "rms_mean": float(np.mean(rms)),
                    "rms_std": float(np.std(rms)),
                    "dynamic_range": dynamic_range,
                    "peak_energy": float(np.max(rms))
                },
                "chroma": {
                    "chroma_mean": chroma_mean.tolist(),
                    "chroma_std": chroma.std(axis=1).tolist()
                },
                "structure": structure,
                "analysis_metadata": {
                    "hop_length": self.hop_length,
                    "n_fft": self.n_fft,
                    "analysis_version": "1.0.0"
                }
            }
            
            logger.info(f"Music analysis completed for: {file_path}")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error in music analysis: {e}")
            raise

    def _detect_key(self, chroma_mean: np.ndarray) -> str:
        """Detect musical key from chroma features"""
        # Major and minor key profiles
        major_profile = np.array([1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1])  # C major
        minor_profile = np.array([1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0])  # A minor
        
        # Key names
        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        
        # Calculate correlation with major and minor profiles
        major_correlations = []
        minor_correlations = []
        
        for i in range(12):
            # Rotate chroma to test each key
            rotated_chroma = np.roll(chroma_mean, -i)
            major_correlations.append(np.corrcoef(rotated_chroma, major_profile)[0, 1])
            minor_correlations.append(np.corrcoef(rotated_chroma, minor_profile)[0, 1])
        
        # Find best match
        max_major_idx = np.argmax(major_correlations)
        max_minor_idx = np.argmax(minor_correlations)
        
        if major_correlations[max_major_idx] > minor_correlations[max_minor_idx]:
            return f"{key_names[max_major_idx]} major"
        else:
            return f"{key_names[max_minor_idx]} minor"

    def _classify_genre(self, tempo: float, spectral_centroids: np.ndarray, mfccs: np.ndarray) -> str:
        """Simple genre classification based on tempo and spectral features"""
        tempo_mean = np.mean(spectral_centroids)
        mfcc_mean = np.mean(mfccs, axis=1)
        
        # Simple rule-based classification
        if tempo < 80:
            return "ambient"
        elif tempo < 100:
            return "ballad"
        elif tempo < 120:
            return "pop"
        elif tempo < 140:
            return "rock"
        elif tempo < 160:
            return "electronic"
        else:
            return "dance"

    def _analyze_mood(self, tempo: float, spectral_centroids: np.ndarray, 
                     rms: np.ndarray, dynamic_range: float) -> str:
        """Analyze musical mood based on various features"""
        tempo_mean = np.mean(spectral_centroids)
        energy_mean = np.mean(rms)
        
        # Mood classification based on tempo, brightness, and energy
        if tempo < 90 and energy_mean < 0.1:
            return "calm"
        elif tempo < 120 and energy_mean < 0.3:
            return "melancholic"
        elif tempo < 140 and energy_mean < 0.5:
            return "neutral"
        elif tempo < 160 and energy_mean < 0.7:
            return "energetic"
        else:
            return "intense"

    def _analyze_structure(self, y: np.ndarray, sr: int, beat_frames: np.ndarray) -> Dict[str, Any]:
        """Analyze song structure (intro, verse, chorus, etc.)"""
        # Simple structure analysis based on energy and tempo changes
        hop_length = self.hop_length
        frame_length = len(y) // hop_length
        
        # Calculate energy over time
        energy = []
        for i in range(0, len(y) - hop_length, hop_length):
            frame = y[i:i + hop_length]
            energy.append(np.sum(frame ** 2))
        
        energy = np.array(energy)
        
        # Find energy peaks (potential chorus sections)
        from scipy.signal import find_peaks
        peaks, _ = find_peaks(energy, height=np.mean(energy) * 1.2, distance=len(energy) // 10)
        
        # Estimate structure
        total_duration = len(y) / sr
        structure = {
            "total_duration": float(total_duration),
            "energy_peaks": (peaks * hop_length / sr).tolist(),
            "estimated_sections": self._estimate_sections(energy, total_duration)
        }
        
        return structure

    def _estimate_sections(self, energy: np.ndarray, duration: float) -> List[Dict[str, Any]]:
        """Estimate song sections based on energy patterns"""
        sections = []
        section_duration = duration / 8  # Divide into 8 sections
        
        for i in range(8):
            start_time = i * section_duration
            end_time = (i + 1) * section_duration
            section_energy = np.mean(energy[i * len(energy) // 8:(i + 1) * len(energy) // 8])
            
            # Classify section type based on energy
            if i == 0:
                section_type = "intro"
            elif i == 7:
                section_type = "outro"
            elif section_energy > np.mean(energy) * 1.2:
                section_type = "chorus"
            else:
                section_type = "verse"
            
            sections.append({
                "start_time": start_time,
                "end_time": end_time,
                "type": section_type,
                "energy": float(section_energy)
            })
        
        return sections

    def generate_music_description(self, analysis: Dict[str, Any]) -> str:
        """Generate a human-readable description of the music"""
        basic = analysis["basic_info"]
        rhythm = analysis["rhythm"]
        energy = analysis["energy"]
        
        description_parts = []
        
        # Tempo description
        tempo = basic["tempo"]
        if tempo < 80:
            tempo_desc = "slow and relaxed"
        elif tempo < 120:
            tempo_desc = "moderate tempo"
        elif tempo < 140:
            tempo_desc = "upbeat and energetic"
        else:
            tempo_desc = "fast and intense"
        
        description_parts.append(f"A {tempo_desc} {basic['genre']} track")
        
        # Key and mood
        description_parts.append(f"in {basic['key']} with a {basic['mood']} mood")
        
        # Energy description
        if energy["peak_energy"] > 0.5:
            description_parts.append("featuring high energy and dynamic range")
        elif energy["peak_energy"] > 0.2:
            description_parts.append("with moderate energy levels")
        else:
            description_parts.append("with a gentle, ambient feel")
        
        # Duration
        duration = basic["duration"]
        if duration < 60:
            description_parts.append(f"({duration:.1f}s duration)")
        else:
            minutes = int(duration // 60)
            seconds = int(duration % 60)
            description_parts.append(f"({minutes}:{seconds:02d} duration)")
        
        return " ".join(description_parts)


# Global analysis service instance
analysis_service = AnalysisService()
