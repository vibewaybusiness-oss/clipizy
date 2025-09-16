import numpy as np
import cv2
import os


class ParticleSystem:
    """Particle system for atmospheric effects in visualizers"""
    
    def __init__(self, 
                 width=1920, 
                 height=1080, 
                 particle_count=50,
                 circle_min_radius=60,
                 circle_max_radius=120,
                 x_position=0.5,
                 y_position=0.5,
                 logo_scale_factor=1.0,
                 logo_scale_to_circle=True,
                 fadein=3.0,
                 fadeout=0.0,
                 delay_outro=0.0,
                 time_in=0.0,
                 duration_intro=0.0,
                 bass_bins=5,
                 smoothing=60,
                 wave_amplitude=30,
                 wave_frequency=8,
                 outline_thickness=8,
                 energy_intensity=0.8,
                 enhanced_mode=None,
                 n_circles=7,
                 scale_factor=1.0,
                 circle_scale_factor=1.2):
        self.W = width
        self.H = height
        self.particle_count = particle_count
        self.cmin = int(circle_min_radius)
        self.cmax = int(circle_max_radius)
        
        # Position
        self.x_pos = float(x_position)
        self.y_pos = float(y_position)
        self.cx = int(self.W * self.x_pos)
        self.cy = int(self.H * self.y_pos)
        
        # Logo settings
        self.logo_scale = float(logo_scale_factor)
        self.logo_scale_to_circle = bool(logo_scale_to_circle)
        
        # Timing
        self.fadein = float(fadein)
        self.fadeout = float(fadeout)
        self.delay_outro = float(delay_outro)
        self.time_in = float(time_in)
        self.duration_intro = float(duration_intro)
        
        # Audio processing
        self.bass_bins = int(bass_bins)
        self.smoothing = max(0, min(100, int(smoothing)))
        
        # Visual effects
        self.wave_amplitude = int(wave_amplitude)
        self.wave_frequency = int(wave_frequency)
        self.outline_thickness = int(outline_thickness)
        self.energy_intensity = float(energy_intensity)
        
        # Enhanced mode
        self.enhanced_mode = enhanced_mode
        
        # Circle scaling parameters
        self.n_circles = int(n_circles)
        self.scale_factor = float(scale_factor)
        self.circle_scale_factor = float(circle_scale_factor)
        
        # Pre-compute constants
        self.radius_range = self.cmax - self.cmin
        self.ease_power = 1.4
        self.core_cap = int(self.cmin * 1.4)
        
        # Pre-allocate black frame
        self.black_frame = np.zeros((self.H, self.W, 3), dtype=np.uint8)
        
        self.particles = self._init_particles()
    
    def _init_particles(self):
        """Initialize particle system for atmospheric effects"""
        particles = []
        for _ in range(self.particle_count):
            angle = np.random.uniform(0, 2 * np.pi)
            distance = np.random.uniform(200, 400)
            x = self.W // 2 + distance * np.cos(angle)
            y = self.H // 2 + distance * np.sin(angle)
            particles.append({
                'x': x, 'y': y,
                'vx': np.random.uniform(-0.5, 0.5),
                'vy': np.random.uniform(-0.5, 0.5),
                'size': np.random.uniform(1, 3),
                'brightness': np.random.uniform(0.3, 1.0),
                'pulse_phase': np.random.uniform(0, 2 * np.pi)
            })
        return particles
    
    def update(self, dt, center_x, center_y):
        """Update particle system for atmospheric effects"""
        for particle in self.particles:
            # Apply velocity damping for smoother movement
            particle['vx'] *= 0.98
            particle['vy'] *= 0.98
            
            # Update position with time-based movement
            particle['x'] += particle['vx'] * dt
            particle['y'] += particle['vy'] * dt
            
            # Add gentle drift toward center with smooth attraction
            dx = center_x - particle['x']
            dy = center_y - particle['y']
            distance = np.sqrt(dx*dx + dy*dy)
            if distance > 0:
                # Smooth attraction force
                attraction_strength = 0.0002 * dt
                particle['vx'] += dx * attraction_strength
                particle['vy'] += dy * attraction_strength
            
            # Add subtle random movement for organic feel
            particle['vx'] += np.random.uniform(-0.01, 0.01) * dt
            particle['vy'] += np.random.uniform(-0.01, 0.01) * dt
            
            # Update pulse phase with smooth timing
            particle['pulse_phase'] += 0.05 * dt
            particle['brightness'] = 0.3 + 0.7 * (0.5 + 0.5 * np.sin(particle['pulse_phase']))
            
            # Smooth boundary wrapping
            if particle['x'] < -50:
                particle['x'] = self.W + 50
            elif particle['x'] > self.W + 50:
                particle['x'] = -50
            if particle['y'] < -50:
                particle['y'] = self.H + 50
            elif particle['y'] > self.H + 50:
                particle['y'] = -50
    
    def draw(self, frame):
        """Draw atmospheric particles with smooth rendering"""
        for particle in self.particles:
            x, y = particle['x'], particle['y']
            if -10 <= x < self.W + 10 and -10 <= y < self.H + 10:
                # Use sub-pixel positioning for smoother movement
                center = (int(x), int(y))
                size = max(1, int(particle['size']))
                brightness = int(255 * particle['brightness'])
                
                # Draw particle with anti-aliased appearance
                cv2.circle(frame, center, size, (brightness, brightness, brightness), -1)
                
                # Add subtle glow effect for smoother appearance
                if size > 1:
                    glow_brightness = int(brightness * 0.3)
                    cv2.circle(frame, center, size + 1, (glow_brightness, glow_brightness, glow_brightness), 1)
        return frame


