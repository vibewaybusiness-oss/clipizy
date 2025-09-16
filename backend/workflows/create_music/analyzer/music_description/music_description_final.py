import music21
import librosa
import numpy as np
import json
import os
import wave
import mutagen
from typing import Dict, List, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

class MusicTheoryCategorizer:
    def __init__(self, ai_random_json_path: str = None):
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
                "bpm_range": (30, 80),
                "energy_low": True,
                "valence_low": True,
                "acoustic_high": True,
                "instrumental": True,
                "danceability_low": True,
                "harmony_simple": True,
                "rhythm_simple": True,
                "keywords": ["ethereal", "atmospheric", "meditative", "drone", "ambient"]
            },
            "Synthwave / Electronic": {
                "bpm_range": (80, 140),
                "energy_medium": True,
                "electronic": True,
                "synthetic": True,
                "danceability_high": True,
                "harmony_simple": True,
                "rhythm_regular": True,
                "keywords": ["synth", "electronic", "retro", "80s", "digital"]
            },
            "Reggae / Dub / Ska": {
                "bpm_range": (60, 120),
                "offbeat": True,
                "bass_heavy": True,
                "danceability_medium": True,
                "harmony_simple": True,
                "rhythm_offbeat": True,
                "keywords": ["reggae", "dub", "ska", "offbeat", "bass"]
            },
            "Hip Hop / Trap / Lo-Fi": {
                "bpm_range": (60, 180),
                "beat_heavy": True,
                "percussive": True,
                "low_freq": True,
                "danceability_high": True,
                "harmony_minimal": True,
                "rhythm_complex": True,
                "keywords": ["hip hop", "trap", "lo-fi", "beat", "rap"]
            },
            "Classical / Orchestral": {
                "bpm_range": (40, 200),
                "acoustic_high": True,
                "instrumental": True,
                "complex_harmony": True,
                "danceability_low": True,
                "harmony_complex": True,
                "rhythm_varied": True,
                "keywords": ["classical", "orchestral", "symphony", "chamber"]
            },
            "Rock / Metal / Punk": {
                "bpm_range": (80, 200),
                "energy_high": True,
                "distorted": True,
                "guitar_heavy": True,
                "danceability_medium": True,
                "harmony_power_chords": True,
                "rhythm_strong": True,
                "keywords": ["rock", "metal", "punk", "guitar", "distorted"]
            },
            "Jazz / Blues": {
                "bpm_range": (60, 200),
                "swing": True,
                "improvisation": True,
                "acoustic_high": True,
                "danceability_medium": True,
                "harmony_complex": True,
                "rhythm_swing": True,
                "keywords": ["jazz", "blues", "swing", "improvisation", "saxophone"]
            },
            "World / Folk / Traditional": {
                "bpm_range": (40, 160),
                "acoustic_high": True,
                "ethnic": True,
                "traditional": True,
                "danceability_medium": True,
                "harmony_modal": True,
                "rhythm_traditional": True,
                "keywords": ["folk", "traditional", "world", "ethnic", "acoustic"]
            },
            "Latin / Tango / Flamenco": {
                "bpm_range": (60, 180),
                "latin_rhythm": True,
                "percussive": True,
                "danceability_high": True,
                "harmony_modal": True,
                "rhythm_latin": True,
                "keywords": ["latin", "tango", "flamenco", "salsa", "rhythm"]
            },
            "Pop / Indie / Folk": {
                "bpm_range": (70, 140),
                "melodic": True,
                "accessible": True,
                "danceability_high": True,
                "harmony_simple": True,
                "rhythm_regular": True,
                "keywords": ["pop", "indie", "folk", "melodic", "catchy"]
            },
            "Dance / EDM / Club": {
                "bpm_range": (120, 180),
                "energy_high": True,
                "electronic": True,
                "beat_heavy": True,
                "danceability_high": True,
                "harmony_simple": True,
                "rhythm_regular": True,
                "keywords": ["dance", "edm", "club", "electronic", "beat"]
            },
            "World / Regional": {
                "bpm_range": (40, 160),
                "ethnic": True,
                "regional": True,
                "traditional": True,
                "danceability_medium": True,
                "harmony_modal": True,
                "rhythm_traditional": True,
                "keywords": ["world", "regional", "ethnic", "traditional"]
            },
            "Cinematic / Trailer / Score": {
                "bpm_range": (40, 180),
                "dramatic": True,
                "orchestral": True,
                "emotional": True,
                "danceability_low": True,
                "harmony_complex": True,
                "rhythm_varied": True,
                "keywords": ["cinematic", "trailer", "score", "dramatic", "epic"]
            },
            "Children / Playful": {
                "bpm_range": (60, 160),
                "melodic": True,
                "simple": True,
                "happy": True,
                "danceability_high": True,
                "harmony_simple": True,
                "rhythm_simple": True,
                "keywords": ["children", "playful", "happy", "simple", "melodic"]
            },
            "Marches / Traditional Ensembles": {
                "bpm_range": (80, 140),
                "military": True,
                "brass": True,
                "rhythmic": True,
                "danceability_medium": True,
                "harmony_simple": True,
                "rhythm_march": True,
                "keywords": ["march", "military", "brass", "traditional", "ensemble"]
            }
        }
    
    def extract_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extract comprehensive metadata including title, artist, album, etc."""
        metadata = {
            'title': 'Unknown',
            'artist': 'Unknown',
            'album': 'Unknown',
            'genre': 'Unknown',
            'year': 'Unknown',
            'duration': 0,
            'bitrate': 0,
            'sample_rate': 0,
            'channels': 0,
            'file_size': 0,
            'file_type': 'Unknown',
            'comment': 'Unknown',
            'track_number': 'Unknown',
            'disc_number': 'Unknown'
        }
        
        try:
            # Get file size and type
            metadata['file_size'] = os.path.getsize(file_path)
            file_ext = os.path.splitext(file_path)[1].lower()
            metadata['file_type'] = file_ext
            
            # Try to extract metadata using mutagen
            try:
                audio_file = mutagen.File(file_path)
                if audio_file is not None:
                    # Extract common metadata fields
                    if 'TIT2' in audio_file:  # Title
                        metadata['title'] = str(audio_file['TIT2'][0])
                    elif 'TITLE' in audio_file:
                        metadata['title'] = str(audio_file['TITLE'][0])
                    
                    if 'TPE1' in audio_file:  # Artist
                        metadata['artist'] = str(audio_file['TPE1'][0])
                    elif 'ARTIST' in audio_file:
                        metadata['artist'] = str(audio_file['ARTIST'][0])
                    
                    if 'TALB' in audio_file:  # Album
                        metadata['album'] = str(audio_file['TALB'][0])
                    elif 'ALBUM' in audio_file:
                        metadata['album'] = str(audio_file['ALBUM'][0])
                    
                    if 'TCON' in audio_file:  # Genre
                        metadata['genre'] = str(audio_file['TCON'][0])
                    elif 'GENRE' in audio_file:
                        metadata['genre'] = str(audio_file['GENRE'][0])
                    
                    if 'TDRC' in audio_file:  # Year
                        metadata['year'] = str(audio_file['TDRC'][0])
                    elif 'DATE' in audio_file:
                        metadata['year'] = str(audio_file['DATE'][0])
                    
                    if 'COMM' in audio_file:  # Comment
                        metadata['comment'] = str(audio_file['COMM'][0])
                    elif 'COMMENT' in audio_file:
                        metadata['comment'] = str(audio_file['COMMENT'][0])
                    
                    if 'TRCK' in audio_file:  # Track number
                        metadata['track_number'] = str(audio_file['TRCK'][0])
                    elif 'TRACKNUMBER' in audio_file:
                        metadata['track_number'] = str(audio_file['TRACKNUMBER'][0])
                    
                    if 'TPOS' in audio_file:  # Disc number
                        metadata['disc_number'] = str(audio_file['TPOS'][0])
                    elif 'DISCNUMBER' in audio_file:
                        metadata['disc_number'] = str(audio_file['DISCNUMBER'][0])
                    
                    # Get audio properties
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
            
            # Fallback: extract from filename
            if metadata['title'] == 'Unknown':
                filename = os.path.basename(file_path)
                name_without_ext = os.path.splitext(filename)[0]
                # Clean up filename to make it more readable
                title = name_without_ext.replace('_', ' ').replace('-', ' ')
                title = ' '.join(word.capitalize() for word in title.split())
                metadata['title'] = title
            
            # Extract audio properties using wave module for WAV files
            if file_ext == '.wav':
                try:
                    with wave.open(file_path, 'rb') as wav_file:
                        metadata['channels'] = wav_file.getnchannels()
                        metadata['sample_rate'] = wav_file.getframerate()
                        metadata['duration'] = wav_file.getnframes() / wav_file.getframerate()
                except Exception as e:
                    print(f"WAV metadata extraction failed: {e}")
                
        except Exception as e:
            print(f"Error extracting metadata: {e}")
        
        return metadata
    
    def detect_genre_from_title(self, title: str) -> Dict[str, float]:
        """Detect genre keywords in the title and return genre scores"""
        title_lower = title.lower()
        title_scores = {}
        
        # Genre keyword mapping
        genre_keywords = {
            "Ambient": ["ambient", "atmospheric", "ethereal", "drone", "meditative", "chill", "relaxing"],
            "Synthwave / Electronic": ["synth", "electronic", "synthesizer", "retro", "80s", "digital", "techno", "house", "edm"],
            "Reggae / Dub / Ska": ["reggae", "dub", "ska", "jamaican", "caribbean", "offbeat"],
            "Hip Hop / Trap / Lo-Fi": ["hip hop", "hiphop", "trap", "lo-fi", "lofi", "rap", "beats", "urban"],
            "Classical / Orchestral": ["classical", "orchestral", "symphony", "chamber", "baroque", "romantic", "concerto"],
            "Rock / Metal / Punk": ["rock", "metal", "punk", "grunge", "alternative", "hardcore", "guitar", "distorted"],
            "Jazz / Blues": ["jazz", "blues", "swing", "bebop", "fusion", "smooth", "saxophone", "trumpet"],
            "World / Folk / Traditional": ["folk", "traditional", "world", "ethnic", "acoustic", "country", "bluegrass"],
            "Latin / Tango / Flamenco": ["latin", "tango", "flamenco", "salsa", "bossa", "samba", "spanish"],
            "Pop / Indie / Folk": ["pop", "indie", "alternative", "mainstream", "radio", "catchy"],
            "Dance / EDM / Club": ["dance", "edm", "club", "electronic", "beat", "party", "disco"],
            "World / Regional": ["world", "regional", "ethnic", "traditional", "cultural", "indigenous"],
            "Cinematic / Trailer / Score": ["cinematic", "trailer", "score", "soundtrack", "dramatic", "epic", "orchestral"],
            "Children / Playful": ["children", "kids", "playful", "fun", "happy", "nursery", "cartoon"],
            "Marches / Traditional Ensembles": ["march", "military", "brass", "band", "ensemble", "parade", "ceremonial"]
        }
        
        for genre, keywords in genre_keywords.items():
            score = 0.0
            for keyword in keywords:
                if keyword in title_lower:
                    # Give higher weight to exact genre names
                    if keyword in ["jazz", "blues", "rock", "pop", "classical", "ambient", "electronic"]:
                        score += 3.0  # Even higher weight for main genre names
                    else:
                        score += 1.5  # Higher weight for related keywords
            
            # Normalize score but don't cap too low
            if score > 0:
                title_scores[genre] = min(score / 2.0, 1.0)  # Cap at 1.0 but allow higher scores
            else:
                title_scores[genre] = 0.0
        
        return title_scores
    
    def analyze_audio_features(self, file_path: str) -> Dict[str, Any]:
        try:
            # Load audio with librosa for basic features
            y, sr = librosa.load(file_path)
            
            features = {}
            
            # Basic audio features
            features['duration'] = len(y) / sr
            
            # Tempo and rhythm
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            features['tempo'] = float(tempo)
            
            # Spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            features['spectral_centroid'] = float(np.mean(spectral_centroids))
            
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
            features['spectral_rolloff'] = float(np.mean(spectral_rolloff))
            
            # MFCC features
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            features['mfcc_mean'] = [float(np.mean(mfcc)) for mfcc in mfccs]
            
            # Chroma features
            chroma = librosa.feature.chroma_stft(y=y, sr=sr)
            features['chroma_mean'] = [float(np.mean(c)) for c in chroma]
            
            # Energy and rhythm
            rms = librosa.feature.rms(y=y)[0]
            features['rms_energy'] = float(np.mean(rms))
            
            zero_crossing_rate = librosa.feature.zero_crossing_rate(y)[0]
            features['zero_crossing_rate'] = float(np.mean(zero_crossing_rate))
            
            # Harmonic/Percussive separation
            harmonic, percussive = librosa.effects.hpss(y)
            features['harmonic_ratio'] = float(np.sum(harmonic**2) / (np.sum(harmonic**2) + np.sum(percussive**2)))
            
            # Onset detection
            onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
            features['onset_rate'] = len(onset_frames) / (len(y) / sr)
            
            # Music21 analysis for music theory features
            try:
                # Convert to music21 stream
                stream = music21.converter.parse(file_path)
                
                # Key analysis
                key_analyzer = music21.analysis.discrete.KrumhanslSchmuckler()
                key = key_analyzer.getSolution(stream)
                features['key'] = str(key) if key else "Unknown"
                
                # Time signature analysis
                time_signatures = stream.getTimeSignatures()
                if time_signatures:
                    ts = time_signatures[0]
                    features['time_signature'] = f"{ts.numerator}/{ts.denominator}"
                else:
                    features['time_signature'] = "Unknown"
                
                # Scale analysis
                scale_analyzer = music21.analysis.discrete.Scale()
                scale = scale_analyzer.getSolution(stream)
                features['scale'] = str(scale) if scale else "Unknown"
                
                # Chord analysis
                chord_analyzer = music21.analysis.discrete.Chord()
                chords = chord_analyzer.getSolution(stream)
                features['chord_progression'] = [str(chord) for chord in chords] if chords else []
                
                # Interval analysis
                intervals = []
                for part in stream.parts:
                    for note in part.flat.notes:
                        if hasattr(note, 'pitch'):
                            intervals.append(note.pitch.midi)
                
                if len(intervals) > 1:
                    interval_diffs = np.diff(intervals)
                    features['interval_complexity'] = float(np.std(interval_diffs))
                    features['melodic_range'] = float(max(intervals) - min(intervals))
                else:
                    features['interval_complexity'] = 0.0
                    features['melodic_range'] = 0.0
                
                # Rhythm analysis
                rhythm_analyzer = music21.analysis.discrete.Rhythm()
                rhythm = rhythm_analyzer.getSolution(stream)
                features['rhythm_complexity'] = float(rhythm) if rhythm else 0.0
                
                # Harmonic complexity
                harmonic_analyzer = music21.analysis.discrete.Harmonic()
                harmonic = harmonic_analyzer.getSolution(stream)
                features['harmonic_complexity'] = float(harmonic) if harmonic else 0.0
                
                # Tonal complexity
                tonal_analyzer = music21.analysis.discrete.Tonal()
                tonal = tonal_analyzer.getSolution(stream)
                features['tonal_complexity'] = float(tonal) if tonal else 0.0
                
            except Exception as e:
                print(f"Music21 analysis failed: {e}")
                features['key'] = "Unknown"
                features['scale'] = "Unknown"
                features['time_signature'] = "Unknown"
                features['chord_progression'] = []
                features['interval_complexity'] = 0.0
                features['melodic_range'] = 0.0
                features['rhythm_complexity'] = 0.0
                features['harmonic_complexity'] = 0.0
                features['tonal_complexity'] = 0.0
            
            return features
            
        except Exception as e:
            print(f"Error analyzing audio: {e}")
            return {}
    
    def calculate_genre_scores(self, features: Dict[str, Any], metadata: Dict[str, Any]) -> Dict[str, float]:
        scores = {}
        
        # Get title-based genre scores
        title_scores = self.detect_genre_from_title(metadata.get('title', ''))
        
        for genre, characteristics in self.genre_characteristics.items():
            score = 0.0
            total_checks = 0
            
            # Title-based scoring (weighted heavily)
            title_score = title_scores.get(genre, 0.0)
            if title_score > 0:
                score += title_score * 3.0  # Triple weight for title matches
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
            
            # Harmony complexity
            harmonic_complexity = features.get('harmonic_complexity', 0)
            if characteristics.get('harmony_simple', False):
                if harmonic_complexity < 0.5:
                    score += 1.0
                total_checks += 1
            
            if characteristics.get('harmony_complex', False):
                if harmonic_complexity > 0.5:
                    score += 1.0
                total_checks += 1
            
            if characteristics.get('harmony_minimal', False):
                if harmonic_complexity < 0.3:
                    score += 1.0
                total_checks += 1
            
            # Rhythm complexity
            rhythm_complexity = features.get('rhythm_complexity', 0)
            if characteristics.get('rhythm_simple', False):
                if rhythm_complexity < 0.5:
                    score += 1.0
                total_checks += 1
            
            if characteristics.get('rhythm_complex', False):
                if rhythm_complexity > 0.5:
                    score += 1.0
                total_checks += 1
            
            if characteristics.get('rhythm_regular', False):
                if 0.3 <= rhythm_complexity <= 0.7:
                    score += 1.0
                total_checks += 1
            
            # Tonal complexity
            tonal_complexity = features.get('tonal_complexity', 0)
            if characteristics.get('harmony_modal', False):
                if tonal_complexity > 0.5:
                    score += 1.0
                total_checks += 1
            
            if total_checks > 0:
                scores[genre] = score / total_checks
            else:
                scores[genre] = 0.0
        
        return scores
    
    def categorize_music(self, file_path: str) -> Dict[str, Any]:
        print(f"ANALYZING MUSIC FILE: {file_path}")
        print("=" * 60)
        
        if not os.path.exists(file_path):
            print(f"ERROR: File not found: {file_path}")
            return {}
        
        # Extract metadata first
        metadata = self.extract_metadata(file_path)
        
        print("FILE METADATA:")
        print("-" * 15)
        print(f"Title: {metadata['title']}")
        print(f"Artist: {metadata['artist']}")
        print(f"Album: {metadata['album']}")
        print(f"Genre (from tags): {metadata['genre']}")
        print(f"Year: {metadata['year']}")
        print(f"Track: {metadata['track_number']}")
        print(f"Disc: {metadata['disc_number']}")
        print(f"Comment: {metadata['comment']}")
        print(f"File Type: {metadata['file_type']}")
        print(f"File Size: {metadata['file_size']:,} bytes")
        print(f"Channels: {metadata['channels']}")
        print(f"Sample Rate: {metadata['sample_rate']} Hz")
        
        # Analyze title for genre keywords
        title_scores = self.detect_genre_from_title(metadata['title'])
        if any(score > 0 for score in title_scores.values()):
            print(f"\nTITLE GENRE ANALYSIS:")
            print("-" * 25)
            print(f"Detected genre keywords in title: '{metadata['title']}'")
            for genre, score in sorted(title_scores.items(), key=lambda x: x[1], reverse=True):
                if score > 0:
                    print(f"  {genre}: {score:.2f}")
        
        features = self.analyze_audio_features(file_path)
        if not features:
            print("ERROR: Could not analyze audio features")
            return {}
        
        print("\nMUSIC THEORY ANALYSIS:")
        print("-" * 25)
        print(f"Duration: {features.get('duration', 0):.2f} seconds")
        print(f"Tempo: {features.get('tempo', 0):.1f} BPM")
        print(f"Key: {features.get('key', 'Unknown')}")
        print(f"Scale: {features.get('scale', 'Unknown')}")
        print(f"Time Signature: {features.get('time_signature', 'Unknown')}")
        
        print(f"\nMUSIC THEORY COMPLEXITY:")
        print(f"  Harmonic Complexity: {features.get('harmonic_complexity', 0):.3f}")
        print(f"  Rhythm Complexity: {features.get('rhythm_complexity', 0):.3f}")
        print(f"  Tonal Complexity: {features.get('tonal_complexity', 0):.3f}")
        print(f"  Interval Complexity: {features.get('interval_complexity', 0):.3f}")
        print(f"  Melodic Range: {features.get('melodic_range', 0):.1f} semitones")
        
        print(f"\nAUDIO FEATURES:")
        print(f"  Spectral Centroid: {features.get('spectral_centroid', 0):.1f} Hz")
        print(f"  Spectral Rolloff: {features.get('spectral_rolloff', 0):.1f} Hz")
        print(f"  RMS Energy: {features.get('rms_energy', 0):.4f}")
        print(f"  Zero Crossing Rate: {features.get('zero_crossing_rate', 0):.4f}")
        print(f"  Onset Rate: {features.get('onset_rate', 0):.2f} onsets/second")
        print(f"  Harmonic Ratio: {features.get('harmonic_ratio', 0):.3f}")
        
        if features.get('chord_progression'):
            print(f"\nCHORD PROGRESSION:")
            chords = features['chord_progression'][:8]  # Show first 8 chords
            print(f"  {' -> '.join(chords)}")
            if len(features['chord_progression']) > 8:
                print(f"  ... and {len(features['chord_progression']) - 8} more chords")
        
        print("\nMFCC FEATURES (Mean values):")
        mfcc_means = features.get('mfcc_mean', [])
        for i, mfcc in enumerate(mfcc_means[:5]):
            print(f"  MFCC {i+1}: {mfcc:.3f}")
        if len(mfcc_means) > 5:
            print(f"  ... and {len(mfcc_means) - 5} more")
        
        print("\nCHROMA FEATURES (Mean values):")
        chroma_means = features.get('chroma_mean', [])
        chroma_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        for i, chroma in enumerate(chroma_means):
            if i < len(chroma_names):
                print(f"  {chroma_names[i]}: {chroma:.3f}")
        
        scores = self.calculate_genre_scores(features, metadata)
        
        print("\nGENRE CATEGORIZATION SCORES:")
        print("-" * 35)
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        for genre, score in sorted_scores:
            percentage = score * 100
            bar_length = int(percentage / 2)
            bar = "█" * bar_length + "░" * (50 - bar_length)
            print(f"{genre:<25} {percentage:5.1f}% [{bar}]")
        
        predicted_genre = sorted_scores[0][0] if sorted_scores else "Unknown"
        confidence = sorted_scores[0][1] * 100 if sorted_scores else 0
        
        print(f"\nPREDICTED GENRE: {predicted_genre}")
        print(f"CONFIDENCE: {confidence:.1f}%")
        
        print("\nMUSIC DESCRIPTORS:")
        print("-" * 20)
        
        tempo = features.get('tempo', 0)
        energy = features.get('rms_energy', 0)
        harmonic_ratio = features.get('harmonic_ratio', 0)
        spectral_centroid = features.get('spectral_centroid', 0)
        harmonic_complexity = features.get('harmonic_complexity', 0)
        rhythm_complexity = features.get('rhythm_complexity', 0)
        tonal_complexity = features.get('tonal_complexity', 0)
        
        # Tempo description
        if tempo < 60:
            print("• Very slow tempo (ballad-like, ambient)")
        elif tempo < 80:
            print("• Slow tempo (relaxed, chill)")
        elif tempo < 120:
            print("• Moderate tempo (walking pace, comfortable)")
        elif tempo < 140:
            print("• Up-tempo (energetic, driving)")
        else:
            print("• Fast tempo (very energetic, intense)")
        
        # Energy description
        if energy < 0.05:
            print("• Very low energy (quiet, ambient, meditative)")
        elif energy < 0.1:
            print("• Low energy (soft, gentle, relaxed)")
        elif energy < 0.2:
            print("• Medium energy (balanced, moderate)")
        elif energy < 0.3:
            print("• High energy (loud, dynamic, exciting)")
        else:
            print("• Very high energy (intense, powerful, aggressive)")
        
        # Harmonic content
        if harmonic_ratio > 0.8:
            print("• Highly harmonic (very melodic, tonal, musical)")
        elif harmonic_ratio > 0.6:
            print("• Harmonic (melodic, tonal)")
        elif harmonic_ratio > 0.4:
            print("• Mixed harmonic/percussive (balanced)")
        elif harmonic_ratio > 0.2:
            print("• Percussive (rhythmic, beat-focused)")
        else:
            print("• Highly percussive (very rhythmic, minimal melody)")
        
        # Harmonic complexity
        if harmonic_complexity > 0.7:
            print("• High harmonic complexity (complex chords, jazz-like)")
        elif harmonic_complexity > 0.4:
            print("• Medium harmonic complexity (moderate chord complexity)")
        else:
            print("• Low harmonic complexity (simple chords, pop-like)")
        
        # Rhythm complexity
        if rhythm_complexity > 0.7:
            print("• High rhythm complexity (complex patterns, syncopated)")
        elif rhythm_complexity > 0.4:
            print("• Medium rhythm complexity (moderate rhythmic variety)")
        else:
            print("• Low rhythm complexity (simple, regular patterns)")
        
        # Tonal complexity
        if tonal_complexity > 0.7:
            print("• High tonal complexity (modulatory, chromatic)")
        elif tonal_complexity > 0.4:
            print("• Medium tonal complexity (some modulation)")
        else:
            print("• Low tonal complexity (diatonic, simple tonality)")
        
        # Frequency content
        if spectral_centroid < 1000:
            print("• Low frequency content (bass-heavy, warm, deep)")
        elif spectral_centroid < 2000:
            print("• Mid-low frequency content (warm, full-bodied)")
        elif spectral_centroid < 4000:
            print("• Mid frequency content (balanced, natural)")
        else:
            print("• High frequency content (bright, crisp, airy)")
        
        return {
            'file_path': file_path,
            'metadata': metadata,
            'features': features,
            'genre_scores': scores,
            'predicted_genre': predicted_genre,
            'confidence': confidence
        }

def main():
    categorizer = MusicTheoryCategorizer()
    
    # Test with a file that has "jazz" in the title
    song_path = "C:/Users/willi/Downloads/Winter Room.wav"
    
    result = categorizer.categorize_music(song_path)
    
    if result:
        print("\n" + "=" * 60)
        print("ENHANCED MUSIC THEORY ANALYSIS COMPLETE")
        print("=" * 60)
        
        # Save results to JSON
        output_file = "music_analysis_results.json"
        try:
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2, default=str)
            print(f"\nResults saved to: {output_file}")
        except Exception as e:
            print(f"Error saving results: {e}")

if __name__ == "__main__":
    main()
