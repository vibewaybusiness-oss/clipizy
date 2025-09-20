#!/usr/bin/env python3
"""
Integration test for the Unified Particle System.
This script tests all particle types with the song.wav file and generates final outputs.
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


def test_particle_integration():
    """Test all particle types with the song.wav file"""
    print("🎬 Unified Particle System Integration Test")
    print("=" * 60)
    
    # Set up paths
    particles_dir = api_dir / "processing" / "music" / "generator" / "particles"
    song_path = particles_dir / "song.wav"
    output_dir = Path(__file__).parent / "particle_outputs"
    
    # Create output directory
    output_dir.mkdir(exist_ok=True)
    
    # Check if song file exists
    if not song_path.exists():
        print(f"❌ Song file not found: {song_path}")
        return False
    
    print(f"🎵 Using audio file: {song_path}")
    print(f"📁 Output directory: {output_dir}")
    print()
    
    # Test configuration for all particle types
    base_config = ParticleConfig(
        width=1280,
        height=720,
        fps=30,
        duration=10.0,
        particle_count=100,
        bass_threshold=0.3,
        enhanced_mode={
            "active": True,
            "threshold": 0.3,
            "factor": 2.0
        }
    )
    
    # Test results
    results = {}
    
    # Test each particle type
    for particle_type in ParticleType:
        print(f"🧪 Testing {particle_type.value.upper()} particles...")
        print("-" * 40)
        
        try:
            # Create particle system
            system = UnifiedParticleSystem(particle_type=particle_type, config=base_config)
            
            # Load audio
            system.load_audio(str(song_path))
            print(f"  ✅ Audio loaded successfully")
            
            # Get system info
            status = system.get_status()
            print(f"  📊 Particle count: {status['particle_count']}")
            print(f"  🎯 Resolution: {status['config']['width']}x{status['config']['height']}")
            print(f"  ⏱️ Duration: {status['config']['duration']}s")
            print(f"  🎵 FPS: {status['config']['fps']}")
            
            # Generate output filename
            output_filename = f"particles_{particle_type.value}_{int(time.time())}.mp4"
            output_path = output_dir / output_filename
            
            # Render particles
            print(f"  🎬 Rendering to: {output_filename}")
            start_time = time.time()
            
            system.render_particles(str(output_path), str(song_path))
            
            render_time = time.time() - start_time
            
            # Check if file was created and has content
            if output_path.exists() and output_path.stat().st_size > 0:
                file_size = output_path.stat().st_size / (1024 * 1024)  # MB
                print(f"  ✅ Render completed in {render_time:.1f}s")
                print(f"  📁 File size: {file_size:.1f} MB")
                
                results[particle_type.value] = {
                    "status": "success",
                    "output_path": str(output_path),
                    "render_time": render_time,
                    "file_size": file_size,
                    "particle_count": status['particle_count']
                }
            else:
                print(f"  ❌ Render failed: No output file created")
                results[particle_type.value] = {
                    "status": "failed",
                    "error": "No output file created"
                }
                
        except Exception as e:
            print(f"  ❌ Test failed: {e}")
            results[particle_type.value] = {
                "status": "failed",
                "error": str(e)
            }
        
        print()
    
    # Print summary
    print("📊 INTEGRATION TEST SUMMARY")
    print("=" * 60)
    
    successful = 0
    total = len(ParticleType)
    
    for particle_type, result in results.items():
        if result["status"] == "success":
            print(f"✅ {particle_type.upper()}: {result['render_time']:.1f}s, {result['file_size']:.1f}MB")
            successful += 1
        else:
            print(f"❌ {particle_type.upper()}: {result.get('error', 'Unknown error')}")
    
    print(f"\n🎯 Results: {successful}/{total} particle types successful")
    
    if successful == total:
        print("🎉 All particle types working correctly!")
    else:
        print("⚠️ Some particle types failed. Check the output above.")
    
    # Create a summary file
    summary_path = output_dir / "integration_test_summary.txt"
    with open(summary_path, "w") as f:
        f.write("Unified Particle System Integration Test Summary\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"Test Date: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Audio File: {song_path}\n")
        f.write(f"Output Directory: {output_dir}\n\n")
        
        f.write("Results:\n")
        f.write("-" * 20 + "\n")
        for particle_type, result in results.items():
            if result["status"] == "success":
                f.write(f"{particle_type.upper()}: SUCCESS\n")
                f.write(f"  - Render Time: {result['render_time']:.1f}s\n")
                f.write(f"  - File Size: {result['file_size']:.1f}MB\n")
                f.write(f"  - Output: {result['output_path']}\n")
            else:
                f.write(f"{particle_type.upper()}: FAILED\n")
                f.write(f"  - Error: {result.get('error', 'Unknown error')}\n")
            f.write("\n")
        
        f.write(f"Overall: {successful}/{total} successful\n")
    
    print(f"📄 Summary saved to: {summary_path}")
    
    return successful == total


def test_specific_configurations():
    """Test specific configurations for different particle types"""
    print("\n🔧 Testing Specific Configurations")
    print("=" * 60)
    
    # Set up paths
    particles_dir = api_dir / "processing" / "music" / "generator" / "particles"
    song_path = particles_dir / "song.wav"
    output_dir = Path(__file__).parent / "particle_outputs" / "special_configs"
    
    # Create output directory
    output_dir.mkdir(exist_ok=True)
    
    # Special configurations
    special_configs = {
        "snow_high_quality": {
            "particle_type": ParticleType.SNOW,
            "config": ParticleConfig(
                width=1920,
                height=1080,
                fps=60,
                duration=15.0,
                particle_count=200,
                bass_threshold=0.2,
                enhanced_mode={
                    "active": True,
                    "threshold": 0.2,
                    "factor": 1.5
                }
            )
        },
        "enhanced_colored": {
            "particle_type": ParticleType.ENHANCED,
            "config": ParticleConfig(
                width=1280,
                height=720,
                fps=30,
                duration=12.0,
                particle_count=150,
                particle_colors=[
                    (255, 0, 0),    # Red
                    (0, 255, 0),    # Green
                    (0, 0, 255),    # Blue
                    (255, 255, 0),  # Yellow
                    (255, 0, 255),  # Magenta
                ],
                speed_z=0.1,
                bounce=True,
                bass_threshold=0.25
            )
        },
        "continuous_high_energy": {
            "particle_type": ParticleType.CONTINUOUS_SPAWNING,
            "config": ParticleConfig(
                width=1280,
                height=720,
                fps=30,
                duration=20.0,
                particle_count=50,
                max_particles=800,
                steady_spawn_rate=2.0,
                spawn_area_width=0.2,
                spawn_area_height=0.2,
                bass_threshold=0.2,
                enhanced_mode={
                    "active": True,
                    "threshold": 0.2,
                    "factor": 1.8
                }
            )
        }
    }
    
    for config_name, config_data in special_configs.items():
        print(f"🧪 Testing {config_name}...")
        
        try:
            system = UnifiedParticleSystem(
                particle_type=config_data["particle_type"],
                config=config_data["config"]
            )
            
            system.load_audio(str(song_path))
            
            output_filename = f"special_{config_name}_{int(time.time())}.mp4"
            output_path = output_dir / output_filename
            
            print(f"  🎬 Rendering: {output_filename}")
            start_time = time.time()
            
            system.render_particles(str(output_path), str(song_path))
            
            render_time = time.time() - start_time
            file_size = output_path.stat().st_size / (1024 * 1024)
            
            print(f"  ✅ Completed in {render_time:.1f}s, {file_size:.1f}MB")
            
        except Exception as e:
            print(f"  ❌ Failed: {e}")
        
        print()


def main():
    """Run all integration tests"""
    print("🚀 Starting Unified Particle System Integration Tests")
    print("=" * 70)
    
    # Run main integration test
    success = test_particle_integration()
    
    # Run special configuration tests
    test_specific_configurations()
    
    print("\n🎯 INTEGRATION TEST COMPLETE")
    print("=" * 70)
    
    if success:
        print("✅ All basic particle types working correctly!")
        print("📁 Check the 'particle_outputs' directory for generated videos")
    else:
        print("⚠️ Some tests failed. Check the output above for details.")
    
    print("\n📋 Generated Files:")
    output_dir = Path(__file__).parent / "particle_outputs"
    if output_dir.exists():
        for file in output_dir.rglob("*.mp4"):
            size = file.stat().st_size / (1024 * 1024)
            print(f"  📹 {file.name} ({size:.1f}MB)")
    
    return success


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
