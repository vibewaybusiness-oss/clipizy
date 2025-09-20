#!/usr/bin/env python3
"""
Unified Music Analysis Tool
Combines peak detection with music analysis for entire track and segments
"""

import numpy as np
import librosa
import matplotlib.pyplot as plt
from scipy.signal import find_peaks
from scipy.ndimage import gaussian_filter1d
import os
import json
import mutagen
from typing import Dict, List, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

class UnifiedMusicAnalyzer:
    def __init__(self):
        self.genres = [
            "Ambient", "Synthwave / Electronic", "Reggae / Dub / Ska", 
            "Hip Hop / Trap / Lo-Fi", "Classical / Orchestral", 
            "Rock / Metal / Punk", "Jazz / Blues", "World / Folk / Traditional",
            "Latin / Tango / Flamenco", "Pop / Indie / Folk", 
            "Dance / EDM / Club", "World / Regional", 
            "Cinematic / Trailer / Score", "Children / Playful",
            "Marches / Traditional Ensembles"
        ]
        
        # Load genre characteristics
        try:
            with open("music_descriptors.json", "r") as f:
                self.genre_characteristics = json.load(f)
        except FileNotFoundError:
            print("Warning: music_descriptors.json not found. Using default characteristics.")
            self.genre_characteristics = self._get_default_characteristics()
    
    
    def extract_title(self, file_path: str) -> str:
        """Extract title from metadata or filename"""
        try:
            audio_file = mutagen.File(file_path)
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
    
    def analyze_music(self, file_path: str, output_dir: str = ".") -> Dict[str, Any]:
        """Perform complete unified music analysis"""
        print(f"UNIFIED MUSIC ANALYSIS: {os.path.basename(file_path)}")
        print("=" * 60)
        
        if not os.path.exists(file_path):
            print(f"ERROR: File not found: {file_path}")
            return {}
        
        # Extract title
        title = self.extract_title(file_path)
        print(f"Title: {title}")
        
        # DETECT PEAKS AND SEGMENTS
        print("\n1. DETECTING PEAKS AND SEGMENTS...")
        peak_times, peak_scores, times, rms_db, ma_short, ma_long, score_z, segments, y, sr = self.detect_music_peaks(file_path)
        
        print(f"Detected {len(peak_times)} peaks and {len(segments)} segments")
        
        # ANALYZE ENTIRE TRACK
        print("\n2. ANALYZING ENTIRE TRACK...")
        overall_features = self.analyze_audio_features(y, sr)
        overall_scores = self.calculate_genre_scores(overall_features, title)
        
        sorted_scores = sorted(overall_scores.items(), key=lambda x: x[1], reverse=True)
        overall_genre = sorted_scores[0][0] if sorted_scores else "Unknown"
        overall_confidence = sorted_scores[0][1] * 100 if sorted_scores else 0
        overall_descriptors = self.generate_music_descriptors(overall_features)
        
        print(f"Overall Genre: {overall_genre} ({overall_confidence:.1f}%)")
        
        # ANALYZE SEGMENTS
        print("\n3. ANALYZING SEGMENTS...")
        segment_analyses = []
        
        for i, seg in enumerate(segments[:-1]):  # Exclude the last segment (end point)
            start_time = seg['time']
            end_time = segments[i + 1]['time'] if i + 1 < len(segments) else times[-1]
            
            print(f"Analyzing segment {i+1}: {start_time:.2f}s - {end_time:.2f}s")
            
            segment_analysis = self.analyze_segment(y, sr, start_time, end_time, i+1, title)
            if segment_analysis:
                segment_analyses.append(segment_analysis)
                print(f"  Genre: {segment_analysis['predicted_genre']} ({segment_analysis['confidence']:.1f}%)")
        
        # CREATE VISUALIZATION
        print("\n4. CREATING VISUALIZATION...")
        fig = self.create_visualization(times, rms_db, ma_short, ma_long, score_z, 
                                      peak_times, peak_scores, segments, file_path)
        
        # Save visualization
        output_image = os.path.join(output_dir, f"music_analysis_{os.path.splitext(os.path.basename(file_path))[0]}.png")
        fig.savefig(output_image, dpi=300, bbox_inches='tight')
        plt.close(fig)
        print(f"Visualization saved: {output_image}")
        
        # CREATE JSON OUTPUT
        print("\n5. CREATING JSON OUTPUT...")
        
        # Format peaks
        formatted_peaks = []
        for i, (time, score) in enumerate(zip(peak_times, peak_scores)):
            minutes = int(time // 60)
            seconds = time % 60
            formatted_peaks.append({
                "index": i + 1,
                "time_seconds": float(time),
                "time_formatted": f"{minutes:02d}:{seconds:06.3f}",
                "score": float(score)
            })
        
        # Format segments
        formatted_segments = []
        for i, seg in enumerate(segments[:-1]):  # Exclude end point
            minutes = int(seg['time'] // 60)
            seconds = seg['time'] % 60
            
            # Find corresponding segment analysis
            segment_analysis = None
            for analysis in segment_analyses:
                if analysis['segment_index'] == i + 1:
                    segment_analysis = analysis
                    break
            
            formatted_segment = {
                "index": i + 1,
                "time_seconds": float(seg['time']),
                "time_formatted": f"{minutes:02d}:{seconds:06.3f}",
                "ma_long_gap": float(seg.get('ma_long_gap', 0)),
                "ma_long_std": float(seg.get('ma_long_std', 0)),
                "ma_long_mean": float(seg.get('ma_long_mean', 0)),
                "ma_long_change_std": float(seg.get('ma_long_change_std', 0)),
                "ma_long_change_mean": float(seg.get('ma_long_change_mean', 0)),
                "combined_score": float(seg.get('combined_score', 0)),
                "fitted_to_tempo": seg.get('fitted_to_tempo', False)
            }
            
            # Add analysis if available
            if segment_analysis:
                formatted_segment.update({
                    "analysis": {
                        "predicted_genre": segment_analysis['predicted_genre'],
                        "confidence": segment_analysis['confidence'],
                        "descriptors": segment_analysis['descriptors'],
                        "features": segment_analysis['features'],
                        "long_ma_analysis": segment_analysis['long_ma_analysis'],
                        "enhanced_features": segment_analysis['enhanced_features'],
                        "peak_analysis": segment_analysis['peak_analysis']
                    }
                })
            
            formatted_segments.append(formatted_segment)
        
        # Create final result
        result = {
            "audio_file": os.path.basename(file_path),
            "title": title,
            "analysis_timestamp": np.datetime64('now').astype(str),
            "overall_analysis": {
                "predicted_genre": overall_genre,
                "confidence": overall_confidence,
                "descriptors": overall_descriptors,
                "features": overall_features,
                "genre_scores": overall_scores
            },
            "peak_analysis": {
                "total_peaks": len(formatted_peaks),
                "peaks": formatted_peaks
            },
            "segment_analysis": {
                "total_segments": len(formatted_segments),
                "segments": formatted_segments
            },
            "summary": {
                "duration_seconds": overall_features.get('duration', 0),
                "tempo_bpm": overall_features.get('tempo', 0),
                "peak_times": [float(t) for t in peak_times],
                "segment_times": [float(seg['time']) for seg in segments[:-1]]
            }
        }
        
        # Save JSON
        output_json = os.path.join(output_dir, f"music_analysis_{os.path.splitext(os.path.basename(file_path))[0]}.json")
        with open(output_json, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"JSON output saved: {output_json}")
        
        print("\n" + "=" * 60)
        print("ANALYSIS COMPLETE!")
        print(f"Overall Genre: {overall_genre} ({overall_confidence:.1f}%)")
        print(f"Peaks: {len(peak_times)}, Segments: {len(segments)-1}")
        print(f"Output files: {output_image}, {output_json}")
        print("=" * 60)
        
        return result

def main():
    """Main function with command line interface"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Unified Music Analysis Tool")
    parser.add_argument("--file", type=str, required=True, help="Path to audio file")
    parser.add_argument("--output", type=str, default=".", help="Output directory")
    parser.add_argument("--min-peaks", type=int, default=2, help="Minimum number of peaks")
    parser.add_argument("--max-peaks", type=int, default=None, help="Maximum number of peaks")
    parser.add_argument("--min-gap", type=float, default=2.0, help="Minimum gap between peaks (seconds)")
    
    args = parser.parse_args()
    
    analyzer = UnifiedMusicAnalyzer()
    result = analyzer.analyze_music(args.file, args.output)
    
    if result:
        print("\nAnalysis completed successfully!")
    else:
        print("\nAnalysis failed!")

if __name__ == "__main__":
    main()
