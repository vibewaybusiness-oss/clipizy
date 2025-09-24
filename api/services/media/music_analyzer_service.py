"""
Integrated Music Analysis Service for clipizy API
Combines all music analysis capabilities into a single FastAPI service
"""

import os
import json
import tempfile
from typing import Dict, List, Any, Optional
from fastapi import HTTPException, UploadFile
import warnings
warnings.filterwarnings('ignore')

# Conditional imports for Vercel compatibility
try:
    import librosa
    import numpy as np
    import mutagen
    import wave
    from scipy.signal import find_peaks
    from scipy.ndimage import gaussian_filter1d
    CORE_ML_AVAILABLE = True
    print(f"✅ Music analyzer ML libraries loaded: librosa={librosa.__version__}, numpy={np.__version__}")
except ImportError as e:
    librosa = None
    np = None
    mutagen = None
    wave = None
    find_peaks = None
    gaussian_filter1d = None
    CORE_ML_AVAILABLE = False
    print(f"❌ Music analyzer ML libraries import failed: {e}")

# Optional imports for advanced features
try:
    import music21
    MUSIC21_AVAILABLE = True
except ImportError:
    music21 = None
    MUSIC21_AVAILABLE = False

# ML_AVAILABLE is True if we have the core libraries needed for comprehensive analysis
ML_AVAILABLE = CORE_ML_AVAILABLE

