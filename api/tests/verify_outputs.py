#!/usr/bin/env python3
"""
Verification script to check that all generated visualizer outputs are valid
"""

import os
import cv2
from pathlib import Path

def verify_video_file(file_path):
    """Verify that a video file is valid and readable"""
    try:
        cap = cv2.VideoCapture(file_path)
        
        if not cap.isOpened():
            return False, "Cannot open video file"
        
        # Get video properties
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = frame_count / fps if fps > 0 else 0
        
        # Try to read first frame
        ret, frame = cap.read()
        if not ret:
            return False, "Cannot read first frame"
        
        cap.release()
        
        return True, {
            "frame_count": frame_count,
            "fps": fps,
            "width": width,
            "height": height,
            "duration": duration,
            "file_size": os.path.getsize(file_path) / (1024 * 1024)  # MB
        }
        
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    """Main verification function"""
    print("🔍 Verifying Visualizer Output Files")
    print("=" * 50)
    
    test_dir = Path("api/tests/complete_outputs")
    
    # Find all test video files
    video_files = list(test_dir.glob("*.mp4"))
    
    if not video_files:
        print("❌ No test video files found")
        return False
    
    print(f"📁 Found {len(video_files)} video files to verify")
    print()
    
    all_valid = True
    results = []
    
    for video_file in sorted(video_files):
        print(f"🎬 Verifying: {video_file.name}")
        
        is_valid, info = verify_video_file(str(video_file))
        
        if is_valid:
            print(f"   ✅ Valid - {info['width']}x{info['height']}, {info['duration']:.1f}s, {info['file_size']:.1f}MB")
            results.append({
                "file": video_file.name,
                "status": "valid",
                "info": info
            })
        else:
            print(f"   ❌ Invalid - {info}")
            results.append({
                "file": video_file.name,
                "status": "invalid",
                "error": info
            })
            all_valid = False
        
        print()
    
    # Summary
    print("📊 VERIFICATION SUMMARY")
    print("=" * 50)
    
    valid_count = sum(1 for r in results if r["status"] == "valid")
    total_count = len(results)
    
    print(f"✅ Valid files: {valid_count}/{total_count}")
    print(f"❌ Invalid files: {total_count - valid_count}/{total_count}")
    
    if all_valid:
        print("🎉 All video files are valid!")
        print()
        print("📋 File Details:")
        for result in results:
            if result["status"] == "valid":
                info = result["info"]
                print(f"   • {result['file']}: {info['width']}x{info['height']}, {info['duration']:.1f}s, {info['file_size']:.1f}MB")
    else:
        print("⚠️ Some files are invalid:")
        for result in results:
            if result["status"] == "invalid":
                print(f"   • {result['file']}: {result['error']}")
    
    return all_valid

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
