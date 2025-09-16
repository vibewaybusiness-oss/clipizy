#!/usr/bin/env python3
"""
Simplified Music Analysis - Only Essential Information
Outputs: Music Theory Analysis, Genre, and Music Descriptors
"""

import librosa
import numpy as np
import json
import os
import wave
import mutagen
from typing import Dict, List, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

class SimpleMusicAnalyzer:
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
        with open("music_descriptors.json", "r") as f:
            self.genre_characteristics = json.load(f)
    
    def extract_title(self, file_path: str) -> str:
        """Extract title from metadata or filename"""
        try:
            # Try metadata first
            audio_file = mutagen.File(file_path)
            if audio_file is not None:
                if 'TIT2' in audio_file:
                    return str(audio_file['TIT2'][0])
                elif 'TITLE' in audio_file:
                    return str(audio_file['TITLE'][0])
            
            # Fallback to filename
            filename = os.path.basename(file_path)
            name_without_ext = os.path.splitext(filename)[0]
            title = name_without_ext.replace('_', ' ').replace('-', ' ')
            return ' '.join(word.capitalize() for word in title.split())
            
        except Exception:
            # Final fallback
            filename = os.path.basename(file_path)
            name_without_ext = os.path.splitext(filename)[0]
            title = name_without_ext.replace('_', ' ').replace('-', ' ')
            return ' '.join(word.capitalize() for word in title.split())
    
    def detect_genre_from_title(self, title: str) -> Dict[str, float]:
        """Detect genre keywords in the title"""
        title_lower = title.lower()
        title_scores = {}
        
        genre_keywords = {
            "Jazz / Blues": ["jazz", "blues", "swing", "bebop", "fusion", "smooth", "saxophone"],
            "Ambient": ["ambient", "atmospheric", "ethereal", "drone", "meditative", "chill"],
            "Synthwave / Electronic": ["synth", "electronic", "synthesizer", "retro", "80s", "digital", "techno"],
            "Reggae / Dub / Ska": ["reggae", "dub", "ska", "jamaican", "caribbean", "offbeat"],
            "Hip Hop / Trap / Lo-Fi": ["hip hop", "hiphop", "trap", "lo-fi", "lofi", "rap", "beats"],
            "Classical / Orchestral": ["classical", "orchestral", "symphony", "chamber", "baroque"],
            "Rock / Metal / Punk": ["rock", "metal", "punk", "grunge", "alternative", "guitar"],
            "World / Folk / Traditional": ["folk", "traditional", "world", "ethnic", "acoustic", "country"],
            "Latin / Tango / Flamenco": ["latin", "tango", "flamenco", "salsa", "bossa", "samba"],
            "Pop / Indie / Folk": ["pop", "indie", "alternative", "mainstream", "radio", "catchy"],
            "Dance / EDM / Club": ["dance", "edm", "club", "electronic", "beat", "party", "disco"],
            "World / Regional": ["world", "regional", "ethnic", "traditional", "cultural"],
            "Cinematic / Trailer / Score": ["cinematic", "trailer", "score", "soundtrack", "dramatic", "epic"],
            "Children / Playful": ["children", "kids", "playful", "fun", "happy", "nursery"],
            "Marches / Traditional Ensembles": ["march", "military", "brass", "band", "ensemble", "parade"]
        }
        
        for genre, keywords in genre_keywords.items():
            score = 0.0
            for keyword in keywords:
                if keyword in title_lower:
                    # Give maximum weight to main genre names
                    if keyword in ["jazz", "blues", "rock", "pop", "classical", "ambient", "electronic"]:
                        score += 5.0  # Very high weight for main genres
                    else:
                        score += 2.0  # High weight for related keywords
            
            if score > 0:
                # Normalize but keep high scores
                title_scores[genre] = min(score / 3.0, 1.0)
            else:
                title_scores[genre] = 0.0
        
        return title_scores
    
    def analyze_audio_features(self, file_path: str) -> Dict[str, Any]:
        """Extract essential audio features"""
        try:
            y, sr = librosa.load(file_path)
            
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
    
    def calculate_genre_scores(self, features: Dict[str, Any], title: str) -> Dict[str, float]:
        """Calculate genre scores based on audio features and title"""
        scores = {}
        
        # Get title-based scores
        title_scores = self.detect_genre_from_title(title)
        
        # Check if title has strong genre indicators
        has_strong_title_match = any(score >= 0.8 for score in title_scores.values())
        
        for genre, characteristics in self.genre_characteristics.items():
            score = 0.0
            total_checks = 0
            
            # Title-based scoring (MUCH higher weight when title matches)
            title_score = title_scores.get(genre, 0.0)
            if title_score > 0:
                if has_strong_title_match:
                    # If title has strong matches, give title 10x weight
                    score += title_score * 10.0
                    total_checks += 10.0
                else:
                    # Normal title weighting
                    score += title_score * 3.0
                    total_checks += 3.0
            
            # Only add audio features if title doesn't have strong matches
            if not has_strong_title_match:
                # BPM matching
                if 'bpm_range' in characteristics:
                    bpm_min, bpm_max = characteristics['bpm_range']
                    bpm = features.get('tempo', 0)
                    if bpm_min <= bpm <= bpm_max:
                        score += 1.0
                    total_checks += 1
                
                # Energy matching
                energy = features.get('rms_energy', 0)
                if characteristics.get('energy_low', False):
                    if energy < 0.1:
                        score += 1.0
                    total_checks += 1
                
                if characteristics.get('energy_high', False):
                    if energy > 0.2:
                        score += 1.0
                    total_checks += 1
                
                # Harmonic content
                harmonic_ratio = features.get('harmonic_ratio', 0)
                if characteristics.get('acoustic_high', False):
                    if harmonic_ratio > 0.6:
                        score += 1.0
                    total_checks += 1
                
                if characteristics.get('electronic', False):
                    if harmonic_ratio < 0.4:
                        score += 1.0
                    total_checks += 1
                
                # Spectral characteristics
                spectral_centroid = features.get('spectral_centroid', 0)
                if characteristics.get('melodic', False):
                    if spectral_centroid > 1000:
                        score += 1.0
                    total_checks += 1
                
                if characteristics.get('bass_heavy', False):
                    if spectral_centroid < 1000:
                        score += 1.0
                    total_checks += 1
            
            if total_checks > 0:
                scores[genre] = score / total_checks
            else:
                scores[genre] = 0.0
        
        return scores
    
    def generate_music_descriptors(self, features: Dict[str, Any]) -> List[str]:
        """Generate human-readable music descriptors"""
        descriptors = []
        
        tempo = features.get('tempo', 0)
        energy = features.get('rms_energy', 0)
        harmonic_ratio = features.get('harmonic_ratio', 0)
        spectral_centroid = features.get('spectral_centroid', 0)
        
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
        
        # Energy description
        if energy < 0.05:
            descriptors.append("Very low energy (quiet, ambient, meditative)")
        elif energy < 0.1:
            descriptors.append("Low energy (soft, gentle, relaxed)")
        elif energy < 0.2:
            descriptors.append("Medium energy (balanced, moderate)")
        elif energy < 0.3:
            descriptors.append("High energy (loud, dynamic, exciting)")
        else:
            descriptors.append("Very high energy (intense, powerful, aggressive)")
        
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
        """Perform complete music analysis"""
        print(f"ANALYZING: {os.path.basename(file_path)}")
        print("=" * 50)
        
        if not os.path.exists(file_path):
            print(f"ERROR: File not found: {file_path}")
            return {}
        
        # Extract title
        title = self.extract_title(file_path)
        
        # Analyze audio features
        features = self.analyze_audio_features(file_path)
        if not features:
            print("ERROR: Could not analyze audio features")
            return {}
        
        # Calculate genre scores
        scores = self.calculate_genre_scores(features, title)
        
        # Get predicted genre
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        predicted_genre = sorted_scores[0][0] if sorted_scores else "Unknown"
        confidence = sorted_scores[0][1] * 100 if sorted_scores else 0
        
        # Generate descriptors
        descriptors = self.generate_music_descriptors(features)
        
        # Display results
        print("\nMUSIC THEORY ANALYSIS:")
        print("-" * 25)
        print(f"Duration: {features.get('duration', 0):.2f} seconds")
        print(f"Tempo: {features.get('tempo', 0):.1f} BPM")
        
        print(f"\nPREDICTED GENRE: {predicted_genre}")
        print(f"CONFIDENCE: {confidence:.1f}%")
        
        print("\nMUSIC DESCRIPTORS:")
        print("-" * 20)
        for descriptor in descriptors:
            print(f"• {descriptor}")
        
        print("\n" + "=" * 50)
        
        return {
            'title': title,
            'features': features,
            'predicted_genre': predicted_genre,
            'confidence': confidence,
            'descriptors': descriptors,
            'genre_scores': scores
        }

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", type=str, required=True)
    args = parser.parse_args()
    analyzer = SimpleMusicAnalyzer()
    result = analyzer.analyze_music(args.file)
    print(result)
    with open("simple_music_analysis.json", "w") as f:
        json.dump(result, f, indent=2)