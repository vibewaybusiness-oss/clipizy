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
    
    def _get_default_characteristics(self):
        """Default genre characteristics if JSON file is not available"""
        return {
            "Ambient": {"bpm_range": [60, 100], "energy_low": True, "acoustic_high": True},
            "Dance / EDM / Club": {"bpm_range": [120, 140], "energy_high": True, "electronic": True},
            "Classical / Orchestral": {"bpm_range": [60, 120], "acoustic_high": True, "melodic": True},
            "Rock / Metal / Punk": {"bpm_range": [100, 160], "energy_high": True, "melodic": True},
            "Jazz / Blues": {"bpm_range": [80, 140], "acoustic_high": True, "melodic": True}
        }
    
    def detect_music_peaks(self, audio_file, min_peaks=2, max_peaks=None, 
                          window_size=1024, hop_length=512, min_gap_seconds=2.0,
                          short_ma_sec=0.50, long_ma_sec=3.00, include_boundaries=True):
        """Detect musical peaks and segments using moving average difference method"""
        
        print(f"Loading audio file: {audio_file}")
        
        if not os.path.exists(audio_file):
            raise FileNotFoundError(f"Audio file not found: {audio_file}")
        
        y, sr = librosa.load(audio_file, sr=None)
        print(f"Audio loaded - Duration: {len(y)/sr:.2f} seconds, Sample rate: {sr} Hz")
        
        # RMS ENERGY → dB
        rms = librosa.feature.rms(y=y, frame_length=window_size, hop_length=hop_length)[0]
        rms_db = librosa.amplitude_to_db(rms, ref=np.max)
        rms_db = np.nan_to_num(rms_db, nan=np.min(rms_db))
        
        # SMOOTH dB TO REDUCE NOISE
        smoothed_db = gaussian_filter1d(rms_db, sigma=1.5)
        
        # MOVING AVERAGES
        def moving_average(x, win):
            win = max(1, int(win))
            kernel = np.ones(win, dtype=float) / float(win)
            return np.convolve(x, kernel, mode='same')
        
        short_frames = max(1, int(round(short_ma_sec * sr / hop_length)))
        long_frames = max(short_frames + 1, int(round(long_ma_sec * sr / hop_length)))
        ma_short = moving_average(smoothed_db, short_frames)
        ma_long = moving_average(smoothed_db, long_frames)
        
        # TIMES
        L = len(smoothed_db)
        times = librosa.frames_to_time(np.arange(L), sr=sr, hop_length=hop_length)
        
        # ROBUST NORMALIZATION
        def robust_z(x):
            x = np.asarray(x)
            med = np.median(x)
            mad = np.median(np.abs(x - med)) + 1e-8
            return (x - med) / (1.4826 * mad)
        
        score = ma_short - ma_long
        score_z = robust_z(score)
        score_z = gaussian_filter1d(score_z, sigma=1.0)
        
        # ADAPTIVE THRESHOLD
        def adaptive_threshold(score_z, rms_db, times):
            base_thr = np.median(score_z) + 0.8 * (np.median(np.abs(score_z - np.median(score_z))) * 1.4826)
            energy_percentile = np.percentile(rms_db, 70)
            energy_mask = rms_db > energy_percentile
            if np.any(energy_mask):
                energy_thr = np.median(score_z[energy_mask]) + 0.5 * np.std(score_z[energy_mask])
                base_thr = min(base_thr, energy_thr)
            return base_thr
        
        thr = adaptive_threshold(score_z, rms_db, times)
        
        # TEMPO-AWARE MIN DISTANCE
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop_length)
        try:
            tempo = float(tempo)
        except Exception:
            tempo = float(np.asarray(tempo).reshape(-1)[0]) if np.size(tempo) else 0.0
        
        if tempo <= 0:
            min_dist_frames = max(1, int(0.5 * sr / hop_length))
        else:
            seconds_per_beat = 60.0 / tempo
            min_dist_frames = max(1, int(0.3 * float(seconds_per_beat) * sr / hop_length))
        
        min_gap_frames = max(1, int(min_gap_seconds * sr / hop_length))
        min_dist_frames = max(min_dist_frames, min_gap_frames)
        
        # PEAK DETECTION
        def find_peaks_multi_level(score_z, times, rms_db, base_thr):
            all_peaks = []
            
            # Level 1: High confidence peaks
            peaks1, props1 = find_peaks(
                score_z,
                height=base_thr,
                distance=min_dist_frames,
                prominence=np.std(score_z) * 0.6
            )
            all_peaks.extend([(p, score_z[p], 1.0) for p in peaks1])
            
            # Level 2: Medium confidence peaks
            peaks2, props2 = find_peaks(
                score_z,
                height=base_thr * 0.7,
                distance=max(1, min_dist_frames // 2),
                prominence=np.std(score_z) * 0.3
            )
            for p in peaks2:
                if all(abs(times[p] - times[existing_p]) >= min_gap_seconds 
                       for existing_p, _, _ in all_peaks):
                    all_peaks.append((p, score_z[p], 0.7))
            
            return all_peaks
        
        all_peaks = find_peaks_multi_level(score_z, times, rms_db, thr)
        
        # TEMPO-BASED PEAK SELECTION WITH LINEARIZATION
        def get_tempo_peaks_linearized(score_z, rms_db, times, duration):
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop_length)
            try:
                tempo = float(tempo)
            except Exception:
                tempo = 120.0
            
            if tempo > 0:
                seconds_per_beat = 60.0 / tempo
                phrase_length = seconds_per_beat * 4
            else:
                phrase_length = 6.0
            
            # Calculate ideal number of peaks based on duration and tempo
            tempo_based_count = max(5, int(duration / phrase_length))
            
            # Sort peaks by confidence (score * level)
            peaks_with_confidence = [(p, s, l, s * l) for p, s, l in all_peaks]
            peaks_with_confidence.sort(key=lambda x: x[3], reverse=True)
            
            # LINEARIZATION: Distribute peaks more evenly across the duration
            def linearize_peaks(peaks, target_count, duration):
                if len(peaks) <= target_count:
                    return peaks
                
                # Create time bins for more even distribution
                bin_size = duration / target_count
                time_bins = [(i * bin_size, (i + 1) * bin_size) for i in range(target_count)]
                
                linearized_peaks = []
                used_peaks = set()
                
                for bin_start, bin_end in time_bins:
                    # Find the best peak in this time bin
                    best_peak = None
                    best_score = -float('inf')
                    
                    for p, s, l, conf in peaks:
                        if p in used_peaks:
                            continue
                        
                        peak_time = times[p]
                        if bin_start <= peak_time < bin_end:
                            # Prefer peaks closer to the center of the bin
                            bin_center = (bin_start + bin_end) / 2
                            distance_penalty = abs(peak_time - bin_center) / bin_size
                            adjusted_score = conf * (1.0 - distance_penalty * 0.3)
                            
                            if adjusted_score > best_score:
                                best_score = adjusted_score
                                best_peak = (p, s, l, conf)
                    
                    if best_peak:
                        linearized_peaks.append(best_peak)
                        used_peaks.add(best_peak[0])
                
                # If we still need more peaks, add the highest remaining ones
                remaining_peaks = [(p, s, l, conf) for p, s, l, conf in peaks if p not in used_peaks]
                remaining_peaks.sort(key=lambda x: x[3], reverse=True)
                
                while len(linearized_peaks) < target_count and remaining_peaks:
                    linearized_peaks.append(remaining_peaks.pop(0))
                
                return linearized_peaks
            
            # Apply linearization
            linearized_peaks = linearize_peaks(peaks_with_confidence, tempo_based_count, duration)
            
            # Final filtering with minimum gap constraints
            tempo_peaks = []
            min_gap_frames = max(1, int(phrase_length * sr / hop_length))
            
            for p, s, l, conf in linearized_peaks:
                t = times[p]
                if all(abs(t - times[existing_p]) >= phrase_length * 0.5 for existing_p, _, _, _ in tempo_peaks):
                    tempo_peaks.append((p, s, l, conf))
            
            return tempo_peaks, tempo, phrase_length
        
        tempo_peaks, tempo, phrase_length = get_tempo_peaks_linearized(score_z, rms_db, times, times[-1])
        
        # SEGMENT DETECTION USING LONG MA
        def detect_segments_ma_long(ma_long, times, duration):
            window_size = max(8.0, duration / 15.0)
            window_frames = int(window_size * sr / hop_length)
            
            segments = []
            segment_starts = [0]
            
            for start_idx in range(0, len(times), window_frames):
                end_idx = min(start_idx + window_frames, len(times) - 1)
                
                if end_idx - start_idx < window_frames // 2:
                    continue
                
                window_ma_long = ma_long[start_idx:end_idx]
                window_times = times[start_idx:end_idx]
                
                if len(window_ma_long) < 10:
                    continue
                
                # Calculate Long MA statistics
                ma_long_max_idx = np.argmax(window_ma_long)
                ma_long_min_idx = np.argmin(window_ma_long)
                ma_long_gap = window_ma_long[ma_long_max_idx] - window_ma_long[ma_long_min_idx]
                ma_long_std = np.std(window_ma_long)
                ma_long_mean = np.mean(window_ma_long)
                
                # Calculate Long MA changes (derivative)
                ma_long_changes = np.abs(np.diff(window_ma_long))
                ma_long_change_std = np.std(ma_long_changes) if len(ma_long_changes) > 0 else 0
                ma_long_change_mean = np.mean(ma_long_changes) if len(ma_long_changes) > 0 else 0
                
                # Combined metric using Long MA characteristics
                combined_score = 0.4 * ma_long_gap + 0.3 * ma_long_std + 0.3 * ma_long_change_std
                
                min_score_threshold = 2.0
                min_gap_threshold = 1.5
                
                if combined_score < min_score_threshold or ma_long_gap < min_gap_threshold:
                    continue
                
                # Find the point of maximum change in Long MA
                if len(ma_long_changes) > 0:
                    max_change_idx = np.argmax(ma_long_changes)
                    segment_time = window_times[max_change_idx + 1]
                    
                    if not segment_starts or abs(segment_time - segment_starts[-1]) > window_size * 0.8:
                        segments.append({
                            'time': segment_time,
                            'ma_long_gap': ma_long_gap,
                            'ma_long_std': ma_long_std,
                            'ma_long_mean': ma_long_mean,
                            'ma_long_change_std': ma_long_change_std,
                            'ma_long_change_mean': ma_long_change_mean,
                            'combined_score': combined_score,
                            'window_start': window_times[0],
                            'window_end': window_times[-1]
                        })
                        segment_starts.append(segment_time)
            
            segments.append({
                'time': times[-1],
                'ma_long_gap': 0,
                'ma_long_std': 0,
                'ma_long_mean': 0,
                'ma_long_change_std': 0,
                'ma_long_change_mean': 0,
                'combined_score': 0,
                'window_start': times[-1],
                'window_end': times[-1]
            })
            
            segments.sort(key=lambda x: x['time'])
            return segments
        
        segments = detect_segments_ma_long(ma_long, times, times[-1])
        
        # FIT SEGMENTS TO TEMPO POINTS
        def fit_segments_to_tempo_points(segments, tempo_peaks, times):
            tempo_times = [times[p] for p, s, l, conf in tempo_peaks]
            duration = times[-1]
            internal_tempo_times = [t for t in tempo_times if t > 1.0 and t < duration - 1.0]
            
            fitted_segments = []
            for i, seg in enumerate(segments[:-1]):
                seg_time = seg['time']
                
                if internal_tempo_times:
                    closest_tempo_idx = np.argmin([abs(seg_time - t) for t in internal_tempo_times])
                    closest_tempo_time = internal_tempo_times[closest_tempo_idx]
                    
                    if abs(seg_time - closest_tempo_time) <= 5.0:
                        fitted_time = closest_tempo_time
                        fitted_segments.append({
                            'time': fitted_time,
                            'original_time': seg_time,
                            'ma_long_gap': seg['ma_long_gap'],
                            'ma_long_std': seg['ma_long_std'],
                            'ma_long_mean': seg['ma_long_mean'],
                            'ma_long_change_std': seg['ma_long_change_std'],
                            'ma_long_change_mean': seg['ma_long_change_mean'],
                            'combined_score': seg['combined_score'],
                            'window_start': seg['window_start'],
                            'window_end': seg['window_end'],
                            'fitted_to_tempo': True
                        })
                    else:
                        fitted_segments.append({
                            'time': seg_time,
                            'original_time': seg_time,
                            'ma_long_gap': seg['ma_long_gap'],
                            'ma_long_std': seg['ma_long_std'],
                            'ma_long_mean': seg['ma_long_mean'],
                            'ma_long_change_std': seg['ma_long_change_std'],
                            'ma_long_change_mean': seg['ma_long_change_mean'],
                            'combined_score': seg['combined_score'],
                            'window_start': seg['window_start'],
                            'window_end': seg['window_end'],
                            'fitted_to_tempo': False
                        })
                else:
                    fitted_segments.append({
                        'time': seg_time,
                        'original_time': seg_time,
                        'ma_long_gap': seg['ma_long_gap'],
                        'ma_long_std': seg['ma_long_std'],
                        'ma_long_mean': seg['ma_long_mean'],
                        'ma_long_change_std': seg['ma_long_change_std'],
                        'ma_long_change_mean': seg['ma_long_change_mean'],
                        'combined_score': seg['combined_score'],
                        'window_start': seg['window_start'],
                        'window_end': seg['window_end'],
                        'fitted_to_tempo': False
                    })
            
            fitted_segments.append(segments[-1])
            return fitted_segments
        
        fitted_segments = fit_segments_to_tempo_points(segments, tempo_peaks, times)
        
        # ADD BOUNDARY POINTS IF REQUESTED
        selected_peaks = tempo_peaks
        if include_boundaries:
            if not selected_peaks or times[selected_peaks[0][0]] > 1.0:
                selected_peaks.insert(0, (0, score_z[0], 1.0, score_z[0]))
            
            end_idx = len(times) - 1
            if not selected_peaks or times[selected_peaks[-1][0]] < times[-1] - 1.0:
                selected_peaks.append((end_idx, score_z[-1], 1.0, score_z[-1]))
        
        # EXTRACT FINAL RESULTS
        final_peak_times = np.array([times[p] for p, s, l, conf in selected_peaks])
        final_peak_scores = np.array([s for p, s, l, conf in selected_peaks])
        
        # SORT BY TIME
        order = np.argsort(final_peak_times)
        final_peak_times = final_peak_times[order]
        final_peak_scores = final_peak_scores[order]
        
        return final_peak_times, final_peak_scores, times, rms_db[:L], ma_short, ma_long, score_z, fitted_segments, y, sr
    
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
                    if keyword in ["jazz", "blues", "rock", "pop", "classical", "ambient", "electronic"]:
                        score += 5.0
                    else:
                        score += 2.0
            
            if score > 0:
                title_scores[genre] = min(score / 3.0, 1.0)
            else:
                title_scores[genre] = 0.0
        
        return title_scores
    
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
            
            # Title-based scoring
            title_score = title_scores.get(genre, 0.0)
            if title_score > 0:
                if has_strong_title_match:
                    score += title_score * 10.0
                    total_checks += 10.0
                else:
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
                
                # Long MA characteristics
                ma_long_mean = features.get('ma_long_mean', 0)
                ma_long_stability = features.get('ma_long_stability', 0)
                ma_long_trend = features.get('ma_long_trend', 0)
                ma_long_range = features.get('ma_long_range', 0)
                
                # Stability-based genre classification
                if characteristics.get('ambient', False):
                    if ma_long_stability > 0.5:  # High stability for ambient
                        score += 1.0
                    total_checks += 1
                
                if characteristics.get('dynamic', False):
                    if ma_long_range > 5.0:  # High range for dynamic music
                        score += 1.0
                    total_checks += 1
                
                # Trend-based classification
                if characteristics.get('building', False):
                    if ma_long_trend > 0.1:  # Positive trend for building energy
                        score += 1.0
                    total_checks += 1
                
                if characteristics.get('fading', False):
                    if ma_long_trend < -0.1:  # Negative trend for fading energy
                        score += 1.0
                    total_checks += 1
                
                # Energy level classification based on Long MA
                if characteristics.get('low_energy', False):
                    if ma_long_mean < -20.0:  # Low Long MA mean
                        score += 1.0
                    total_checks += 1
                
                if characteristics.get('high_energy', False):
                    if ma_long_mean > -15.0:  # High Long MA mean
                        score += 1.0
                    total_checks += 1
            
            if total_checks > 0:
                scores[genre] = score / total_checks
            else:
                scores[genre] = 0.0
        
        return scores
    
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
    
    def analyze_segment_peaks(self, y: np.ndarray, sr: int, start_time: float, end_time: float, 
                             hop_length: int = 512) -> Dict[str, Any]:
        """Analyze peaks within a specific segment"""
        start_sample = int(start_time * sr)
        end_sample = int(end_time * sr)
        segment_audio = y[start_sample:end_sample]
        
        if len(segment_audio) < sr * 0.5:  # Skip segments shorter than 0.5 seconds
            return None
        
        # RMS ENERGY → dB for segment
        rms = librosa.feature.rms(y=segment_audio, frame_length=1024, hop_length=hop_length)[0]
        rms_db = librosa.amplitude_to_db(rms, ref=np.max)
        rms_db = np.nan_to_num(rms_db, nan=np.min(rms_db))
        
        # SMOOTH dB TO REDUCE NOISE
        smoothed_db = gaussian_filter1d(rms_db, sigma=1.5)
        
        # MOVING AVERAGES
        def moving_average(x, win):
            win = max(1, int(win))
            kernel = np.ones(win, dtype=float) / float(win)
            return np.convolve(x, kernel, mode='same')
        
        short_frames = max(1, int(round(0.5 * sr / hop_length)))
        long_frames = max(short_frames + 1, int(round(3.0 * sr / hop_length)))
        ma_short = moving_average(smoothed_db, short_frames)
        ma_long = moving_average(smoothed_db, long_frames)
        
        # Ensure both arrays have the same length
        min_len = min(len(ma_short), len(ma_long))
        ma_short = ma_short[:min_len]
        ma_long = ma_long[:min_len]
        smoothed_db = smoothed_db[:min_len]
        
        # TIMES (relative to segment start)
        L = len(smoothed_db)
        times = librosa.frames_to_time(np.arange(L), sr=sr, hop_length=hop_length)
        
        # ROBUST NORMALIZATION
        def robust_z(x):
            x = np.asarray(x)
            med = np.median(x)
            mad = np.median(np.abs(x - med)) + 1e-8
            return (x - med) / (1.4826 * mad)
        
        score = ma_short - ma_long
        score_z = robust_z(score)
        score_z = gaussian_filter1d(score_z, sigma=1.0)
        
        # ADAPTIVE THRESHOLD
        def adaptive_threshold(score_z, rms_db, times):
            base_thr = np.median(score_z) + 0.8 * (np.median(np.abs(score_z - np.median(score_z))) * 1.4826)
            energy_percentile = np.percentile(rms_db, 70)
            energy_mask = rms_db > energy_percentile
            if np.any(energy_mask):
                energy_thr = np.median(score_z[energy_mask]) + 0.5 * np.std(score_z[energy_mask])
                base_thr = min(base_thr, energy_thr)
            return base_thr
        
        thr = adaptive_threshold(score_z, rms_db, times)
        
        # TEMPO-AWARE MIN DISTANCE
        tempo, _ = librosa.beat.beat_track(y=segment_audio, sr=sr, hop_length=hop_length)
        try:
            tempo = float(tempo)
        except Exception:
            tempo = float(np.asarray(tempo).reshape(-1)[0]) if np.size(tempo) else 0.0
        
        if tempo <= 0:
            min_dist_frames = max(1, int(0.5 * sr / hop_length))
        else:
            seconds_per_beat = 60.0 / tempo
            min_dist_frames = max(1, int(0.3 * float(seconds_per_beat) * sr / hop_length))
        
        min_gap_frames = max(1, int(2.0 * sr / hop_length))
        min_dist_frames = max(min_dist_frames, min_gap_frames)
        
        # PEAK DETECTION
        def find_peaks_multi_level(score_z, times, rms_db, base_thr):
            all_peaks = []
            
            # Level 1: High confidence peaks
            peaks1, props1 = find_peaks(
                score_z,
                height=base_thr,
                distance=min_dist_frames,
                prominence=np.std(score_z) * 0.6
            )
            all_peaks.extend([(p, score_z[p], 1.0) for p in peaks1])
            
            # Level 2: Medium confidence peaks
            peaks2, props2 = find_peaks(
                score_z,
                height=base_thr * 0.7,
                distance=max(1, min_dist_frames // 2),
                prominence=np.std(score_z) * 0.3
            )
            for p in peaks2:
                if all(abs(times[p] - times[existing_p]) >= 2.0 
                       for existing_p, _, _ in all_peaks):
                    all_peaks.append((p, score_z[p], 0.7))
            
            return all_peaks
        
        all_peaks = find_peaks_multi_level(score_z, rms_db, times, thr)
        
        # Format peaks (relative to segment start)
        formatted_peaks = []
        for i, (peak_idx, score, level) in enumerate(all_peaks):
            peak_time = times[peak_idx]
            minutes = int(peak_time // 60)
            seconds = peak_time % 60
            formatted_peaks.append({
                "index": i + 1,
                "time_seconds": float(peak_time),
                "time_formatted": f"{minutes:02d}:{seconds:06.3f}",
                "score": float(score),
                "confidence_level": float(level)
            })
        
        return {
            'total_peaks': len(formatted_peaks),
            'peaks': formatted_peaks,
            'tempo_bpm': float(tempo),
            'rms_energy_mean': float(np.mean(rms_db)),
            'rms_energy_std': float(np.std(rms_db)),
            'score_mean': float(np.mean(score_z)),
            'score_std': float(np.std(score_z))
        }
    
    def analyze_segment_long_ma(self, y: np.ndarray, sr: int, start_time: float, end_time: float, 
                               hop_length: int = 512) -> Dict[str, Any]:
        """Analyze Long MA characteristics within a specific segment"""
        start_sample = int(start_time * sr)
        end_sample = int(end_time * sr)
        segment_audio = y[start_sample:end_sample]
        
        if len(segment_audio) < sr * 0.5:  # Skip segments shorter than 0.5 seconds
            return None
        
        # RMS ENERGY → dB for segment
        rms = librosa.feature.rms(y=segment_audio, frame_length=1024, hop_length=hop_length)[0]
        rms_db = librosa.amplitude_to_db(rms, ref=np.max)
        rms_db = np.nan_to_num(rms_db, nan=np.min(rms_db))
        
        # SMOOTH dB TO REDUCE NOISE
        smoothed_db = gaussian_filter1d(rms_db, sigma=1.5)
        
        # MOVING AVERAGES
        def moving_average(x, win):
            win = max(1, int(win))
            kernel = np.ones(win, dtype=float) / float(win)
            return np.convolve(x, kernel, mode='same')
        
        short_frames = max(1, int(round(0.5 * sr / hop_length)))
        long_frames = max(short_frames + 1, int(round(3.0 * sr / hop_length)))
        ma_short = moving_average(smoothed_db, short_frames)
        ma_long = moving_average(smoothed_db, long_frames)
        
        # Ensure both arrays have the same length
        min_len = min(len(ma_short), len(ma_long))
        ma_short = ma_short[:min_len]
        ma_long = ma_long[:min_len]
        smoothed_db = smoothed_db[:min_len]
        
        # TIMES (relative to segment start)
        L = len(smoothed_db)
        times = librosa.frames_to_time(np.arange(L), sr=sr, hop_length=hop_length)
        
        # Calculate Long MA characteristics
        ma_long_mean = np.mean(ma_long)
        ma_long_std = np.std(ma_long)
        ma_long_min = np.min(ma_long)
        ma_long_max = np.max(ma_long)
        ma_long_range = ma_long_max - ma_long_min
        
        # Calculate Long MA trend (slope)
        if len(ma_long) > 1:
            ma_long_trend = np.polyfit(times, ma_long, 1)[0]  # Linear regression slope
        else:
            ma_long_trend = 0.0
        
        # Calculate Long MA stability (inverse of variance)
        ma_long_stability = 1.0 / (ma_long_std + 1e-8)
        
        # Calculate Long MA vs Short MA relationship
        ma_divergence = np.mean(np.abs(ma_long - ma_short))
        ma_correlation = np.corrcoef(ma_long, ma_short)[0, 1] if len(ma_long) > 1 else 0.0
        
        # Calculate Long MA energy distribution
        ma_long_energy_high = np.sum(ma_long > ma_long_mean) / len(ma_long)
        ma_long_energy_low = np.sum(ma_long < ma_long_mean) / len(ma_long)
        
        return {
            'ma_long_mean': float(ma_long_mean),
            'ma_long_std': float(ma_long_std),
            'ma_long_min': float(ma_long_min),
            'ma_long_max': float(ma_long_max),
            'ma_long_range': float(ma_long_range),
            'ma_long_trend': float(ma_long_trend),
            'ma_long_stability': float(ma_long_stability),
            'ma_divergence': float(ma_divergence),
            'ma_correlation': float(ma_correlation),
            'ma_long_energy_high': float(ma_long_energy_high),
            'ma_long_energy_low': float(ma_long_energy_low),
            'duration': end_time - start_time
        }
    
    def analyze_segment(self, y: np.ndarray, sr: int, start_time: float, end_time: float, 
                       segment_index: int, title: str) -> Dict[str, Any]:
        """Analyze a specific segment of the audio with Long MA focus"""
        start_sample = int(start_time * sr)
        end_sample = int(end_time * sr)
        segment_audio = y[start_sample:end_sample]
        
        if len(segment_audio) < sr * 0.5:  # Skip segments shorter than 0.5 seconds
            return None
        
        # Analyze basic audio features
        features = self.analyze_audio_features(segment_audio, sr)
        if not features:
            return None
        
        # Analyze Long MA characteristics
        long_ma_analysis = self.analyze_segment_long_ma(y, sr, start_time, end_time)
        if not long_ma_analysis:
            return None
        
        # Combine features with Long MA characteristics for genre analysis
        enhanced_features = {**features, **long_ma_analysis}
        
        # Calculate genre scores using enhanced features
        scores = self.calculate_genre_scores(enhanced_features, title)
        
        # Get predicted genre
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        predicted_genre = sorted_scores[0][0] if sorted_scores else "Unknown"
        confidence = sorted_scores[0][1] * 100 if sorted_scores else 0
        
        # Generate descriptors based on enhanced features
        descriptors = self.generate_music_descriptors(enhanced_features)
        
        # Analyze peaks within this segment
        peak_analysis = self.analyze_segment_peaks(y, sr, start_time, end_time)
        
        return {
            'segment_index': segment_index,
            'start_time': start_time,
            'end_time': end_time,
            'duration': end_time - start_time,
            'features': features,
            'long_ma_analysis': long_ma_analysis,
            'enhanced_features': enhanced_features,
            'predicted_genre': predicted_genre,
            'confidence': confidence,
            'descriptors': descriptors,
            'peak_analysis': peak_analysis
        }
    
    def create_visualization(self, times, rms_db, ma_short, ma_long, score_z, 
                           peak_times, peak_scores, segments, audio_file):
        """Create visualization with soundwave, peaks, and segment markers"""
        fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(15, 12))
        
        # RMS ENERGY WITH PEAKS AND SEGMENTS
        ax1.plot(times, rms_db, 'b-', alpha=0.7, label='RMS Energy (dB)')
        
        # Plot peaks in RED
        if len(peak_times) > 0:
            ax1.scatter(peak_times, np.interp(peak_times, times, rms_db), 
                       color='red', s=100, zorder=5, label='Detected Peaks (RED)', marker='o')
        
        # Plot segments as GREEN VERTICAL BARS
        if segments is not None:
            for i, seg in enumerate(segments):
                if i < len(segments) - 1:  # Don't plot the last segment (end point)
                    ax1.axvline(x=seg['time'], color='green', alpha=0.7, linewidth=2, 
                               label='Segments (GREEN)' if i == 0 else "")
                    # Add segment number
                    ax1.text(seg['time'], ax1.get_ylim()[1] * 0.9, f'S{i+1}', 
                            ha='center', va='bottom', fontsize=8, color='green', weight='bold')
        
        ax1.set_ylabel('RMS Energy (dB)')
        ax1.set_title(f'Music Analysis: Peaks (RED) + Segments (GREEN) - {os.path.basename(audio_file)}')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # MOVING AVERAGES
        ax2.plot(times, ma_short, 'g-', alpha=0.8, label='Short MA')
        ax2.plot(times, ma_long, 'm-', alpha=0.8, label='Long MA')
        
        # Add segment markers to moving averages
        if segments is not None:
            for i, seg in enumerate(segments):
                if i < len(segments) - 1:
                    ax2.axvline(x=seg['time'], color='green', alpha=0.5, linewidth=1, linestyle='--')
        
        ax2.set_ylabel('dB')
        ax2.set_title('Short vs Long Moving Average with Segment Markers')
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        # SCORE WITH PEAKS AND SEGMENTS
        ax3.plot(times, score_z, 'c-', alpha=0.9, label='MA Diff (z)')
        
        # Plot peaks in RED
        if len(peak_times) > 0 and len(peak_scores) > 0:
            ax3.scatter(peak_times, peak_scores, color='red', s=100, zorder=5, 
                       label='Detected Peaks (RED)', marker='o')
        
        # Add segment markers to score plot
        if segments is not None:
            for i, seg in enumerate(segments):
                if i < len(segments) - 1:
                    ax3.axvline(x=seg['time'], color='green', alpha=0.7, linewidth=2,
                               label='Segments (GREEN)' if i == 0 else "")
        
        ax3.set_xlabel('Time (seconds)')
        ax3.set_ylabel('Score')
        ax3.set_title('Peak Detection Score with Segments')
        ax3.legend()
        ax3.grid(True, alpha=0.3)
        
        plt.tight_layout()
        return fig
    
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
