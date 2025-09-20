#!/usr/bin/env python3
"""
Final comprehensive test for the Unified Particle System.
This script generates final outputs for all particle types with the song.wav file.
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


def generate_final_outputs():
    """Generate final outputs for all particle types"""
    print("🎬 FINAL PARTICLE SYSTEM TEST")
    print("=" * 60)
    
    # Set up paths
    particles_dir = api_dir / "processing" / "music" / "generator" / "particles"
    song_path = particles_dir / "song.wav"
    output_dir = Path(__file__).parent / "final_outputs"
    
    # Create output directory
    output_dir.mkdir(exist_ok=True)
    
    # Check if song file exists
    if not song_path.exists():
        print(f"❌ Song file not found: {song_path}")
        return False
    
    print(f"🎵 Audio source: {song_path}")
    print(f"📁 Output directory: {output_dir}")
    print()
    
    # High-quality configuration for final outputs
    final_config = ParticleConfig(
        width=1920,
        height=1080,
        fps=30,
        duration=15.0,
        particle_count=200,
        bass_threshold=0.3,
        enhanced_mode={
            "active": True,
            "threshold": 0.3,
            "factor": 2.0
        }
    )
    
    # Results tracking
    results = {}
    
    # Generate outputs for each particle type
    for particle_type in ParticleType:
        print(f"🎨 Generating {particle_type.value.upper()} particles...")
        print("-" * 50)
        
        try:
            # Create particle system
            system = UnifiedParticleSystem(particle_type=particle_type, config=final_config)
            
            # Load audio
            system.load_audio(str(song_path))
            print(f"  ✅ Audio loaded")
            
            # Get system info
            status = system.get_status()
            print(f"  📊 Particles: {status['particle_count']}")
            print(f"  🎯 Resolution: {status['config']['width']}x{status['config']['height']}")
            print(f"  ⏱️ Duration: {status['config']['duration']}s")
            
            # Generate output filename
            output_filename = f"FINAL_{particle_type.value.upper()}_PARTICLES.mp4"
            output_path = output_dir / output_filename
            
            # Render particles
            print(f"  🎬 Rendering: {output_filename}")
            start_time = time.time()
            
            system.render_particles(str(output_path), str(song_path))
            
            render_time = time.time() - start_time
            
            # Check output
            if output_path.exists() and output_path.stat().st_size > 0:
                file_size = output_path.stat().st_size / (1024 * 1024)  # MB
                print(f"  ✅ Completed in {render_time:.1f}s")
                print(f"  📁 File size: {file_size:.1f} MB")
                
                results[particle_type.value] = {
                    "status": "success",
                    "output_path": str(output_path),
                    "filename": output_filename,
                    "render_time": render_time,
                    "file_size": file_size,
                    "particle_count": status['particle_count']
                }
            else:
                print(f"  ❌ Render failed: No output file")
                results[particle_type.value] = {
                    "status": "failed",
                    "error": "No output file created"
                }
                
        except Exception as e:
            print(f"  ❌ Failed: {e}")
            results[particle_type.value] = {
                "status": "failed",
                "error": str(e)
            }
        
        print()
    
    # Generate special configurations
    print("🌟 Generating Special Configurations...")
    print("-" * 50)
    
    special_configs = {
        "SNOW_HIGH_QUALITY": {
            "particle_type": ParticleType.SNOW,
            "config": ParticleConfig(
                width=1920,
                height=1080,
                fps=60,
                duration=20.0,
                particle_count=300,
                bass_threshold=0.2,
                enhanced_mode={
                    "active": True,
                    "threshold": 0.2,
                    "factor": 1.5
                }
            )
        },
        "ENHANCED_RAINBOW": {
            "particle_type": ParticleType.ENHANCED,
            "config": ParticleConfig(
                width=1920,
                height=1080,
                fps=30,
                duration=18.0,
                particle_count=250,
                particle_colors=[
                    (255, 0, 0),    # Red
                    (255, 127, 0),  # Orange
                    (255, 255, 0),  # Yellow
                    (0, 255, 0),    # Green
                    (0, 0, 255),    # Blue
                    (75, 0, 130),   # Indigo
                    (148, 0, 211),  # Violet
                ],
                speed_z=0.2,
                bounce=True,
                bass_threshold=0.25
            )
        },
        "CONTINUOUS_ENERGY": {
            "particle_type": ParticleType.CONTINUOUS_SPAWNING,
            "config": ParticleConfig(
                width=1920,
                height=1080,
                fps=30,
                duration=25.0,
                particle_count=100,
                max_particles=1000,
                steady_spawn_rate=3.0,
                spawn_area_width=0.3,
                spawn_area_height=0.3,
                bass_threshold=0.2,
                enhanced_mode={
                    "active": True,
                    "threshold": 0.2,
                    "factor": 2.5
                }
            )
        }
    }
    
    for config_name, config_data in special_configs.items():
        print(f"🎨 Generating {config_name}...")
        
        try:
            system = UnifiedParticleSystem(
                particle_type=config_data["particle_type"],
                config=config_data["config"]
            )
            
            system.load_audio(str(song_path))
            
            output_filename = f"FINAL_{config_name}.mp4"
            output_path = output_dir / output_filename
            
            print(f"  🎬 Rendering: {output_filename}")
            start_time = time.time()
            
            system.render_particles(str(output_path), str(song_path))
            
            render_time = time.time() - start_time
            file_size = output_path.stat().st_size / (1024 * 1024)
            
            print(f"  ✅ Completed in {render_time:.1f}s, {file_size:.1f}MB")
            
            results[config_name.lower()] = {
                "status": "success",
                "output_path": str(output_path),
                "filename": output_filename,
                "render_time": render_time,
                "file_size": file_size,
                "particle_count": config_data["config"].particle_count
            }
            
        except Exception as e:
            print(f"  ❌ Failed: {e}")
            results[config_name.lower()] = {
                "status": "failed",
                "error": str(e)
            }
        
        print()
    
    # Print final summary
    print("📊 FINAL TEST SUMMARY")
    print("=" * 60)
    
    successful = 0
    total = len(results)
    total_size = 0
    total_time = 0
    
    for name, result in results.items():
        if result["status"] == "success":
            print(f"✅ {name.upper()}: {result['render_time']:.1f}s, {result['file_size']:.1f}MB")
            successful += 1
            total_size += result['file_size']
            total_time += result['render_time']
        else:
            print(f"❌ {name.upper()}: {result.get('error', 'Unknown error')}")
    
    print(f"\n🎯 Results: {successful}/{total} successful")
    print(f"📁 Total size: {total_size:.1f} MB")
    print(f"⏱️ Total time: {total_time:.1f} s")
    
    # Create comprehensive summary file
    summary_path = output_dir / "FINAL_TEST_SUMMARY.txt"
    with open(summary_path, "w") as f:
        f.write("UNIFIED PARTICLE SYSTEM - FINAL TEST SUMMARY\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"Test Date: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Audio File: {song_path}\n")
        f.write(f"Output Directory: {output_dir}\n\n")
        
        f.write("PARTICLE TYPES TESTED:\n")
        f.write("-" * 25 + "\n")
        for particle_type in ParticleType:
            f.write(f"• {particle_type.value.upper()}\n")
        f.write("\n")
        
        f.write("SPECIAL CONFIGURATIONS:\n")
        f.write("-" * 25 + "\n")
        f.write("• SNOW_HIGH_QUALITY - High-quality snow particles\n")
        f.write("• ENHANCED_RAINBOW - Rainbow colored enhanced particles\n")
        f.write("• CONTINUOUS_ENERGY - High-energy continuous spawning\n\n")
        
        f.write("RESULTS:\n")
        f.write("-" * 10 + "\n")
        for name, result in results.items():
            if result["status"] == "success":
                f.write(f"{name.upper()}: SUCCESS\n")
                f.write(f"  - File: {result['filename']}\n")
                f.write(f"  - Render Time: {result['render_time']:.1f}s\n")
                f.write(f"  - File Size: {result['file_size']:.1f}MB\n")
                f.write(f"  - Particles: {result['particle_count']}\n")
            else:
                f.write(f"{name.upper()}: FAILED\n")
                f.write(f"  - Error: {result.get('error', 'Unknown error')}\n")
            f.write("\n")
        
        f.write(f"OVERALL STATISTICS:\n")
        f.write(f"-" * 20 + "\n")
        f.write(f"Successful: {successful}/{total}\n")
        f.write(f"Total Size: {total_size:.1f} MB\n")
        f.write(f"Total Time: {total_time:.1f} s\n")
        f.write(f"Average Size: {total_size/successful:.1f} MB per video\n")
        f.write(f"Average Time: {total_time/successful:.1f} s per video\n")
    
    print(f"📄 Comprehensive summary saved to: {summary_path}")
    
    # List all generated files
    print(f"\n📁 Generated Files in {output_dir}:")
    for file in sorted(output_dir.glob("*.mp4")):
        size = file.stat().st_size / (1024 * 1024)
        print(f"  📹 {file.name} ({size:.1f}MB)")
    
    return successful == total


def main():
    """Run the final test"""
    print("🚀 UNIFIED PARTICLE SYSTEM - FINAL INTEGRATION TEST")
    print("=" * 70)
    
    success = generate_final_outputs()
    
    print("\n🎯 FINAL TEST COMPLETE")
    print("=" * 70)
    
    if success:
        print("🎉 ALL TESTS PASSED!")
        print("✅ All particle types and configurations working correctly")
        print("📁 Check the 'final_outputs' directory for all generated videos")
        print("📄 See 'FINAL_TEST_SUMMARY.txt' for detailed results")
    else:
        print("⚠️ Some tests failed. Check the output above for details.")
    
    return success


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
