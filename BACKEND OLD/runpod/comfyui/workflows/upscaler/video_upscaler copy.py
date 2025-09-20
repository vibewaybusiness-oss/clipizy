import os
import random
from pathlib import Path
import json
import time
import subprocess
import cv2
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from moviepy.editor import VideoFileClip, concatenate_videoclips

from ..comfyui import ComfyUI
from ...logger import Scripts
from ...mediaProcessing.video.video import Video

class VideoUpscaler:
    def __init__(self):
        self.server_address = "127.0.0.1:8188"
        self.package_dir = os.path.dirname(__file__)
        self.comfyui = ComfyUI()
        self.scripts = Scripts("Video Upscaler")
        self.logger = self.scripts  # Quiet initialization
        self.max_frames_per_chunk = 10000  # Reduced from 5000 to prevent server overload
        self.video_processor = Video()  # Initialize video processor for corruption checks

    def get_video_info(self, video_path: str):
        """Get video information including frame count"""
        try:
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                self.scripts.error(f"Could not open video: {video_path}")
                return None
            
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = frame_count / fps if fps > 0 else 0
            
            cap.release()
            
            info = {
                "frame_count": frame_count,
                "fps": fps,
                "width": width,
                "height": height,
                "duration": duration
            }
            
            self.scripts.log(f"Video info for {video_path}: {info}")
            return info
            
        except Exception as e:
            self.scripts.error(f"Error getting video info: {str(e)}")
            return None

    def split_video_by_frames(self, input_path: str, max_frames_per_chunk: int = None):
        """
        Split video into chunks based on frame count
        
        Args:
            input_path (str): Path to input video
            max_frames_per_chunk (int): Maximum frames per chunk (default: self.max_frames_per_chunk)
            
        Returns:
            list: List of chunk file paths
        """
        if max_frames_per_chunk is None:
            max_frames_per_chunk = self.max_frames_per_chunk
            
        try:
            # Get video info
            video_info = self.get_video_info(input_path)
            if video_info is None:
                return []
            
            frame_count = video_info["frame_count"]
            fps = video_info["fps"]
            duration = video_info["duration"]
            
            self.scripts.log(f"Splitting video with {frame_count} frames at {fps} fps")
            
            # Check if splitting is needed
            if frame_count <= max_frames_per_chunk:
                self.scripts.log(f"Video has {frame_count} frames, no splitting needed")
                return [input_path]
            
            # Calculate chunk duration based on frame count
            chunk_duration = max_frames_per_chunk / fps
            total_chunks = int(frame_count / max_frames_per_chunk) + 1
            
            self.scripts.log(f"Splitting {frame_count} frames into {total_chunks} chunks of ~{max_frames_per_chunk} frames each")
            
            # Create chunks directory
            base_dir = os.path.dirname(input_path)
            chunks_dir = os.path.join(base_dir, "frame_chunks")
            os.makedirs(chunks_dir, exist_ok=True)
            
            chunk_paths = []
            
            for i in range(total_chunks):
                start_time = i * chunk_duration
                # Calculate end time to ensure finite cuts
                end_time = min((i + 1) * chunk_duration, duration)
                actual_chunk_duration = end_time - start_time
                
                # Skip if chunk duration is too small
                if actual_chunk_duration < 0.1:  # Less than 100ms
                    self.scripts.log(f"⚠️ Skipping chunk {i+1} - duration too small: {actual_chunk_duration:.3f}s")
                    continue
                
                chunk_filename = f"frame_chunk_{i:04d}.mp4"
                chunk_path = os.path.join(chunks_dir, chunk_filename)
                
                # Use ffmpeg with more robust parameters to ensure valid chunks
                # Use re-encoding instead of copy to ensure proper keyframes
                # Use -to instead of -t for more precise timing
                cmd = [
                    'ffmpeg', '-y', '-i', input_path,
                    '-ss', str(start_time), '-to', str(end_time),
                    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                    '-avoid_negative_ts', 'make_zero',
                    '-fflags', '+genpts',
                    '-force_key_frames', f'expr:gte(t,{start_time})',  # Force keyframe at start
                    '-pix_fmt', 'yuv420p',  # Ensure compatible pixel format
                    '-movflags', '+faststart',  # Optimize for streaming
                    chunk_path
                ]
                
                self.scripts.log(f"Creating chunk {i+1}/{total_chunks} with command: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode == 0 and os.path.exists(chunk_path):
                    # Verify chunk has content and is valid
                    if os.path.getsize(chunk_path) > 0:
                        # Enhanced validation using the video processor
                        try:
                            # First check with OpenCV
                            test_cap = cv2.VideoCapture(chunk_path)
                            if test_cap.isOpened():
                                test_frame_count = int(test_cap.get(cv2.CAP_PROP_FRAME_COUNT))
                                test_fps = test_cap.get(cv2.CAP_PROP_FPS)
                                test_width = int(test_cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                                test_height = int(test_cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                                test_cap.release()
                                
                                if test_frame_count > 0 and test_fps > 0 and test_width > 0 and test_height > 0:
                                    # Additional validation using video processor
                                    if self.video_processor.check_video_corruption(chunk_path):
                                        chunk_paths.append(chunk_path)
                                        self.scripts.log(f"✅ Created valid frame chunk {i+1}/{total_chunks}: {chunk_path} ({test_frame_count} frames, {test_fps:.2f} fps, {test_width}x{test_height})")
                                    else:
                                        self.scripts.log(f"❌ Chunk {i+1} failed corruption check, skipping")
                                        if os.path.exists(chunk_path):
                                            os.remove(chunk_path)
                                else:
                                    self.scripts.log(f"❌ Chunk {i+1} has invalid properties (frames: {test_frame_count}, fps: {test_fps}, size: {test_width}x{test_height}), skipping")
                                    if os.path.exists(chunk_path):
                                        os.remove(chunk_path)
                            else:
                                self.scripts.log(f"❌ Chunk {i+1} cannot be opened by OpenCV, skipping")
                                if os.path.exists(chunk_path):
                                    os.remove(chunk_path)
                        except Exception as e:
                            self.scripts.log(f"❌ Error validating chunk {i+1}: {str(e)}")
                            if os.path.exists(chunk_path):
                                os.remove(chunk_path)
                    else:
                        self.scripts.log(f"❌ Chunk {i+1} is empty, skipping")
                        if os.path.exists(chunk_path):
                            os.remove(chunk_path)
                else:
                    self.scripts.error(f"❌ Failed to create frame chunk {i+1}: {result.stderr}")
                    # Don't break, continue with other chunks
                    continue
            
            if len(chunk_paths) == 0:
                self.scripts.error("❌ No valid chunks were created, falling back to original video")
                return [input_path]
            
            self.scripts.log(f"✅ Successfully created {len(chunk_paths)} valid frame-based video chunks")
            return chunk_paths
            
        except Exception as e:
            self.scripts.error(f"Error splitting video by frames: {str(e)}")
            return []

    def split_video_by_duration(self, input_path: str, max_duration: float = 20.0):
        """
        Split video into chunks based on duration (fallback method)
        
        Args:
            input_path (str): Path to input video
            max_duration (float): Maximum duration per chunk in seconds
            
        Returns:
            list: List of chunk file paths
        """
        try:
            # Get video info
            video_info = self.get_video_info(input_path)
            if video_info is None:
                return []
            
            duration = video_info["duration"]
            fps = video_info["fps"]
            
            self.scripts.log(f"Splitting video with duration {duration:.2f}s at {fps} fps")
            
            # Check if splitting is needed
            if duration <= max_duration:
                self.scripts.log(f"Video has {duration:.2f}s duration, no splitting needed")
                return [input_path]
            
            # Calculate number of chunks
            total_chunks = int(duration / max_duration) + 1
            
            self.scripts.log(f"Splitting {duration:.2f}s into {total_chunks} chunks of ~{max_duration}s each")
            
            # Create chunks directory
            base_dir = os.path.dirname(input_path)
            chunks_dir = os.path.join(base_dir, "duration_chunks")
            os.makedirs(chunks_dir, exist_ok=True)
            
            chunk_paths = []
            
            for i in range(total_chunks):
                start_time = i * max_duration
                # Calculate end time to ensure finite cuts
                end_time = min((i + 1) * max_duration, duration)
                actual_chunk_duration = end_time - start_time
                
                chunk_filename = f"duration_chunk_{i:04d}.mp4"
                chunk_path = os.path.join(chunks_dir, chunk_filename)
                
                # Use ffmpeg with duration-based splitting
                # Use -to instead of -t for more precise timing
                cmd = [
                    'ffmpeg', '-y', '-i', input_path,
                    '-ss', str(start_time), '-to', str(end_time),
                    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                    '-avoid_negative_ts', 'make_zero',
                    '-fflags', '+genpts',
                    '-force_key_frames', f'expr:gte(t,{start_time})',  # Force keyframe at start
                    chunk_path
                ]
                
                self.scripts.log(f"Creating duration chunk {i+1}/{total_chunks} with command: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode == 0 and os.path.exists(chunk_path):
                    # Verify chunk has content and is valid
                    if os.path.getsize(chunk_path) > 0:
                        # Additional validation: try to read the chunk with OpenCV
                        try:
                            test_cap = cv2.VideoCapture(chunk_path)
                            if test_cap.isOpened():
                                test_frame_count = int(test_cap.get(cv2.CAP_PROP_FRAME_COUNT))
                                test_cap.release()
                                if test_frame_count > 0:
                                    chunk_paths.append(chunk_path)
                                    self.scripts.log(f"✅ Created valid duration chunk {i+1}/{total_chunks}: {chunk_path} ({test_frame_count} frames)")
                                else:
                                    self.scripts.log(f"❌ Duration chunk {i+1} has 0 frames, skipping")
                                    if os.path.exists(chunk_path):
                                        os.remove(chunk_path)
                            else:
                                self.scripts.log(f"❌ Duration chunk {i+1} cannot be opened by OpenCV, skipping")
                                if os.path.exists(chunk_path):
                                    os.remove(chunk_path)
                        except Exception as e:
                            self.scripts.log(f"❌ Error validating duration chunk {i+1}: {str(e)}")
                            if os.path.exists(chunk_path):
                                os.remove(chunk_path)
                    else:
                        self.scripts.log(f"❌ Duration chunk {i+1} is empty, skipping")
                        if os.path.exists(chunk_path):
                            os.remove(chunk_path)
                else:
                    self.scripts.error(f"❌ Failed to create duration chunk {i+1}: {result.stderr}")
                    continue
            
            if len(chunk_paths) == 0:
                self.scripts.error("❌ No valid duration chunks were created")
                return []
            
            self.scripts.log(f"✅ Successfully created {len(chunk_paths)} valid duration-based video chunks")
            return chunk_paths
            
        except Exception as e:
            self.scripts.error(f"Error splitting video by duration: {str(e)}")
            return []

    def cleanup_temp_chunks(self, chunk_paths: list):
        """
        Clean up temporary chunk files
        
        Args:
            chunk_paths (list): List of chunk file paths to clean up
        """
        try:
            for chunk_path in chunk_paths:
                try:
                    if os.path.exists(chunk_path) and ("frame_chunks" in chunk_path or "duration_chunks" in chunk_path):
                        os.remove(chunk_path)
                        self.scripts.log(f"Cleaned up temp chunk: {chunk_path}")
                except Exception as e:
                    self.scripts.log(f"Warning: Could not clean up temp chunk {chunk_path}: {str(e)}")
                    
            # Try to remove the chunks directories if empty
            try:
                for chunk_path in chunk_paths:
                    if "frame_chunks" in chunk_path or "duration_chunks" in chunk_path:
                        chunks_dir = os.path.dirname(chunk_path)
                        if os.path.exists(chunks_dir) and not os.listdir(chunks_dir):
                            os.rmdir(chunks_dir)
                            self.scripts.log(f"Removed empty chunks directory: {chunks_dir}")
                        break
            except Exception as e:
                self.scripts.log(f"Warning: Could not remove chunks directory: {str(e)}")
                
        except Exception as e:
            self.scripts.error(f"Error in cleanup_temp_chunks: {str(e)}")

    def cleanup_chunk_files(self, directory_path: str):
        """
        Clean up any remaining chunk files in the output directory
        
        Args:
            directory_path (str): Directory path to clean up
        """
        try:
            if not os.path.exists(directory_path):
                return
                
            chunk_patterns = [
                "upscaler_chunk_",
                "frame_chunk_",
                "duration_chunk_"
            ]
            
            cleaned_count = 0
            for filename in os.listdir(directory_path):
                if any(filename.startswith(pattern) for pattern in chunk_patterns):
                    file_path = os.path.join(directory_path, filename)
                    try:
                        if os.path.isfile(file_path):
                            os.remove(file_path)
                            cleaned_count += 1
                            self.scripts.log(f"Cleaned up chunk file: {filename}")
                    except Exception as e:
                        self.scripts.log(f"Warning: Could not clean up chunk file {filename}: {str(e)}")
            
            if cleaned_count > 0:
                self.scripts.log(f"✅ Cleaned up {cleaned_count} chunk files from {directory_path}")
                
        except Exception as e:
            self.scripts.error(f"Error in cleanup_chunk_files: {str(e)}")

    def check_server_health(self):
        """
        Check if ComfyUI server is healthy and ready for processing
        
        Returns:
            bool: True if server is healthy, False otherwise
        """
        try:
            if not self.comfyui.is_server_running():
                self.scripts.error("❌ ComfyUI server is not running")
                return False
            
            # Additional health checks can be added here
            # For now, just check if server responds
            return True
            
        except Exception as e:
            self.scripts.error(f"❌ Error checking server health: {str(e)}")
            return False

    def debug_video_chunk(self, chunk_path: str):
        """
        Debug a specific video chunk to identify issues.
        
        Args:
            chunk_path (str): Path to the video chunk to debug
            
        Returns:
            dict: Debug information about the chunk
        """
        try:
            debug_info = {
                "path": chunk_path,
                "exists": False,
                "file_size": 0,
                "opencv_valid": False,
                "corruption_check": False,
                "video_properties": {},
                "comfyui_compatible": False,
                "errors": []
            }
            
            # Check if file exists
            if os.path.exists(chunk_path):
                debug_info["exists"] = True
                debug_info["file_size"] = os.path.getsize(chunk_path)
            else:
                debug_info["errors"].append("File does not exist")
                return debug_info
            
            # Check file size
            if debug_info["file_size"] == 0:
                debug_info["errors"].append("File is empty")
                return debug_info
            
            # Test with OpenCV
            try:
                cap = cv2.VideoCapture(chunk_path)
                if cap.isOpened():
                    debug_info["opencv_valid"] = True
                    
                    # Get video properties
                    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    fps = cap.get(cv2.CAP_PROP_FPS)
                    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    duration = frame_count / fps if fps > 0 else 0
                    
                    debug_info["video_properties"] = {
                        "frame_count": frame_count,
                        "fps": fps,
                        "width": width,
                        "height": height,
                        "duration": duration
                    }
                    
                    # Check if properties are valid
                    if frame_count <= 0:
                        debug_info["errors"].append(f"Invalid frame count: {frame_count}")
                    if fps <= 0 or fps > 120:
                        debug_info["errors"].append(f"Invalid FPS: {fps}")
                    if width <= 0 or height <= 0:
                        debug_info["errors"].append(f"Invalid dimensions: {width}x{height}")
                    if width > 8192 or height > 8192:
                        debug_info["errors"].append(f"Dimensions too large for ComfyUI: {width}x{height}")
                    
                    # Try to read first frame
                    ret, frame = cap.read()
                    if not ret or frame is None:
                        debug_info["errors"].append("Cannot read first frame")
                    else:
                        debug_info["first_frame_shape"] = frame.shape
                    
                    cap.release()
                else:
                    debug_info["errors"].append("Cannot open with OpenCV")
            except Exception as e:
                debug_info["errors"].append(f"OpenCV error: {str(e)}")
            
            # Test corruption check
            try:
                debug_info["corruption_check"] = self.video_processor.check_video_corruption(chunk_path)
            except Exception as e:
                debug_info["errors"].append(f"Corruption check error: {str(e)}")
            
            # Check ComfyUI compatibility
            if (debug_info["opencv_valid"] and 
                debug_info["video_properties"].get("fps", 0) > 0 and 
                debug_info["video_properties"].get("fps", 0) <= 120 and
                debug_info["video_properties"].get("width", 0) > 0 and
                debug_info["video_properties"].get("height", 0) > 0 and
                debug_info["video_properties"].get("width", 0) <= 8192 and
                debug_info["video_properties"].get("height", 0) <= 8192 and
                debug_info["corruption_check"]):
                debug_info["comfyui_compatible"] = True
            
            return debug_info
            
        except Exception as e:
            return {
                "path": chunk_path,
                "exists": False,
                "file_size": 0,
                "opencv_valid": False,
                "corruption_check": False,
                "video_properties": {},
                "comfyui_compatible": False,
                "errors": [f"Debug error: {str(e)}"]
            }

    def check_previous_concatenation_chunks(self, output_dir: str, expected_duration: float = None):
        """
        Check for previous concatenation chunks and clean them up if they exist.
        This ensures uninterrupted upscaling by cleaning up old chunks.
        
        Args:
            output_dir (str): Directory to check for previous chunks
            expected_duration (float): Expected duration of the interpolated video
            
        Returns:
            bool: True if cleanup was successful or no chunks found, False otherwise
        """
        try:
            if not os.path.exists(output_dir):
                return True
            
            # Look for upscaler chunk files
            chunk_patterns = [
                "upscaler_chunk_",
                "upscaler_",
                "frame_chunk_",
                "duration_chunk_"
            ]
            
            found_chunks = []
            for filename in os.listdir(output_dir):
                if any(filename.startswith(pattern) for pattern in chunk_patterns):
                    file_path = os.path.join(output_dir, filename)
                    if os.path.isfile(file_path):
                        found_chunks.append(file_path)
            
            if not found_chunks:
                self.scripts.log("✅ No previous concatenation chunks found")
                return True
            
            self.scripts.log(f"🧹 Found {len(found_chunks)} previous concatenation chunks, cleaning up...")
            
            # If we have expected duration, validate chunks before cleanup
            if expected_duration is not None:
                total_duration = 0
                valid_chunks = []
                
                for chunk_path in found_chunks:
                    try:
                        # Check if chunk is not corrupted
                        if self.video_processor.check_video_corruption(chunk_path):
                            # Get chunk duration
                            cap = cv2.VideoCapture(chunk_path)
                            if cap.isOpened():
                                chunk_duration = cap.get(cv2.CAP_PROP_FRAME_COUNT) / cap.get(cv2.CAP_PROP_FPS)
                                cap.release()
                                total_duration += chunk_duration
                                valid_chunks.append(chunk_path)
                            else:
                                cap.release()
                    except Exception as e:
                        self.scripts.log(f"Warning: Error checking chunk {chunk_path}: {str(e)}")
                
                # If total duration matches expected duration, these might be valid chunks
                if abs(total_duration - expected_duration) < 1.0:  # Within 1 second tolerance
                    self.scripts.log(f"⚠️ Found chunks with matching duration ({total_duration:.2f}s ≈ {expected_duration:.2f}s), cleaning up anyway for fresh start")
                else:
                    self.scripts.log(f"ℹ️ Previous chunks duration ({total_duration:.2f}s) doesn't match expected ({expected_duration:.2f}s)")
            
            # Clean up all found chunks
            cleaned_count = 0
            for chunk_path in found_chunks:
                try:
                    os.remove(chunk_path)
                    cleaned_count += 1
                    self.scripts.log(f"✅ Cleaned up previous chunk: {os.path.basename(chunk_path)}")
                except Exception as e:
                    self.scripts.log(f"⚠️ Could not clean up chunk {os.path.basename(chunk_path)}: {str(e)}")
            
            self.scripts.log(f"🎯 Cleaned up {cleaned_count}/{len(found_chunks)} previous concatenation chunks")
            return True
            
        except Exception as e:
            self.scripts.error(f"❌ Error checking previous concatenation chunks: {str(e)}")
            return False

    def generate_unique_chunk_name(self, base_seed: str, chunk_index: int, total_chunks: int, timestamp: str = None):
        """
        Generate a unique name for upscaled chunks to prevent conflicts.
        
        Args:
            base_seed (str): Base seed for the video
            chunk_index (int): Index of the chunk
            total_chunks (int): Total number of chunks
            timestamp (str): Optional timestamp to make names more unique
            
        Returns:
            str: Unique chunk name
        """
        try:
            if timestamp is None:
                timestamp = str(int(time.time() * 1000))  # Millisecond timestamp
            
            # Create a unique identifier combining seed, index, total, and timestamp
            unique_id = f"{base_seed}_{chunk_index:04d}_{total_chunks:04d}_{timestamp}"
            return f"upscaler_chunk_{unique_id}.mp4"
            
        except Exception as e:
            self.scripts.log(f"Warning: Error generating unique chunk name: {str(e)}")
            # Fallback to simple naming
            return f"upscaler_chunk_{base_seed}_{chunk_index:04d}.mp4"

    def upscale_video_process(self, input_path: str, frame_rate: float = 25.0, output_path: str = None, seed: str = None):
        """
        Main processing function for video upscaling with chunk handling and parallel concatenation.
        This ensures uninterrupted upscaling by handling concatenation in the workflow.
        
        Args:
            input_path (str): Path to the input video
            frame_rate (float): Output frame rate (default: 25.0)
            output_path (str): Final output path for the concatenated video (REQUIRED)
            seed (str): Seed for generation
            
        Returns:
            bool: True if processing was successful, False otherwise
        """
        try:
            self.scripts.log(f"🚀 Starting uninterrupted video upscaling process for: {input_path}")
            
            # Check server health before starting
            if not self.check_server_health():
                self.scripts.error("❌ Server health check failed, aborting upscaling")
                return False
            
            # Require output_path parameter
            if output_path is None:
                self.scripts.error("❌ output_path parameter is required but not specified")
                return False
            
            # Ensure seed is an integer
            if seed is not None:
                try:
                    seed = int(seed)
                except (ValueError, TypeError):
                    self.scripts.error(f"Invalid seed value: {seed}. Using random seed instead.")
                    seed = random.randint(1, 2**63 - 1)
            else:
                seed = random.randint(1, 2**63 - 1)
            
            self.scripts.log(f"Using seed: {seed} (type: {type(seed)})")
            self.scripts.log(f"Output path: {output_path}")
            
            # Get video info for duration checking
            video_info = self.get_video_info(input_path)
            expected_duration = video_info["duration"] if video_info else None
            
            # Clean up previous concatenation chunks before starting
            output_dir = os.path.dirname(output_path)
            if not self.check_previous_concatenation_chunks(output_dir, expected_duration):
                self.scripts.log("⚠️ Previous chunk cleanup had issues, but continuing...")
            
            # Check if video needs to be chunked
            video_chunks = self.check_video_chunks(input_path)
            self.scripts.log(f"Video will be processed as {len(video_chunks)} chunk(s)")
            
            # If chunking failed and we only have the original video, try processing it directly
            if len(video_chunks) == 1 and video_chunks[0] == input_path:
                if video_info and video_info["frame_count"] > self.max_frames_per_chunk:
                    self.scripts.log(f"⚠️ Chunking failed for large video ({video_info['frame_count']} frames), attempting direct processing")
                    # Try to process the video directly as a fallback
                    return self.upscale_video(
                        input_path=input_path,
                        frame_rate=frame_rate,
                        output_path=output_path,
                        seed=seed
                    )
            
            # Generate unique timestamp for this upscaling session
            session_timestamp = str(int(time.time() * 1000))
            
            # Process each chunk
            upscaled_chunks = []
            temp_chunks_to_cleanup = []
            
            try:
                for i, chunk_path in enumerate(video_chunks):
                    # Generate unique chunk name
                    chunk_seed = f"{seed}_chunk_{i:04d}" if len(video_chunks) > 1 else seed
                    chunk_filename = self.generate_unique_chunk_name(seed, i, len(video_chunks), session_timestamp)
                    chunk_output_path = os.path.join(output_dir, chunk_filename)
                    
                    self.scripts.log(f"🎯 Processing chunk {i+1}/{len(video_chunks)}: {chunk_path}")
                    self.scripts.log(f"🔍 Chunk output: {chunk_output_path}")
                    
                    # Check server health before each chunk
                    if not self.check_server_health():
                        self.scripts.error(f"❌ Server health check failed before chunk {i+1}, aborting")
                        return False
                    
                    try:
                        success = self.upscale_video(
                            input_path=chunk_path,
                            frame_rate=frame_rate,
                            output_path=chunk_output_path,
                            seed=chunk_seed
                        )
                        
                        if success:
                            upscaled_chunks.append(chunk_output_path)
                            # Mark original chunk for cleanup if it's a temporary split
                            if chunk_path != input_path and ("frame_chunks" in chunk_path or "duration_chunks" in chunk_path):
                                temp_chunks_to_cleanup.append(chunk_path)
                            self.scripts.log(f"✅ Successfully processed chunk {i+1}: {chunk_path}")
                        else:
                            self.scripts.error(f"❌ Failed to process chunk {i+1}: {chunk_path}")
                            # If this is a single chunk, return False
                            if len(video_chunks) == 1:
                                return False
                            # If multiple chunks, continue with others but log the failure
                            self.scripts.log(f"Continuing with remaining chunks...")
                    except Exception as e:
                        self.scripts.error(f"❌ Exception processing chunk {i+1}: {str(e)}")
                        # If this is a single chunk, return False
                        if len(video_chunks) == 1:
                            return False
                        # If multiple chunks, continue with others but log the failure
                        self.scripts.log(f"Continuing with remaining chunks...")
                
                # If we have multiple chunks, concatenate them using parallel processing
                if len(upscaled_chunks) > 1:
                    self.scripts.log(f"🔄 Concatenating {len(upscaled_chunks)} upscaled chunks using parallel processing")
                    success = self.concatenate_chunks_parallel(upscaled_chunks, output_path, max_workers=3)
                    if success:
                        self.scripts.log(f"✅ Video upscaling completed successfully with parallel concatenation")
                        # Clean up temporary chunks after successful concatenation
                        self.cleanup_temp_chunks(temp_chunks_to_cleanup)
                        # Clean up any remaining chunk files in the output directory
                        self.cleanup_chunk_files(output_dir)
                        return True
                    else:
                        self.scripts.error("❌ Video upscaling failed during parallel concatenation")
                        return False
                elif len(upscaled_chunks) == 1:
                    # Single chunk, just rename if needed
                    if upscaled_chunks[0] != output_path:
                        import shutil
                        shutil.move(upscaled_chunks[0], output_path)
                    self.scripts.log(f"✅ Video upscaling completed successfully (single chunk)")
                    # Clean up temporary chunks
                    self.cleanup_temp_chunks(temp_chunks_to_cleanup)
                    # Clean up any remaining chunk files in the output directory
                    self.cleanup_chunk_files(output_dir)
                    return True
                else:
                    self.scripts.error("❌ No chunks were successfully processed")
                    return False
                    
            except Exception as e:
                self.scripts.error(f"Error during chunk processing: {str(e)}")
                # Clean up temporary chunks even on error
                self.cleanup_temp_chunks(temp_chunks_to_cleanup)
                return False
                
        except Exception as e:
            self.scripts.error(f"Error in video upscaling process: {str(e)}")
            return False

    def concatenate_chunks_parallel(self, chunk_paths: list, output_path: str, max_workers: int = 3):
        """
        Concatenate multiple video chunks into a single video using parallel processing.
        This method validates chunks for corruption before concatenation.
        
        Args:
            chunk_paths (list): List of chunk file paths to concatenate
            output_path (str): Path for the final concatenated video
            max_workers (int): Maximum number of parallel workers for validation
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            self.scripts.log(f"🔄 Starting parallel concatenation of {len(chunk_paths)} video chunks")
            
            # Validate all chunks for corruption in parallel
            valid_chunks = self._validate_chunks_parallel(chunk_paths, max_workers)
            
            if not valid_chunks:
                self.scripts.error("❌ No valid chunks found for concatenation")
                return False
            
            if len(valid_chunks) != len(chunk_paths):
                self.scripts.log(f"⚠️ {len(chunk_paths) - len(valid_chunks)} chunks were corrupted and will be skipped")
            
            # Use MoviePy for high-quality concatenation
            self.scripts.log(f"🎬 Concatenating {len(valid_chunks)} valid chunks using MoviePy")
            
            try:
                # Load all valid chunks
                clips = []
                for chunk_path in valid_chunks:
                    try:
                        clip = VideoFileClip(chunk_path)
                        clips.append(clip)
                        self.scripts.log(f"✅ Loaded chunk: {os.path.basename(chunk_path)} ({clip.duration:.2f}s)")
                    except Exception as e:
                        self.scripts.error(f"❌ Failed to load chunk {chunk_path}: {str(e)}")
                        continue
                
                if not clips:
                    self.scripts.error("❌ No clips could be loaded for concatenation")
                    return False
                
                # Concatenate clips
                final_clip = concatenate_videoclips(clips)
                
                # Write the final video with high quality settings
                final_clip.write_videofile(
                    output_path,
                    codec='libx264',
                    audio_codec='aac',
                    temp_audiofile='temp-audio.m4a',
                    remove_temp=True,
                    fps=final_clip.fps,
                    preset='slow',  # High quality preset
                    ffmpeg_params=[
                        '-crf', '18',  # High quality (18 is visually lossless)
                        '-pix_fmt', 'yuv420p',
                        '-movflags', '+faststart'
                    ]
                )
                
                # Clean up clips
                for clip in clips:
                    clip.close()
                final_clip.close()
                
                # Verify output file
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    file_size = os.path.getsize(output_path)
                    self.scripts.log(f"✅ Successfully concatenated chunks. Final video size: {file_size} bytes")
                    
                    # Clean up individual chunks
                    self._cleanup_chunks_parallel(valid_chunks)
                    return True
                else:
                    self.scripts.error("❌ Concatenated video file not created or empty")
                    return False
                    
            except Exception as e:
                self.scripts.error(f"❌ Error during MoviePy concatenation: {str(e)}")
                # Fall back to ffmpeg method
                return self._concatenate_chunks_ffmpeg(valid_chunks, output_path)
                
        except Exception as e:
            self.scripts.error(f"❌ Error in parallel concatenation: {str(e)}")
            return False

    def _validate_chunks_parallel(self, chunk_paths: list, max_workers: int = 3):
        """
        Validate video chunks for corruption in parallel.
        
        Args:
            chunk_paths (list): List of chunk file paths to validate
            max_workers (int): Maximum number of parallel workers
            
        Returns:
            list: List of valid chunk paths
        """
        try:
            self.scripts.log(f"🔍 Validating {len(chunk_paths)} chunks for corruption using {max_workers} workers")
            
            valid_chunks = []
            completed_count = 0
            total_count = len(chunk_paths)
            
            with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="ChunkValidate") as executor:
                # Submit all validation tasks
                future_to_chunk = {}
                for chunk_path in chunk_paths:
                    future = executor.submit(self._validate_single_chunk, chunk_path)
                    future_to_chunk[future] = chunk_path
                
                # Process completed tasks
                for future in as_completed(future_to_chunk):
                    chunk_path = future_to_chunk[future]
                    completed_count += 1
                    
                    try:
                        is_valid = future.result()
                        if is_valid:
                            valid_chunks.append(chunk_path)
                            self.scripts.log(f"✅ [{completed_count}/{total_count}] Valid: {os.path.basename(chunk_path)}")
                        else:
                            self.scripts.error(f"❌ [{completed_count}/{total_count}] Corrupted: {os.path.basename(chunk_path)}")
                            
                    except Exception as e:
                        self.scripts.error(f"❌ [{completed_count}/{total_count}] Exception validating {os.path.basename(chunk_path)}: {str(e)}")
            
            self.scripts.log(f"🎯 Chunk validation completed: {len(valid_chunks)}/{total_count} valid chunks")
            return valid_chunks
            
        except Exception as e:
            self.scripts.error(f"❌ Error in parallel chunk validation: {str(e)}")
            return []

    def _validate_single_chunk(self, chunk_path: str):
        """
        Validate a single video chunk for corruption.
        
        Args:
            chunk_path (str): Path to the chunk file
            
        Returns:
            bool: True if chunk is valid, False if corrupted
        """
        try:
            if not os.path.exists(chunk_path):
                return False
            
            if os.path.getsize(chunk_path) == 0:
                return False
            
            # Use the video processor's corruption check
            return self.video_processor.check_video_corruption(chunk_path)
            
        except Exception as e:
            self.scripts.log(f"Warning: Error validating chunk {chunk_path}: {str(e)}")
            return False

    def _cleanup_chunks_parallel(self, chunk_paths: list, max_workers: int = 3):
        """
        Clean up chunk files in parallel.
        
        Args:
            chunk_paths (list): List of chunk file paths to clean up
            max_workers (int): Maximum number of parallel workers
        """
        try:
            if not chunk_paths:
                return
            
            self.scripts.log(f"🧹 Cleaning up {len(chunk_paths)} chunk files using {max_workers} workers")
            
            with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="ChunkCleanup") as executor:
                # Submit all cleanup tasks
                future_to_chunk = {}
                for chunk_path in chunk_paths:
                    future = executor.submit(self._cleanup_single_chunk, chunk_path)
                    future_to_chunk[future] = chunk_path
                
                # Process completed tasks
                for future in as_completed(future_to_chunk):
                    chunk_path = future_to_chunk[future]
                    try:
                        success = future.result()
                        if success:
                            self.scripts.log(f"✅ Cleaned up: {os.path.basename(chunk_path)}")
                        else:
                            self.scripts.log(f"⚠️ Could not clean up: {os.path.basename(chunk_path)}")
                    except Exception as e:
                        self.scripts.log(f"⚠️ Error cleaning up {os.path.basename(chunk_path)}: {str(e)}")
            
        except Exception as e:
            self.scripts.error(f"❌ Error in parallel chunk cleanup: {str(e)}")

    def _cleanup_single_chunk(self, chunk_path: str):
        """
        Clean up a single chunk file.
        
        Args:
            chunk_path (str): Path to the chunk file
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if os.path.exists(chunk_path):
                os.remove(chunk_path)
                return True
            return True  # File doesn't exist, consider it cleaned up
        except Exception as e:
            self.scripts.log(f"Warning: Could not clean up chunk {chunk_path}: {str(e)}")
            return False

    def _concatenate_chunks_ffmpeg(self, chunk_paths: list, output_path: str):
        """
        Fallback method to concatenate chunks using ffmpeg.
        
        Args:
            chunk_paths (list): List of chunk file paths to concatenate
            output_path (str): Path for the final concatenated video
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            self.scripts.log(f"🔄 Using ffmpeg fallback for concatenation of {len(chunk_paths)} chunks")
            
            # Create a temporary file list for ffmpeg
            base_dir = os.path.dirname(output_path)
            filelist_path = os.path.join(base_dir, "filelist.txt")
            
            with open(filelist_path, 'w') as f:
                for chunk_path in chunk_paths:
                    # Convert path to absolute and escape for ffmpeg
                    abs_path = os.path.abspath(chunk_path)
                    f.write(f"file '{abs_path}'\n")
            
            self.scripts.log(f"Created file list: {filelist_path}")
            
            # Use ffmpeg to concatenate chunks
            cmd = [
                'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
                '-i', filelist_path, '-c', 'copy', output_path
            ]
            
            self.scripts.log(f"Concatenating chunks with command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            # Clean up file list
            try:
                os.remove(filelist_path)
            except Exception as e:
                self.scripts.log(f"Warning: Could not clean up file list: {str(e)}")
            
            if result.returncode == 0 and os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                self.scripts.log(f"✅ Successfully concatenated chunks using ffmpeg. Final video size: {file_size} bytes")
                return True
            else:
                self.scripts.error(f"❌ Failed to concatenate chunks with ffmpeg: {result.stderr}")
                return False
                
        except Exception as e:
            self.scripts.error(f"❌ Error in ffmpeg concatenation: {str(e)}")
            return False

    def concatenate_chunks(self, chunk_paths: list, output_path: str):
        """
        Legacy concatenation method - now calls the parallel version.
        
        Args:
            chunk_paths (list): List of chunk file paths to concatenate
            output_path (str): Path for the final concatenated video
            
        Returns:
            bool: True if successful, False otherwise
        """
        return self.concatenate_chunks_parallel(chunk_paths, output_path)

    def check_video_chunks(self, input_path: str):
        """
        Check if video needs to be chunked and return list of chunks
        
        Args:
            input_path (str): Path to the input video
            
        Returns:
            list: List of video paths (single item if no chunking needed, multiple if chunked)
        """
        try:
            # Get video info
            video_info = self.get_video_info(input_path)
            if video_info is None:
                return [input_path]  # Return original if we can't get info
            
            frame_count = video_info["frame_count"]
            duration = video_info["duration"]
            
            self.scripts.log(f"Video analysis: {frame_count} frames, {duration:.2f}s duration")
            
            # Check if splitting is needed - use both frame count and duration as criteria
            max_duration = self.max_frames_per_chunk / video_info["fps"] if video_info["fps"] > 0 else 30.0
            
            if frame_count <= self.max_frames_per_chunk and duration <= max_duration:
                self.scripts.log(f"Video has {frame_count} frames ({duration:.2f}s), no chunking needed")
                return [input_path]
            else:
                self.scripts.log(f"Video has {frame_count} frames ({duration:.2f}s), chunking required")
                self.scripts.log(f"Target: max {self.max_frames_per_chunk} frames or {max_duration:.2f}s per chunk")
                
                # Try frame-based chunking first
                chunk_paths = self.split_video_by_frames(input_path)
                if chunk_paths and len(chunk_paths) > 1:
                    return chunk_paths
                
                # If frame-based chunking failed, try duration-based chunking
                self.scripts.log("Frame-based chunking failed, trying duration-based chunking...")
                chunk_paths = self.split_video_by_duration(input_path)
                if chunk_paths and len(chunk_paths) > 1:
                    return chunk_paths
                
                # If both chunking methods failed, return original
                self.scripts.error("Both chunking methods failed, returning original video")
                return [input_path]
                
        except Exception as e:
            self.scripts.error(f"Error checking video chunks: {str(e)}")
            return [input_path]  # Return original on error

    def validate_video_file(self, video_path: str):
        """
        Validate that a video file can be read by OpenCV
        
        Args:
            video_path (str): Path to the video file
            
        Returns:
            bool: True if video is valid, False otherwise
        """
        try:
            if not os.path.exists(video_path):
                self.scripts.error(f"❌ Video file does not exist: {video_path}")
                return False
            
            if os.path.getsize(video_path) == 0:
                self.scripts.error(f"❌ Video file is empty: {video_path}")
                return False
            
            # Try to open with OpenCV
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                self.scripts.error(f"❌ Video file cannot be opened by OpenCV: {video_path}")
                return False
            
            # Check if we can read at least one frame
            ret, frame = cap.read()
            if not ret or frame is None:
                self.scripts.error(f"❌ Video file has no readable frames: {video_path}")
                cap.release()
                return False
            
            # Get video properties
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            cap.release()
            
            if frame_count <= 0:
                self.scripts.error(f"❌ Video file has invalid frame count: {video_path}")
                return False
            
            if fps <= 0:
                self.scripts.error(f"❌ Video file has invalid FPS: {video_path}")
                return False
            
            if width <= 0 or height <= 0:
                self.scripts.error(f"❌ Video file has invalid dimensions: {video_path}")
                return False
            
            self.scripts.log(f"✅ Video file validated: {video_path} ({frame_count} frames, {fps} fps, {width}x{height})")
            return True
            
        except Exception as e:
            self.scripts.error(f"❌ Error validating video file {video_path}: {str(e)}")
            return False

    def upscale_video(self, input_path: str, frame_rate: float = 25.0, output_path: str = None, seed: str = None):
        """
        Upscale a single video (chunk or full video)
        
        Args:
            input_path (str): Path to the input video
            frame_rate (float): Output frame rate (default: 25.0)
            output_path (str): Path for the upscaled output video (REQUIRED)
            seed (str): Seed for generation
            
        Returns:
            bool: True if prompt was queued successfully, False otherwise
        """
        try:
            # Require output_path parameter
            if output_path is None:
                self.scripts.error("❌ output_path parameter is required but not specified")
                return False
            
            self.scripts.log(f"Using seed: {seed} (type: {type(seed)})")
            self.scripts.log(f"Output path: {output_path}")
            
            # Enhanced validation with detailed logging
            self.scripts.log(f"🔍 DEBUG: Validating input video: {input_path}")
            
            # Check if file exists
            if not os.path.exists(input_path):
                self.scripts.error(f"❌ Input video file does not exist: {input_path}")
                return False
            
            # Check file size
            file_size = os.path.getsize(input_path)
            self.scripts.log(f"📊 Input file size: {file_size} bytes")
            
            if file_size == 0:
                self.scripts.error(f"❌ Input video file is empty: {input_path}")
                return False
            
            # Validate input video before processing
            if not self.validate_video_file(input_path):
                self.scripts.error(f"❌ Input video validation failed: {input_path}")
                # Debug the problematic chunk
                debug_info = self.debug_video_chunk(input_path)
                self.scripts.error(f"🔍 DEBUG INFO: {debug_info}")
                return False
            
            # Check video size and warn if too large
            video_info = self.get_video_info(input_path)
            if video_info:
                frame_count = video_info["frame_count"]
                duration = video_info["duration"]
                fps = video_info["fps"]
                width = video_info["width"]
                height = video_info["height"]
                
                self.scripts.log(f"📊 Video info: {frame_count} frames, {duration:.2f}s duration, {fps:.2f} fps, {width}x{height}")
                
                if frame_count > self.max_frames_per_chunk:
                    self.scripts.error(f"❌ Video chunk has {frame_count} frames, exceeds limit of {self.max_frames_per_chunk}")
                    return False
                
                # Additional validation for ComfyUI compatibility
                if fps <= 0 or fps > 120:
                    self.scripts.error(f"❌ Invalid FPS for ComfyUI: {fps}")
                    return False
                
                if width <= 0 or height <= 0 or width > 8192 or height > 8192:
                    self.scripts.error(f"❌ Invalid dimensions for ComfyUI: {width}x{height}")
                    return False
            else:
                self.scripts.error(f"❌ Could not get video info for: {input_path}")
                return False
            
            workflow_path = os.path.join(self.package_dir, "videoUpscaler.json")
            upscaler_workflow = self.comfyui.load_workflow(workflow_path)
            
            # Copy video to ComfyUI input directory with enhanced validation
            video_filename = f"upscaler_input_{seed}.mp4"
            self.scripts.log(f"🔄 Copying video to ComfyUI input directory as: {video_filename}")
            
            comfyui_video_path = self.comfyui.load_input(input_path, video_filename)
            
            if comfyui_video_path is None:
                self.scripts.error(f"❌ Failed to copy video to ComfyUI input directory: {input_path}")
                return False
            
            # Get the actual WSL file path for verification
            wsl_file_path = os.path.join("//wsl.localhost/Ubuntu/home/unix/code/ComfyUI/input", video_filename)
            
            # Verify the copied file exists and is valid
            if not os.path.exists(wsl_file_path):
                self.scripts.error(f"❌ Copied video file does not exist in ComfyUI directory: {wsl_file_path}")
                return False
            
            copied_file_size = os.path.getsize(wsl_file_path)
            self.scripts.log(f"📊 Copied file size: {copied_file_size} bytes")
            
            if copied_file_size == 0:
                self.scripts.error(f"❌ Copied video file is empty: {wsl_file_path}")
                return False
            
            # Validate the copied file
            if not self.video_processor.check_video_corruption(wsl_file_path):
                self.scripts.error(f"❌ Copied video file is corrupted: {wsl_file_path}")
                return False
            
            # Add a small delay to ensure file system synchronization
            import time
            time.sleep(0.5)
            self.scripts.log(f"⏳ Waiting for file system synchronization...")
            
            # Double-check file exists and is accessible after delay
            if not os.path.exists(wsl_file_path):
                self.scripts.error(f"❌ Copied video file disappeared after delay: {wsl_file_path}")
                return False
            
            # Test file access one more time
            try:
                test_cap = cv2.VideoCapture(wsl_file_path)
                if not test_cap.isOpened():
                    self.scripts.error(f"❌ Copied video file cannot be opened after delay: {wsl_file_path}")
                    return False
                test_cap.release()
            except Exception as e:
                self.scripts.error(f"❌ Error testing copied file after delay: {str(e)}")
                return False
            
            self.scripts.log(f"✅ Video successfully copied and validated in ComfyUI directory")
            
            # Update workflow parameters
            upscaler_workflow["7"]["inputs"]["video"] = video_filename #DO NOT USE THE FULL PATH HERE
            upscaler_workflow["8"]["inputs"]["filename_prefix"] = f"upscaler_{seed}"
            upscaler_workflow["8"]["inputs"]["frame_rate"] = frame_rate
            
            self.scripts.log(f"🔍 DEBUG: About to queue video upscaling workflow...")
            self.scripts.log(f"🔍 DEBUG: Workflow video parameter: {upscaler_workflow['7']['inputs']['video']}")
            self.scripts.log(f"🔍 DEBUG: ComfyUI video path: {comfyui_video_path}")
            self.scripts.log(f"🔍 DEBUG: WSL file path: {wsl_file_path}")
            self.scripts.log(f"🔍 DEBUG: File exists check: {os.path.exists(wsl_file_path)}")
            
            # Final verification before submitting
            if not os.path.exists(wsl_file_path):
                self.scripts.error(f"❌ CRITICAL: Video file does not exist before workflow submission: {wsl_file_path}")
                return False

            # Process the generated prompt with reduced timeout for chunks
            timeout = 900 if video_info and video_info["frame_count"] <= 500 else 1800  # 15 min for small chunks, 30 min for larger
            result = self.comfyui.process_generated_prompt(
                workflow=upscaler_workflow,
                output_path=output_path,
                pattern=f"upscaler_{seed}",
                extensions=["mp4", "avi", "mov"],
                timeout=timeout
            )
            
            if result:
                self.scripts.log(f"✅ Video upscaling completed successfully for chunk: {input_path}")
                return True
            else:
                self.scripts.error(f"❌ Video upscaling failed during processing for chunk: {input_path}")
                # Debug the problematic chunk when ComfyUI fails
                debug_info = self.debug_video_chunk(wsl_file_path)
                self.scripts.error(f"🔍 COMFYUI DEBUG INFO: {debug_info}")
                return False
                
        except Exception as e:
            self.scripts.error(f"❌ Error in video upscaling: {str(e)}")
            import traceback
            self.scripts.error(f"📋 Full traceback: {traceback.format_exc()}")
            return False