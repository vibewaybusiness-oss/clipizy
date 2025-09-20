#!/usr/bin/env python3
"""
Test script to verify the corrected particle behaviors:
- Zen particles: floating around, bouncing back or random respawn, no music dependency
- Bouncing particles: fixed count, bounce back on frame, increased movement with bass
"""

import os
import sys
import time
from pathlib import Path

# Add the API directory to the Python path
api_dir = Path(__file__).parent.parent
sys.path.insert(0, str(api_dir))

from processing.music.generator.particles.unified_particle_system import (
    UnifiedParticleSystem,
    ParticleType,
    ParticleConfig
)


def test_zen_particles():
    """Test Zen particles - should float around and bounce back, no music dependency"""
    print("🧘 Testing ZEN particles (no music dependency)...")
    print("-" * 50)
    
    # Set up paths
    particles_dir = api_dir / "processing" / "music" / "generator" / "particles"
    song_path = particles_dir / "song.wav"
    output_dir = Path(__file__).parent / "corrected_outputs"
    output_dir.mkdir(exist_ok=True)
    
    # Test Zen particles with bounce=True
    print("Testing Zen particles with bounce=True...")
    config_bounce = ParticleConfig(
        width=1280,
        height=720,
        fps=30,
        duration=8.0,
        particle_count=50,
        bounce=True  # Should bounce back on screen frames
    )
    
    system_bounce = UnifiedParticleSystem(particle_type=ParticleType.ZEN, config=config_bounce)
    system_bounce.load_audio(str(song_path))  # Load audio but shouldn't affect movement
    
    output_path_bounce = output_dir / "ZEN_BOUNCE_TRUE.mp4"
    system_bounce.render_particles(str(output_path_bounce), str(song_path))
    
    if output_path_bounce.exists():
        size = output_path_bounce.stat().st_size / (1024 * 1024)
        print(f"  ✅ Zen bounce=True: {output_path_bounce.name} ({size:.1f}MB)")
    else:
        print(f"  ❌ Zen bounce=True: Failed to create output")
    
    # Test Zen particles with bounce=False
    print("Testing Zen particles with bounce=False...")
    config_respawn = ParticleConfig(
        width=1280,
        height=720,
        fps=30,
        duration=8.0,
        particle_count=50,
        bounce=False  # Should respawn randomly when hitting edges
    )
    
    system_respawn = UnifiedParticleSystem(particle_type=ParticleType.ZEN, config=config_respawn)
    system_respawn.load_audio(str(song_path))
    
    output_path_respawn = output_dir / "ZEN_BOUNCE_FALSE.mp4"
    system_respawn.render_particles(str(output_path_respawn), str(song_path))
    
    if output_path_respawn.exists():
        size = output_path_respawn.stat().st_size / (1024 * 1024)
        print(f"  ✅ Zen bounce=False: {output_path_respawn.name} ({size:.1f}MB)")
    else:
        print(f"  ❌ Zen bounce=False: Failed to create output")
    
    print()


def test_bouncing_particles():
    """Test Bouncing particles - should have fixed count, bounce back, increased movement with bass"""
    print("🏀 Testing BOUNCING particles (fixed count, bounce back, bass excitement)...")
    print("-" * 50)
    
    # Set up paths
    particles_dir = api_dir / "processing" / "music" / "generator" / "particles"
    song_path = particles_dir / "song.wav"
    output_dir = Path(__file__).parent / "corrected_outputs"
    output_dir.mkdir(exist_ok=True)
    
    # Test Bouncing particles with fixed count
    print("Testing Bouncing particles with fixed count and bass excitement...")
    config = ParticleConfig(
        width=1280,
        height=720,
        fps=30,
        duration=10.0,
        particle_count=75,  # Fixed count
        bass_threshold=0.3,
        bounce=True  # Should always bounce back
    )
    
    system = UnifiedParticleSystem(particle_type=ParticleType.BOUNCING, config=config)
    system.load_audio(str(song_path))
    
    # Check initial particle count
    initial_count = len(system.particles)
    print(f"  📊 Initial particle count: {initial_count}")
    
    output_path = output_dir / "BOUNCING_FIXED_COUNT.mp4"
    system.render_particles(str(output_path), str(song_path))
    
    if output_path.exists():
        size = output_path.stat().st_size / (1024 * 1024)
        print(f"  ✅ Bouncing particles: {output_path.name} ({size:.1f}MB)")
        print(f"  📊 Final particle count: {len(system.particles)} (should be same as initial)")
    else:
        print(f"  ❌ Bouncing particles: Failed to create output")
    
    print()


def test_comparison():
    """Test comparison between old and new behaviors"""
    print("🔄 Testing behavior comparison...")
    print("-" * 50)
    
    # Set up paths
    particles_dir = api_dir / "processing" / "music" / "generator" / "particles"
    song_path = particles_dir / "song.wav"
    output_dir = Path(__file__).parent / "corrected_outputs"
    output_dir.mkdir(exist_ok=True)
    
    # Test all particle types with corrected behaviors
    particle_types = [
        (ParticleType.ZEN, "ZEN_CORRECTED"),
        (ParticleType.BOUNCING, "BOUNCING_CORRECTED"),
        (ParticleType.ENHANCED, "ENHANCED_COMPARISON"),
        (ParticleType.SNOW, "SNOW_COMPARISON")
    ]
    
    for particle_type, name in particle_types:
        print(f"Testing {particle_type.value} particles...")
        
        config = ParticleConfig(
            width=1280,
            height=720,
            fps=30,
            duration=6.0,
            particle_count=60,
            bass_threshold=0.3
        )
        
        system = UnifiedParticleSystem(particle_type=particle_type, config=config)
        system.load_audio(str(song_path))
        
        output_path = output_dir / f"{name}.mp4"
        system.render_particles(str(output_path), str(song_path))
        
        if output_path.exists():
            size = output_path.stat().st_size / (1024 * 1024)
            print(f"  ✅ {particle_type.value}: {output_path.name} ({size:.1f}MB)")
        else:
            print(f"  ❌ {particle_type.value}: Failed to create output")
    
    print()


def main():
    """Run all corrected behavior tests"""
    print("🧪 TESTING CORRECTED PARTICLE BEHAVIORS")
    print("=" * 60)
    
    # Test Zen particles
    test_zen_particles()
    
    # Test Bouncing particles
    test_bouncing_particles()
    
    # Test comparison
    test_comparison()
    
    print("🎯 CORRECTED BEHAVIOR TESTS COMPLETE")
    print("=" * 60)
    
    # List generated files
    output_dir = Path(__file__).parent / "corrected_outputs"
    if output_dir.exists():
        print(f"📁 Generated files in {output_dir}:")
        for file in sorted(output_dir.glob("*.mp4")):
            size = file.stat().st_size / (1024 * 1024)
            print(f"  📹 {file.name} ({size:.1f}MB)")
    
    print("\n✅ All corrected behavior tests completed!")
    print("📋 Expected behaviors:")
    print("  • ZEN particles: Float around, bounce back or random respawn, NO music dependency")
    print("  • BOUNCING particles: Fixed count, bounce back on frame, increased movement with bass")


if __name__ == "__main__":
    main()
