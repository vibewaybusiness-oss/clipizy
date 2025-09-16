import os
import math
import shutil
import subprocess
import time
import numpy as np
import cv2
import librosa


class TrapNationParticles:
    """
    Trap Nation inspired particle system for atmospheric effects:
    - Floating particles with gentle drift toward center
    - Pulsing brightness effects
    - Screen wrapping for continuous movement
    - Configurable particle count and properties
    """

    def __init__(
        self,
        width=1920,
        height=1080,
        fps=30,
        x_position=0.5,
        y_position=0.5,
        particle_count=50,
        duration=10.0,
        bass_threshold=0.3,
        outer_movement_strength=2.0,
        inner_movement_strength=1.0,
        particle_colors=None,
        speed_x=0,
        speed_y=0,
        speed_z=0,
        bounce=False,
    ):
        self.W = width
        self.H = height
        self.fps = int(fps)
        
        # Position
        self.x_pos = float(x_position)
        self.y_pos = float(y_position)
        self.cx = int(self.W * self.x_pos)
        self.cy = int(self.H * self.y_pos)
        
        # Particle settings
        self.particle_count = int(particle_count)
        self.duration = float(duration)
        
        # Music-dependent settings
        self.bass_threshold = float(bass_threshold)
        self.outer_movement_strength = float(outer_movement_strength)
        self.inner_movement_strength = float(inner_movement_strength)
        
        # Particle appearance and behavior settings
        self.particle_colors = particle_colors if particle_colors else [(255, 255, 255)]  # Default white
        self.speed_x = float(speed_x)
        self.speed_y = float(speed_y)
        self.speed_z = float(speed_z)
        self.bounce = bool(bounce)
        
        # Enhanced mode settings
        self.enhanced_mode = {
            "active": True,
            "threshold": 0.3,  # 30% of max bass level
            "factor": 2.0      # Multiplication factor when threshold is reached
        }
        
        # Audio data
        self.audio_data = None
        self.sample_rate = None
        self.bass_frequencies = None
        
        # Pre-allocate black frame
        self.black_frame = np.zeros((self.H, self.W, 3), dtype=np.uint8)
        
        # Particle system
        self.particles = self._init_particles()

    def _init_particles(self):
        """Initialize particle system for atmospheric effects"""
        particles = []
        for _ in range(self.particle_count):
            angle = np.random.uniform(0, 2 * np.pi)
            distance = np.random.uniform(200, 400)
            x = self.cx + distance * np.cos(angle)
            y = self.cy + distance * np.sin(angle)
            
            # Speed initialization (0 = random)
            vx = np.random.uniform(-0.5, 0.5) if self.speed_x == 0 else self.speed_x
            vy = np.random.uniform(-0.5, 0.5) if self.speed_y == 0 else self.speed_y
            vz = np.random.uniform(-0.1, 0.1) if self.speed_z == 0 else self.speed_z
            
            # Color selection
            color = np.random.choice(self.particle_colors) if len(self.particle_colors) > 1 else self.particle_colors[0]
            
            particles.append({
                'x': x, 'y': y,
                'vx': vx,
                'vy': vy,
                'vz': vz,  # Z speed for size changes
                'size': np.random.uniform(1, 3),
                'base_size': np.random.uniform(1, 3),  # Store original size
                'brightness': np.random.uniform(0.3, 1.0),
                'pulse_phase': np.random.uniform(0, 2 * np.pi),
                'color': color
            })
        return particles

    def load_audio(self, audio_path):
        """Load audio file and extract bass frequencies"""
        print(f"🎵 Loading audio: {audio_path}")
        self.audio_data, self.sample_rate = librosa.load(audio_path, sr=None, mono=True)
        print(f"📊 Audio loaded: {len(self.audio_data)} samples at {self.sample_rate}Hz")
        
        # Extract bass frequencies (0-250 Hz)
        self.bass_frequencies = self._extract_bass_frequencies()
        print(f"🎸 Bass frequencies extracted: {len(self.bass_frequencies)} frames")

    def _extract_bass_frequencies(self):
        """Extract bass frequency energy for each frame"""
        if self.audio_data is None:
            return np.zeros(int(self.duration * self.fps))
        
        # Calculate samples per frame
        samples_per_frame = max(1, int(self.sample_rate / self.fps))
        total_frames = int(self.duration * self.fps)
        
        # Create window for FFT
        window = np.hanning(samples_per_frame).astype(np.float32)
        bass_frequencies = np.zeros(total_frames, dtype=np.float32)
        
        # Bass frequency range (0-250 Hz)
        bass_low = 0
        bass_high = 250
        
        for i in range(total_frames):
            start_idx = i * samples_per_frame
            end_idx = min(start_idx + samples_per_frame, len(self.audio_data))
            
            if start_idx >= len(self.audio_data):
                bass_frequencies[i] = 0.0
                continue
            
            segment = self.audio_data[start_idx:end_idx].astype(np.float32)
            if len(segment) < samples_per_frame:
                segment = np.pad(segment, (0, samples_per_frame - len(segment)), mode="constant")
            
            # Apply window and FFT
            segment_windowed = segment * window
            spec = np.fft.rfft(segment_windowed)
            mag = np.abs(spec)
            
            # Convert frequency bins to Hz
            freqs = np.fft.rfftfreq(samples_per_frame, 1/self.sample_rate)
            
            # Extract bass frequencies
            bass_mask = (freqs >= bass_low) & (freqs <= bass_high)
            if np.any(bass_mask):
                bass_energy = np.mean(mag[bass_mask])
            else:
                bass_energy = 0.0
            
            bass_frequencies[i] = bass_energy
        
        # Normalize bass frequencies
        max_bass = np.max(bass_frequencies)
        if max_bass > 0:
            bass_frequencies = bass_frequencies / max_bass
        
        return bass_frequencies

    def _get_bass_level_at_frame(self, frame_idx):
        """Get bass level at specific frame"""
        if self.bass_frequencies is None or frame_idx >= len(self.bass_frequencies):
            return 0.0
        return float(self.bass_frequencies[frame_idx])

    def _apply_enhanced_mode(self, bass_level):
        """Apply enhanced mode processing to bass level"""
        if not self.enhanced_mode or not self.enhanced_mode.get("active", False):
            return bass_level
        
        # Get enhanced mode parameters
        threshold = self.enhanced_mode.get("threshold", 0.3)
        factor = self.enhanced_mode.get("factor", 2.0)
        
        # Apply threshold and enhancement
        if bass_level >= threshold:
            # Apply enhancement factor to values above threshold
            enhanced_bass = min(1.0, bass_level * factor)
        else:
            # Keep values below threshold as they are
            enhanced_bass = bass_level
        
        return enhanced_bass

    def _update_particles(self, t, frame_idx):
        """Update particle system with music-dependent movement"""
        # Get current bass level
        raw_bass_level = self._get_bass_level_at_frame(frame_idx)
        
        # Apply enhanced mode processing
        bass_level = self._apply_enhanced_mode(raw_bass_level)
        
        for particle in self.particles:
            # Calculate distance from center
            dx = particle['x'] - self.cx
            dy = particle['y'] - self.cy
            distance_from_center = np.sqrt(dx*dx + dy*dy)
            
            # Music-dependent movement logic
            if bass_level > self.bass_threshold:
                # HIGH BASS: Outer movement (expand outward)
                # Add outward force based on bass intensity - MUCH STRONGER
                outward_force = bass_level * self.outer_movement_strength * 3.0  # 3x stronger
                
                # Normalize direction vector
                if distance_from_center > 0:
                    dx_norm = dx / distance_from_center
                    dy_norm = dy / distance_from_center
                else:
                    # If at center, choose random direction
                    angle = np.random.uniform(0, 2 * np.pi)
                    dx_norm = np.cos(angle)
                    dy_norm = np.sin(angle)
                
                # Apply outward force - MUCH STRONGER
                particle['vx'] += dx_norm * outward_force * 0.05  # 5x stronger
                particle['vy'] += dy_norm * outward_force * 0.05
                
                # Add some randomness for organic movement
                particle['vx'] += np.random.uniform(-0.5, 0.5) * bass_level
                particle['vy'] += np.random.uniform(-0.5, 0.5) * bass_level
                
            else:
                # LOW BASS: Inner movement (drift toward center) - MUCH STRONGER
                # Add inward force based on distance from center
                if distance_from_center > 0:
                    inward_force = self.inner_movement_strength * (1.0 - bass_level) * 2.0  # 2x stronger
                    
                    # Normalize direction vector toward center
                    dx_norm = -dx / distance_from_center
                    dy_norm = -dy / distance_from_center
                    
                    # Apply inward force - MUCH STRONGER
                    particle['vx'] += dx_norm * inward_force * 0.03  # 6x stronger
                    particle['vy'] += dy_norm * inward_force * 0.03
                
                # Add gentle random drift
                particle['vx'] += np.random.uniform(-0.1, 0.1)
                particle['vy'] += np.random.uniform(-0.1, 0.1)
            
            # Apply air resistance - reduced for more visible movement
            particle['vx'] *= 0.995  # Less resistance
            particle['vy'] *= 0.995
            
            # Update position
            particle['x'] += particle['vx']
            particle['y'] += particle['vy']
            
            # Update pulse phase and brightness based on bass
            particle['pulse_phase'] += 0.1 + bass_level * 0.2
            base_brightness = 0.3 + 0.7 * (0.5 + 0.5 * np.sin(particle['pulse_phase']))
            particle['brightness'] = base_brightness * (0.7 + 0.3 * bass_level)
            
            # Update size based on z speed (size increase/decrease factor)
            particle['size'] += particle['vz']
            # Keep size within reasonable bounds
            particle['size'] = max(0.5, min(particle['size'], 10.0))
            
            # Handle screen boundaries
            if self.bounce:
                # Bounce behavior - reverse velocity when hitting edges
                if particle['x'] < 0:
                    particle['x'] = 0
                    particle['vx'] = abs(particle['vx'])
                elif particle['x'] >= self.W:
                    particle['x'] = self.W - 1
                    particle['vx'] = -abs(particle['vx'])
                
                if particle['y'] < 0:
                    particle['y'] = 0
                    particle['vy'] = abs(particle['vy'])
                elif particle['y'] >= self.H:
                    particle['y'] = self.H - 1
                    particle['vy'] = -abs(particle['vy'])
            else:
                # Disappear and repopulate behavior
                if particle['x'] < 0 or particle['x'] >= self.W or particle['y'] < 0 or particle['y'] >= self.H:
                    # Repopulate particle at random position
                    angle = np.random.uniform(0, 2 * np.pi)
                    distance = np.random.uniform(200, 400)
                    particle['x'] = self.cx + distance * np.cos(angle)
                    particle['y'] = self.cy + distance * np.sin(angle)
                    # Reset velocities
                    particle['vx'] = np.random.uniform(-0.5, 0.5) if self.speed_x == 0 else self.speed_x
                    particle['vy'] = np.random.uniform(-0.5, 0.5) if self.speed_y == 0 else self.speed_y
                    particle['vz'] = np.random.uniform(-0.1, 0.1) if self.speed_z == 0 else self.speed_z
                    # Reset size and color
                    particle['size'] = np.random.uniform(1, 3)
                    particle['base_size'] = particle['size']
                    particle['color'] = np.random.choice(self.particle_colors) if len(self.particle_colors) > 1 else self.particle_colors[0]

    def _draw_particles(self, frame):
        """Draw atmospheric particles with colors"""
        for particle in self.particles:
            x, y = int(particle['x']), int(particle['y'])
            if 0 <= x < self.W and 0 <= y < self.H:
                size = int(particle['size'])
                brightness = particle['brightness']
                
                # Apply brightness to color
                color = particle['color']
                if isinstance(color, (list, tuple)) and len(color) >= 3:
                    # BGR format for OpenCV
                    b, g, r = color[0], color[1], color[2]
                    final_color = (
                        int(b * brightness),
                        int(g * brightness), 
                        int(r * brightness)
                    )
                else:
                    # Fallback to grayscale
                    gray = int(255 * brightness)
                    final_color = (gray, gray, gray)
                
                cv2.circle(frame, (x, y), size, final_color, -1)
        return frame

    def _draw_bass_indicator(self, frame, frame_idx):
        """Draw bass level indicator on screen"""
        raw_bass_level = self._get_bass_level_at_frame(frame_idx)
        enhanced_bass_level = self._apply_enhanced_mode(raw_bass_level)
        
        # Draw bass level bar at top of screen
        bar_width = 400
        bar_height = 20
        bar_x = (self.W - bar_width) // 2
        bar_y = 50
        
        # Background bar
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_width, bar_y + bar_height), (50, 50, 50), -1)
        
        # Bass level bar (use enhanced level for display)
        level_width = int(bar_width * enhanced_bass_level)
        if enhanced_bass_level > self.bass_threshold:
            # High bass - red color
            color = (0, 0, 255)  # Red
            text = "HIGH BASS - OUTER MOVEMENT"
        else:
            # Low bass - blue color
            color = (255, 0, 0)  # Blue
            text = "LOW BASS - INNER MOVEMENT"
        
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + level_width, bar_y + bar_height), color, -1)
        
        # Add text
        font = cv2.FONT_HERSHEY_SIMPLEX
        text_size = cv2.getTextSize(text, font, 0.6, 2)[0]
        text_x = (self.W - text_size[0]) // 2
        text_y = bar_y + bar_height + 30
        cv2.putText(frame, text, (text_x, text_y), font, 0.6, color, 2)
        
        # Add enhanced mode indicator
        if self.enhanced_mode.get("active", False) and raw_bass_level >= self.enhanced_mode.get("threshold", 0.3):
            enhanced_text = f"ENHANCED! (x{self.enhanced_mode.get('factor', 2.0)})"
            enhanced_text_size = cv2.getTextSize(enhanced_text, font, 0.5, 2)[0]
            enhanced_text_x = (self.W - enhanced_text_size[0]) // 2
            enhanced_text_y = text_y + 25
            cv2.putText(frame, enhanced_text, (enhanced_text_x, enhanced_text_y), font, 0.5, (0, 255, 255), 2)
        
        # Add bass level percentages (raw and enhanced)
        level_text = f"Raw: {raw_bass_level:.2f} ({raw_bass_level*100:.0f}%) | Enhanced: {enhanced_bass_level:.2f} ({enhanced_bass_level*100:.0f}%)"
        level_text_size = cv2.getTextSize(level_text, font, 0.4, 1)[0]
        level_text_x = (self.W - level_text_size[0]) // 2
        level_text_y = text_y + 50
        cv2.putText(frame, level_text, (level_text_x, level_text_y), font, 0.4, (255, 255, 255), 1)
        
        return frame

    def render_particles_test(self, output_path, audio_path=None):
        """Render particles test on black background with optional audio"""
        start_time = time.time()
        print("🚀 Starting Trap Nation particles test render...")
        
        # Load audio if provided
        if audio_path and os.path.exists(audio_path):
            self.load_audio(audio_path)
        else:
            print("⚠️ No audio file provided or file not found, using default movement")
        
        # Calculate total frames
        total_frames = int(self.duration * self.fps)
        frame_times = np.arange(total_frames, dtype=np.float32) / self.fps
        
        # Video writer
        writer_start = time.time()
        tmp_out = output_path + ".temp.mp4"
        self._ensure_dir(os.path.dirname(output_path))
        writer = cv2.VideoWriter(tmp_out, cv2.VideoWriter_fourcc(*"mp4v"), self.fps, (self.W, self.H))
        if not writer.isOpened():
            raise RuntimeError("Failed to open video writer")
        writer_time = time.time() - writer_start
        print(f"📝 Video writer setup: {writer_time:.3f}s")
        
        # Performance tracking
        render_time_total = 0
        write_time_total = 0
        
        # Main rendering loop
        render_start = time.time()
        for i in range(total_frames):
            t = frame_times[i]
            
            # Start with black frame
            frame = self.black_frame.copy()
            
            # Update particles with frame index for bass analysis
            self._update_particles(t, i)
            
            # Draw particles
            render_start_frame = time.time()
            frame = self._draw_particles(frame)
            
            # Draw bass level indicator
            frame = self._draw_bass_indicator(frame, i)
            
            render_time_total += time.time() - render_start_frame
            
            # Write frame
            write_start = time.time()
            writer.write(frame)
            write_time_total += time.time() - write_start
            
            # Progress reporting
            if total_frames > 0 and i % max(1, total_frames // 10) == 0:
                elapsed = time.time() - render_start
                fps_actual = (i + 1) / elapsed if elapsed > 0 else 0
                print(f"Progress: {int(100 * i / total_frames)}% | Elapsed: {elapsed:.1f}s | FPS: {fps_actual:.1f}")

        render_time = time.time() - render_start
        print(f"🎬 Frame rendering: {render_time:.3f}s ({render_time/total_frames*1000:.1f}ms per frame)")

        writer.release()

        # Finalize
        finalize_start = time.time()
        if os.path.exists(output_path):
            os.remove(output_path)
        os.rename(tmp_out, output_path)
        finalize_time = time.time() - finalize_start
        print(f"📁 File operations: {finalize_time:.3f}s")
        
        # Audio muxing
        if audio_path and os.path.exists(audio_path):
            audio_mux_start = time.time()
            self._mux_audio(output_path, audio_path)
            audio_mux_time = time.time() - audio_mux_start
            print(f"🔊 Audio muxing: {audio_mux_time:.3f}s")
        
        # Performance summary
        total_time = time.time() - start_time
        realtime_ratio = self.duration / total_time if total_time > 0 else 0
        
        print("\n" + "="*60)
        print("📊 TRAP NATION PARTICLES TEST PERFORMANCE")
        print("="*60)
        print(f"🎬 Frame rendering:      {render_time:6.3f}s ({render_time/total_time*100:5.1f}%)")
        print(f"📝 Video writer setup:   {writer_time:6.3f}s ({writer_time/total_time*100:5.1f}%)")
        print(f"📁 File operations:      {finalize_time:6.3f}s ({finalize_time/total_time*100:5.1f}%)")
        print("-"*60)
        print(f"⏱️  Total time:           {total_time:6.3f}s")
        print(f"🎬 Video duration:       {self.duration:6.1f}s")
        print(f"⚡ Speed ratio:          {realtime_ratio:6.2f}x realtime")
        print(f"🎯 Avg FPS:              {total_frames/total_time:6.1f} fps")
        print(f"✨ Particle count:       {self.particle_count}")
        print("="*60)
        print(f"✅ Done: {output_path}")

    def _mux_audio(self, video_path, audio_path):
        """Mux audio into video using ffmpeg"""
        if not audio_path or not os.path.exists(audio_path):
            print("⚠️ No audio file provided for muxing")
            return
            
        temp_out = video_path + ".with_audio.mp4"
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "320k",
            "-map", "0:v:0", "-map", "1:a:0",
            "-shortest",  # End when shortest stream ends
            temp_out
        ]
        try:
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if proc.returncode == 0 and os.path.exists(temp_out) and os.path.getsize(temp_out) > 0:
                os.remove(video_path)
                shutil.move(temp_out, video_path)
                print("🔊 Audio muxed into video.")
            else:
                if os.path.exists(temp_out):
                    os.remove(temp_out)
                print("⚠️ ffmpeg failed; leaving video without audio.")
        except Exception as e:
            print(f"⚠️ ffmpeg not available or error occurred: {e}. Leaving video without audio.")

    @staticmethod
    def _ensure_dir(d):
        if d and not os.path.exists(d):
            os.makedirs(d, exist_ok=True)