class MusicTheoryCategorizer:
    """Enhanced music theory analysis with comprehensive genre detection"""

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

        self.genre_characteristics = {
            "Ambient": {
                "bpm_range": (30, 80), "energy_low": True, "valence_low": True,
                "acoustic_high": True, "instrumental": True, "danceability_low": True,
                "harmony_simple": True, "rhythm_simple": True,
                "keywords": ["ethereal", "atmospheric", "meditative", "drone", "ambient"]
            },
            "Synthwave / Electronic": {
                "bpm_range": (80, 140), "energy_medium": True, "electronic": True,
                "synthetic": True, "danceability_high": True, "harmony_simple": True,
                "rhythm_regular": True, "keywords": ["synth", "electronic", "retro", "80s", "digital"]
            },
            "Jazz / Blues": {
                "bpm_range": (60, 200), "swing": True, "improvisation": True,
                "acoustic_high": True, "danceability_medium": True, "harmony_complex": True,
                "rhythm_swing": True, "keywords": ["jazz", "blues", "swing", "improvisation", "saxophone"]
            },
            "Classical / Orchestral": {
                "bpm_range": (40, 200), "acoustic_high": True, "instrumental": True,
                "complex_harmony": True, "danceability_low": True, "harmony_complex": True,
                "rhythm_varied": True, "keywords": ["classical", "orchestral", "symphony", "chamber"]
            },
            "Rock / Metal / Punk": {
                "bpm_range": (80, 200), "energy_high": True, "distorted": True,
                "guitar_heavy": True, "danceability_medium": True, "harmony_power_chords": True,
                "rhythm_strong": True, "keywords": ["rock", "metal", "punk", "guitar", "distorted"]
            }
        }

    def extract_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extract comprehensive metadata from audio file"""
        metadata = {
            'title': 'Unknown', 'artist': 'Unknown', 'album': 'Unknown',
            'genre': 'Unknown', 'year': 'Unknown', 'duration': 0,
            'bitrate': 0, 'sample_rate': 0, 'channels': 0,
            'file_size': 0, 'file_type': 'Unknown'
        }

        try:
            metadata['file_size'] = os.path.getsize(file_path)
            file_ext = os.path.splitext(file_path)[1].lower()
            metadata['file_type'] = file_ext

            # Try to load with mutagen, but handle format errors gracefully
            try:
                audio_file = mutagen.File(file_path)
            except Exception as mutagen_error:
                print(f"Mutagen failed to load file {file_path}: {mutagen_error}")
                audio_file = None

            if audio_file is not None:
                if 'TIT2' in audio_file:
                    metadata['title'] = str(audio_file['TIT2'][0])
                elif 'TITLE' in audio_file:
                    metadata['title'] = str(audio_file['TITLE'][0])

                if 'TPE1' in audio_file:
                    metadata['artist'] = str(audio_file['TPE1'][0])
                elif 'ARTIST' in audio_file:
                    metadata['artist'] = str(audio_file['ARTIST'][0])

                if hasattr(audio_file, 'info'):
                    metadata['duration'] = audio_file.info.length
                    if hasattr(audio_file.info, 'bitrate'):
                        metadata['bitrate'] = audio_file.info.bitrate
                    if hasattr(audio_file.info, 'sample_rate'):
                        metadata['sample_rate'] = audio_file.info.sample_rate
                    if hasattr(audio_file.info, 'channels'):
                        metadata['channels'] = audio_file.info.channels

        except Exception as e:
            print(f"Metadata extraction failed: {e}")

        # If duration is still 0, try to get it using librosa
        if metadata['duration'] == 0:
            try:
                import librosa
                y, sr = librosa.load(file_path, sr=None)
                metadata['duration'] = len(y) / sr
                metadata['sample_rate'] = sr
            except Exception as librosa_error:
                print(f"Librosa duration calculation failed: {librosa_error}")

        if metadata['title'] == 'Unknown':
            filename = os.path.basename(file_path)
            name_without_ext = os.path.splitext(filename)[0]
            title = name_without_ext.replace('_', ' ').replace('-', ' ')
            metadata['title'] = ' '.join(word.capitalize() for word in title.split())

        return metadata

    def analyze_audio_features(self, file_path: str) -> Dict[str, Any]:
        """Extract comprehensive audio features using librosa and music21"""
        if not ML_AVAILABLE or np is None:
            return {}
            
        try:
            y, sr = librosa.load(file_path)
            features = {}

            features['duration'] = len(y) / sr
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            features['tempo'] = float(tempo)

            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            features['spectral_centroid'] = float(np.mean(spectral_centroids))

            rms = librosa.feature.rms(y=y)[0]
            features['rms_energy'] = float(np.mean(rms))

            harmonic, percussive = librosa.effects.hpss(y)
            features['harmonic_ratio'] = float(np.sum(harmonic**2) / (np.sum(harmonic**2) + np.sum(percussive**2)))

            onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
            features['onset_rate'] = len(onset_frames) / (len(y) / sr)

            # Music21 analysis (skip if file format is not supported or Music21 not available)
            if MUSIC21_AVAILABLE:
                try:
                    # Check if file extension is supported by Music21
                    file_ext = os.path.splitext(file_path)[1].lower()
                    supported_extensions = ['.mid', '.midi', '.xml', '.mxl', '.musicxml']

                    if file_ext in supported_extensions:
                        stream = music21.converter.parse(file_path)
                        key_analyzer = music21.analysis.discrete.KrumhanslSchmuckler()
                        key = key_analyzer.getSolution(stream)
                        features['key'] = str(key) if key else "Unknown"

                        time_signatures = stream.getTimeSignatures()
                        if time_signatures:
                            ts = time_signatures[0]
                            features['time_signature'] = f"{ts.numerator}/{ts.denominator}"
                        else:
                            features['time_signature'] = "Unknown"
                    else:
                        # For audio files, skip Music21 analysis
                        features['key'] = "Unknown"
                        features['time_signature'] = "Unknown"

                except Exception as e:
                    print(f"Music21 analysis failed: {e}")
                    features['key'] = "Unknown"
                    features['time_signature'] = "Unknown"
            else:
                # Music21 not available, set defaults
                features['key'] = "Unknown"
                features['time_signature'] = "Unknown"

            return features

        except Exception as e:
            print(f"Error analyzing audio: {e}")
            return {}

    def analyze_audio_features_from_array(self, y, sr: int) -> Dict[str, Any]:
        """Extract comprehensive audio features from audio array using librosa"""
        if not ML_AVAILABLE or np is None:
            return {}
            
        try:
            features = {}

            features['duration'] = len(y) / sr
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            features['tempo'] = float(tempo)

            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            features['spectral_centroid'] = float(np.mean(spectral_centroids))

            rms = librosa.feature.rms(y=y)[0]
            features['rms_energy'] = float(np.mean(rms))

            harmonic, percussive = librosa.effects.hpss(y)
            features['harmonic_ratio'] = float(np.sum(harmonic**2) / (np.sum(harmonic**2) + np.sum(percussive**2)))

            onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
            features['onset_rate'] = len(onset_frames) / (len(y) / sr)

            # For segment analysis, we'll skip music21 analysis as it requires file paths
            features['key'] = 'Unknown'
            features['time_signature'] = 'Unknown'

            return features

        except Exception as e:
            print(f"Error analyzing audio array: {e}")
            return {}

    def calculate_genre_scores(self, features: Dict[str, Any], metadata: Dict[str, Any]) -> Dict[str, float]:
        """Calculate genre scores based on audio features and metadata"""
        scores = {}
        title = metadata.get('title', '').lower()

        for genre, characteristics in self.genre_characteristics.items():
            score = 0.0
            total_checks = 0

            # Title-based scoring
            keywords = characteristics.get('keywords', [])
            title_score = sum(1.0 for keyword in keywords if keyword in title)
            if title_score > 0:
                score += title_score * 3.0
                total_checks += 3.0

            # BPM matching
            if 'bpm_range' in characteristics:
                bpm_min, bpm_max = characteristics['bpm_range']
                bpm = features.get('tempo', 0)
                if bpm_min <= bpm <= bpm_max:
                    score += 1.0
                total_checks += 1

            # Energy matching
            energy = features.get('rms_energy', 0)
            if characteristics.get('energy_low', False) and energy < 0.1:
                score += 1.0
                total_checks += 1
            if characteristics.get('energy_high', False) and energy > 0.2:
                score += 1.0
                total_checks += 1

            if total_checks > 0:
                scores[genre] = score / total_checks
            else:
                scores[genre] = 0.0

        return scores

class SimpleMusicAnalyzer:
    """Simplified music analysis focused on essential features"""

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

    def analyze_audio_features(self, file_path: str) -> Dict[str, Any]:
        """Extract essential audio features"""
        if not ML_AVAILABLE or np is None:
            return {}
            
        try:
            y, sr = librosa.load(file_path)
            features = {}

            features['duration'] = len(y) / sr
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            features['tempo'] = float(tempo)

            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            features['spectral_centroid'] = float(np.mean(spectral_centroids))

            rms = librosa.feature.rms(y=y)[0]
            features['rms_energy'] = float(np.mean(rms))

            harmonic, percussive = librosa.effects.hpss(y)
            features['harmonic_ratio'] = float(np.sum(harmonic**2) / (np.sum(harmonic**2) + np.sum(percussive**2)))

            return features

        except Exception as e:
            print(f"Error analyzing audio: {e}")
            return {}

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

        return descriptors

class MusicPeakDetector:
    """Detect musical peaks and segments in audio"""

    def detect_music_peaks(self, file_path: str, min_peaks: int = 2,
                          min_gap_seconds: float = 2.0) -> Dict[str, Any]:
        """Detect musical peaks using moving average difference method"""
        if not ML_AVAILABLE or np is None or find_peaks is None or gaussian_filter1d is None:
            return {'peak_times': [], 'peak_scores': [], 'total_peaks': 0, 'analysis_duration': 0}
            
        try:
            y, sr = librosa.load(file_path, sr=None)

            # RMS energy to dB
            rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=512)[0]
            rms_db = librosa.amplitude_to_db(rms, ref=np.max)
            rms_db = np.nan_to_num(rms_db, nan=np.min(rms_db))

            # Smooth dB to reduce noise
            smoothed_db = gaussian_filter1d(rms_db, sigma=1.5)

            # Moving averages
            short_frames = max(1, int(round(0.5 * sr / 512)))
            long_frames = max(short_frames + 1, int(round(3.0 * sr / 512)))

            def moving_average(x, win):
                win = max(1, int(win))
                kernel = np.ones(win, dtype=float) / float(win)
                return np.convolve(x, kernel, mode='same')

            ma_short = moving_average(smoothed_db, short_frames)
            ma_long = moving_average(smoothed_db, long_frames)

            # Calculate score
            score = ma_short - ma_long
            score_z = (score - np.mean(score)) / (np.std(score) + 1e-8)

            # Find peaks
            min_dist_frames = max(1, int(min_gap_seconds * sr / 512))
            peaks, _ = find_peaks(score_z, height=np.std(score_z), distance=min_dist_frames)

            # Convert to times
            times = librosa.frames_to_time(np.arange(len(score_z)), sr=sr, hop_length=512)
            peak_times = times[peaks]
            peak_scores = score_z[peaks]

            return {
                'peak_times': peak_times.tolist(),
                'peak_scores': peak_scores.tolist(),
                'total_peaks': len(peak_times),
                'analysis_duration': len(y) / sr
            }

        except Exception as e:
            print(f"Error detecting peaks: {e}")
            return {'peak_times': [], 'peak_scores': [], 'total_peaks': 0, 'analysis_duration': 0}

class MusicAnalyzerService:
    """Main FastAPI service integrating all music analysis capabilities"""

    def __init__(self):
        self.theory_categorizer = MusicTheoryCategorizer()
        self.simple_analyzer = SimpleMusicAnalyzer()
        self.peak_detector = MusicPeakDetector()

    async def analyze_music_comprehensive(self, file_path: str) -> Dict[str, Any]:
        """Perform comprehensive music analysis including theory, genre, peaks, and segmentation"""
        try:
            # Check if ML libraries are available
            if not ML_AVAILABLE:
                # Use fallback service
                from api.services.utils.vercel_compatibility import get_music_analyzer_service
                fallback_service = get_music_analyzer_service()
                if hasattr(fallback_service, 'analyze_music_comprehensive'):
                    # Check if the method is async
                    import asyncio
                    import inspect
                    if inspect.iscoroutinefunction(fallback_service.analyze_music_comprehensive):
                        return await fallback_service.analyze_music_comprehensive(file_path)
                    else:
                        return fallback_service.analyze_music_comprehensive(file_path)
                else:
                    return {
                        'analysis_type': 'fallback',
                        'message': 'ML libraries not available, using basic analysis',
                        'error': 'Heavy ML libraries not available in Vercel environment'
                    }

            # Read audio file as bytes for the complete workflow
            with open(file_path, 'rb') as audio_file:
                audio_data = audio_file.read()

            # Use the complete music_analyzer workflow
            import sys
            import os
            current_dir = os.path.dirname(os.path.abspath(__file__))
            analyzer_dir = os.path.join(current_dir, '..', '..', 'workflows', 'analyzer')
            sys.path.insert(0, analyzer_dir)

            try:
                from music_analyzer import analyze_audio_bytes
            except ImportError:
                import importlib.util
                spec = importlib.util.spec_from_file_location("music_analyzer", os.path.join(analyzer_dir, "music_analyzer.py"))
                music_analyzer = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(music_analyzer)
                analyze_audio_bytes = music_analyzer.analyze_audio_bytes

            # Perform comprehensive analysis with segmentation
            try:
                result = analyze_audio_bytes(
                    data=audio_data,
                    create_plot=False,  # No visualization for API
                    audio_file=os.path.basename(file_path),
                    use_beat_energy=True,
                    short_ma_beats=4,
                    long_ma_beats=16,
                    min_gap_seconds=11.0
                )
            except Exception as e:
                # If segmentation fails, try with simpler parameters
                print(f"Segmentation failed with complex parameters: {e}")
                print("Trying with simpler parameters...")
                result = analyze_audio_bytes(
                    data=audio_data,
                    create_plot=False,  # No visualization for API
                    audio_file=os.path.basename(file_path),
                    use_beat_energy=False,  # Disable beat energy segmentation
                    short_ma_beats=4,
                    long_ma_beats=16,
                    min_gap_seconds=2.0  # Shorter minimum gap
                )

            # Extract metadata using existing service
            metadata = self.theory_categorizer.extract_metadata(file_path)

            # Calculate genre scores using existing service
            features = self.theory_categorizer.analyze_audio_features(file_path)
            if not features:
                raise HTTPException(status_code=400, detail="Could not analyze audio features")

            genre_scores = self.theory_categorizer.calculate_genre_scores(features, metadata)

            # Get predicted genre
            sorted_scores = sorted(genre_scores.items(), key=lambda x: x[1], reverse=True)
            predicted_genre = sorted_scores[0][0] if sorted_scores else "Unknown"
            confidence = sorted_scores[0][1] * 100 if sorted_scores else 0

            # Detect peaks using existing service
            peak_analysis = self.peak_detector.detect_music_peaks(file_path)

            # Process segments from segments_sec
            segments_sec = result.get('segments_sec', [])
            segments = []
            segment_analysis = []

            if len(segments_sec) > 1:
                # Load audio for segment analysis
                import librosa
                y, sr = librosa.load(file_path, sr=22050)

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
                        # Analyze segment features using the theory categorizer
                        segment_features = self.theory_categorizer.analyze_audio_features_from_array(segment_audio, sr)
                        if segment_features:
                            segment_features['start_time'] = start_time
                            segment_features['end_time'] = end_time
                            segment_features['duration'] = end_time - start_time

                            # Generate descriptors for segment
                            segment_descriptors = self.simple_analyzer.generate_music_descriptors(segment_features)

                            # Add analysis to segment
                            segment['features'] = segment_features
                            segment['descriptors'] = segment_descriptors

                            segment_analysis.append(segment)

            # Combine all results
            comprehensive_result = {
                'file_path': file_path,
                'metadata': metadata,
                'features': features,
                'genre_scores': genre_scores,
                'predicted_genre': predicted_genre,
                'confidence': confidence,
                'peak_analysis': peak_analysis,
                'analysis_timestamp': str(np.datetime64('now')) if np is not None else 'unknown' if np is not None else 'unknown',
                # Add segmentation results from music_analyzer
                'segments_sec': segments_sec,
                'segments': segments,
                'segment_analysis': segment_analysis,
                'beat_times_sec': result.get('beat_times_sec', []),
                'downbeats_sec': result.get('downbeats_sec', []),
                'tempo': result.get('tempo', 0),
                'duration': result.get('duration', 0),
                'debug': result.get('debug', {})
            }

            return comprehensive_result

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Music analysis error: {str(e)}")
            print(f"Full traceback: {error_details}")
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    async def analyze_music_simple(self, file_path: str) -> Dict[str, Any]:
        """Perform simplified music analysis focused on essential features"""
        try:
            # Extract basic metadata
            metadata = self.theory_categorizer.extract_metadata(file_path)

            # Analyze audio features
            features = self.simple_analyzer.analyze_audio_features(file_path)
            if not features:
                raise HTTPException(status_code=400, detail="Could not analyze audio features")

            # Generate descriptors
            descriptors = self.simple_analyzer.generate_music_descriptors(features)

            return {
                'file_path': file_path,
                'metadata': metadata,
                'features': features,
                'descriptors': descriptors,
                'analysis_timestamp': str(np.datetime64('now')) if np is not None else 'unknown'
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    async def detect_peaks_only(self, file_path: str, min_peaks: int = 2,
                               min_gap_seconds: float = 2.0) -> Dict[str, Any]:
        """Detect only musical peaks and segments"""
        try:
            peak_analysis = self.peak_detector.detect_music_peaks(file_path, min_peaks, min_gap_seconds)
            return {
                'file_path': file_path,
                'peak_analysis': peak_analysis,
                'analysis_timestamp': str(np.datetime64('now')) if np is not None else 'unknown'
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Peak detection failed: {str(e)}")

    async def analyze_uploaded_file(self, file: UploadFile) -> Dict[str, Any]:
        """Analyze an uploaded audio file"""
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_file_path = tmp_file.name

            try:
                # Perform comprehensive analysis
                result = await self.analyze_music_comprehensive(tmp_file_path)
                result['original_filename'] = file.filename
                return result
            finally:
                # Clean up temporary file
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"File analysis failed: {str(e)}")

# Global service instance
music_analyzer_service = MusicAnalyzerService()
