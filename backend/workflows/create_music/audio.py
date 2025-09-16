import os
import traceback
from moviepy.editor import VideoFileClip, AudioFileClip, CompositeAudioClip, CompositeVideoClip, TextClip, concatenate_videoclips, ImageClip, concatenate_audioclips, afx
import numpy as np
from scipy.signal import find_peaks
import subprocess
import shutil
import math
import torch
import librosa

from ...logger import Scripts
from ...mediaProcessing.video.video import Video

ressources_path__init__ = os.path.join("C:\\", "Code", "Creator", "Youtube Creator App", "Resources")

class Audio:
    def __init__(self):
        self.package_dir = os.path.dirname(__file__)
        self.logger = Scripts("Audio")
        # Quiet initialization
        self.video = Video()
        # Directory to store temporary artifacts for current render (set by caller)
        self.temp_dir = None
    
    def linear_visualizer_advanced(self, audio_path, output_path='output.mp4', 
                        width=1920, height=1080, video_path=None, use_background=True, 
                        circle_color_primary=(255, 50, 255), circle_color_secondary=(50, 200, 255), 
                        bar_gradient_top=(50, 200, 255), bar_gradient_bottom=(255, 50, 255),
                        circle_min_radius=40, circle_max_radius=80, min_bar_height=7, logo_path=None, logo_scale_factor=1,
                        batch_size=8, duration_intro=0, fadein_duration=0, fadeout_duration=0, delay_outro=0, 
                        short_mode=False, particles=True, viz_width=None, viz_height=None, viz_x=None, viz_y=None,
                        time_in=0.0):
        """
        Performance-optimized linear audio visualizer using PyTorch and OpenCV
        with background video support and geometric effects
        
        Parameters:
        - audio_path: path to the audio file
        - output_path: path to save the output video
        - width: width of the output video
        - height: height of the output video
        - video_path: optional background video
        - use_background: whether to use the provided video_path as background
        - circle_color_primary/secondary: colors for the bass circle
        - bar_gradient_top/bottom: colors for the audio bars
        - circle_min/max_radius: size range for the bass circle
        - min_bar_height: minimum height for audio bars
        - logo_path: path to PNG logo to display in the center of the bass circle
        - logo_scale_factor: size multiplier for the logo
        - batch_size: number of frames to process in parallel (higher values use more GPU memory)
        - duration_intro: duration of the intro
        - fadein_duration: duration of the fade-in
        - fadeout_duration: duration of the fade-out
        - delay_outro: delay before the end of the video
        - short_mode: whether to use short mode (no bars, only bass circle)
        - particles: whether to enable particle effects
        - viz_width: width of the visualizer (if None, uses full video width)
        - viz_height: height of the visualizer (if None, uses full video height)
        - viz_x: x position of the visualizer (if None, centers horizontally)
        - viz_y: y position of the visualizer (if None, centers vertically)
        - time_in: time in seconds when the visualizer should start appearing (default: 0.0)
        """
        import numpy as np
        import torch
        import cv2
        import librosa
        import os
        import shutil
        import math
        import random
        from moviepy.editor import AudioFileClip, VideoFileClip

        # Setup visualization parameters
        fps = 30
        n_segments = 58  # Reduced from 60 by 2 as requested
        decay = 0.95
        color_white_weight = 0.5
        bar_height_multiplier = 0.18  # Reduced from 0.298 to 0.296 to reduce max height by another 2
        smoothing_window = 3  # PERFORMANCE: Reduced from 5 for faster processing
        line_width = 1  # Fixed: minimum valid thickness for cv2.line is 1, not -1
        
        # Load logo and colors
        logo_img = cv2.imread(logo_path, cv2.IMREAD_UNCHANGED)

        colors = {
            'bar_top_bgr': (255, 255, 255),
            'bar_bottom_bgr': (255, 255, 255),
            'circle_primary': (255, 255, 255),
            'circle_secondary': (255, 255, 255)
        }
        
        # Process audio and prepare FFT - this happens on GPU
        # Set default fade-in duration to 3 seconds if not specified
        if fadein_duration == 0:
            fadein_duration = 3.0
            self.logger.log(f"🎨 Visualizer fade-in duration set to {fadein_duration}s (default)")
        else:
            self.logger.log(f"🎨 Visualizer fade-in duration: {fadein_duration}s")
            
        audio_data, fft_data, duration, total_frames, samples_per_frame = self._prepare_fft_data(
            audio_path, "cpu", fps, n_segments, smoothing_window, duration_intro, fadein_duration, fadeout_duration, delay_outro
        )
        
        # Store time_in parameter and fps for opacity calculations
        self.time_in = time_in
        self.visualizer_fps = fps
        
        # Setup shape parameters
        shape_params = self._setup_shape_parameters(fps)
        
        # PERFORMANCE: Reduce max number of shapes
        shape_params['max_shapes'] = 250  # Reduced from 500
        
        # Setup visualization dimensions with positioning
        # Calculate visualizer dimensions (reduce by 2 if not specified)
        viz_width = viz_width if viz_width is not None else width // 2
        viz_height = viz_height if viz_height is not None else height // 2
        
        # Calculate visualizer position (default to lower sixth, horizontally centered)
        if viz_x is None:
            viz_x = (width - viz_width) // 2  # Center horizontally
        if viz_y is None:
            viz_y = int(height * 5/6) - viz_height // 2  # Lower sixth
        
        # Ensure visualizer stays within video bounds
        viz_x = max(0, min(viz_x, width - viz_width))
        viz_y = max(0, min(viz_y, height - viz_height))
        
        frame_params = {
            'width': width,
            'height': height,
            'viz_width': viz_width,
            'viz_height': viz_height,
            'viz_x': viz_x,
            'viz_y': viz_y,
            'center_x': viz_x + viz_width // 2,  # Center of visualizer area
            'center_y': viz_y + viz_height // 2,  # Center of visualizer area
            'max_bar_height': int(viz_height * bar_height_multiplier),
            'margin': int(viz_width * 0.1),
            'circle_min_radius': circle_min_radius,
            'circle_max_radius': circle_max_radius,
            'min_bar_height': min_bar_height
        }
        
        # Load background video if provided
        bg_video = self._load_background_video(video_path, use_background, duration, width, height)
        
        # Setup video writer
        try:
            # Make sure directory exists (only if there's a directory component)
            output_dir = os.path.dirname(output_path)
            if output_dir:  # Only create directory if there's a directory component
                os.makedirs(output_dir, exist_ok=True)
            
            # Ensure a dedicated temp effects directory inside final_videos
            temp_effects_dir = os.path.join(output_dir, "temp_final_effects") if output_dir else "temp_final_effects"
            os.makedirs(temp_effects_dir, exist_ok=True)
            # Expose to downstream helpers (e.g., _prepare_fft_data)
            self.temp_dir = temp_effects_dir

            # Use a temporary path during creation to avoid issues with failed files (in temp_final_effects)
            temp_output_path = os.path.join(temp_effects_dir, os.path.basename(output_path) + ".temp.mp4")
            
            # PERFORMANCE: Use more efficient codec
            video_writer = cv2.VideoWriter(
                temp_output_path, 
                cv2.VideoWriter_fourcc(*'avc1'),  # Use avc1 codec for better compression and performance
                fps, 
                (width, height)
            )
            
            # Check if the writer was initialized successfully
            if not video_writer.isOpened():
                # Fall back to mp4v if avc1 fails
                video_writer = cv2.VideoWriter(
                    temp_output_path, 
                    cv2.VideoWriter_fourcc(*'mp4v'),
                    fps, 
                    (width, height)
                )
                if not video_writer.isOpened():
                    self.logger.log(f"Failed to open video writer for {temp_output_path}")
                    raise Exception("Failed to initialize video writer")
                
            self.logger.log(f"Video writer initialized successfully for {temp_output_path}")
        except Exception as e:
            self._log_error_with_context(
                "Error setting up video writer", 
                exception=e, 
                context={"temp_output_path": temp_output_path, "fps": fps, "width": width, "height": height}
            )
            # Clean up and ensure we don't leave partial files
            if 'video_writer' in locals() and video_writer:
                video_writer.release()
            if 'temp_output_path' in locals() and os.path.exists(temp_output_path):
                try:
                    os.remove(temp_output_path)
                except Exception as cleanup_error:
                    if self.logger:
                        self.logger.log(f"⚠️ Warning: Failed to remove temporary file during cleanup: {str(cleanup_error)}")
            raise
        
        # PERFORMANCE: Increase batch size for better CPU utilization
        actual_batch_size = 1
        
        # Process frames in batches
        particles = []  # List to track particles (replacing old geometric shapes)
        
        for batch_start in range(0, total_frames, actual_batch_size):
            batch_end = min(batch_start + actual_batch_size, total_frames)
            current_batch_size = batch_end - batch_start
            
            batch_frames = []
            batch_values = fft_data[batch_start:batch_end].detach()
            
            # Fall back to standard processing for each frame
            for i in range(batch_start, batch_end):
                # Create frame with or without background
                frame = self._create_linear_frame(i, fps, frame_params, bg_video)
                
                # Calculate visualizer opacity for fade effects
                viz_opacity = self._calculate_visualizer_opacity(i)

                if viz_opacity > 0:
                    # Extract current FFT values
                    values = fft_data[i].detach().cpu().numpy()
                    
                    # Scale FFT values by opacity for fade effect
                    values = values * viz_opacity
                    
                    # Draw visualization elements
                    if not short_mode:
                        # Draw bars for regular mode
                        frame, spawn_positions = self._draw_linear_visualizer_bars(
                            frame, values, n_segments, frame_params, 
                            colors['bar_top_bgr'], colors['bar_bottom_bgr'], 
                            line_width, shape_params['circle_shape_radius']
                        )
                    else:
                        # Short mode: skip bars, only use bass circle
                        spawn_positions = []
                    
                    # Draw bass circle and logo (always included)
                    frame = self._draw_bass_circle(
                        frame, values, frame_params, 
                        colors['circle_primary'], colors['circle_secondary'], 
                        logo_img, logo_scale_factor, i, fps, bg_video
                    )
                    
                    # NEW PARTICLE SYSTEM: Process particles on every frame (replacing old geometric shapes)
                    if particles:
                        particles = self._process_ambient_particles(
                            frame, particles, values, frame_params, colors
                    )
                
                # Write frame
                video_writer.write(frame)
            
            # Log progress
            if batch_start % (total_frames // 10) == 0:  # PERFORMANCE: Log less frequently
                progress = 100 * batch_start // total_frames
                self.logger.log(f"Rendered frames {batch_start}-{batch_end-1}/{total_frames} ({progress}%)")
        
        # Finalize video
        try:
            # Make sure to release the video writer
            video_writer.release()
            
            # Verify that the file was created and has content
            if os.path.exists(temp_output_path) and os.path.getsize(temp_output_path) > 0:
                self.logger.log(f"Video writer released. File size: {os.path.getsize(temp_output_path)} bytes")
                
                # Clean up any existing file at the target location
                if os.path.exists(output_path):
                    os.remove(output_path)
                    
                # Move temp file to final output
                os.rename(temp_output_path, output_path)
                self.logger.log(f"Renamed temporary file to final output: {output_path}")
            else:
                self.logger.log("Error: Temporary video file is missing or empty")
                raise Exception("Failed to create visualization video")
        except Exception as e:
            self.logger.log(f"Error finalizing video: {e}")
            # Clean up and ensure we don't leave partial files
            if os.path.exists(temp_output_path):
                try:
                    os.remove(temp_output_path)
                except Exception as cleanup_error:
                    if self.logger:
                        self.logger.log(f"⚠️ Warning: Failed to remove temporary file during finalization cleanup: {str(cleanup_error)}")
            raise
        
        # Clean up and add audio
        if bg_video is not None:
            bg_video.close()
            
        # Add audio to the video 
        if os.path.exists(output_path):
            self._add_audio_to_video(output_path, audio_path)
            
            # Verify the final file exists and has content
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                self.logger.log("Error: Final video file is missing or empty after adding audio")
                raise Exception("Failed to create visualization video with audio")
        else:
            self.logger.log("Error: Video file is missing before adding audio")
            raise Exception("Failed to create visualization video")
        
        self.logger.log("Visualization complete. Output saved to: " + output_path)
        # Reset temp dir after use
        self.temp_dir = None
        return output_path
 
    def _prepare_fft_data(self, audio_path, device, fps, n_segments, smoothing_window, duration_intro, fadein_duration=3, fadeout_duration=3, delay_outro=0):
        """
        Load audio and prepare FFT data for visualization
        """
        import torch
        import librosa
        from pydub import AudioSegment
        
        # Load audio
        audio = AudioSegment.from_file(audio_path)

        # For visualizer with introduction_duration, we start from the introduction point
        # instead of trimming from the beginning
        start_time = duration_intro * 1000  # Pydub uses milliseconds
        if start_time > 0:
            audio = audio[start_time:]  # Start from the introduction point
            self.logger.log(f"Starting audio from {duration_intro:.2f}s for visualizer")

        # Export the modified audio to a new file into the temp effects directory when available
        try:
            if getattr(self, 'temp_dir', None):
                os.makedirs(self.temp_dir, exist_ok=True)
                output_path = os.path.join(self.temp_dir, 'audio_temp.wav')
            else:
                output_path = os.path.dirname(audio_path) + '/audio_temp.wav'
        except Exception:
            output_path = os.path.dirname(audio_path) + '/audio_temp.wav'
        audio.export(output_path, format="wav")  # 
        y_sr, sr = librosa.load(output_path, sr=None)
        audio_tensor = torch.tensor(y_sr, device="cpu")
        duration = len(y_sr) / sr
        total_frames = int(duration * fps)
        samples_per_frame = int(sr / fps)
        
        # Store fade parameters for opacity calculations
        self.fade_params = {
            'fadein_frames': int(fadein_duration * fps),
            'fadeout_frames': int(fadeout_duration * fps),
            'delay_outro_frames': int(delay_outro * fps),
            'total_frames': total_frames,
            'duration_intro_frames': 0  # Since we already started from intro point, this is 0
        }
        
        # Prepare batched frames for FFT
        frame_samples = []
        for i in range(total_frames):
            start_idx = i * samples_per_frame
            end_idx = min(start_idx + samples_per_frame, len(audio_tensor))
            if start_idx >= len(audio_tensor):
                # Handle edge case by repeating the last valid frame
                if frame_samples:
                    frame_samples.append(frame_samples[-1])
                else:
                    # If we somehow have no valid frames yet, create a zero tensor
                    frame_samples.append(torch.zeros(samples_per_frame, device=device))
            else:
                # Pad with zeros if needed to ensure consistent length
                sample = audio_tensor[start_idx:end_idx]
                if len(sample) < samples_per_frame:
                    padding = torch.zeros(samples_per_frame - len(sample), device=device)
                    sample = torch.cat([sample, padding])
                frame_samples.append(sample)
        
        # Stack samples into a tensor with consistent dimensions
        frame_samples = torch.stack(frame_samples)
        
        # Compute FFT in batch on GPU
        fft_outputs = torch.fft.rfft(frame_samples)
        # Ensure consistent size for FFT magnitude
        n_fft_bins = fft_outputs.shape[1]
        target_bins = min(n_fft_bins, n_segments // 2)
        fft_magnitude = torch.abs(fft_outputs[:, :target_bins])
        fft_magnitude /= torch.amax(fft_magnitude, dim=1, keepdim=True) + 1e-6
        
        # Apply smoothing using Conv1d
        smoothed = self._apply_fft_smoothing(fft_magnitude, n_segments, smoothing_window, "cpu", total_frames)
        
        # Ensure consistent size for mirrored spectrum
        target_half_bins = n_segments // 2
        # Force exact size matching for all tensors to prevent size mismatches
        if smoothed.shape[1] != target_half_bins:
            if smoothed.shape[1] > target_half_bins:
                smoothed = smoothed[:, :target_half_bins]
            else:
                padding = torch.zeros((smoothed.shape[0], target_half_bins - smoothed.shape[1]), device="cpu")
                smoothed = torch.cat([smoothed, padding], dim=1)
        
        # Reset any previous state to avoid contamination between different audio files
        if hasattr(self, '_previous_fft_data'):
            delattr(self, '_previous_fft_data')
            
        # Create mirror with exactly n_segments bins
        mirrored_fft = torch.cat([smoothed, torch.flip(smoothed, dims=[1])], dim=1)
        
        # Ensure the mirrored FFT has exactly n_segments for consistent sizes
        if mirrored_fft.shape[1] != n_segments:
            if mirrored_fft.shape[1] > n_segments:
                mirrored_fft = mirrored_fft[:, :n_segments]
            else:
                padding = torch.zeros((mirrored_fft.shape[0], n_segments - mirrored_fft.shape[1]), device="cpu")
                mirrored_fft = torch.cat([mirrored_fft, padding], dim=1)
                
        mirrored_fft = mirrored_fft.clamp(min=0.02)
        
        return y_sr, mirrored_fft, duration, total_frames, samples_per_frame
    
    def _calculate_visualizer_opacity(self, frame_idx):
        """
        Calculate the opacity for the visualizer at a given frame index
        Handles fade-in and fade-out effects for visualizer elements
        """
        if not hasattr(self, 'fade_params'):
            return 1.0
        
        fade_params = self.fade_params
        fadein_frames = max(1, fade_params['fadein_frames'])
        fadeout_frames = max(1, fade_params['fadeout_frames'])
        total_frames = fade_params['total_frames']
        delay_outro_frames = fade_params['delay_outro_frames']
        
        # Get time_in parameter (when visualizer should start appearing)
        time_in = getattr(self, 'time_in', 0.0)
        fps = getattr(self, 'visualizer_fps', 30)
        time_in_frames = int(time_in * fps)
        
        # Check if we're before the time_in point
        if frame_idx < time_in_frames:
            return 0.0  # Visualizer is completely invisible before time_in
        
        # Calculate fade-in opacity (starts from time_in, not from frame 0)
        fade_in_start_frame = time_in_frames
        fade_in_end_frame = fade_in_start_frame + fadein_frames
        
        if frame_idx < fade_in_start_frame:
            # Before time_in, visualizer is completely invisible
            fade_in_opacity = 0.0
        elif frame_idx < fade_in_end_frame:
            # We're in the fade-in period after time_in
            frames_into_fadein = frame_idx - fade_in_start_frame
            fade_in_opacity = frames_into_fadein / fadein_frames if fadein_frames > 0 else 1.0
        else:
            fade_in_opacity = 1.0
        
        # Calculate fade-out opacity
        fadeout_start_frame = total_frames - fadeout_frames - delay_outro_frames
        if frame_idx >= fadeout_start_frame and fadeout_frames > 0:
            frames_into_fadeout = frame_idx - fadeout_start_frame
            fade_out_opacity = 1.0 - (frames_into_fadeout / fadeout_frames)
            fade_out_opacity = max(0.0, fade_out_opacity)
        else:
            fade_out_opacity = 1.0
        
        # Return the minimum of both opacities
        final_opacity = min(fade_in_opacity, fade_out_opacity)
        
        return final_opacity
    
    def _apply_fft_smoothing(self, fft_magnitude, n_segments, smoothing_window, device, total_frames):
        """
        Apply temporal smoothing to FFT data
        """
        import torch
        import torch.nn.functional as F
        
        # PERFORMANCE: Simplified smoothing that's faster but still effective
        if fft_magnitude.shape[0] >= smoothing_window:
            # First apply temporal smoothing (along time axis)
            fft_magnitude_t = fft_magnitude.transpose(0, 1).unsqueeze(0)
            
            # Define convolution parameters
            in_channels = fft_magnitude_t.shape[1]  # Use actual number of channels
            
            # PERFORMANCE: Simplified kernel - use triangular kernel which is computationally cheaper
            kernel_size = smoothing_window
            
            # Generate simple triangular kernel (faster than Gaussian)
            x = torch.arange(1, kernel_size + 1, device="cpu").float()
            if kernel_size % 2 == 0:  # Even kernel size
                triangular = torch.cat([x[:kernel_size//2], x[kernel_size//2:].flip(0)])
            else:  # Odd kernel size
                triangular = torch.cat([x[:kernel_size//2], 
                                       torch.tensor([kernel_size//2 + 1], device="cpu").float(),
                                       x[:kernel_size//2].flip(0)])
            
            triangular = triangular / triangular.sum()  # Normalize
            
            # Reshape to convolution kernel
            tri_kernel = triangular.view(1, 1, -1).repeat(in_channels, 1, 1)
            
            # Apply temporal convolution with padding
            padding_size = smoothing_window // 2
            smoothed_t = F.conv1d(
                fft_magnitude_t, tri_kernel, padding=padding_size, groups=in_channels
            )
            
            # PERFORMANCE: Skip spectral smoothing for faster processing
            # The result is still good enough for visualization
            smoothed = smoothed_t.squeeze(0).transpose(0, 1)
            
            # Apply adaptive threshold check across frames based on audio level
            if hasattr(self, '_previous_fft_data') and self._previous_fft_data.shape == smoothed.shape:
                # Calculate average audio level for this frame
                avg_level = torch.mean(smoothed).item()
                
                # Apply adaptive threshold based on audio level
                # When audio is close to 0, use much higher threshold to prevent flickering
                if avg_level < 0.1:  # Very low audio level
                    threshold = 0.4  # 40% threshold for very low levels
                elif avg_level < 0.3:  # Low audio level
                    threshold = 0.2  # 20% threshold for low levels
                else:  # Normal audio level
                    threshold = 0.05  # 5% threshold for normal levels
                
                mask = (smoothed - self._previous_fft_data).abs() < threshold * (self._previous_fft_data + 0.01)
                smoothed = torch.where(mask, self._previous_fft_data, 
                                      0.5 * smoothed + 0.5 * self._previous_fft_data)  # Changed from 0.7/0.3 to 0.5/0.5
                self._previous_fft_data = smoothed.clone()
            else:
                # Initialize with current data
                self._previous_fft_data = smoothed.clone()
        else:
            # Not enough frames to smooth, use original magnitude
            smoothed = fft_magnitude
            self._previous_fft_data = smoothed.clone()
            
        # Ensure frame count matches total_frames
        if smoothed.shape[0] != total_frames:
            if smoothed.shape[0] > total_frames:
                smoothed = smoothed[:total_frames, :]
            elif smoothed.shape[0] < total_frames:
                # Handle case where we need to add more frames
                pad_rows = total_frames - smoothed.shape[0]
                if smoothed.shape[0] > 0:
                    # Repeat the last frame if we have data
                    smoothed = torch.cat([smoothed, smoothed[-1:].repeat(pad_rows, 1)], dim=0)
                else:
                    # Create empty frames if no data
                    smoothed = torch.zeros((total_frames, smoothed.shape[1]), device="cpu")
                    
        # Final size check to ensure consistency   
        if hasattr(self, '_previous_fft_data') and self._previous_fft_data.shape != smoothed.shape:
            self._previous_fft_data = smoothed.clone()
                
        return smoothed
    
    def _setup_shape_parameters(self, fps):
        """
        Setup parameters for geometric shapes in the visualizer
        """
        return {
            'spawn_rate': 0.3,
            'base_spawn_rate': 0.1,
            'base_sizes': [2, 4, 6],
            'min_life': int(6 * fps),
            'max_life': int(10 * fps),
            'max_shapes': 250,
            'speed_min': 0.5,
            'speed_max': 1.5,
            'off_screen_buffer': 50,
            'circle_shape_radius': 1  # Reduced from 3 by 3 as requested
        }
    
    def _create_linear_frame(self, frame_idx, fps, frame_params, bg_video):
        """
        Create a frame for the linear visualizer
        """
        import numpy as np
        import cv2
        
        # Get background frame at current time
        bg_frame_time = frame_idx / fps
        try:
            if bg_video is None:
                self.logger.log(f"Background video is None, using black frame")
                frame = np.zeros((frame_params['height'], frame_params['width'], 3), dtype=np.uint8)
            else:
                bg_frame = bg_video.get_frame(bg_frame_time)
                # Convert RGB to BGR (OpenCV format)
                frame = bg_frame[:, :, ::-1].copy()
        except Exception as e:
            self.logger.log(f"Error getting background frame at {bg_frame_time}s: {e}")
            frame = np.zeros((frame_params['height'], frame_params['width'], 3), dtype=np.uint8)
            
        return frame
    
    def _draw_linear_visualizer_bars(self, frame, values, n_segments, frame_params, bar_top_bgr, bar_bottom_bgr, line_width, circle_shape_radius):
        """
        Draw audio bars and related elements for the linear visualizer
        """
        import cv2
        import numpy as np
        
        # Initialize or update bar height tracking for threshold check
        if not hasattr(self, '_previous_bar_heights'):
            self._previous_bar_heights = np.zeros(n_segments)
        
        # Calculate usable width within the visualizer area
        usable_width = frame_params['viz_width'] - 2 * frame_params['margin']
        spawn_positions = []
        
        # Apply additional smoothing across neighboring frequency bins
        smoothed_values = np.copy(values)
        kernel = np.array([0.05, 0.1, 0.7, 0.1, 0.05])  # Gaussian-like kernel
        for i in range(n_segments):
            # Get neighboring indices with wrap-around
            indices = [(i-2) % n_segments, (i-1) % n_segments, i, (i+1) % n_segments, (i+2) % n_segments]
            # Apply weighted average
            smoothed_values[i] = sum(values[idx] * kernel[j] for j, idx in enumerate(indices))
        
        for j in range(n_segments):
            amp = smoothed_values[j]
            # Calculate x position relative to visualizer area
            x = frame_params['viz_x'] + frame_params['margin'] + int((j / (n_segments - 1)) * usable_width)
            
            # Calculate bar height
            raw_bar_h = int(max(frame_params['min_bar_height'], amp * frame_params['max_bar_height']))
            
            # Apply adaptive threshold based on audio level
            # When audio is close to 0, use much higher threshold to prevent flickering
            if amp < 0.1:  # Very low audio level
                threshold = 0.8  # 80% threshold for very low levels
            elif amp < 0.3:  # Low audio level
                threshold = 0.4  # 40% threshold for low levels
            else:  # Normal audio level
                threshold = 0.15  # 15% threshold for normal levels
            
            if abs(raw_bar_h - self._previous_bar_heights[j]) < threshold * (self._previous_bar_heights[j] + 1):
                # Change is below threshold, keep previous height
                bar_h = self._previous_bar_heights[j]
            else:
                # Apply temporal smoothing for significant changes
                bar_h = int(0.7 * raw_bar_h + 0.3 * self._previous_bar_heights[j])
            
            # Update previous bar height
            self._previous_bar_heights[j] = bar_h
            
            top_y = int(frame_params['center_y'] - bar_h)
            bottom_y = int(frame_params['center_y'] + bar_h)
            
            # Apply smoother color gradient
            color = tuple([
                int(bar_top_bgr[c] + (bar_bottom_bgr[c] - bar_top_bgr[c]) * (j / n_segments))
                for c in range(3)
            ])
            
            # Draw anti-aliased line for smoother appearance
            cv2.line(frame, (x, top_y), (x, bottom_y), color, thickness=line_width, lineType=cv2.LINE_AA)
            spawn_positions.append((x, top_y, amp))
            spawn_positions.append((x, bottom_y, amp))
            
            # Add circles at bar endpoints with anti-aliasing
            cv2.circle(frame, (x, top_y + circle_shape_radius), circle_shape_radius, color, line_width, lineType=cv2.LINE_AA)
            cv2.circle(frame, (x, bottom_y - circle_shape_radius), circle_shape_radius, color, line_width, lineType=cv2.LINE_AA)
            
        return frame, spawn_positions
    
    def _draw_bass_circle(self, frame, values, frame_params, circle_primary, circle_secondary, logo_img, logo_scale_factor, frame_idx, fps, bg_video):
        """
        Draw bass circle with logo cutout for the linear visualizer
        """
        import cv2
        import numpy as np
        
        # Use first 3 frequency bins for bass response
        bass = values[:3].mean() * 0.85
        
        # Initialize or update smoothing buffer
        if not hasattr(self, '_bass_smoothing_buffer'):
            # REDUCED SMOOTHENING: Use smaller buffer for more responsive logo
            self._bass_smoothing_buffer = [bass] * 4  # Reduced from 8 for faster response
            self._previous_bass_radius = None
            self._previous_bass_color = None
        else:
            self._bass_smoothing_buffer.pop(0)
            self._bass_smoothing_buffer.append(bass)
        
        alpha = 0.3  # Increased from 0.15 for more responsive visualizer
        smoothed_bass = self._bass_smoothing_buffer[0]
        for i in range(1, len(self._bass_smoothing_buffer)):
            weight = alpha * (1 - alpha) ** (len(self._bass_smoothing_buffer) - i - 1)
            smoothed_bass = smoothed_bass * (1 - weight) + self._bass_smoothing_buffer[i] * weight
        
        # Calculate circle radius based on smoothed bass intensity
        radius = int(min(
            frame_params['circle_min_radius']*1.3, 
            frame_params['circle_min_radius'] + 
            (frame_params['circle_max_radius'] - frame_params['circle_min_radius']) * smoothed_bass
        ))
        
        # Apply adaptive threshold check for radius changes based on bass level
        if self._previous_bass_radius is not None:
            # Apply adaptive threshold based on bass level
            # When bass is close to 0, use much higher threshold to prevent flickering
            if smoothed_bass < 0.1:  # Very low bass level
                threshold = 0.6  # 60% threshold for very low levels
            elif smoothed_bass < 0.3:  # Low bass level
                threshold = 0.3  # 30% threshold for low levels
            else:  # Normal bass level
                threshold = 0.05  # 5% threshold for normal levels
            
            radius_change = abs(radius - self._previous_bass_radius)
            if radius_change < threshold * (self._previous_bass_radius + 1):
                # Change is below threshold, keep previous radius
                radius = self._previous_bass_radius
            else:
                # Apply reduced temporal smoothing for faster response
                radius = int(0.5 * radius + 0.5 * self._previous_bass_radius)  # Changed from 0.7/0.3 to 0.5/0.5
        
        # Store current radius for next frame
        self._previous_bass_radius = radius
        
        # Calculate circle color based on smoothed bass intensity
        circle_color = tuple([
            int(circle_primary[c] + (circle_secondary[c] - circle_primary[c]) * smoothed_bass)
            for c in range(3)
        ])
        
        # Apply adaptive threshold check for color changes based on bass level
        if self._previous_bass_color is not None:
            # Apply adaptive threshold based on bass level for color changes
            if smoothed_bass < 0.1:  # Very low bass level
                color_threshold = 0.6  # 60% threshold for very low levels
            elif smoothed_bass < 0.3:  # Low bass level
                color_threshold = 0.3  # 30% threshold for low levels
            else:  # Normal bass level
                color_threshold = 0.05  # 5% threshold for normal levels
            
            color_change_significant = False
            for c in range(3):
                if abs(circle_color[c] - self._previous_bass_color[c]) > color_threshold * (self._previous_bass_color[c] + 1):
                    color_change_significant = True
                    break
                    
            if not color_change_significant:
                # Color change is below threshold, keep previous color
                circle_color = self._previous_bass_color
            else:
                # Apply less temporal smoothing for color changes
                circle_color = tuple([
                    int(0.5 * circle_color[c] + 0.5 * self._previous_bass_color[c])  # Changed from 0.7/0.3 to 0.5/0.5
                    for c in range(3)
                ])
        
        # Store current color for next frame
        self._previous_bass_color = circle_color
        
        # Draw filled bass circle
        cv2.circle(
            frame, 
            (frame_params['center_x'], frame_params['center_y']), 
            radius, 
            circle_color, 
            -1, 
            lineType=cv2.LINE_AA
        )
        
        # Add logo cutout if provided
        if logo_img is not None:
            self._add_linear_logo_cutout(
                frame, 
                logo_img, 
                radius, 
                logo_scale_factor, 
                frame_params, 
                frame_idx, 
                fps, 
                bg_video
            )
        
        # RESTORED: Return to using 3 circles as in the original version
        golden_ratio = 1.618
        circle_factors = [1.0, 1.0 + 0.1 * golden_ratio, 1.0 + 0.2 * golden_ratio]  # Restored 3 circles
        
        for i, radius_factor in enumerate(circle_factors):
            # Apply improved easing function for smoother transitions
            eased_bass = smoothed_bass ** 1.3  # Less aggressive easing
            
            # Calculate radius with smooth transition
            bass_radius = int(
                frame_params['circle_min_radius'] * radius_factor + 
                (frame_params['circle_max_radius'] - frame_params['circle_min_radius']) * eased_bass * 1.2
            )
            
            # Adjust opacity based on ring position for depth effect
            alpha = 0.7 - (i * 0.15)  # Outer rings slightly more transparent
            ring_color = list(circle_color)
            
            # Draw smoother circle with anti-aliasing
            cv2.circle(
                frame, 
                (frame_params['center_x'], frame_params['center_y']), 
                bass_radius, 
                circle_color, 
                1, 
                lineType=cv2.LINE_AA
            )
            
        return frame
    
    def _add_linear_logo_cutout(self, frame, logo_img, radius, logo_scale_factor, frame_params, frame_idx, fps, bg_video):
        """
        Add logo cutout to bass circle
        """
        import cv2
        
        try:
            # Calculate logo size based on the bass circle radius
            logo_size = int(radius * logo_scale_factor)
            
            # Resize logo while preserving aspect ratio
            logo_height, logo_width = logo_img.shape[:2]
            logo_aspect = logo_width / logo_height
            
            if logo_aspect > 1:  # Wider than tall
                resized_width = logo_size
                resized_height = int(resized_width / logo_aspect)
            else:  # Taller than wide or square
                resized_height = logo_size
                resized_width = int(resized_height * logo_aspect)
            
            # Sanity check for logo size
            if resized_width <= 0 or resized_height <= 0:
                # Skip adding the logo if dimensions are invalid
                return frame
                
            # Additional sanity check for oversized logos
            frame_height, frame_width = frame.shape[:2]
            if resized_width > frame_width or resized_height > frame_height:
                # Scale down oversized logo
                scale = min(frame_width / resized_width, frame_height / resized_height) * 0.9
                resized_width = int(resized_width * scale)
                resized_height = int(resized_height * scale)
            
            # Resize logo
            resized_logo = cv2.resize(logo_img, (resized_width, resized_height), interpolation=cv2.INTER_AREA)
            
            # Calculate position to center the logo
            x_offset = frame_params['center_x'] - resized_width // 2
            y_offset = frame_params['center_y'] - resized_height // 2
            
            # Ensure offsets are within frame bounds
            x_offset = max(0, min(x_offset, frame_width - resized_width))
            y_offset = max(0, min(y_offset, frame_height - resized_height))
            
            # Create a mask from the logo
            if resized_logo.shape[2] == 4:
                # Use alpha channel if available
                logo_mask = resized_logo[:, :, 3]
            else:
                # Use grayscale otherwise
                logo_mask = cv2.cvtColor(resized_logo, cv2.COLOR_BGR2GRAY)
            
            # Threshold to get a binary mask
            _, binary_mask = cv2.threshold(logo_mask, 127, 255, cv2.THRESH_BINARY)
            
            # Ensure we're not going out of bounds
            roi_height = min(resized_height, frame_height - y_offset)
            roi_width = min(resized_width, frame_width - x_offset)
            
            if roi_height <= 0 or roi_width <= 0:
                # Skip if roi dimensions are invalid
                return frame
            
            # Get ROI from frame where the logo should be
            roi = frame[y_offset:y_offset+roi_height, x_offset:x_offset+roi_width].copy()
            
            # Create a mask for the logo pixels, ensuring it matches ROI dimensions
            logo_pixels = binary_mask[:roi_height, :roi_width] > 127
            
            try:
                bg_frame_time = frame_idx / fps
                if bg_video is None:
                    self.logger.log(f"Background video is None, skipping logo overlay")
                    return frame
                bg_frame = bg_video.get_frame(bg_frame_time)
                bg_frame = bg_frame[:, :, ::-1]  # RGB to BGR
                
                # Extract the region where the logo is
                bg_roi = bg_frame[y_offset:y_offset+roi_height, x_offset:x_offset+roi_width].copy()
                
                # Replace circle pixels with background pixels where the logo mask is active
                for c in range(3):  # For each color channel
                    if roi.shape[0] > 0 and roi.shape[1] > 0 and logo_pixels.shape[0] > 0 and logo_pixels.shape[1] > 0:
                        roi[:, :, c][logo_pixels] = bg_roi[:, :, c][logo_pixels]
            except Exception as e:
                # Fallback to black if background frame extraction fails
                for c in range(3):
                    if roi.shape[0] > 0 and roi.shape[1] > 0 and logo_pixels.shape[0] > 0 and logo_pixels.shape[1] > 0:
                        roi[:, :, c][logo_pixels] = 0
            
            # Update the frame with our modified ROI
            frame[y_offset:y_offset+roi_height, x_offset:x_offset+roi_width] = roi
            
            return frame
        except Exception as e:
            # If there's any error in logo processing, return the original frame
            return frame
    
    def _add_audio_to_video(self, output_path, audio_path):
        """
        Add audio to the video using FFmpeg
        """
        import os
        import subprocess
        import shutil
        
        # Normalize paths to use forward slashes (avoiding Windows backslash issues)
        output_path = output_path.replace('\\', '/')
        audio_path = audio_path.replace('\\', '/')
        
        self.logger.log(f"Adding audio to the final video...")
        temp_output = output_path + ".with_audio.mp4"
        
        # Make sure the original video exists and is valid
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            self.logger.log(f"Error: Source video file missing or empty: {output_path}")
            return False
            
        # Make sure the audio file exists
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
            self.logger.log(f"Error: Audio file missing or empty: {audio_path}")
            return False
        
        try:
            # Use FFmpeg to add audio - removed -shortest flag to use full audio duration
            cmd = [
                'ffmpeg', '-y',
                '-i', output_path,
                '-i', audio_path,
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-b:a', '320k',
                '-map', '0:v:0',  # Map video from first input
                '-map', '1:a:0',  # Map audio from second input
                temp_output
            ]
            
            # Create the process and capture output for logging
            process = subprocess.Popen(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE
            )
            stdout, stderr = process.communicate()
            
            # Log the FFmpeg output
            if stdout:
                self.logger.log(f"FFmpeg stdout: {stdout.decode('utf-8')}")
            if stderr:
                self.logger.log(f"FFmpeg stderr: {stderr.decode('utf-8')}")
                
            # Check if the output file was created
            if os.path.exists(temp_output) and os.path.getsize(temp_output) > 0:
                # Replace the original file with the new one
                if os.path.exists(output_path):
                    os.remove(output_path)
                shutil.move(temp_output, output_path)
                self.logger.log(f"Successfully added audio to {output_path}")
                return True
            else:
                self.logger.log(f"Error: FFmpeg failed to create output file with audio")
                return False
                
        except Exception as e:
            self.logger.log(f"Error adding audio: {e}")
            # Clean up temp file if it exists
            if os.path.exists(temp_output):
                try:
                    os.remove(temp_output)
                except Exception as cleanup_error:
                    if self.logger:
                        self.logger.log(f"⚠️ Warning: Failed to remove temporary audio file during cleanup: {str(cleanup_error)}")
            return False

    def process_audio(self, audio_clip, dictionary, volume_x = 1.0):
        """
        Process audio based on dictionary configuration:
        - Load audio
        - Loop it to a specific duration
        - Add fade in/out transitions
        """
        try:
            # === Looping ===
            loop_duration = dictionary.get("loop_duration", 1)
            if loop_duration > 0:
                audio_clip = self.loop(audio_clip, loop_duration)
            
            audio_clip = audio_clip.volumex(volume_x)

            # === Transitions ===
            transition_cfg = dictionary.get("transition", {})
            
            # Fade In
            fadein_cfg = transition_cfg.get("in", {})
            fadein_delay = fadein_cfg.get("delay", 0)
            fadein_type = fadein_cfg.get("type", "fade").lower()
            fadein_duration = fadein_cfg.get("duration", 0)

            if fadein_type == "fade":
                if fadein_delay > 0:
                    audio_clip = audio_clip.set_start(fadein_delay)
                audio_clip = afx.audio_fadein(audio_clip, fadein_duration)

            # Fade Out
            fadeout_cfg = transition_cfg.get("out", {})
            fadeout_delay = fadeout_cfg.get("delay", 0)  # Not typically used with audio fadeout
            fadeout_type = fadeout_cfg.get("type", "fade").lower()
            fadeout_duration = fadeout_cfg.get("duration", 0)

            if fadeout_type == "fade":
                audio_clip = afx.audio_fadeout(audio_clip, fadeout_duration)

            # === Crossfade (Placeholder) ===
            crossfade_duration = transition_cfg.get("crossfade", 0)
            # Normally used between multiple audio clips — skipping actual crossfade here

            return audio_clip
            
        except Exception as e:
            self._log_error_with_context(
                "Error processing audio", 
                exception=e, 
                context={"volume_x": volume_x, "dictionary": dictionary}
            )
            # Return the original audio clip as fallback
            return audio_clip

    def detect_peaks(self, audio_path, threshold=0.1, distance=1, width=1):
        """
        Detect peaks in an audio file for timing purposes.
        
        Args:
            audio_path: Path to audio file
            threshold: Peak detection threshold
            distance: Minimum distance between peaks
            width: Peak width
            
        Returns:
            List: List of peak times in seconds
        """
        try:
            from moviepy.editor import AudioFileClip
            import numpy as np
            from scipy.signal import find_peaks
            
            # Load audio file
            audio_clip = AudioFileClip(audio_path)
            
            # Get audio data
            audio_data = audio_clip.to_soundarray(fps=audio_clip.fps)
            
            # Convert to mono if stereo
            if len(audio_data.shape) > 1:
                audio_data = np.mean(audio_data, axis=1)
            
            # Find peaks
            peaks, _ = find_peaks(
                np.abs(audio_data), 
                height=threshold * np.max(np.abs(audio_data)),
                distance=int(distance * audio_clip.fps),
                width=int(width * audio_clip.fps)
            )
            
            # Convert peak indices to times
            peak_times = peaks / audio_clip.fps
            
            # Clean up
            audio_clip.close()
            
            return peak_times.tolist()
            
        except Exception as e:
            self.logger.error(f"Error in detect_peaks: {str(e)}")
            return []

    def analyze_tempo(self, audio_path):
        """
        Analyze tempo of an audio file and return tempo and period duration.
        
        Args:
            audio_path: Path to the audio file
            
        Returns:
            tuple: (tempo_bpm, period_duration_seconds) or (None, None) if failed
        """
        if not os.path.exists(audio_path):
            self.logger.error(f"Audio file not found: {audio_path}")
            return None, None
        
        try:
            self.logger.log(f"Analyzing tempo for: {audio_path}")
            
            y, sr = librosa.load(audio_path)
            
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            
            tempo_scalar = float(tempo[0]) if hasattr(tempo, '__len__') else tempo
            period_duration = 60.0 / tempo_scalar
            
            self.logger.log(f"Tempo: {tempo_scalar:.2f} BPM")
            self.logger.log(f"Period Duration: {period_duration:.3f} seconds")
            self.logger.log(f"Period Duration: {period_duration * 1000:.1f} milliseconds")
            
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            tempo_alt, _ = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
            
            tempo_alt_scalar = float(tempo_alt[0]) if hasattr(tempo_alt, '__len__') else tempo_alt
            self.logger.log(f"Alternative Tempo: {tempo_alt_scalar:.2f} BPM")
            
            return tempo_scalar, period_duration
            
        except Exception as e:
            self.logger.error(f"Error analyzing audio tempo: {e}")
            return None, None
