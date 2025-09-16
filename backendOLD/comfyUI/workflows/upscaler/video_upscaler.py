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
from ..config import ComfyUIConfig
from ...logger import Scripts
from ...mediaProcessing.video.video import Video

class VideoUpscaler:
    def __init__(self):
        self.server_address = ComfyUIConfig.get_server_address()
        self.package_dir = os.path.dirname(__file__)
        self.comfyui = ComfyUI()
        self.scripts = Scripts("Video Upscaler")
        self.logger = self.scripts  # Quiet initialization
        self.max_frames_per_chunk = 200  # Reduced from 5000 to prevent server overload
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
            
            # Calculate exact frame-based chunking
            total_chunks = int(frame_count / max_frames_per_chunk) + (1 if frame_count % max_frames_per_chunk > 0 else 0)
            
            self.scripts.log(f"Splitting {frame_count} frames into {total_chunks} chunks of max {max_frames_per_chunk} frames each")
            
            # Create chunks directory
            base_dir = os.path.dirname(input_path)
            chunks_dir = os.path.join(base_dir, "frame_chunks")
            os.makedirs(chunks_dir, exist_ok=True)
            
            chunk_paths = []
            skipped_chunks = 0
            
            for i in range(total_chunks):
                # Calculate exact frame ranges
                start_frame = i * max_frames_per_chunk
                end_frame = min((i + 1) * max_frames_per_chunk, frame_count)
                actual_frames = end_frame - start_frame
                
                # Skip if chunk has no frames
                if actual_frames <= 0:
                    self.scripts.log(f"⚠️ Skipping chunk {i+1} - no frames: {actual_frames}")
                    skipped_chunks += 1
                    continue
                
                # Use original index for proper ordering
                chunk_filename = f"frame_chunk_{i:04d}.mp4"
                chunk_path = os.path.join(chunks_dir, chunk_filename)
                
                # Use ffmpeg with exact frame-based cutting
                # Calculate time boundaries from frame numbers for ffmpeg
                start_time = start_frame / fps
                end_time = end_frame / fps
                
                self.scripts.log(f"Chunk {i+1}: frames {start_frame}-{end_frame-1} ({actual_frames} frames) = {start_time:.3f}s-{end_time:.3f}s")
                
                cmd = [
                    'ffmpeg', '-y', '-i', input_path,
                    '-vf', f'select=between(n\\,{start_frame}\\,{end_frame-1})',  # Select exact frame range
                    '-vsync', 'vfr',  # Variable frame rate to preserve exact frame count
                    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                    '-pix_fmt', 'yuv420p',  # Ensure compatible pixel format
                    '-movflags', '+faststart',  # Optimize for streaming
                    '-avoid_negative_ts', 'make_zero',
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
                                        expected_frames = actual_frames
                                        frame_diff = abs(test_frame_count - expected_frames)
                                        self.scripts.log(f"✅ Created valid frame chunk {i+1}/{total_chunks}: {chunk_path}")
                                        self.scripts.log(f"   Expected: {expected_frames} frames, Got: {test_frame_count} frames, Diff: {frame_diff}")
                                        if frame_diff > 0:
                                            self.scripts.log(f"   ⚠️ Frame count mismatch: {frame_diff} frames difference")
                                    else:
                                        self.scripts.log(f"❌ Chunk {i+1} failed corruption check, skipping")
                                        skipped_chunks += 1
                                        if os.path.exists(chunk_path):
                                            os.remove(chunk_path)
                                else:
                                    self.scripts.log(f"❌ Chunk {i+1} has invalid properties (frames: {test_frame_count}, fps: {test_fps}, size: {test_width}x{test_height}), skipping")
                                    skipped_chunks += 1
                                    if os.path.exists(chunk_path):
                                        os.remove(chunk_path)
                            else:
                                self.scripts.log(f"❌ Chunk {i+1} cannot be opened by OpenCV, skipping")
                                skipped_chunks += 1
                                if os.path.exists(chunk_path):
                                    os.remove(chunk_path)
                        except Exception as e:
                            self.scripts.log(f"❌ Error validating chunk {i+1}: {str(e)}")
                            skipped_chunks += 1
                            if os.path.exists(chunk_path):
                                os.remove(chunk_path)
                    else:
                        self.scripts.log(f"❌ Chunk {i+1} is empty, skipping")
                        skipped_chunks += 1
                        if os.path.exists(chunk_path):
                            os.remove(chunk_path)
                else:
                    self.scripts.error(f"❌ Failed to create frame chunk {i+1}: {result.stderr}")
                    skipped_chunks += 1
                    # Don't break, continue with other chunks
                    continue
            
            if len(chunk_paths) == 0:
                self.scripts.error("❌ No valid chunks were created, falling back to original video")
                return [input_path]
            
            # Sort chunk paths to ensure proper ordering
            chunk_paths.sort()
            
            # Log the actual vs expected chunk count and frame validation
            actual_chunks = len(chunk_paths)
            expected_chunks = total_chunks - skipped_chunks
            
            # Calculate total frames in all chunks
            total_chunk_frames = 0
            for chunk_path in chunk_paths:
                try:
                    cap = cv2.VideoCapture(chunk_path)
                    if cap.isOpened():
                        chunk_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                        total_chunk_frames += chunk_frames
                        cap.release()
                except:
                    pass
            
            frame_diff = abs(total_chunk_frames - frame_count)
            self.scripts.log(f"✅ Successfully created {actual_chunks} valid frame-based video chunks (expected: {expected_chunks}, skipped: {skipped_chunks})")
            self.scripts.log(f"📊 Frame count validation: Original={frame_count}, Chunks={total_chunk_frames}, Diff={frame_diff}")
            
            if frame_diff > 0:
                self.scripts.log(f"⚠️ Frame count mismatch detected: {frame_diff} frames difference")
            else:
                self.scripts.log(f"✅ Frame count validation passed: All {frame_count} frames preserved")
            
            # Log chunk order for debugging
            for i, chunk_path in enumerate(chunk_paths):
                self.scripts.log(f"📋 Chunk {i+1}: {os.path.basename(chunk_path)}")
            
            return chunk_paths
            
        except Exception as e:
            self.scripts.error(f"Error splitting video by frames: {str(e)}")
            return []

    def cleanup_chunks(self, chunk_paths: list = None, directory_path: str = None):
        """Clean up chunk files and directories"""
        try:
            if chunk_paths:
                for chunk_path in chunk_paths:
                    if os.path.exists(chunk_path):
                        os.remove(chunk_path)
                        self.scripts.log(f"Cleaned up: {os.path.basename(chunk_path)}")
            
            if directory_path and os.path.exists(directory_path):
                chunk_patterns = ["upscaler_chunk_", "frame_chunk_", "duration_chunk_"]
                for filename in os.listdir(directory_path):
                    if any(filename.startswith(pattern) for pattern in chunk_patterns):
                        file_path = os.path.join(directory_path, filename)
                        if os.path.isfile(file_path):
                            os.remove(file_path)
                            self.scripts.log(f"Cleaned up: {filename}")
        except Exception as e:
            self.scripts.log(f"Cleanup warning: {str(e)}")

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

    def generate_unique_chunk_name(self, base_seed: str, chunk_index: int, total_chunks: int, timestamp: str = None):
        """Generate a unique name for upscaled chunks"""
        if timestamp is None:
            timestamp = str(int(time.time() * 1000))
        return f"upscaler_chunk_{base_seed}_{chunk_index:04d}_{timestamp}.mp4"

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
            
            # Clean up previous chunks before starting
            output_dir = os.path.dirname(output_path)
            self.cleanup_chunks(directory_path=output_dir)
            
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
            failed_chunks = 0
            
            try:
                for i, chunk_path in enumerate(video_chunks):
                    # Generate unique chunk name using actual chunk count
                    actual_chunk_count = len(video_chunks)
                    chunk_seed = f"{seed}_chunk_{i:04d}" if len(video_chunks) > 1 else seed
                    chunk_filename = self.generate_unique_chunk_name(seed, i, actual_chunk_count, session_timestamp)
                    chunk_output_path = os.path.join(output_dir, chunk_filename)
                    
                    self.scripts.log(f"🎯 Processing chunk {i+1}/{actual_chunk_count}: {chunk_path}")
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
                            failed_chunks += 1
                            # If this is a single chunk, return False
                            if len(video_chunks) == 1:
                                return False
                            # If multiple chunks, continue with others but log the failure
                            self.scripts.log(f"Continuing with remaining chunks...")
                    except Exception as e:
                        self.scripts.error(f"❌ Exception processing chunk {i+1}: {str(e)}")
                        failed_chunks += 1
                        # If this is a single chunk, return False
                        if len(video_chunks) == 1:
                            return False
                        # If multiple chunks, continue with others but log the failure
                        self.scripts.log(f"Continuing with remaining chunks...")
                
                if len(upscaled_chunks) == 0:
                        self.scripts.error("❌ No chunks were successfully processed")
                        return False
                
                # If we have multiple chunks, concatenate them using parallel processing
                if len(upscaled_chunks) > 1:
                    self.scripts.log(f"🔄 Concatenating {len(upscaled_chunks)} upscaled chunks using parallel processing")
                    success = self.concatenate_chunks_parallel(upscaled_chunks, output_path, max_workers=3)
                    if success:
                        # Validate output duration matches input duration
                        if expected_duration:
                            output_info = self.get_video_info(output_path)
                            if output_info:
                                output_duration = output_info["duration"]
                                duration_diff = abs(output_duration - expected_duration)
                                duration_tolerance = 1.0  # 1 second tolerance
                                
                                self.scripts.log(f"📊 Duration validation:")
                                self.scripts.log(f"   Input duration: {expected_duration:.2f}s")
                                self.scripts.log(f"   Output duration: {output_duration:.2f}s")
                                self.scripts.log(f"   Difference: {duration_diff:.2f}s")
                                
                                if duration_diff > duration_tolerance:
                                    self.scripts.log(f"⚠️ Duration mismatch detected: {duration_diff:.2f}s difference")
                                    self.scripts.log(f"   This may be due to skipped chunks or processing issues")
                                else:
                                    self.scripts.log(f"✅ Duration validation passed: {duration_diff:.2f}s difference within tolerance")
                            else:
                                self.scripts.log(f"⚠️ Could not validate output duration")
                        
                        self.scripts.log(f"✅ Video upscaling completed successfully with parallel concatenation")
                        # Clean up temporary chunks after successful concatenation
                        self.cleanup_chunks(temp_chunks_to_cleanup)
                        self.cleanup_chunks(directory_path=output_dir)
                        return True
                    else:
                        self.scripts.error("❌ Video upscaling failed during parallel concatenation")
                        return False
                elif len(upscaled_chunks) == 1:
                    # Single chunk, just rename if needed
                    if upscaled_chunks[0] != output_path:
                        import shutil
                        shutil.move(upscaled_chunks[0], output_path)
                    
                    # Validate output duration matches input duration for single chunk
                    if expected_duration:
                        output_info = self.get_video_info(output_path)
                        if output_info:
                            output_duration = output_info["duration"]
                            duration_diff = abs(output_duration - expected_duration)
                            duration_tolerance = 1.0  # 1 second tolerance
                            
                            self.scripts.log(f"📊 Duration validation (single chunk):")
                            self.scripts.log(f"   Input duration: {expected_duration:.2f}s")
                            self.scripts.log(f"   Output duration: {output_duration:.2f}s")
                            self.scripts.log(f"   Difference: {duration_diff:.2f}s")
                            
                            if duration_diff > duration_tolerance:
                                self.scripts.log(f"⚠️ Duration mismatch detected: {duration_diff:.2f}s difference")
                            else:
                                self.scripts.log(f"✅ Duration validation passed: {duration_diff:.2f}s difference within tolerance")
                    
                    self.scripts.log(f"✅ Video upscaling completed successfully (single chunk)")
                    # Clean up temporary chunks
                    self.cleanup_chunks(temp_chunks_to_cleanup)
                    self.cleanup_chunks(directory_path=output_dir)
                    return True
                else:
                    self.scripts.error("❌ No chunks were successfully processed")
                    return False
                    
            except Exception as e:
                self.scripts.error(f"Error during chunk processing: {str(e)}")
                # Clean up temporary chunks even on error
                self.cleanup_chunks(temp_chunks_to_cleanup)
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
            
            # Log chunk count information for validation
            self.scripts.log(f"📊 Concatenation input: {len(chunk_paths)} chunks")
            
            # Sort chunks to ensure proper ordering before validation
            chunk_paths.sort()
            
            # Validate all chunks for corruption in parallel
            valid_chunks = self._validate_chunks_parallel(chunk_paths, max_workers)
            
            if not valid_chunks:
                self.scripts.error("❌ No valid chunks found for concatenation")
                return False
            
            # Sort valid chunks to maintain order
            valid_chunks.sort()
            
            # Log validation results
            corrupted_count = len(chunk_paths) - len(valid_chunks)
            if corrupted_count > 0:
                self.scripts.log(f"⚠️ {corrupted_count} chunks were corrupted and will be skipped")
                self.scripts.log(f"📊 Final concatenation: {len(valid_chunks)} valid chunks out of {len(chunk_paths)} total")
            else:
                self.scripts.log(f"✅ All {len(valid_chunks)} chunks passed validation")
            
            # Log final chunk order for debugging
            self.scripts.log(f"📋 Final chunk order for concatenation:")
            for i, chunk_path in enumerate(valid_chunks):
                self.scripts.log(f"   {i+1}: {os.path.basename(chunk_path)}")
            
            # Use MoviePy for high-quality concatenation
            self.scripts.log(f"🎬 Concatenating {len(valid_chunks)} valid chunks using MoviePy")
            
            try:
                # Load all valid chunks and track total duration
                clips = []
                total_duration = 0.0
                for i, chunk_path in enumerate(valid_chunks):
                    try:
                        clip = VideoFileClip(chunk_path)
                        clips.append(clip)
                        total_duration += clip.duration
                        self.scripts.log(f"✅ Loaded chunk {i+1}: {os.path.basename(chunk_path)} ({clip.duration:.2f}s) - Total so far: {total_duration:.2f}s")
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
                
                # Verify output file and duration
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    file_size = os.path.getsize(output_path)
                    
                    # Verify final duration matches expected total
                    final_clip = VideoFileClip(output_path)
                    final_duration = final_clip.duration
                    final_clip.close()
                    
                    duration_diff = abs(final_duration - total_duration)
                    self.scripts.log(f"📊 Duration validation:")
                    self.scripts.log(f"   Expected total: {total_duration:.2f}s")
                    self.scripts.log(f"   Final video: {final_duration:.2f}s")
                    self.scripts.log(f"   Difference: {duration_diff:.2f}s")
                    
                    if duration_diff > 1.0:  # More than 1 second difference
                        self.scripts.log(f"⚠️ Duration mismatch detected: {duration_diff:.2f}s difference")
                    else:
                        self.scripts.log(f"✅ Duration validation passed")
                    
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
            
            # Sort chunks to ensure proper ordering
            chunk_paths.sort()
            
            # Create a temporary file list for ffmpeg
            base_dir = os.path.dirname(output_path)
            filelist_path = os.path.join(base_dir, "filelist.txt")
            
            with open(filelist_path, 'w') as f:
                for i, chunk_path in enumerate(chunk_paths):
                    # Convert path to absolute and escape for ffmpeg
                    abs_path = os.path.abspath(chunk_path)
                    f.write(f"file '{abs_path}'\n")
                    self.scripts.log(f"📋 FFmpeg chunk {i+1}: {os.path.basename(chunk_path)}")
            
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
                
                # Try frame-based chunking
                chunk_paths = self.split_video_by_frames(input_path)
                if chunk_paths and len(chunk_paths) > 1:
                    return chunk_paths
                
                # If chunking failed, return original
                self.scripts.error("Chunking failed, returning original video")
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
            
            # Basic validation
            if not os.path.exists(input_path) or os.path.getsize(input_path) == 0:
                self.scripts.error(f"❌ Input video file invalid: {input_path}")
                return False
            
            if not self.validate_video_file(input_path):
                self.scripts.error(f"❌ Input video validation failed: {input_path}")
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
            
            # Copy video to ComfyUI input directory
            video_filename = f"upscaler_input_{seed}.mp4"
            comfyui_video_path = self.comfyui.load_input(input_path, video_filename)
            
            if comfyui_video_path is None:
                self.scripts.error(f"❌ Failed to copy video to ComfyUI input directory: {input_path}")
                return False
            
            # Update workflow parameters
            upscaler_workflow["7"]["inputs"]["video"] = video_filename #DO NOT USE THE FULL PATH HERE
            upscaler_workflow["8"]["inputs"]["filename_prefix"] = f"upscaler_{seed}"
            upscaler_workflow["8"]["inputs"]["frame_rate"] = frame_rate
            

            # Process the generated prompt with reduced timeout for chunks
            timeout = 900 if video_info and video_info["frame_count"] <= 500 else 1800  # 15 min for small chunks, 30 min for larger
            result = self.comfyui.process_generated_prompt(
                workflow=upscaler_workflow,
                output_path=output_path,
                pattern=f"upscaler_{seed}",
                extensions=ComfyUIConfig.VIDEO_EXTENSIONS,
                timeout=timeout
            )
            
            if result:
                self.scripts.log(f"✅ Video upscaling completed successfully for chunk: {input_path}")
                return True
            else:
                self.scripts.error(f"❌ Video upscaling failed during processing for chunk: {input_path}")
                return False
                
        except Exception as e:
            self.scripts.error(f"❌ Error in video upscaling: {str(e)}")
            import traceback
            self.scripts.error(f"📋 Full traceback: {traceback.format_exc()}")
            return False