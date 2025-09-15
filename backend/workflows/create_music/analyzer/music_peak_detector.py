import numpy as np
import librosa
import matplotlib.pyplot as plt
from scipy.signal import find_peaks
from scipy.ndimage import gaussian_filter1d
import os
import json

def detect_music_peaks(
    audio_file,
    min_peaks=2,
    max_peaks=None,
    window_size=1024,
    hop_length=512,
    min_gap_seconds=2.0,
    short_ma_sec=0.50,
    long_ma_sec=3.00,
    include_boundaries=True,
):
    """
    Detect abrupt musical changes using an improved MOVING-AVERAGE DIFFERENCE method on RMS dB.
    Uses adaptive thresholding and dynamic peak count evaluation.

    Args:
        audio_file: Path to audio file
        min_peaks: Minimum number of peaks to find
        max_peaks: Maximum number of peaks to find (None for dynamic evaluation)
        window_size: STFT window size
        hop_length: STFT hop length
        min_gap_seconds: Enforce a minimum time gap between any two returned peaks
        short_ma_sec: Short moving average window in seconds
        long_ma_sec: Long moving average window in seconds
        include_boundaries: Include start (t0) and end (tf) points

    Returns:
        final_peak_times, final_peak_scores, times, rms_db, ma_short, ma_long, score_z
    """

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

    # MOVING AVERAGES (SHORT AND LONG)
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

    # ROBUST NORMALIZATION (z-score via MAD)
    def robust_z(x):
        x = np.asarray(x)
        med = np.median(x)
        mad = np.median(np.abs(x - med)) + 1e-8
        return (x - med) / (1.4826 * mad)

    score = ma_short - ma_long
    score_z = robust_z(score)
    score_z = gaussian_filter1d(score_z, sigma=1.0)

    # IMPROVED ADAPTIVE THRESHOLD USING MULTIPLE CRITERIA
    def adaptive_threshold(score_z, rms_db, times):
        # Base threshold using robust statistics
        base_thr = np.median(score_z) + 0.8 * (np.median(np.abs(score_z - np.median(score_z))) * 1.4826)
        
        # Energy-based threshold adjustment
        energy_percentile = np.percentile(rms_db, 70)  # Focus on higher energy regions
        energy_mask = rms_db > energy_percentile
        if np.any(energy_mask):
            energy_thr = np.median(score_z[energy_mask]) + 0.5 * np.std(score_z[energy_mask])
            base_thr = min(base_thr, energy_thr)
        
        return base_thr

    thr = adaptive_threshold(score_z, rms_db, times)

    # TEMPO-AWARE MIN DISTANCE BETWEEN PEAKS
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop_length)
    try:
        tempo = float(tempo)
    except Exception:
        tempo = float(np.asarray(tempo).reshape(-1)[0]) if np.size(tempo) else 0.0
    
    # Dynamic minimum distance based on tempo and audio characteristics
    if tempo <= 0:
        min_dist_frames = max(1, int(0.5 * sr / hop_length))
    else:
        seconds_per_beat = 60.0 / tempo
        min_dist_frames = max(1, int(0.3 * float(seconds_per_beat) * sr / hop_length))

    # MIN GAP IN FRAMES
    min_gap_frames = max(1, int(min_gap_seconds * sr / hop_length))
    min_dist_frames = max(min_dist_frames, min_gap_frames)

    # MULTI-LEVEL PEAK DETECTION
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
        
        # Level 2: Medium confidence peaks (lower threshold)
        peaks2, props2 = find_peaks(
            score_z,
            height=base_thr * 0.7,
            distance=max(1, min_dist_frames // 2),
            prominence=np.std(score_z) * 0.3
        )
        # Filter out peaks too close to level 1 peaks
        for p in peaks2:
            if all(abs(times[p] - times[existing_p]) >= min_gap_seconds 
                   for existing_p, _, _ in all_peaks):
                all_peaks.append((p, score_z[p], 0.7))
        
        # Level 3: Energy-based peaks in high-energy regions
        energy_threshold = np.percentile(rms_db, 60)
        high_energy_mask = rms_db > energy_threshold
        if np.any(high_energy_mask):
            high_energy_indices = np.where(high_energy_mask)[0]
            high_energy_score = score_z[high_energy_mask]
            peaks3, props3 = find_peaks(
                high_energy_score,
                height=base_thr * 0.5,
                distance=max(1, min_dist_frames // 3),
                prominence=np.std(high_energy_score) * 0.2
            )
            for p in peaks3:
                actual_p = high_energy_indices[p]
                if all(abs(times[actual_p] - times[existing_p]) >= min_gap_seconds 
                       for existing_p, _, _ in all_peaks):
                    all_peaks.append((actual_p, score_z[actual_p], 0.5))
        
        return all_peaks

    all_peaks = find_peaks_multi_level(score_z, times, rms_db, thr)
    
    # DUAL ANALYSIS: TEMPO PEAKS + SEGMENT DETECTION
    def dual_analysis_approach(peaks, times, duration, score_z, rms_db):
        if not peaks:
            return min_peaks, [], []
        
        # Sort by confidence (score * level)
        peaks_with_confidence = [(p, s, l, s * l) for p, s, l in peaks]
        peaks_with_confidence.sort(key=lambda x: x[3], reverse=True)
        
        print("="*60)
        print("STAGE 1: TEMPO-BASED PEAKS (RED)")
        print("="*60)
        
        # STAGE 1: TEMPO-BASED PEAKS (KEEP THESE)
        def get_tempo_peaks(score_z, rms_db, times, duration):
            # Calculate tempo
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop_length)
            try:
                tempo = float(tempo)
            except Exception:
                tempo = 120.0  # Default tempo
            
            print(f"Detected tempo: {tempo:.1f} BPM")
            
            # Calculate tempo-based phrase length (more sensitive)
            if tempo > 0:
                seconds_per_beat = 60.0 / tempo
                # Use 4-beat phrases for more tempo peaks (increased sensitivity)
                phrase_length = seconds_per_beat * 4
            else:
                phrase_length = 6.0  # Default 6 seconds (more sensitive)
            
            # Calculate tempo-based peak count
            tempo_based_count = max(5, int(duration / phrase_length))
            
            print(f"Tempo-based phrase length: {phrase_length:.2f} seconds")
            print(f"Tempo-based peak count: {tempo_based_count}")
            
            # Select tempo peaks from available peaks
            tempo_peaks = []
            min_gap_frames = max(1, int(phrase_length * sr / hop_length))
            
            for p, s, l, conf in peaks_with_confidence:
                if len(tempo_peaks) >= tempo_based_count:
                    break
                t = times[p]
                if all(abs(t - times[existing_p]) >= phrase_length for existing_p, _, _, _ in tempo_peaks):
                    tempo_peaks.append((p, s, l, conf))
            
            return tempo_peaks, tempo, phrase_length
        
        tempo_peaks, tempo, phrase_length = get_tempo_peaks(score_z, rms_db, times, duration)
        
        print("\n" + "="*60)
        print("STAGE 2: MOVING AVERAGE GAP SEGMENT DETECTION (GREEN)")
        print("="*60)
        
        # STAGE 2: MOVING AVERAGE GAP SEGMENT DETECTION
        def detect_segments_ma_gap(score_z, rms_db, times, duration, ma_short, ma_long):
            # Calculate window size for analysis (adaptive based on duration, less sensitive)
            window_size = max(8.0, duration / 15.0)  # 15 windows across duration (larger windows)
            window_frames = int(window_size * sr / hop_length)
            
            print(f"Using window size: {window_size:.2f} seconds")
            print("Using moving average values for gap calculation")
            
            # Find local maxima and minima in each window using moving averages
            segments = []
            segment_starts = [0]  # Always start with beginning
            
            for start_idx in range(0, len(times), window_frames):
                end_idx = min(start_idx + window_frames, len(times) - 1)
                
                if end_idx - start_idx < window_frames // 2:  # Skip too small windows
                    continue
                
                # Extract window data using moving averages
                window_ma_short = ma_short[start_idx:end_idx]
                window_ma_long = ma_long[start_idx:end_idx]
                window_times = times[start_idx:end_idx]
                
                if len(window_ma_short) < 10:  # Skip very small windows
                    continue
                
                # Find local maxima and minima in moving averages
                ma_short_max_idx = np.argmax(window_ma_short)
                ma_short_min_idx = np.argmin(window_ma_short)
                ma_long_max_idx = np.argmax(window_ma_long)
                ma_long_min_idx = np.argmin(window_ma_long)
                
                # Calculate max-min gaps using moving averages
                ma_short_gap = window_ma_short[ma_short_max_idx] - window_ma_short[ma_short_min_idx]
                ma_long_gap = window_ma_long[ma_long_max_idx] - window_ma_long[ma_long_min_idx]
                
                # Calculate MA divergence (difference between short and long MA)
                ma_divergence = np.mean(np.abs(window_ma_short - window_ma_long))
                
                # Calculate MA change rates
                ma_short_changes = np.abs(np.diff(window_ma_short))
                ma_long_changes = np.abs(np.diff(window_ma_long))
                ma_combined_changes = 0.7 * ma_short_changes + 0.3 * ma_long_changes
                
                # Combined gap score using moving average metrics (more selective)
                combined_gap = 0.4 * ma_short_gap + 0.3 * ma_long_gap + 0.3 * ma_divergence
                
                # Apply minimum threshold for segment detection (reduce sensitivity)
                min_gap_threshold = 3.0  # Minimum combined gap to consider
                min_divergence_threshold = 0.5  # Minimum divergence to consider
                
                if combined_gap < min_gap_threshold or ma_divergence < min_divergence_threshold:
                    continue  # Skip this window if not significant enough
                
                # Find the most significant transition point in this window
                # Look for the point with highest MA change
                if len(ma_combined_changes) > 0:
                    max_change_idx = np.argmax(ma_combined_changes)
                    segment_time = window_times[max_change_idx + 1]  # +1 because of diff
                    
                    # More selective: require larger gaps between segments
                    if not segment_starts or abs(segment_time - segment_starts[-1]) > window_size * 0.8:
                        segments.append({
                            'time': segment_time,
                            'ma_short_gap': ma_short_gap,
                            'ma_long_gap': ma_long_gap,
                            'ma_divergence': ma_divergence,
                            'combined_gap': combined_gap,
                            'window_start': window_times[0],
                            'window_end': window_times[-1]
                        })
                        segment_starts.append(segment_time)
            
            # Add end point
            segments.append({
                'time': times[-1],
                'ma_short_gap': 0,
                'ma_long_gap': 0,
                'ma_divergence': 0,
                'combined_gap': 0,
                'window_start': times[-1],
                'window_end': times[-1]
            })
            
            # Sort segments by time
            segments.sort(key=lambda x: x['time'])
            
            print(f"Detected {len(segments)} segments using moving average gap analysis")
            
            # Print segment information
            for i, seg in enumerate(segments):
                print(f"Segment {i+1}: {seg['time']:.2f}s (ma_short_gap: {seg['ma_short_gap']:.2f}, ma_long_gap: {seg['ma_long_gap']:.2f}, divergence: {seg['ma_divergence']:.2f})")
            
            return segments
        
        segments = detect_segments_ma_gap(score_z, rms_db, times, duration, ma_short, ma_long)
        
        # FIT SEGMENTS TO TEMPO POINTS (excluding t0 and tf)
        def fit_segments_to_tempo_points(segments, tempo_peaks, times):
            # Extract tempo peak times (excluding boundary points t0 and tf)
            tempo_times = [times[p] for p, s, l, conf in tempo_peaks]
            
            # Filter out boundary points (t0 and tf)
            duration = times[-1]
            internal_tempo_times = [t for t in tempo_times if t > 1.0 and t < duration - 1.0]
            
            print(f"Internal tempo peaks (excluding t0/tf): {len(internal_tempo_times)}")
            
            # Fit segments to internal tempo points
            fitted_segments = []
            for i, seg in enumerate(segments[:-1]):  # Exclude the last segment (tf)
                seg_time = seg['time']
                
                # Find the closest internal tempo peak to this segment
                if internal_tempo_times:
                    closest_tempo_idx = np.argmin([abs(seg_time - t) for t in internal_tempo_times])
                    closest_tempo_time = internal_tempo_times[closest_tempo_idx]
                    
                    # Only use tempo point if it's reasonably close (within 5 seconds)
                    if abs(seg_time - closest_tempo_time) <= 5.0:
                        fitted_time = closest_tempo_time
                        fitted_segments.append({
                            'time': fitted_time,
                            'original_time': seg_time,
                            'ma_short_gap': seg['ma_short_gap'],
                            'ma_long_gap': seg['ma_long_gap'],
                            'ma_divergence': seg['ma_divergence'],
                            'combined_gap': seg['combined_gap'],
                            'window_start': seg['window_start'],
                            'window_end': seg['window_end'],
                            'fitted_to_tempo': True
                        })
                    else:
                        # Keep original segment if no close tempo point
                        fitted_segments.append({
                            'time': seg_time,
                            'original_time': seg_time,
                            'ma_short_gap': seg['ma_short_gap'],
                            'ma_long_gap': seg['ma_long_gap'],
                            'ma_divergence': seg['ma_divergence'],
                            'combined_gap': seg['combined_gap'],
                            'window_start': seg['window_start'],
                            'window_end': seg['window_end'],
                            'fitted_to_tempo': False
                        })
                else:
                    # No internal tempo points, keep original
                    fitted_segments.append({
                        'time': seg_time,
                        'original_time': seg_time,
                        'ma_short_gap': seg['ma_short_gap'],
                        'ma_long_gap': seg['ma_long_gap'],
                        'ma_divergence': seg['ma_divergence'],
                        'combined_gap': seg['combined_gap'],
                        'window_start': seg['window_start'],
                        'window_end': seg['window_end'],
                        'fitted_to_tempo': False
                    })
            
            # Add the end point (tf) as the last segment
            fitted_segments.append(segments[-1])
            
            return fitted_segments
        
        fitted_segments = fit_segments_to_tempo_points(segments, tempo_peaks, times)
        
        print("\n" + "="*60)
        print("DUAL ANALYSIS SUMMARY")
        print("="*60)
        print(f"Tempo-based peaks (RED): {len(tempo_peaks)}")
        print(f"Original segments: {len(segments)}")
        print(f"Fitted segments (GREEN): {len(fitted_segments)}")
        
        # Count how many segments were fitted to tempo points
        fitted_count = sum(1 for seg in fitted_segments[:-1] if seg.get('fitted_to_tempo', False))
        print(f"Segments fitted to tempo points: {fitted_count}")
        print("="*60)
        
        # Return both tempo peaks and fitted segments
        return len(tempo_peaks), tempo_peaks, fitted_segments

    # Get both tempo peaks and segments
    tempo_count, tempo_peaks, segments = dual_analysis_approach(all_peaks, times, times[-1], score_z, rms_db)
    
    # Use tempo peaks as the main selection
    selected_peaks = tempo_peaks

    # ADD BOUNDARY POINTS IF REQUESTED
    if include_boundaries:
        # Add start point (t0)
        if not selected_peaks or times[selected_peaks[0][0]] > 1.0:
            selected_peaks.insert(0, (0, score_z[0], 1.0, score_z[0]))
        
        # Add end point (tf)
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

    return final_peak_times, final_peak_scores, times, rms_db[:L], ma_short, ma_long, score_z, segments

def analyze_gaps_and_smooth(peak_times, peak_scores, significance_threshold=1.5):
    """
    Analyze time gaps between consecutive peaks and apply smoothing.
    
    Args:
        peak_times: Array of peak times in seconds
        peak_scores: Array of peak scores
        significance_threshold: Threshold for considering gaps significant (in standard deviations)
    
    Returns:
        smoothed_peak_times, smoothed_peak_scores, gap_analysis
    """
    if len(peak_times) < 2:
        return peak_times, peak_scores, {}
    
    # Calculate gaps between consecutive peaks
    gaps = np.diff(peak_times)
    
    # Calculate statistics
    gap_mean = np.mean(gaps)
    gap_std = np.std(gaps)
    gap_rms = np.sqrt(np.mean(gaps**2))
    
    print(f"\nGAP ANALYSIS")
    print(f"Average gap: {gap_mean:.3f} seconds")
    print(f"Gap standard deviation: {gap_std:.3f} seconds")
    print(f"Gap RMS: {gap_rms:.3f} seconds")
    
    # Identify significant gaps (outliers)
    z_scores = np.abs((gaps - gap_mean) / (gap_std + 1e-8))
    significant_gaps = z_scores > significance_threshold
    
    print(f"Significant gaps found: {np.sum(significant_gaps)}")
    
    # Create new arrays for smoothed peaks
    smoothed_times = peak_times.copy()
    smoothed_scores = peak_scores.copy()
    
    # Fill significant gaps with interpolated points
    if np.any(significant_gaps):
        print("\nFILLING SIGNIFICANT GAPS")
        print("="*40)
        
        # Process gaps in reverse order to maintain indices
        for i in range(len(significant_gaps) - 1, -1, -1):
            if significant_gaps[i]:
                gap = gaps[i]
                start_time = peak_times[i]
                end_time = peak_times[i + 1]
                
                # Calculate how many points to add based on average gap
                points_to_add = max(1, int(round(gap / gap_mean)) - 1)
                
                print(f"Gap {i+1}: {gap:.3f}s -> adding {points_to_add} points")
                
                # Create interpolated times
                interpolated_times = np.linspace(start_time, end_time, points_to_add + 2)[1:-1]
                
                # Interpolate scores
                interpolated_scores = np.interp(interpolated_times, [start_time, end_time], 
                                             [peak_scores[i], peak_scores[i + 1]])
                
                # Insert interpolated points
                insert_idx = i + 1
                smoothed_times = np.insert(smoothed_times, insert_idx, interpolated_times)
                smoothed_scores = np.insert(smoothed_scores, insert_idx, interpolated_scores)
    
    # Apply per-segment smoothing
    smoothed_times, smoothed_scores = smooth_segment_gaps(smoothed_times, smoothed_scores)
    
    gap_analysis = {
        'original_gaps': gaps,
        'gap_mean': gap_mean,
        'gap_std': gap_std,
        'gap_rms': gap_rms,
        'significant_gaps': significant_gaps,
        'z_scores': z_scores,
        'points_added': len(smoothed_times) - len(peak_times)
    }
    
    return smoothed_times, smoothed_scores, gap_analysis

def smooth_segment_gaps(peak_times, peak_scores, segment_threshold=10.0):
    """
    Smooth time gaps per segment by setting equal gaps within each segment.
    
    Args:
        peak_times: Array of peak times
        peak_scores: Array of peak scores
        segment_threshold: Threshold for defining segment boundaries (seconds)
    
    Returns:
        smoothed_peak_times, smoothed_peak_scores
    """
    if len(peak_times) < 3:
        return peak_times, peak_scores
    
    # Identify segment boundaries (large gaps)
    gaps = np.diff(peak_times)
    segment_boundaries = np.where(gaps > segment_threshold)[0]
    
    # Add start and end indices
    segment_starts = np.concatenate([[0], segment_boundaries + 1])
    segment_ends = np.concatenate([segment_boundaries + 1, [len(peak_times)]])
    
    print(f"\nSEGMENT SMOOTHING")
    print(f"Found {len(segment_starts)} segments")
    print("="*40)
    
    smoothed_times = peak_times.copy()
    smoothed_scores = peak_scores.copy()
    
    for seg_idx, (start, end) in enumerate(zip(segment_starts, segment_ends)):
        if end - start < 2:  # Skip segments with less than 2 points
            continue
            
        segment_times = peak_times[start:end]
        segment_scores = peak_scores[start:end]
        
        # Calculate equal spacing for this segment
        segment_duration = segment_times[-1] - segment_times[0]
        equal_gap = segment_duration / (len(segment_times) - 1)
        
        # Create equally spaced times for this segment
        equal_times = np.linspace(segment_times[0], segment_times[-1], len(segment_times))
        
        # Interpolate scores for equal times
        equal_scores = np.interp(equal_times, segment_times, segment_scores)
        
        # Update the smoothed arrays
        smoothed_times[start:end] = equal_times
        smoothed_scores[start:end] = equal_scores
        
        print(f"Segment {seg_idx + 1}: {len(segment_times)} points, "
              f"duration {segment_duration:.3f}s, gap {equal_gap:.3f}s")
    
    return smoothed_times, smoothed_scores

def print_peak_timings(peak_times, peak_values):
    """Print peak timings in a formatted way"""
    print("\n" + "="*60)
    print("DETECTED MUSIC PEAKS")
    print("="*60)
    
    for i, (time, value) in enumerate(zip(peak_times, peak_values), 1):
        minutes = int(time // 60)
        seconds = time % 60
        print(f"Peak {i:2d}: {minutes:02d}:{seconds:06.3f} (score: {value:6.2f})")
    
    print("="*60)
    print(f"Total peaks detected: {len(peak_times)}")

def export_to_json(peak_times, peak_scores, segments, audio_file, output_file=None):
    """
    Export peak detection results to JSON format.
    
    Args:
        peak_times: Array of peak times in seconds
        peak_scores: Array of peak scores
        segments: List of segment dictionaries
        audio_file: Path to the audio file
        output_file: Output JSON file path (optional)
    
    Returns:
        Dictionary containing the results
    """
    # Convert numpy arrays to lists for JSON serialization
    smoothed_peaks = []
    for i, (time, score) in enumerate(zip(peak_times, peak_scores)):
        minutes = int(time // 60)
        seconds = time % 60
        smoothed_peaks.append({
            "index": i + 1,
            "time_seconds": float(time),
            "time_formatted": f"{minutes:02d}:{seconds:06.3f}",
            "score": float(score)
        })
    
    # Process segments
    segment_times = []
    for i, seg in enumerate(segments):
        if i < len(segments) - 1:  # Exclude the last segment (end point)
            minutes = int(seg['time'] // 60)
            seconds = seg['time'] % 60
            segment_times.append({
                "index": i + 1,
                "time_seconds": float(seg['time']),
                "time_formatted": f"{minutes:02d}:{seconds:06.3f}",
                "ma_short_gap": float(seg.get('ma_short_gap', 0)),
                "ma_long_gap": float(seg.get('ma_long_gap', 0)),
                "ma_divergence": float(seg.get('ma_divergence', 0)),
                "combined_gap": float(seg.get('combined_gap', 0)),
                "fitted_to_tempo": seg.get('fitted_to_tempo', False)
            })
    
    # Create the result dictionary
    result = {
        "audio_file": os.path.basename(audio_file),
        "analysis_timestamp": np.datetime64('now').astype(str),
        "total_peaks": len(smoothed_peaks),
        "total_segments": len(segment_times),
        "smoothed_peaks": smoothed_peaks,
        "segments": segment_times,
        "summary": {
            "peak_times": [float(t) for t in peak_times],
            "segment_times": [float(seg['time']) for seg in segments[:-1]]  # Exclude end point
        }
    }
    
    # Save to file if output_file is specified
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Results exported to: {output_file}")
    
    return result

def plot_analysis(times, rms_db, ma_short, ma_long, score_z, peak_times, peak_scores, audio_file, segments=None, smoothed_times=None, smoothed_scores=None):
    """Create visualization of the analysis with tempo peaks (red) and segments (green bars)"""
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(15, 12))

def plot_final_analysis(times, rms_db, ma_short, ma_long, score_z, smoothed_times, smoothed_scores, audio_file, segments=None):
    """Create final visualization showing only smoothed peaks (red) and segments (green bars)"""
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(15, 12))

    # RMS ENERGY
    ax1.plot(times, rms_db, 'b-', alpha=0.7, label='RMS Energy (dB)')
    
    # Plot smoothed peaks in RED
    if len(smoothed_times) > 0:
        ax1.scatter(smoothed_times, np.interp(smoothed_times, times, rms_db), 
                   color='red', s=100, zorder=5, label='Final Smooted Peaks (RED)', marker='o')
    
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
    ax1.set_title(f'Final Analysis: Smoothed Peaks (RED) + Segments (GREEN) - {os.path.basename(audio_file)}')
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

    # SCORE WITH FINAL VISUALIZATION
    ax3.plot(times, score_z, 'c-', alpha=0.9, label='MA Diff (z)')
    
    # Plot smoothed peaks in RED
    if len(smoothed_times) > 0 and len(smoothed_scores) > 0:
        ax3.scatter(smoothed_times, smoothed_scores, color='red', s=100, zorder=5, 
                   label='Final Smoothed Peaks (RED)', marker='o')
    
    # Add segment markers to score plot
    if segments is not None:
        for i, seg in enumerate(segments):
            if i < len(segments) - 1:
                ax3.axvline(x=seg['time'], color='green', alpha=0.7, linewidth=2,
                           label='Segments (GREEN)' if i == 0 else "")
    
    ax3.set_xlabel('Time (seconds)')
    ax3.set_ylabel('Score')
    ax3.set_title('Final Smoothed Peaks (RED) + Segments (GREEN)')
    ax3.legend()
    ax3.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig('music_peak_final_analysis.png', dpi=300, bbox_inches='tight')
    print(f"\nFinal analysis plot saved as 'music_peak_final_analysis.png'")

    return fig

def main():
    """Main function to run the peak detection"""
    
    # Plot smoothed peaks in BLUE
    if smoothed_times is not None and len(smoothed_times) > 0:
        ax1.scatter(smoothed_times, np.interp(smoothed_times, times, rms_db), 
                   color='blue', s=60, zorder=6, label='Smooted Peaks (BLUE)', marker='x', alpha=0.8)
    
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
    ax1.set_title(f'Gap Analysis: Original Peaks (RED) + Smoothed Peaks (BLUE) + Segments (GREEN) - {os.path.basename(audio_file)}')
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

    # SCORE WITH DUAL VISUALIZATION
    ax3.plot(times, score_z, 'c-', alpha=0.9, label='MA Diff (z)')
    
    # Plot tempo peaks in RED
    if len(regular_peaks) > 0:
        regular_scores = peak_scores[~boundary_mask]
        ax3.scatter(regular_peaks, regular_scores, color='red', s=100, zorder=5, 
                   label='Tempo Peaks (RED)', marker='o')
    if len(boundary_peaks) > 0:
        boundary_scores = peak_scores[boundary_mask]
        ax3.scatter(boundary_peaks, boundary_scores, color='orange', s=120, zorder=5, 
                   label='Boundary Points', marker='s')
    
    # Plot smoothed peaks in BLUE
    if smoothed_times is not None and smoothed_scores is not None and len(smoothed_times) > 0:
        ax3.scatter(smoothed_times, smoothed_scores, color='blue', s=60, zorder=6, 
                   label='Smoothed Peaks (BLUE)', marker='x', alpha=0.8)
    
    # Add segment markers to score plot
    if segments is not None:
        for i, seg in enumerate(segments):
            if i < len(segments) - 1:
                ax3.axvline(x=seg['time'], color='green', alpha=0.7, linewidth=2,
                           label='Segments (GREEN)' if i == 0 else "")
    
    ax3.set_xlabel('Time (seconds)')
    ax3.set_ylabel('Score')
    ax3.set_title('Original Peaks (RED) + Smoothed Peaks (BLUE) + Segments (GREEN)')
    ax3.legend()
    ax3.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig('music_peak_analysis.png', dpi=300, bbox_inches='tight')
    print(f"\nAnalysis plot saved as 'music_peak_analysis.png'")

    return fig

def main():
    """Main function to run the peak detection"""
    audio_file = r"audio/Epic Festival-Style Cinematic EDM Instrumental (Tomorrowland Vibes).wav"
    
    try:
        print("MUSIC PEAK DETECTION SCRIPT")
        print("="*50)
        
        # DETECT PEAKS
        peak_times, peak_scores, times, rms_db, ma_short, ma_long, score_z, segments = detect_music_peaks(
            audio_file, 
            min_peaks=2, 
            max_peaks=None,  # Dynamic evaluation
            include_boundaries=True  # Include t0 and tf
        )
        
        # PRINT ORIGINAL RESULTS
        print_peak_timings(peak_times, peak_scores)
        
        # ANALYZE GAPS AND APPLY SMOOTHING
        smoothed_times, smoothed_scores, gap_analysis = analyze_gaps_and_smooth(
            peak_times, peak_scores, significance_threshold=1.5
        )
        
        # PRINT SMOOTHED RESULTS
        print("\n" + "="*60)
        print("SMOOTHED MUSIC PEAKS")
        print("="*60)
        print_peak_timings(smoothed_times, smoothed_scores)
        
        # Print gap analysis summary
        if gap_analysis:
            print(f"\nGAP ANALYSIS SUMMARY")
            print(f"Original peaks: {len(peak_times)}")
            print(f"Smoothed peaks: {len(smoothed_times)}")
            print(f"Points added: {gap_analysis['points_added']}")
            print(f"Average gap: {gap_analysis['gap_mean']:.3f}s")
            print(f"Gap RMS: {gap_analysis['gap_rms']:.3f}s")
        
        # CREATE VISUALIZATION
        plot_analysis(times, rms_db, ma_short, ma_long, score_z, peak_times, peak_scores, audio_file, segments, smoothed_times, smoothed_scores)
        
        # CREATE FINAL VISUALIZATION (SMoothed peaks only)
        plot_final_analysis(times, rms_db, ma_short, ma_long, score_z, smoothed_times, smoothed_scores, audio_file, segments)
        
        print(f"\nAnalysis complete! Found {len(peak_times)} peaks.")
        
    except Exception as e:
        print(f"Error: {e}")
        return None
    
    return peak_times, peak_scores

if __name__ == "__main__":
    main()
