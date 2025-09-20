from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import numpy as np, librosa, ruptures as rpt
from scipy.signal import find_peaks
import matplotlib.pyplot as plt
import os

app = FastAPI()

# ----------------- utilities -----------------

def rms_envelope(y, hop):
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop, center=True)[0]
    return rms / (rms.max() + 1e-9)

def beats(sr, y):
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
    return tempo, np.asarray(beats)

def beat_sync_features(y, sr, hop=512):
    # frame-level features
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))**2
    mel = librosa.feature.melspectrogram(S=S, sr=sr)
    logmel = librosa.power_to_db(mel)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    mfcc = librosa.feature.mfcc(S=librosa.power_to_db(mel), sr=sr, n_mfcc=13)

    # beat-synchronize
    _, beat_times = beats(sr, y)
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

def foote_novelty(F, sigma=8):
    # self-similarity (cosine)
    from sklearn.metrics.pairwise import cosine_similarity
    R = cosine_similarity(F)
    # Gaussian checkerboard kernel
    L = int(np.ceil(3*sigma))
    x = np.arange(-L, L+1)
    g = np.exp(-0.5*(x/sigma)**2)
    K = (np.outer(g, g) * np.sign(np.subtract.outer(x, x)))
    # novelty: 2D convolution along main diagonal
    N = []
    for t in range(L, R.shape[0]-L):
        A = R[t-L:t+L+1, t-L:t+L+1]
        N.append(np.sum(A*K))
    N = np.maximum(0, np.array(N))
    # pad to original length
    N = np.pad(N, (L, L+1), mode='edge')
    N = N / (N.max() + 1e-9)
    return N

def detect_boundaries(F, times, min_gap_s=8.0, novelty_prom_q=0.6):
    N = foote_novelty(F, sigma=6)
    # peak picking on novelty
    dist = max(1, int(min_gap_s / np.median(np.diff(times))))
    peaks, props = find_peaks(N, distance=dist, prominence=np.quantile(N, novelty_prom_q))
    bnds = times[peaks]

    # optional: ruptures changepoint for cross-check
    model = rpt.Pelt(model="rbf").fit(F)
    # penalty tuned by length
    pen = 5*np.log(len(F))
    cps = np.array(model.predict(pen=pen)[:-1])  # last is end
    cp_times = times[np.clip(cps, 0, len(times)-1)]

    # union with a tolerance (keep if close to either)
    all_cands = np.sort(np.unique(np.concatenate([bnds, cp_times])))
    # deduplicate within 2s
    merged = []
    for t in all_cands:
        if not merged or t - merged[-1] > 2.0:
            merged.append(t)
    return np.array(merged), N

def snap_boundaries(bnds, rms_t, rms, beat_times, lookahead=2.0):
    snapped = []
    for t in bnds:
        # search in [t, t+lookahead] for a local RMS minimum (right after a dip)
        i0 = np.searchsorted(rms_t, t)
        i1 = np.searchsorted(rms_t, t+lookahead)
        if i1 <= i0: i1 = min(len(rms)-1, i0+1)
        seg = rms[i0:i1]
        if len(seg) >= 3:
            k = np.argmin(seg)
            t_candidate = rms_t[i0+k]
        else:
            t_candidate = t
        # also snap to nearest future beat within 0.25s
        future_beats = beat_times[beat_times >= t_candidate]
        if len(future_beats) and future_beats[0] - t_candidate <= 0.25:
            t_candidate = future_beats[0]
        snapped.append(t_candidate)
    # enforce minimum spacing after snapping (8s)
    snapped = np.array(sorted(snapped))
    keep = [snapped[0]]
    for t in snapped[1:]:
        if t - keep[-1] >= 8.0:
            keep.append(t)
    return np.array(keep)

def detect_energy_peaks(rms_t, rms, min_gap_s=2.5):
    dist = max(1, int(min_gap_s / np.median(np.diff(rms_t))))
    peaks, props = find_peaks(rms, distance=dist, prominence=np.quantile(rms, 0.85))
    return rms_t[peaks]