def test_particle_system():
    """Test function for ParticleSystem class"""
    print("Testing ParticleSystem...")
    
    # Initialize particle system with TrapNation parameters
    ps = ParticleSystem(
        width=1920,
        height=1080,
        particle_count=50,
        circle_min_radius=60,
        circle_max_radius=120,
        x_position=0.5,
        y_position=0.5,
        logo_scale_factor=1.0,
        logo_scale_to_circle=True,
        fadein=3.0,
        fadeout=0.0,
        delay_outro=0.0,
        time_in=0.0,
        duration_intro=0.0,
        bass_bins=5,
        smoothing=60,
        wave_amplitude=30,
        wave_frequency=8,
        outline_thickness=8,
        energy_intensity=0.8,
        enhanced_mode=None,
        n_circles=7,
        scale_factor=1.0,
        circle_scale_factor=1.2
    )
    
    print(f"Initialized with {len(ps.particles)} particles")
    print(f"Screen dimensions: {ps.W}x{ps.H}")
    print(f"Center position: ({ps.cx}, {ps.cy})")
    print(f"Circle range: {ps.cmin}-{ps.cmax}")
    print(f"Scale factor: {ps.scale_factor}")
    print(f"Circle scale factor: {ps.circle_scale_factor}")
    
    # Test particle initialization
    for i, particle in enumerate(ps.particles[:3]):  # Check first 3 particles
        print(f"Particle {i}: pos=({particle['x']:.1f}, {particle['y']:.1f}), "
              f"vel=({particle['vx']:.3f}, {particle['vy']:.3f}), "
              f"size={particle['size']:.1f}, brightness={particle['brightness']:.2f}")
    
    # Test update function
    print(f"\nUpdating particles with center at ({ps.cx}, {ps.cy})")
    
    # Create output directory
    output_dir = "trapnation_particle_output"
    os.makedirs(output_dir, exist_ok=True)
    
    # Create and save frames with smooth timing
    frames = []
    fps = 30
    duration = 4.0  # 4 seconds
    total_frames = int(fps * duration)
    dt = 1.0 / fps  # Time step for smooth animation
    
    for frame_num in range(total_frames):
        frame = np.zeros((ps.H, ps.W, 3), dtype=np.uint8)
        current_time = frame_num * dt
        ps.update(dt, ps.cx, ps.cy)
        frame = ps.draw(frame)
        
        # Count visible particles
        visible_count = sum(1 for p in ps.particles 
                          if 0 <= p['x'] < ps.W and 0 <= p['y'] < ps.H)
        if frame_num % 15 == 0:  # Print every 15th frame
            print(f"Frame {frame_num}: {visible_count} particles visible")
        
        # Save frame (every 10th frame to avoid too many files)
        if frame_num % 10 == 0:
            frame_path = os.path.join(output_dir, f"frame_{frame_num:03d}.png")
            cv2.imwrite(frame_path, frame)
        frames.append(frame)
    
    # Create video output with higher frame rate
    video_path = os.path.join(output_dir, "trapnation_particle_animation.mp4")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(video_path, fourcc, fps, (ps.W, ps.H))
    
    for frame in frames:
        out.write(frame)
    out.release()
    
    print(f"Saved {len(frames)} frames to {output_dir}/")
    print(f"Created video: {video_path}")
    print("ParticleSystem test completed successfully!")


if __name__ == "__main__":
    test_particle_system()
