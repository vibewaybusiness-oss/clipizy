import numpy as np
import cv2
import librosa
from typing import List, Tuple, Optional
import random
import math

class WhiteFloatingParticles:
    def __init__(self, 
                 width: int = 1920, 
                 height: int = 1080,
                 initial_speed: float = 8.0,
                 randomness_x: float = 1.5,
                 randomness_z: float = 1.0,
                 particle_size: float = 8.0,
                 particle_amount: int = 20,
                 volume_impact: float = 3.0,
                 size_increase: float = 2.0):
        """
        WHITE FLOATING PARTICLES SYSTEM FOR MUSIC VIDEO ANIMATION
        
        Parameters:
        - initial_speed: Base movement speed of particles
        - randomness_x: Randomness factor for X-axis movement (0.0 to 1.0)
        - randomness_z: Randomness factor for Z-axis movement (0.0 to 1.0)
        - particle_size: Size of particles (radius in pixels)
        - particle_amount: Number of particles to generate
        - volume_impact: Multiplier for music volume effect on particle speed
        - size_increase: Maximum size increase multiplier based on volume (default: 2.0)
        """
        self.width = width
        self.height = height
        self.initial_speed = initial_speed
        self.randomness_x = randomness_x
        self.randomness_z = randomness_z
        self.particle_size = particle_size
        self.particle_amount = particle_amount
        self.volume_impact = volume_impact
        self.size_increase = size_increase
        
        self.particles = []
        self.audio_data = None
        self.sample_rate = None
        self.frame_count = 0
        
        self._initialize_particles()
    
    def _initialize_particles(self):
        """INITIALIZE PARTICLE POSITIONS AND PROPERTIES"""
        self.particles = []
        for _ in range(self.particle_amount):
            particle = {
                'x': random.uniform(0, self.width),
                'y': random.uniform(0, self.height),
                'z': random.uniform(0.5, 2.0),  # Depth for 3D effect
                'vx': random.uniform(-self.initial_speed, self.initial_speed),
                'vy': random.uniform(-self.initial_speed * 0.8, self.initial_speed * 0.8),
                'vz': random.uniform(-self.initial_speed * 0.5, self.initial_speed * 0.5),
                'base_size': random.uniform(self.particle_size * 0.8, self.particle_size * 1.2),
                'current_size': random.uniform(self.particle_size * 0.8, self.particle_size * 1.2),
                'target_size': random.uniform(self.particle_size * 0.8, self.particle_size * 1.2),
                'opacity': random.uniform(0.7, 1.0),
                'blur_radius': random.uniform(3, 12)
            }
            self.particles.append(particle)
    
    def load_audio(self, audio_path: str):
        """LOAD AUDIO FILE FOR VOLUME ANALYSIS"""
        self.audio_data, self.sample_rate = librosa.load(audio_path)
        print(f"Audio loaded: {len(self.audio_data)} samples at {self.sample_rate}Hz")
    
    def _get_volume_at_frame(self, frame_number: int, fps: int = 30) -> float:
        """GET VOLUME LEVEL AT SPECIFIC FRAME - OPTIMIZED"""
        if self.audio_data is None:
            return 0.5
        
        frame_time = frame_number / fps
        sample_index = int(frame_time * self.sample_rate)
        
        if sample_index >= len(self.audio_data):
            return 0.5
        
        # Optimized window size for better performance
        window_size = min(int(self.sample_rate * 0.05), 1024)  # 50ms window, max 1024 samples
        start_idx = max(0, sample_index - window_size // 2)
        end_idx = min(len(self.audio_data), sample_index + window_size // 2)
        
        # Use numpy for faster RMS calculation
        window = self.audio_data[start_idx:end_idx]
        rms = np.sqrt(np.mean(window * window))  # Faster than window ** 2
        
        return float(rms)
    
    def _update_particles(self, volume_level: float):
        """UPDATE PARTICLE POSITIONS AND PROPERTIES - OPTIMIZED"""
        volume_speed_multiplier = 1.0 + (volume_level * self.volume_impact)
        
        # Pre-calculate common values
        target_size_multiplier = 1.0 + (volume_level * (self.size_increase - 1.0))
        opacity_value = min(1.0, 0.5 + volume_level * 0.5)
        blur_radius_value = 3 + volume_level * 8
        
        for particle in self.particles:
            # Apply volume-based speed boost
            current_speed = volume_speed_multiplier
            
            # Add randomness to movement (reduced random calls for performance)
            random_x = random.uniform(-self.randomness_x, self.randomness_x)
            random_z = random.uniform(-self.randomness_z, self.randomness_z)
            random_y = random.uniform(-0.3, 0.3)
            
            # Update velocities with randomness
            particle['vx'] += random_x * current_speed * 0.3
            particle['vy'] += random_y * current_speed
            particle['vz'] += random_z * current_speed * 0.2
            
            # Apply gentle gravity and air resistance
            particle['vy'] += 0.05  # Gravity
            particle['vx'] *= 0.995  # Air resistance
            particle['vy'] *= 0.995
            particle['vz'] *= 0.995
            
            # Update positions with higher speed
            particle['x'] += particle['vx'] * current_speed * 0.5
            particle['y'] += particle['vy'] * current_speed * 0.5
            particle['z'] += particle['vz'] * current_speed * 0.3
            
            # Wrap around screen edges (optimized)
            if particle['x'] < 0:
                particle['x'] = self.width
            elif particle['x'] > self.width:
                particle['x'] = 0
                
            if particle['y'] < 0:
                particle['y'] = self.height
                particle['vy'] = abs(particle['vy'])  # Bounce
            elif particle['y'] > self.height:
                particle['y'] = self.height
                particle['vy'] = -abs(particle['vy'])  # Bounce
            
            # Keep Z within reasonable bounds
            particle['z'] = max(0.1, min(3.0, particle['z']))
            
            # Update particle properties (pre-calculated values)
            particle['opacity'] = opacity_value
            particle['blur_radius'] = blur_radius_value
            
            # Smooth size transitions based on volume
            particle['target_size'] = particle['base_size'] * target_size_multiplier
            
            # Smooth interpolation towards target size
            smoothing_factor = 0.1  # Lower = smoother transitions
            particle['current_size'] += (particle['target_size'] - particle['current_size']) * smoothing_factor
    
    def _draw_particle(self, frame: np.ndarray, particle: dict):
        """DRAW INDIVIDUAL PARTICLE WITH TRAP NATION STYLE - OPTIMIZED"""
        x, y, z = int(particle['x']), int(particle['y']), particle['z']
        size = int(particle['current_size'] * (1.0 / z))
        opacity = particle['opacity']
        
        if size < 2:
            size = 2
        
        # Quick bounds check
        if x < size or x >= self.width - size or y < size or y >= self.height - size:
            return
        
        # Pre-calculate blur radius (reduced for performance)
        blur_radius = min(int(particle['blur_radius'] * 0.5), 8)  # Cap blur for performance
        
        # Create small mask around particle for better performance
        mask_size = (size + blur_radius) * 2 + 1
        mask = np.zeros((mask_size, mask_size), dtype=np.uint8)
        
        # Draw circle in small mask
        center = mask_size // 2
        cv2.circle(mask, (center, center), size, 255, -1)
        
        # Apply blur only if needed and keep it small
        if blur_radius > 1:
            kernel_size = min(blur_radius * 2 + 1, 15)  # Cap kernel size
            mask = cv2.GaussianBlur(mask, (kernel_size, kernel_size), blur_radius)
        
        # Apply opacity
        mask = (mask * opacity).astype(np.uint8)
        
        # Calculate bounds for copying
        x1 = max(0, x - center)
        y1 = max(0, y - center)
        x2 = min(self.width, x + center + 1)
        y2 = min(self.height, y + center + 1)
        
        mask_x1 = max(0, center - x)
        mask_y1 = max(0, center - y)
        mask_x2 = mask_x1 + (x2 - x1)
        mask_y2 = mask_y1 + (y2 - y1)
        
        # Direct pixel blending for better performance
        if mask_x2 > mask_x1 and mask_y2 > mask_y1:
            frame_section = frame[y1:y2, x1:x2]
            mask_section = mask[mask_y1:mask_y2, mask_x1:mask_x2]
            
            # Vectorized blending
            frame_section[:] = np.maximum(frame_section, mask_section[:, :, np.newaxis])
    
    def generate_frame(self, frame_number: int, fps: int = 30) -> np.ndarray:
        """GENERATE SINGLE FRAME WITH PARTICLES - OPTIMIZED"""
        # Create black background (reuse if possible)
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        
        # Get volume level for this frame
        volume_level = self._get_volume_at_frame(frame_number, fps)
        
        # Update particles
        self._update_particles(volume_level)
        
        # Draw all particles (optimized loop)
        for particle in self.particles:
            # Skip particles that are off-screen or too small
            if (particle['x'] < 0 or particle['x'] >= self.width or 
                particle['y'] < 0 or particle['y'] >= self.height or
                particle['current_size'] < 1):
                continue
            self._draw_particle(frame, particle)
        
        self.frame_count += 1
        return frame
    
    def create_animation(self, 
                        output_path: str, 
                        duration: float = 10.0, 
                        fps: int = 30,
                        audio_path: Optional[str] = None):
        """CREATE COMPLETE PARTICLE ANIMATION - OPTIMIZED"""
        if audio_path:
            self.load_audio(audio_path)
        
        total_frames = int(duration * fps)
        
        # Setup video writer with optimized codec
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (self.width, self.height))
        
        print(f"Creating {total_frames} frames of particle animation...")
        
        # Pre-allocate frame for better performance
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        
        for frame_num in range(total_frames):
            # Clear frame efficiently
            frame.fill(0)
            
            # Get volume level for this frame
            volume_level = self._get_volume_at_frame(frame_num, fps)
            
            # Update particles
            self._update_particles(volume_level)
            
            # Draw all particles (optimized loop)
            for particle in self.particles:
                # Skip particles that are off-screen or too small
                if (particle['x'] < 0 or particle['x'] >= self.width or 
                    particle['y'] < 0 or particle['y'] >= self.height or
                    particle['current_size'] < 1):
                    continue
                self._draw_particle(frame, particle)
            
            out.write(frame)
            
            if frame_num % 30 == 0:
                print(f"Progress: {frame_num}/{total_frames} frames")
        
        out.release()
        print(f"Animation saved to: {output_path}")

def create_trap_nation_particles(audio_path: str, 
                                output_path: str = "trap_nation_particles.mp4",
                                duration: float = 10.0,
                                initial_speed: float = 8.0,
                                randomness_x: float = 1.5,
                                randomness_z: float = 1.0,
                                particle_size: float = 8.0,
                                particle_amount: int = 20,
                                volume_impact: float = 3.0,
                                size_increase: float = 2.0):
    """
    CREATE TRAP NATION STYLE WHITE FLOATING PARTICLES ANIMATION
    
    Parameters:
    - audio_path: Path to audio file for volume analysis
    - output_path: Output video file path
    - duration: Animation duration in seconds
    - initial_speed: Base particle movement speed
    - randomness_x: X-axis movement randomness (0.0-1.0)
    - randomness_z: Z-axis movement randomness (0.0-1.0)
    - particle_size: Particle size in pixels
    - particle_amount: Number of particles
    - volume_impact: Volume effect multiplier on particle speed
    - size_increase: Maximum size increase multiplier based on volume (default: 2.0)
    """
    
    particle_system = WhiteFloatingParticles(
        initial_speed=initial_speed,
        randomness_x=randomness_x,
        randomness_z=randomness_z,
        particle_size=particle_size,
        particle_amount=particle_amount,
        volume_impact=volume_impact,
        size_increase=size_increase
    )
    
    particle_system.create_animation(
        output_path=output_path,
        duration=duration,
        audio_path=audio_path
    )

if __name__ == "__main__":
    # EXAMPLE USAGE
    create_trap_nation_particles(
        audio_path="song.wav",
        output_path="trap_nation_particles.mp4",
        duration=10.0,
        initial_speed=8.0,
        randomness_x=1.5,
        randomness_z=1.0,
        particle_size=8.0,
        particle_amount=20,
        volume_impact=3.0,
        size_increase=2.0
    )
