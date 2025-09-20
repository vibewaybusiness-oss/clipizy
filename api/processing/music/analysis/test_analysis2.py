from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import numpy as np, librosa, ruptures as rpt
from scipy.signal import find_peaks, savgol_filter
import matplotlib.pyplot as plt
import os
from sklearn.cluster import KMeans

app = FastAPI()

# ----------------- utilities -----------------

def beat_sync_features(y, sr, hop=512):
    # frame-level features
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))**2
    mel = librosa.feature.melspectrogram(S=S, sr=sr)
    logmel = librosa.power_to_db(mel)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    mfcc = librosa.feature.mfcc(S=librosa.power_to_db(mel), sr=sr, n_mfcc=13)

    # beat-synchronize
    tempo, beat_times = librosa.beat.beat_track(y=y, sr=sr, units='time')
    if len(beat_times) < 3:
        # fallback to fixed windows
        idx = np.arange(logmel.shape[1])
        bins = np.array_split(idx, max(1, logmel.shape[1]//20))
        pooled = lambda X: np.vstack([X[:,b].mean(axis=1) for b in bins]).T
        F = np.vstack([pooled(chroma), pooled(mfcc)]).T
        bt = librosa.frames_to_time([b[len(b)//2] for b in bins], sr=sr, hop_length=512)
        return F, bt
    beat_frames = librosa.time_to_frames(beat_times, sr=sr, hop_length=hop)
    def sync(X): return librosa.util.sync(X, beat_frames, aggregate=np.mean)
    F = np.vstack([sync(chroma), sync(mfcc)]).T
    return F, beat_times

def novelty_curve(y, sr, hop=512, win_s=8.0, k_mad=2.5):
    # HPSS
    H, P = librosa.effects.hpss(y)
    
    # Compute STFT for both harmonic and percussive components
    H_stft = librosa.stft(H, n_fft=2048, hop_length=hop)
    P_stft = librosa.stft(P, n_fft=2048, hop_length=hop)
    
    # spectral flux (percussive)
    S = np.maximum(0, np.diff(np.abs(P_stft), axis=1))
    flux = S.mean(axis=0)
    flux = np.r_[0, flux]
    flux /= flux.max() + 1e-9

    # harmonic chroma distance
    chroma = librosa.feature.chroma_cqt(C=H_stft, sr=sr)
    d = 1 - np.sum(chroma[:,1:]*chroma[:,:-1], axis=0)  # cosine-ish
    d = np.r_[0, d]
    d = (d - d.min()) / (d.max() - d.min() + 1e-9)

    # combine + smooth
    nov = 0.6*flux + 0.4*d
    # Ensure real values for savgol filter
    nov = np.real(nov)
    nov = savgol_filter(nov, 11, 3, mode="interp")
    nov = np.clip((nov - nov.min())/(nov.max()-nov.min() + 1e-9), 0, 1)

    # adaptive threshold & peaks
    t = librosa.frames_to_time(np.arange(len(nov)), sr=sr, hop_length=hop)
    w = max(1, int(win_s / np.median(np.diff(t))))
    frames = librosa.util.frame(nov, frame_length=w, hop_length=1)
    med = np.median(frames, axis=0)
    med = np.pad(med, (w-1, 0), mode="edge")
    mad_frames = librosa.util.frame(np.abs(nov-med), frame_length=w, hop_length=1)
    mad = np.median(mad_frames, axis=0)
    mad = np.pad(mad, (w-1, 0), mode="edge")
    thr = med + k_mad*mad

    nov_clipped = np.maximum(0, nov - thr)   # suppress busy sections
    nov_clipped /= nov_clipped.max() + 1e-9

    return t, nov, thr, nov_clipped

def boundaries_from_novelty(t, nov_clipped, min_gap_s=8.0):
    dist = max(1, int(min_gap_s / np.median(np.diff(t))))
    idx, _ = find_peaks(nov_clipped, distance=dist, prominence=np.quantile(nov_clipped, 0.75))
    return t[idx]

def laplacian_segments(F, times, max_k=12):
    # Recurrence matrix (time × time)
    R = librosa.segment.recurrence_matrix(F.T, mode='affinity', metric='cosine', sparse=False)
    # Balance with path-enhancement (optional but helpful)
    R = librosa.segment.path_enhance(R, 5)

    # Normalized Laplacian
    deg = np.diag(R.sum(axis=1))
    L = np.eye(R.shape[0]) - np.linalg.pinv(deg) @ R

    # Eigenvalues/eigenvectors
    w, V = np.linalg.eigh(L)
    # choose k via eigengap
    gaps = np.diff(w[:max_k+1])
    k = 2 + np.argmax(gaps[1:max_k-1])  # avoid trivial 1-group
    X = V[:, :k] / (np.linalg.norm(V[:, :k], axis=1, keepdims=True) + 1e-9)

    # cluster rows → labels over time
    lab = KMeans(n_clusters=k, n_init=10, random_state=0).fit_predict(X)
    # boundaries where label changes
    idx = np.flatnonzero(np.r_[True, lab[1:] != lab[:-1]])
    return times[idx]

def fuse_boundaries(nov_b, lap_b, tol=1.5):
    all_b = np.sort(np.unique(np.concatenate([nov_b, lap_b])))
    conf = []
    for t in all_b:
        c = 0.5  # base
        if np.any(np.abs(nov_b - t) <= tol): c += 0.3
        if np.any(np.abs(lap_b - t) <= tol): c += 0.3
        conf.append(min(c, 1.0))
    return all_b, np.array(conf)

def clean_and_snap(bnds, rms_t, rms, beat_times, min_len=8.0, lookahead=2.5):
    # snap to the next local min / next beat, whichever is closer
    snapped = []
    inv = 1.0 - rms  # dips become peaks
    for t in bnds:
        i0 = np.searchsorted(rms_t, t)
        i1 = np.searchsorted(rms_t, t + lookahead)
        window = inv[i0:max(i0+2, i1)]
        t_min = rms_t[i0 + np.argmax(window)] if len(window) else t
        # next beat within 250 ms
        nb = beat_times[beat_times >= t_min]
        if len(nb) and nb[0] - t_min <= 0.25:
            t_min = nb[0]
        snapped.append(t_min)

    snapped = np.array(sorted(snapped))
    # enforce minimum segment length
    keep = [snapped[0]]
    for t in snapped[1:]:
        if t - keep[-1] >= min_len:
            keep.append(t)
    return np.array(keep)

def improved_segments(y, sr):
    # rms/beat timing
    hop = 512
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    rms_t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
    tempo, beat_times = librosa.beat.beat_track(y=y, sr=sr, units='time')

    # novelty branch
    t, nov, thr, nov_c = novelty_curve(y, sr, hop)
    nov_b = boundaries_from_novelty(t, nov_c, min_gap_s=8.0)

    # laplacian branch (beat-synced features)
    F, times = beat_sync_features(y, sr, hop)   # from previous message
    lap_b = laplacian_segments(F, times, max_k=12)

    # fuse + snap
    cand, conf = fuse_boundaries(nov_b, lap_b, tol=1.5)
    final_b = clean_and_snap(cand, rms_t, rms/ (rms.max()+1e-9), beat_times,
                             min_len=8.0, lookahead=2.5)

    # optional: drop very low-confidence fused points not used after snapping
    keep = []
    for t in final_b:
        # map back to nearest candidate to inherit confidence
        j = np.argmin(np.abs(cand - t))
        if conf[j] >= 0.6: keep.append(t)
    return np.array(keep), {"cand": cand, "conf": conf, "novelty_times": t, "novelty": nov, "thr": thr, "novelty_used": nov_c}

def create_visualization(y, sr, rms_t, rms, beat_times, segments, debug_info, audio_file="audio.wav"):
    """Create visualization similar to music_analysis_audio.png"""
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(15, 12))
    
    # Convert RMS to dB for better visualization
    rms_db = 20 * np.log10(rms + 1e-9)
    
    # PLOT 1: RMS ENERGY WITH SEGMENTS
    ax1.plot(rms_t, rms_db, 'b-', alpha=0.7, label='RMS Energy (dB)')
    
    # Plot segment boundaries as GREEN VERTICAL LINES
    if len(segments) > 0:
        for i, seg_time in enumerate(segments):
            ax1.axvline(x=seg_time, color='green', alpha=0.7, linewidth=2, 
                       label='Segment Boundaries (GREEN)' if i == 0 else "")
            # Add segment number
            ax1.text(seg_time, ax1.get_ylim()[1] * 0.9, f'S{i+1}', 
                    ha='center', va='bottom', fontsize=8, color='green', weight='bold')
    
    ax1.set_ylabel('RMS Energy (dB)')
    ax1.set_title(f'Improved Music Analysis: Segments (GREEN) - {os.path.basename(audio_file)}')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # PLOT 2: BEAT TRACKING
    if len(beat_times) > 0:
        # Create a simple beat visualization
        beat_energy = np.interp(beat_times, rms_t, rms_db)
        ax2.scatter(beat_times, beat_energy, color='purple', s=50, alpha=0.8, 
                   label='Beat Times', marker='|', linewidth=3)
        ax2.plot(rms_t, rms_db, 'b-', alpha=0.3, label='RMS Energy (background)')
        
        # Add segment markers to beat plot
        if len(segments) > 0:
            for i, seg_time in enumerate(segments):
                ax2.axvline(x=seg_time, color='green', alpha=0.5, linewidth=1, linestyle='--')
    else:
        ax2.plot(rms_t, rms_db, 'b-', alpha=0.7, label='RMS Energy')
    
    ax2.set_ylabel('Energy (dB)')
    ax2.set_title('Beat Tracking with Segment Markers')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # PLOT 3: NOVELTY FUNCTION WITH BOUNDARIES
    if 'novelty_times' in debug_info and 'novelty' in debug_info:
        novelty_times = debug_info['novelty_times']
        novelty = debug_info['novelty']
        threshold = debug_info.get('thr', None)
        novelty_used = debug_info.get('novelty_used', None)
        
        # Check if we have valid arrays
        if (hasattr(novelty_times, '__len__') and hasattr(novelty, '__len__') and 
            len(novelty_times) > 0 and len(novelty) > 0):
            
            # Ensure arrays have the same length
            min_len = min(len(novelty_times), len(novelty))
            if min_len > 0:
                novelty_times = novelty_times[:min_len]
                novelty = novelty[:min_len]
                
                ax3.plot(novelty_times, novelty, 'c-', alpha=0.7, label='Novelty Function')
                
                if (threshold is not None and hasattr(threshold, '__len__') and 
                    len(threshold) >= min_len):
                    threshold = threshold[:min_len]
                    ax3.plot(novelty_times, threshold, 'r--', alpha=0.7, label='Threshold')
                
                if (novelty_used is not None and hasattr(novelty_used, '__len__') and 
                    len(novelty_used) >= min_len):
                    novelty_used = novelty_used[:min_len]
                    ax3.plot(novelty_times, novelty_used, 'orange', alpha=0.9, linewidth=2, 
                            label='Novelty Used for Detection')
        
        # Plot segment boundaries
        if len(segments) > 0:
            for i, seg_time in enumerate(segments):
                ax3.axvline(x=seg_time, color='green', alpha=0.7, linewidth=2,
                           label='Segment Boundaries (GREEN)' if i == 0 else "")
    else:
        ax3.plot(rms_t, rms_db, 'b-', alpha=0.7, label='RMS Energy')
    
    ax3.set_xlabel('Time (seconds)')
    ax3.set_ylabel('Novelty Score')
    ax3.set_title('Novelty-Based Boundary Detection with Segments')
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    plt.tight_layout()
    return fig

def analyze_bytes(data: bytes, sr=22050, hop=512, create_plot=False, audio_file="audio.wav"):
    import soundfile as sf, io
    y, file_sr = sf.read(io.BytesIO(data), always_2d=False, dtype='float32')
    
    # Convert to mono if stereo
    if y.ndim > 1: 
        y = np.mean(y, axis=1)
    
    # Resample if needed
    if file_sr != sr: 
        y = librosa.resample(y, orig_sr=file_sr, target_sr=sr)
    
    # Ensure audio is floating-point and normalized
    y = y.astype(np.float32)
    
    # Normalize audio
    y = librosa.util.normalize(y)

    # Get improved segments
    segments, debug_info = improved_segments(y, sr)
    
    # Get basic info
    tempo, beat_times = librosa.beat.beat_track(y=y, sr=sr, units='time')
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    rms_t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)

    result = {
        "duration": len(y)/sr,
        "tempo": float(tempo),
        "segments_sec": segments.tolist(),
        "beat_times_sec": beat_times.tolist(),
        "debug": debug_info
    }

    # Create visualization if requested
    if create_plot:
        fig = create_visualization(y, sr, rms_t, rms, beat_times, segments, debug_info, audio_file)
        result["plot"] = fig

    return result

def analyze_and_plot(data: bytes, audio_file="audio.wav", output_dir="."):
    """Analyze audio and create visualization plot"""
    result = analyze_bytes(data, create_plot=True, audio_file=audio_file)
    
    if "plot" in result:
        fig = result["plot"]
        output_image = os.path.join(output_dir, f"improved_music_analysis_{os.path.splitext(os.path.basename(audio_file))[0]}.png")
        fig.savefig(output_image, dpi=300, bbox_inches='tight')
        plt.close(fig)
        result["plot_saved"] = output_image
        del result["plot"]  # Remove the figure object from the result
    
    return result

# ----------------- FastAPI -----------------

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    data = await file.read()
    result = analyze_bytes(data)
    return JSONResponse(result)

@app.post("/analyze_with_plot")
async def analyze_with_plot(file: UploadFile = File(...)):
    data = await file.read()
    result = analyze_and_plot(data, audio_file=file.filename)
    return JSONResponse(result)