def create_visualization(y, sr, rms_t, rms, beat_times, peaks, segments, novelty, audio_file="audio.wav"):
    """Create visualization similar to music_analysis_audio.png"""
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(15, 12))
    
    # Convert RMS to dB for better visualization
    rms_db = 20 * np.log10(rms + 1e-9)
    
    # PLOT 1: RMS ENERGY WITH PEAKS AND SEGMENTS
    ax1.plot(rms_t, rms_db, 'b-', alpha=0.7, label='RMS Energy (dB)')
    
    # Plot energy peaks in RED
    if len(peaks) > 0:
        peak_values = np.interp(peaks, rms_t, rms_db)
        ax1.scatter(peaks, peak_values, color='red', s=100, zorder=5, 
                   label='Energy Peaks (RED)', marker='o')
    
    # Plot segment boundaries as GREEN VERTICAL LINES
    if len(segments) > 0:
        for i, seg_time in enumerate(segments):
            ax1.axvline(x=seg_time, color='green', alpha=0.7, linewidth=2, 
                       label='Segment Boundaries (GREEN)' if i == 0 else "")
            # Add segment number
            ax1.text(seg_time, ax1.get_ylim()[1] * 0.9, f'S{i+1}', 
                    ha='center', va='bottom', fontsize=8, color='green', weight='bold')
    
    ax1.set_ylabel('RMS Energy (dB)')
    ax1.set_title(f'Music Analysis: Energy Peaks (RED) + Segments (GREEN) - {os.path.basename(audio_file)}')
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
    if len(novelty) > 0:
        # Create time array for novelty
        novelty_times = np.linspace(0, rms_t[-1], len(novelty))
        ax3.plot(novelty_times, novelty, 'c-', alpha=0.9, label='Novelty Function')
        
        # Plot segment boundaries
        if len(segments) > 0:
            for i, seg_time in enumerate(segments):
                ax3.axvline(x=seg_time, color='green', alpha=0.7, linewidth=2,
                           label='Segment Boundaries (GREEN)' if i == 0 else "")
    else:
        ax3.plot(rms_t, rms_db, 'b-', alpha=0.7, label='RMS Energy')
    
    ax3.set_xlabel('Time (seconds)')
    ax3.set_ylabel('Novelty Score')
    ax3.set_title('Boundary Detection (Novelty Function) with Segments')
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    plt.tight_layout()
    return fig

# ----------------- main entry -----------------

def analyze_bytes(data: bytes, sr=22050, hop=512, create_plot=False, audio_file="audio.wav"):
    import soundfile as sf, io
    y, file_sr = sf.read(io.BytesIO(data), always_2d=False)
    if y.ndim > 1: y = np.mean(y, axis=1)
    if file_sr != sr: y = librosa.resample(y, orig_sr=file_sr, target_sr=sr)

    rms = rms_envelope(y, hop)
    rms_t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)

    F, times = beat_sync_features(y, sr, hop)
    bnds0, novelty = detect_boundaries(F, times)
    tempo, beat_times = beats(sr, y)
    bnds = snap_boundaries(bnds0, rms_t, 1.0-rms, beat_times)  # snap using dips (1-rms)

    peaks = detect_energy_peaks(rms_t, rms)

    result = {
        "duration": len(y)/sr,
        "tempo": float(tempo),
        "peaks_sec": peaks.tolist(),
        "segments_sec": bnds.tolist(),
        "debug": {
            "boundary_candidates_sec": bnds0.tolist(),
            "beat_times_sec": beat_times.tolist()
        }
    }

    # Create visualization if requested
    if create_plot:
        fig = create_visualization(y, sr, rms_t, rms, beat_times, peaks, bnds, novelty, audio_file)
        result["plot"] = fig

    return result

def analyze_and_plot(data: bytes, audio_file="audio.wav", output_dir="."):
    """Analyze audio and create visualization plot"""
    result = analyze_bytes(data, create_plot=True, audio_file=audio_file)
    
    if "plot" in result:
        fig = result["plot"]
        output_image = os.path.join(output_dir, f"music_analysis_{os.path.splitext(os.path.basename(audio_file))[0]}.png")
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