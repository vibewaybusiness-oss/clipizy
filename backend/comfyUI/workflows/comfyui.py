import socket
import subprocess
import time
import os
import json
from PIL import Image
from moviepy.editor import VideoFileClip
import re
import urllib.request
import glob
import shutil
import websocket
import traceback
import threading

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from logger.logger import Scripts
from .config import ComfyUIConfig

class ComfyUI:
    _instance = None
    _lock = threading.Lock()
    
    def __init__(self):
        # Only initialize once
        if hasattr(self, '_initialized'):
            return
        
        self._initialized = True
        self.server_address = ComfyUIConfig.get_server_address()
        self.package_dir = os.path.dirname(__file__)
        self.output_dir = ComfyUIConfig.get_output_dir()
        self.input_dir = ComfyUIConfig.get_input_dir()
        self.logger = Scripts("ComfyUI")
        self.logger.log("Initializing ComfyUI")
    
    @staticmethod
    def cleanup_gpu_memory(self):
        """Clean up GPU memory by clearing CUDA cache and killing GPU processes"""
        self.logger.log("🧹 Cleaning up GPU memory...")
        try:
            # Clear CUDA cache using nvidia-smi
            clear_cuda_cmd = ["nvidia-smi", "--gpu-reset"]
            result = subprocess.run(clear_cuda_cmd, check=False, capture_output=True, text=True)
            if result.returncode == 0:
                self.logger.log("✅ GPU memory reset successful")
            else:
                self.logger.warning(f"⚠️ GPU reset failed: {result.stderr}")
            
            # Kill any Python processes that might be holding GPU memory
            kill_python_gpu_cmd = ["bash", "-c", "ps aux | grep python | grep -v grep | awk '{print $2}' | xargs -r kill -9 || true"]
            subprocess.run(kill_python_gpu_cmd, check=False, capture_output=True)
            
            # Clear CUDA cache using Python if available
            try:
                clear_cache_cmd = ["python3", "-c", "import torch; torch.cuda.empty_cache() if torch.cuda.is_available() else None"]
                subprocess.run(clear_cache_cmd, check=False, capture_output=True)
                self.logger.log("✅ CUDA cache cleared")
            except Exception as e:
                self.logger.warning(f"⚠️ CUDA cache clear failed: {str(e)}")
            
            # Wait for GPU memory to be freed
            time.sleep(2)
            
            # Check GPU memory status
            try:
                gpu_status_cmd = ["nvidia-smi", "--query-gpu=memory.used,memory.total", "--format=csv,noheader,nounits"]
                result = subprocess.run(gpu_status_cmd, check=False, capture_output=True, text=True)
                if result.returncode == 0 and result.stdout.strip():
                    gpu_info = result.stdout.strip().split(', ')
                    if len(gpu_info) >= 2:
                        used_mb = int(gpu_info[0])
                        total_mb = int(gpu_info[1])
                        self.logger.log(f"📊 GPU Memory: {used_mb}MB used / {total_mb}MB total")
            except Exception as e:
                self.logger.warning(f"⚠️ Could not check GPU memory status: {str(e)}")
                
        except Exception as e:
            self.logger.warning(f"⚠️ GPU memory cleanup failed: {str(e)}")
            self.logger.warning(f"Traceback: {traceback.format_exc()}")

    @staticmethod
    def load_workflow(self, filename):
        with open(filename, 'r', encoding='utf-8-sig') as file:
            return json.load(file)

    def queue_prompt(self, prompt_data):
        if isinstance(prompt_data, dict):
            # Log workflow nodes that contain important information
            for node_id, node_data in prompt_data.items():
                if isinstance(node_data, dict) and "inputs" in node_data:
                    inputs = node_data["inputs"]
                    
                    # Log text prompts
                    if "text" in inputs:
                        text = inputs["text"]
                        if len(text) > 100:
                            text = text[:100] + "..."
                        self.logger.log(f"   Node {node_id} - Text: '{text}'")
                    
                    # Log model information
                    if "unet_name" in inputs:
                        self.logger.log(f"   Node {node_id} - Model: {inputs['unet_name']}")
                    
                    # Log LoRA information
                    if "lora_name" in inputs:
                        self.logger.log(f"   Node {node_id} - LoRA: {inputs['lora_name']}")
                    
                    # Log generation parameters
                    if "steps" in inputs:
                        self.logger.log(f"   Node {node_id} - Steps: {inputs['steps']}")
                    if "noise_seed" in inputs:
                        self.logger.log(f"   Node {node_id} - Seed: {inputs['noise_seed']}")
                    if "width" in inputs and "height" in inputs:
                        self.logger.log(f"   Node {node_id} - Resolution: {inputs['width']}x{inputs['height']}")
                    if "filename_prefix" in inputs:
                        self.logger.log(f"   Node {node_id} - Filename prefix: {inputs['filename_prefix']}")
        
        data = json.dumps({"prompt": prompt_data}).encode('utf-8')
        self.logger.log(f"📤 Sending data to ComfyUI server:")
        self.logger.log(f"   Data length: {len(data)} bytes")
        self.logger.log(f"   Data preview: {data.decode('utf-8')[:1000]}...")
        req = urllib.request.Request(f"http://{self.server_address}/prompt", data=data, headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req) as response:
                response_data = json.loads(response.read())
                self.logger.log(f"Queue prompt response: {response_data}")
                return response_data
        except urllib.error.HTTPError as e:
            self.logger.error(f"HTTP Error: {e.code} - {e.reason}")
            error_content = e.read().decode("utf-8")
            self.logger.error(f"Error response: {error_content}")
            self.logger.error(f"Request data: {data.decode('utf-8')[:500]}...")
            self.logger.error(f"Traceback: {traceback.format_exc()}")
            raise
        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
            self.logger.error(f"Traceback: {traceback.format_exc()}")
            raise

    def validate_file(self, file_path):
        if file_path.endswith(".txt"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content:
                        return True
            except:
                return False       
        
        elif file_path.endswith(".png"):
            try:
                with Image.open(file_path) as img:
                    img.verify()
                    return True
            except:
                return False

        elif file_path.endswith(".mp4"):
            try:
                with VideoFileClip(file_path) as video:
                    duration = video.duration
                    fps = video.fps
                    if duration <= 0 or fps <= 0:
                        return False
                    return True
            except:
                return False
        else:
            return os.path.exists(file_path) and os.path.getsize(file_path) > 0

    def ensure_file_complete(self, file_path):
        """Wait until file is completely written"""
        self.logger.log(f"🔍 ensure_file_complete: Checking if file is complete: {file_path}")
        file_size_initial = -1
        max_wait = 30
        start_time = time.time()
        while time.time() - start_time < max_wait:
            try:
                if not os.path.exists(file_path):
                    self.logger.log(f"🔍 ensure_file_complete: File doesn't exist yet: {file_path}")
                    time.sleep(0.5)
                    continue
                
                file_size = os.path.getsize(file_path)
                self.logger.log(f"🔍 ensure_file_complete: File size: {file_size} bytes (prev: {file_size_initial})")
                if file_size == file_size_initial and file_size > 0:
                    self.logger.log(f"✅ ensure_file_complete: File is complete: {file_path}")
                    return True
                file_size_initial = file_size
                time.sleep(0.5)
            except Exception as e:
                self.logger.log(f"❌ ensure_file_complete: Error checking file size: {str(e)}")
                self.logger.log(f"Traceback: {traceback.format_exc()}")
                time.sleep(0.5)
        
        self.logger.log(f"⚠️ ensure_file_complete: Timeout reached, file size: {file_size_initial}")
        return file_size_initial > 0

    def wait_for_new_file(self, directory, pattern, reference_files, extensions, timeout):
        """Wait for new file to appear in directory"""
        self.logger.log(f"🔍 wait_for_new_file: Searching in directory: {directory}")
        self.logger.log(f"🔍 wait_for_new_file: Pattern: '{pattern}', Extensions: {extensions}")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                if not os.path.exists(directory):
                    time.sleep(1)
                    continue
                    
                all_files_in_dir = os.listdir(directory)
                try:
                    for ext in extensions:
                        pattern_with_ext = f"{pattern}*.{ext}" if pattern else f"*.{ext}"
                        search_pattern = os.path.join(directory, pattern_with_ext)
                        all_files = glob.glob(search_pattern)
                        
                        new_files = [f for f in all_files if f not in reference_files]
                        
                        if new_files:
                            newest_file = max(new_files, key=os.path.getctime)
                            print(f"Found potential new file: {newest_file}")
                            if self.ensure_file_complete(newest_file):
                                if extensions == ["mp4"]:
                                    time.sleep(4)
                                elif extensions in ["png", "jpg", "jpeg", "webp", "gif"]:
                                    time.sleep(2)
                                elif extensions in ["mp3", "wav"]:
                                    time.sleep(1)
                                return newest_file
                except Exception as e:
                    self.logger.log(f"❌ wait_for_new_file: Error searching for new file: {str(e)}")
                    self.logger.log(f"Traceback: {traceback.format_exc()}")
                    time.sleep(1)
                
                time.sleep(1)
            except Exception as e:
                self.logger.log(f"❌ wait_for_new_file: Error scanning directory {directory}: {str(e)}")
                self.logger.log(f"Traceback: {traceback.format_exc()}")
                time.sleep(1)
        
        self.logger.log(f"⚠️ wait_for_new_file: Timeout reached, no new files found")
        return None

    def wait_and_move_files(self, pattern, output_paths, existing_files, extensions=["mp4"], timeout=300, n_files=1, download_directory="/workspace/ComfyUI/output/", retrieve_filenames=False):
        """Move newest matching files from output directory to target paths with cleanup"""
        start_time = time.time()
        filenames = []
        moved_files = []
        
        self.logger.log(f"=== wait_and_move_files started ===")
        self.logger.log(f"Pattern: '{pattern}'")
        self.logger.log(f"Output paths: {output_paths}")
        self.logger.log(f"Extensions: {extensions}")
        self.logger.log(f"Download directory: {download_directory}")
        self.logger.log(f"Existing files count: {len(existing_files)}")
        self.logger.log(f"Timeout: {timeout} seconds")

        new_files = set()
        try:
            while time.time() - start_time < timeout:
                # Check if output directory is accessible
                all_files_in_dir = os.listdir(download_directory)
                self.logger.log(f"Successfully listed directory. Found {len(all_files_in_dir)} total files")
                
                # More flexible pattern matching - use case-insensitive extension matching
                current_files = set()
                for f in all_files_in_dir:
                    # Check if the file has any of the specified extensions (case insensitive)
                    if any(f.lower().endswith(ext.lower()) for ext in extensions):
                        # Also filter by pattern if provided - use more flexible matching
                        if not pattern or str(pattern).lower() in f.lower():
                            current_files.add(f)
                            self.logger.log(f"🔍 Found matching file: {f} (pattern: {pattern})")
                
                self.logger.log(f"Found {len(current_files)} files with matching extensions in download directory")
                if current_files:
                    self.logger.log(f"Matching files: {list(current_files)}")
                
                # Get new files that weren't in the existing set
                new_files = current_files - existing_files
                self.logger.log(f"Found {len(new_files)} new files: {new_files}")
                self.logger.log(f"Existing files: {list(existing_files)}")
                
                if not new_files:
                    time.sleep(2)
                    
                    # Log current directory contents for debugging
                    try:
                        all_files_debug = [f for f in all_files_in_dir if any(f.lower().endswith(ext.lower()) for ext in extensions)]
                        self.logger.log(f"Debug: Current files with extensions {extensions}: {all_files_debug}")
                    except Exception as e:
                        self.logger.log(f"Debug: Error listing directory contents: {str(e)}")
                        self.logger.log(f"Traceback: {traceback.format_exc()}")
                    continue
                
                # Convert to list and sort
                new_files_list = list(new_files)
                if new_files_list:
                    def sort_key(f):
                        file_path = os.path.join(download_directory, f)
                        creation_time = os.path.getctime(file_path)
                        # Prioritize .mp4 files over others
                        priority = 0 if f.lower().endswith('.mp4') else 1
                        return (priority, -creation_time)  # Lower priority first, newer files first
                    
                    new_files_list.sort(key=sort_key)
                    successful_copies = 0
                    
                    for idx, output_path in enumerate(output_paths):
                        if idx >= len(new_files_list):
                            self.logger.log(f"Not enough new files ({len(new_files_list)}) for all destinations ({len(output_paths)})")
                            break
                        
                        # Skip empty paths
                        if not output_path or output_path.strip() == "":
                            self.logger.error(f"Empty output_path at index {idx}, skipping")
                            continue
                            
                        # Move file
                        target_dir = os.path.dirname(output_path)
                        if target_dir:  # Only create directory if there is a path
                            os.makedirs(target_dir, exist_ok=True)
                        new_file = new_files_list[idx]
                        source_path = os.path.join(download_directory, new_file)
                
                        if retrieve_filenames:
                            original_filename = new_file
                            target_path = os.path.join(target_dir, original_filename)
                        else:
                            target_path = output_path
                        
                        self.logger.log(f"Copying file {idx+1}/{len(output_paths)}:")
                        self.logger.log(f"  Source: {source_path}")
                        self.logger.log(f"  Target: {target_path}")
                        
                        # Only log copy attempts if there are issues
                        for copy_attempt in range(3):
                            try:
                                self.logger.log(f"🔍 Copy attempt {copy_attempt+1}: Copying from {source_path} to {target_path}")
                                shutil.copy2(source_path, target_path)
                                
                                if self.validate_file(target_path) and self.ensure_file_complete(target_path):
                                    successful_copies += 1
                                    filenames.append(target_path)
                                    moved_files.append(source_path)
                                    self.logger.log(f"✅ Successfully copied file {idx+1}")
                                    break
                                else:
                                    self.logger.log(f"❌ File validation or completion failed: {target_path}")

                            except Exception as e:
                                self.logger.log(f"❌ Copy attempt {copy_attempt+1} failed: {str(e)}")
                                self.logger.log(f"Traceback: {traceback.format_exc()}")
                                time.sleep(2)
                    
                    # If we successfully copied all files, break out of the loop
                    if successful_copies == len(output_paths):
                        self.logger.log(f"✅ Successfully copied all {successful_copies} files")
                        break
                        
                time.sleep(1)

            self.cleanup_moved_files(moved_files)
            
            if retrieve_filenames:
                return filenames
            else:
                return len(filenames) > 0
                
        except Exception as e:
            self.cleanup_moved_files(moved_files)
            self.logger.error(f"❌ Error in wait_and_move_files: {str(e)}")
            self.logger.error(f"Traceback: {traceback.format_exc()}")
            return False if not retrieve_filenames else []

    def cleanup_moved_files(self, moved_files):
        """Clean up files that have been successfully moved"""
        try:
            if not moved_files:
                return
                
            self.logger.log(f"🧹 Cleaning up {len(moved_files)} moved files from source directories...")
            
            cleaned_count = 0
            for file_path in moved_files:
                try:
                    if os.path.exists(file_path):
                        # Check if file is still being written
                        try:
                            with open(file_path, 'r+b') as f:
                                pass
                        except (PermissionError, OSError):
                            # File is locked, skip it
                            continue
                        
                        # Check file age - only delete files older than 30 seconds
                        file_age = time.time() - os.path.getctime(file_path)
                        if file_age < 30:
                            continue
                        
                        os.remove(file_path)
                        cleaned_count += 1
                except Exception as e:
                    # Skip files that can't be deleted
                    continue
            
            if cleaned_count > 0:
                self.logger.log(f"✅ Cleaned up {cleaned_count} moved files")
                
        except Exception as e:
            self.logger.log(f"Error in moved files cleanup: {str(e)}")

    def get_initial_files(self, pattern, path="/workspace/ComfyUI/output/", extensions=["mp4"], exclude_files=None):
        """Get a list of existing files matching a pattern

        Args:
            pattern: The pattern to match filenames against (can be empty for all files with extensions)
            path: The directory path to search (defaults to output_dir)
            extensions: List of file extensions to look for (default ["mp4"])
            exclude_files: List of file patterns to exclude (any file containing any of these patterns will be excluded)

        Returns:
            set: A set of filenames (not full paths) of existing files
        """
        if path is None:
            path = self.output_dir
        
        if exclude_files is None:
            exclude_files = []
        
        result = set()
        try:
            # Get all files in the directory
            all_files = os.listdir(path)
            
            # Filter files by extensions and pattern (more precise matching)
            for f in all_files:
                # Case-insensitive extension matching
                if any(f.lower().endswith(ext.lower()) for ext in extensions):
                    # If pattern is provided, file must START with the pattern (exact match)
                    if not pattern or f.startswith(str(pattern)):
                        # Check if file should be excluded
                        should_exclude = False
                        for exclude_pattern in exclude_files:
                            if exclude_pattern.lower() in f.lower():
                                should_exclude = True
                                break
                        
                        if not should_exclude:
                            result.add(f)
                        
            self.logger.log(f"Found {len(result)} existing files starting with '{pattern}' with extensions {extensions} in {path}")
            # Log the actual file names for debugging
            if len(result) > 0:
                self.logger.log(f"Existing files: {list(result)}")
            return result
        except Exception as e:
            self.logger.log(f"Error getting initial files for pattern '{pattern}': {str(e)}")
            return []
            
    def cleanup_files(self, existing_files):
        """
        Enhanced cleanup method that safely removes temporary files from output directories
        """
        try:
            self.logger.log("🧹 Enhanced cleanup of temporary files from output directories...")
            
            # Define directories to clean up
            cleanup_directories = [
                "/workspace/ComfyUI/output/",
                "/workspace/ComfyUI/input/",
                "/tmp/",
                "/var/tmp/"
            ]
            
            total_cleaned = 0
            
            for directory in cleanup_directories:
                try:
                    if not os.path.exists(directory):
                        continue
                        
                    cleaned_count = 0
                    files = os.listdir(directory)
                    
                    for filename in files:
                        file_path = os.path.join(directory, filename)
                        
                        # Skip directories
                        if os.path.isdir(file_path):
                            continue
                        
                        # Skip files that are in the existing_files list (if provided)
                        if existing_files and filename in existing_files:
                            continue
                        
                        # Skip files that are currently being written
                        try:
                            with open(file_path, 'r+b') as f:
                                pass
                        except (PermissionError, OSError):
                            # File is locked, skip it
                            continue
                        
                        # Check file age - only delete files older than 5 minutes
                        try:
                            file_age = time.time() - os.path.getctime(file_path)
                            if file_age < 300:  # 5 minutes
                                continue
                        except:
                            continue
                        
                        # Delete the file
                        try:
                            os.remove(file_path)
                            cleaned_count += 1
                        except Exception as e:
                            # Skip files that can't be deleted
                            continue
                    
                    total_cleaned += cleaned_count
                    if cleaned_count > 0:
                        self.logger.log(f"🧹 Cleaned {cleaned_count} files from {directory}")
                        
                except Exception as e:
                    self.logger.log(f"⚠️ Could not clean directory {directory}: {str(e)}")
            
            if total_cleaned > 0:
                self.logger.log(f"✅ Enhanced cleanup completed: {total_cleaned} files cleaned total")
            else:
                self.logger.log("✅ No temporary files found to clean up")
                
            return True
            
        except Exception as e:
            self.logger.log(f"Error in enhanced cleanup: {str(e)}")
            return False

    def copy_file(self, source_path, target_dir="/tmp/"):
        """Copy a file to a target directory
        
        Args:
            source_path: Path to the source file
            target_dir: Target directory
            
        Returns:
            str: Path to the copied file, or None if copy failed
        """
        try:
            if not os.path.exists(source_path):
                self.logger.error(f"Source file not found: {source_path}")
                return None
                
            # Get file size for verification
            file_size = os.path.getsize(source_path)
            self.logger.log(f"Source file size: {file_size} bytes")
            
            # Create target filename (use the original filename from the path)
            filename = os.path.basename(source_path)
            target_path = os.path.join(target_dir, filename)
            
            # Ensure target directory exists
            os.makedirs(target_dir, exist_ok=True)
            
            # Copy the file
            self.logger.log(f"Copying file from {source_path} to {target_path}")
            shutil.copy2(source_path, target_path)
            
            # Verify file exists and has correct size
            if os.path.exists(target_path):
                copied_size = os.path.getsize(target_path)
                if copied_size == file_size:
                    self.logger.log(f"File copied successfully. Size: {copied_size} bytes")
                    return target_path
                else:
                    self.logger.error(f"File size mismatch: original={file_size}, copied={copied_size}")
                    return None
            else:
                self.logger.error("File copy failed - target file does not exist")
                return None
        
        except Exception as e:
            self.logger.error(f"Error copying file: {str(e)}")
            return None

    def get_state(self, prompt_id, timeout=1200, state_error=False):
        """
        Enhanced version: Wait for "Prompt executed" message with detailed logging
        """
        self.logger.log(f"🔍 MONITORING PROMPT EXECUTION:")
        self.logger.log(f"   Prompt ID: {prompt_id}")
        self.logger.log(f"   Timeout: {timeout} seconds")
        self.logger.log(f"   WebSocket: ws://{self.server_address}/ws")
        
        ws = websocket.WebSocket()
        try:
            ws.connect(f"ws://{self.server_address}/ws")
            self.logger.log(f"✅ WebSocket connected successfully")
            
            start_time = time.time()
            message_count = 0

            while time.time() - start_time < timeout:
                try:
                    ws.settimeout(timeout)
                    message = ws.recv()
                    message_count += 1
                    
                    if isinstance(message, str):
                        data = json.loads(message)
                        
                        # # Log all messages for debugging (but limit frequency)
                        # if message_count % 10 == 1:  # Log every 10th message
                        #     self.logger.log(f"📡 WebSocket message #{message_count}: {data}")
                        
                        if data.get('type', "") == 'status':
                            if data.get('data', {}).get('status', {}).get('exec_info', {}).get('queue_remaining', 0) == 0:
                                # self.logger.log(f"📡 WebSocket message #{message_count}: {data}")
                                # self.logger.log(f"   Execution time: {time.time() - start_time:.1f} seconds")
                                return True
                            else:
                                # self.logger.log(f"📡 WebSocket message #{message_count}: {data}")
                                pass
                        else:
                            # self.logger.log(f"📡 WebSocket message #{message_count}: {data}")
                            pass

                    if not self.is_server_running():
                        self.logger.log("🔄 ComfyUI server is not running while getting state, fatal error, starting it...")
                        self.start_server()
                        return False
                    
                except websocket.WebSocketTimeoutException or websocket.WebSocketConnectionClosedException as e:
                    self.logger.log(f"❌ WebSocket error: {e}")
                    self.logger.error(f"❌ WebSocket connection closed or timed out")
                    break
                    
            self.logger.warning(f"❌ Timeout after {timeout} seconds")
            return False
                    
        finally:
            try:
                ws.close()
            except Exception:
                pass
                
        return False 

    def process_generated_prompt(self, workflow, output_path, pattern=None, extensions=["mp4"], timeout=300, n_files=1, download_directory="/workspace/ComfyUI/output/", retrieve_filenames=False):
        """
        Process a generated prompt: wait for completion, move files, and cleanup
        
        Args:
            output_path: The output path for the generated files
            pattern: Pattern to match files (optional)
            extensions: List of file extensions to process
            timeout: Timeout in seconds for waiting
            n_files: Number of files to process
            download_directory: Source directory in WSL
            retrieve_filenames: Whether to return filenames
            
        Returns:
            True if successful, False otherwise
        """
        self.logger.log(f"🔄 Processing generated prompt with output path: {output_path}")

        # Check if the server is ready
        if not self.is_server_running():
            self.logger.log("Starting ComfyUI server...")
            self.start_server()
        
        existing_files = self.get_initial_files(pattern, download_directory, extensions)
        self.queue_prompt(workflow)
        if not self.get_state(prompt_id=workflow.get("prompt_id")):
            self.logger.error(f"❌ Prompt execution failed")
            return False

        try:
            result = self.wait_and_move_files(
                pattern=pattern,
                output_paths=[output_path],
                existing_files=existing_files,
                extensions=extensions,
                timeout=timeout,
                n_files=n_files,
                download_directory=download_directory,
                retrieve_filenames=retrieve_filenames
            )
            
            if result:
                # Step 2: Clean up any remaining files in the output directory
                try:
                    self.cleanup_files(existing_files)
                    self.logger.log("✅ Cleaned up remaining files in output directory")
                except Exception as e:
                    self.logger.warning(f"Warning: File cleanup failed: {str(e)}")
                
                return True
            else:
                self.logger.error(f"❌ Failed to move files to: {output_path}")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ Error in process_generated_prompt: {str(e)}")
            return False
        
    def unload_comfyui_models(self, server_address="http://127.0.0.1:8188/"):
        """
        Unloads all models from a ComfyUI server by sending a workflow
        containing the 'UnloadAllModels' custom node.

        This function requires the 'ComfyUI-Unload-Models' custom node
        to be installed on your ComfyUI server.

        Args:
            server_address (str): The address of your ComfyUI server
                                (e.g., "127.0.0.1:8188" or "your_wsl_ip:8188").
                                If None, uses self.server_address.

        Returns:
            bool: True if the request was successfully sent, False otherwise.
        """
        if server_address is None:
            server_address = self.server_address
            
        import uuid
        client_id = str(uuid.uuid4())
        prompt_url = f"http://{server_address}/prompt"

        # Minimal workflow JSON to trigger the UnloadAllModels node.
        # The 'UnloadAllModels' node typically takes any input to trigger.
        # We're creating a simple workflow that just executes this node.
        workflow = {
            "1": {
                "inputs": {
                    "value": "trigger_unload" # Any value can be used to trigger
                },
                "class_type": "UnloadAllModels", # This is the key custom node
                "_meta": {
                    "title": "Unload All Models"
                }
            }
        }

        payload = {
            "prompt": workflow,
            "client_id": client_id
        }

        try:
            self.logger.log(f"🧹 Attempting to send unload request to ComfyUI server at {server_address}...")
            
            data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(prompt_url, data=data, headers={'Content-Type': 'application/json'})
            
            with urllib.request.urlopen(req, timeout=15) as response:
                response_data = json.loads(response.read())
                
                if "prompt_id" in response_data:
                    self.logger.log(f"✅ Successfully sent unload request. Prompt ID: {response_data['prompt_id']}")
                    self.logger.log("Models should now be unloading on the ComfyUI server.")
                    return True
                else:
                    self.logger.warning(f"Failed to get a prompt ID in response: {response_data}")
                    return False

        except urllib.error.URLError as e:
            self.logger.error(f"Error: Could not connect to ComfyUI server at {server_address}.")
            self.logger.error("Please ensure ComfyUI is running and the server address is correct.")
            return False
        except urllib.error.HTTPError as e:
            self.logger.error(f"HTTP error occurred: {e.code} - {e.reason}")
            error_content = e.read().decode("utf-8")
            self.logger.error(f"Error response: {error_content}")
            return False
        except json.JSONDecodeError:
            self.logger.error("Error: Failed to decode JSON response from ComfyUI server.")
            return False
        except Exception as e:
            self.logger.error(f"An unexpected error occurred: {e}")
            return False

    def load_input(self, input_path, video_filename):
        try:
            comfyui_video_path = os.path.join(self.input_dir, video_filename)
            
            self.logger.log(f"🔍 DEBUG: Copying {input_path} to {comfyui_video_path}")
            
            # Check if source file exists and get its size
            if not os.path.exists(input_path):
                self.logger.error(f"❌ Source file does not exist: {input_path}")
                return None
            
            source_size = os.path.getsize(input_path)
            self.logger.log(f"📊 Source file size: {source_size} bytes")
            
            # Ensure the input directory exists
            os.makedirs(os.path.dirname(comfyui_video_path), exist_ok=True)
            self.logger.log(f"📁 Input directory created/verified: {os.path.dirname(comfyui_video_path)}")
            
            # Copy the file
            shutil.copy2(input_path, comfyui_video_path)
            self.logger.log(f"📋 File copy command completed")
            
            # Verify the file was copied successfully
            if not os.path.exists(comfyui_video_path):
                self.logger.error(f"❌ Failed to copy file to ComfyUI input: {comfyui_video_path}")
                return None
            
            # Check copied file size
            copied_size = os.path.getsize(comfyui_video_path)
            self.logger.log(f"📊 Copied file size: {copied_size} bytes")
            
            if copied_size != source_size:
                self.logger.error(f"❌ File size mismatch: source={source_size}, copied={copied_size}")
                return None
            
            # Test if the copied file can be opened by OpenCV
            try:
                import cv2
                cap = cv2.VideoCapture(comfyui_video_path)
                if cap.isOpened():
                    ret, frame = cap.read()
                    cap.release()
                    if ret and frame is not None:
                        self.logger.log(f"✅ Copied file is valid and readable by OpenCV")
                    else:
                        self.logger.error(f"❌ Copied file cannot be read by OpenCV")
                        return None
                else:
                    self.logger.error(f"❌ Copied file cannot be opened by OpenCV")
                    return None
            except Exception as e:
                self.logger.error(f"❌ Error testing copied file with OpenCV: {str(e)}")
                return None
            
            self.logger.log(f"✅ Successfully copied and validated {input_path} to {comfyui_video_path}")
            relative_path = "input/" + video_filename
            return relative_path
            
        except Exception as e:
            self.logger.error(f"❌ Error copying file to ComfyUI input: {str(e)}")
            import traceback
            self.logger.error(f"📋 Full traceback: {traceback.format_exc()}")
            return None

    def is_server_running(self):
        """Check if ComfyUI server is running"""
        try:
            import urllib.request
            with urllib.request.urlopen(f"http://{self.server_address}/system_stats", timeout=5) as response:
                return response.getcode() == 200
        except:
            return False

    def start_server(self):
        """Start ComfyUI server"""
        try:
            self.logger.log("🚀 Starting ComfyUI server...")
            # The server should already be started by the RunPod startup script
            # This is a placeholder for any additional server management if needed
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to start ComfyUI server: {str(e)}")
            return False

    def windows_to_wsl_path(self, windows_path):
        """Convert Windows path to WSL path (deprecated for Linux environment)"""
        # This method is no longer needed in pure Linux environment
        # Return the path as-is since we're already in Linux
        return windows_path