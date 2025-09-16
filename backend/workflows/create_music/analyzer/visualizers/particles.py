import numpy as np
import cv2
import os


class ParticleSystem:
    """Particle system for atmospheric effects in visualizers"""
    
    def __init__(self, width, height, particle_count=50):
        self.W = width
        self.H = height
        self.particle_count = particle_count
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
    
    # Initialize particle system
    width, height = 800, 600
    particle_count = 30
    ps = ParticleSystem(width, height, particle_count)
    
    print(f"Initialized with {len(ps.particles)} particles")
    print(f"Screen dimensions: {ps.W}x{ps.H}")
    
    # Test particle initialization
    for i, particle in enumerate(ps.particles[:3]):  # Check first 3 particles
        print(f"Particle {i}: pos=({particle['x']:.1f}, {particle['y']:.1f}), "
              f"vel=({particle['vx']:.3f}, {particle['vy']:.3f}), "
              f"size={particle['size']:.1f}, brightness={particle['brightness']:.2f}")
    
    # Test update function
    center_x, center_y = width // 2, height // 2
    print(f"\nUpdating particles with center at ({center_x}, {center_y})")
    
    # Create output directory
    output_dir = "particle_output"
    os.makedirs(output_dir, exist_ok=True)
    
    # Create and save frames with smooth timing
    frames = []
    fps = 30
    duration = 3.0  # 3 seconds
    total_frames = int(fps * duration)
    dt = 1.0 / fps  # Time step for smooth animation
    
    for frame_num in range(total_frames):
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        current_time = frame_num * dt
        ps.update(dt, center_x, center_y)
        frame = ps.draw(frame)
        
        # Count visible particles
        visible_count = sum(1 for p in ps.particles 
                          if 0 <= p['x'] < width and 0 <= p['y'] < height)
        if frame_num % 10 == 0:  # Print every 10th frame
            print(f"Frame {frame_num}: {visible_count} particles visible")
        
        # Save frame (every 5th frame to avoid too many files)
        if frame_num % 5 == 0:
            frame_path = os.path.join(output_dir, f"frame_{frame_num:03d}.png")
            cv2.imwrite(frame_path, frame)
        frames.append(frame)
    
    # Create video output with higher frame rate
    video_path = os.path.join(output_dir, "particle_animation.mp4")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))
    
    for frame in frames:
        out.write(frame)
    out.release()
    
    print(f"Saved {len(frames)} frames to {output_dir}/")
    print(f"Created video: {video_path}")
    print("ParticleSystem test completed successfully!")


if __name__ == "__main__":
    test_particle_system()