def test_trap_nation_particles():
    """
    Test function to create a music-dependent particles video on black background
    """
    OUTPUT = "trap_nation_particles_music_test.mp4"
    AUDIO = "song.wav"
    
    # Create particles visualizer with music-dependent settings
    particles = TrapNationParticles(
        width=1920,
        height=1080,
        fps=30,
        x_position=0.5,
        y_position=0.5,
        particle_count=100,  # More particles for better effect
        duration=15.0,  # 15 seconds test
        bass_threshold=0.3,  # Bass threshold for movement switching
        outer_movement_strength=2.0,  # Strength of outward movement during bass
        inner_movement_strength=1.0,  # Strength of inward movement during low bass
        particle_colors=[(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (255, 0, 255)],  # RGB colors
        speed_x=0,  # Random X speed
        speed_y=0,  # Random Y speed  
        speed_z=0,  # Random Z speed (size change)
        bounce=False,  # Disappear and repopulate
    )
    
    # Render the test with audio
    particles.render_particles_test(OUTPUT, audio_path=AUDIO)
    
    print(f"\n🎉 Trap Nation music-dependent particles test completed!")
    print(f"📹 Output video: {OUTPUT}")
    print(f"🎵 Audio source: {AUDIO}")
    print(f"✨ Features:")
    print(f"   - {particles.particle_count} floating particles")
    print(f"   - Music-dependent movement patterns")
    print(f"   - OUTER movement when bass increases (threshold: {particles.bass_threshold})")
    print(f"   - INNER movement (toward center) when bass is low")
    print(f"   - Bass-responsive brightness effects")
    print(f"   - Particle colors: {particles.particle_colors}")
    print(f"   - Speed settings: X={particles.speed_x}, Y={particles.speed_y}, Z={particles.speed_z}")
    print(f"   - Bounce behavior: {particles.bounce}")
    print(f"   - Enhanced Mode: {particles.enhanced_mode}")
    print(f"   - {particles.duration}s duration at {particles.fps} FPS")


if __name__ == "__main__":
    test_trap_nation_particles()
