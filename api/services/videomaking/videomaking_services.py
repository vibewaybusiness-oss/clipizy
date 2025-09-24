import asyncio
import json
import os
import subprocess
import tempfile
import uuid
import hashlib
import concurrent.futures
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Union, Any, Tuple
from dataclasses import dataclass
from enum import Enum

import ffmpeg
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from api.config.logging import get_storage_logger
from api.storage.json_store import JSONStore

logger = get_storage_logger()

class TransitionType(str, Enum):
    CUT = "cut"
    FADE = "fade"
    DISSOLVE = "dissolve"
    WIPE = "wipe"
    SLIDE = "slide"
    ZOOM = "zoom"

class OverlayType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    TEXT = "text"

class VideoQuality(str, Enum):
    LOW = "low"      # 480p, fast encoding
    MEDIUM = "medium" # 720p, balanced
    HIGH = "high"     # 1080p, high quality
    ULTRA = "ultra"   # 4K, maximum quality

@dataclass
class VideoSegment:
    file_path: str
    start_time: float
    end_time: float
    volume: float = 1.0
    effects: Optional[Dict[str, Any]] = None

@dataclass
class AudioTrack:
    file_path: str
    start_time: float
    end_time: float
    volume: float = 1.0
    fade_in: float = 0.0
    fade_out: float = 0.0

@dataclass
class Overlay:
    file_path: str
    overlay_type: OverlayType
    start_time: float
    end_time: float
    x: float = 0.0
    y: float = 0.0
    width: Optional[float] = None
    height: Optional[float] = None
    opacity: float = 1.0
    effects: Optional[Dict[str, Any]] = None

@dataclass
class Transition:
    transition_type: TransitionType
    duration: float
    start_time: float
    end_time: float
    effects: Optional[Dict[str, Any]] = None

class VideoComposition(BaseModel):
    output_path: str
    quality: VideoQuality = VideoQuality.HIGH
    resolution: Optional[str] = None  # e.g., "1920x1080"
    fps: int = 30
    video_segments: List[VideoSegment] = Field(default_factory=list)
    audio_tracks: List[AudioTrack] = Field(default_factory=list)
    overlays: List[Overlay] = Field(default_factory=list)
    transitions: List[Transition] = Field(default_factory=list)
    background_color: str = "black"
    duration: Optional[float] = None
    optimize_for_speed: bool = False
    use_gpu: bool = False
    parallel_processing: bool = True
    
    @validator('fps')
    def validate_fps(cls, v):
        if v < 1 or v > 120:
            raise ValueError('FPS must be between 1 and 120')
        return v
    
    @validator('video_segments')
    def validate_video_segments(cls, v):
        if not v:
            raise ValueError('At least one video segment is required')
        return v

class VideoMakingService:
    def __init__(self, storage, json_store: JSONStore):
        self.storage = storage
        self.json_store = json_store
        self.temp_dir = Path(tempfile.gettempdir()) / "clipizy_video"
        self.temp_dir.mkdir(exist_ok=True)
        self.cache_dir = self.temp_dir / "cache"
        self.cache_dir.mkdir(exist_ok=True)
        self.max_workers = min(4, os.cpu_count() or 1)
        self.gpu_available = self._check_gpu_availability()
        
    async def create_video_composition(
        self, 
        db: Session, 
        project_id: str, 
        composition_data: Dict[str, Any], 
        user_id: str
    ) -> Dict[str, Any]:
        """
        MAIN ENTRY POINT: Create a video composition from JSON input
        """
        try:
            logger.info(f"Starting video composition for project {project_id}")
            
            # Parse and validate composition data
            composition = self._parse_composition_data(composition_data)
            
            # Validate media files before processing
            self._validate_media_files(composition)
            
            # Generate unique output filename
            output_filename = f"composition_{uuid.uuid4().hex}.mp4"
            output_path = self.temp_dir / output_filename
            
            # Estimate processing time
            estimated_time = self._estimate_processing_time(composition)
            logger.info(f"Estimated processing time: {estimated_time:.1f} seconds")
            
            # Process the video composition
            result_path = await self._process_composition(composition, output_path)
            
            # Upload to storage
            storage_key = f"compositions/{project_id}/{output_filename}"
            final_url = await self._upload_result(result_path, storage_key, project_id, user_id)
            
            # Update project JSON
            await self._update_project_json(project_id, user_id, composition_data, final_url)
            
            # Cleanup temp files
            self._cleanup_temp_files([result_path])
            
            logger.info(f"Video composition completed: {final_url}")
            return {
                "success": True,
                "output_url": final_url,
                "composition_id": str(uuid.uuid4()),
                "duration": composition.duration,
                "quality": composition.quality.value
            }
            
        except Exception as e:
            logger.error(f"Video composition failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "composition_id": None
            }
    
    def _parse_composition_data(self, data: Dict[str, Any]) -> VideoComposition:
        """Parse and validate input JSON data"""
        try:
            # Extract video segments
            video_segments = []
            for segment_data in data.get("videos", []):
                segment = VideoSegment(
                    file_path=segment_data["file_path"],
                    start_time=float(segment_data["start_time"]),
                    end_time=float(segment_data["end_time"]),
                    volume=float(segment_data.get("volume", 1.0)),
                    effects=segment_data.get("effects")
                )
                video_segments.append(segment)
            
            # Extract audio tracks
            audio_tracks = []
            for audio_data in data.get("audios", []):
                track = AudioTrack(
                    file_path=audio_data["file_path"],
                    start_time=float(audio_data["start_time"]),
                    end_time=float(audio_data["end_time"]),
                    volume=float(audio_data.get("volume", 1.0)),
                    fade_in=float(audio_data.get("fade_in", 0.0)),
                    fade_out=float(audio_data.get("fade_out", 0.0))
                )
                audio_tracks.append(track)
            
            # Extract overlays
            overlays = []
            for overlay_data in data.get("overlays", []):
                overlay = Overlay(
                    file_path=overlay_data["file_path"],
                    overlay_type=OverlayType(overlay_data["type"]),
                    start_time=float(overlay_data["start_time"]),
                    end_time=float(overlay_data["end_time"]),
                    x=float(overlay_data.get("x", 0.0)),
                    y=float(overlay_data.get("y", 0.0)),
                    width=overlay_data.get("width"),
                    height=overlay_data.get("height"),
                    opacity=float(overlay_data.get("opacity", 1.0)),
                    effects=overlay_data.get("effects")
                )
                overlays.append(overlay)
            
            # Extract transitions
            transitions = []
            for transition_data in data.get("transitions", []):
                transition = Transition(
                    transition_type=TransitionType(transition_data["type"]),
                    duration=float(transition_data["duration"]),
                    start_time=float(transition_data["start_time"]),
                    end_time=float(transition_data["end_time"]),
                    effects=transition_data.get("effects")
                )
                transitions.append(transition)
            
            # Create composition
            composition = VideoComposition(
                output_path="",  # Will be set later
                quality=VideoQuality(data.get("quality", "high")),
                resolution=data.get("resolution"),
                fps=int(data.get("fps", 30)),
                video_segments=video_segments,
                audio_tracks=audio_tracks,
                overlays=overlays,
                transitions=transitions,
                background_color=data.get("background_color", "black"),
                duration=data.get("duration")
            )
            
            return composition
            
        except Exception as e:
            logger.error(f"Failed to parse composition data: {str(e)}")
            raise ValueError(f"Invalid composition data: {str(e)}")
    
    async def _process_composition(self, composition: VideoComposition, output_path: Path) -> Path:
        """Process the video composition using FFmpeg"""
        try:
            logger.info("Starting video composition processing")
            
            # Download all media files to temp directory (with parallel processing)
            temp_files = await self._download_media_files_parallel(composition)
            
            # Build FFmpeg command
            ffmpeg_cmd = self._build_ffmpeg_command(composition, temp_files, output_path)
            
            # Apply optimizations
            ffmpeg_cmd = self._optimize_ffmpeg_command(composition, ffmpeg_cmd)
            
            # Execute FFmpeg command
            await self._execute_ffmpeg(ffmpeg_cmd)
            
            # Verify output file
            if not output_path.exists() or output_path.stat().st_size == 0:
                raise Exception("FFmpeg processing failed - no output file generated")
            
            logger.info(f"Video composition processed successfully: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Video composition processing failed: {str(e)}")
            raise
    
    async def _download_media_files(self, composition: VideoComposition) -> Dict[str, Path]:
        """Download all media files to temporary directory"""
        temp_files = {}
        
        # Download video segments
        for i, segment in enumerate(composition.video_segments):
            temp_path = self.temp_dir / f"video_{i}_{Path(segment.file_path).name}"
            await self._download_file(segment.file_path, temp_path)
            temp_files[f"video_{i}"] = temp_path
        
        # Download audio tracks
        for i, track in enumerate(composition.audio_tracks):
            temp_path = self.temp_dir / f"audio_{i}_{Path(track.file_path).name}"
            await self._download_file(track.file_path, temp_path)
            temp_files[f"audio_{i}"] = temp_path
        
        # Download overlays
        for i, overlay in enumerate(composition.overlays):
            temp_path = self.temp_dir / f"overlay_{i}_{Path(overlay.file_path).name}"
            await self._download_file(overlay.file_path, temp_path)
            temp_files[f"overlay_{i}"] = temp_path
        
        return temp_files
    
    async def _download_file(self, file_path: str, local_path: Path) -> None:
        """Download a file from storage to local path"""
        try:
            if file_path.startswith(('http://', 'https://')):
                # Handle URL downloads
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.get(file_path) as response:
                        with open(local_path, 'wb') as f:
                            async for chunk in response.content.iter_chunked(8192):
                                f.write(chunk)
            else:
                # Handle storage downloads
                self.storage.download_file(file_path, str(local_path))
                
        except Exception as e:
            logger.error(f"Failed to download file {file_path}: {str(e)}")
            raise
    
    def _build_ffmpeg_command(self, composition: VideoComposition, temp_files: Dict[str, Path], output_path: Path) -> List[str]:
        """Build optimized FFmpeg command for the composition"""
        cmd = ["ffmpeg", "-y"]  # -y to overwrite output file
        
        # Input files
        input_files = []
        for i, segment in enumerate(composition.video_segments):
            temp_file = temp_files[f"video_{i}"]
            input_files.append(f"-i")
            input_files.append(str(temp_file))
        
        # Audio inputs
        for i, track in enumerate(composition.audio_tracks):
            temp_file = temp_files[f"audio_{i}"]
            input_files.append(f"-i")
            input_files.append(str(temp_file))
        
        # Overlay inputs
        for i, overlay in enumerate(composition.overlays):
            temp_file = temp_files[f"overlay_{i}"]
            input_files.append(f"-i")
            input_files.append(str(temp_file))
        
        cmd.extend(input_files)
        
        # Video processing
        video_filters = self._build_video_filters(composition, temp_files)
        if video_filters:
            cmd.extend(["-filter_complex", video_filters])
        
        # Audio processing
        audio_filters = self._build_audio_filters(composition, temp_files)
        if audio_filters:
            cmd.extend(["-filter:a", audio_filters])
        
        # Output settings based on quality
        output_settings = self._get_output_settings(composition)
        cmd.extend(output_settings)
        
        # Output file
        cmd.append(str(output_path))
        
        return cmd
    
    def _build_video_filters(self, composition: VideoComposition, temp_files: Dict[str, Path]) -> str:
        """Build FFmpeg video filter complex"""
        filters = []
        
        # Video concatenation and trimming
        video_inputs = []
        for i, segment in enumerate(composition.video_segments):
            temp_file = temp_files[f"video_{i}"]
            # Trim video to specified time range
            trim_filter = f"[{i}:v]trim=start={segment.start_time}:end={segment.end_time},setpts=PTS-STARTPTS[v{i}]"
            filters.append(trim_filter)
            video_inputs.append(f"[v{i}]")
        
        # Concatenate video segments
        if len(video_inputs) > 1:
            concat_filter = f"{''.join(video_inputs)}concat=n={len(video_inputs)}:v=1:a=0[outv]"
            filters.append(concat_filter)
        else:
            filters.append(f"[v0]copy[outv]")
        
        # Add overlays
        overlay_count = 0
        for i, overlay in enumerate(composition.overlays):
            temp_file = temp_files[f"overlay_{i}"]
            overlay_input_idx = len(composition.video_segments) + len(composition.audio_tracks) + i
            
            if overlay.overlay_type == OverlayType.IMAGE:
                # Scale and position image overlay
                scale_filter = f"[{overlay_input_idx}:v]scale={overlay.width or -1}:{overlay.height or -1}[overlay{i}]"
                filters.append(scale_filter)
                
                overlay_filter = f"[outv][overlay{i}]overlay={overlay.x}:{overlay.y}:enable='between(t,{overlay.start_time},{overlay.end_time})'[outv]"
                filters.append(overlay_filter)
            elif overlay.overlay_type == OverlayType.VIDEO:
                # Video overlay with timing
                trim_overlay = f"[{overlay_input_idx}:v]trim=start={overlay.start_time}:end={overlay.end_time},setpts=PTS-STARTPTS[overlay_v{i}]"
                filters.append(trim_overlay)
                
                scale_overlay = f"[overlay_v{i}]scale={overlay.width or -1}:{overlay.height or -1}[overlay_scaled{i}]"
                filters.append(scale_overlay)
                
                overlay_filter = f"[outv][overlay_scaled{i}]overlay={overlay.x}:{overlay.y}[outv]"
                filters.append(overlay_filter)
        
        return ";".join(filters)
    
    def _build_audio_filters(self, composition: VideoComposition, temp_files: Dict[str, Path]) -> str:
        """Build FFmpeg audio filters"""
        filters = []
        
        # Process audio tracks
        audio_inputs = []
        for i, track in enumerate(composition.audio_tracks):
            temp_file = temp_files[f"audio_{i}"]
            audio_input_idx = len(composition.video_segments) + i
            
            # Trim and adjust volume
            trim_filter = f"[{audio_input_idx}:a]atrim=start={track.start_time}:end={track.end_time},asetpts=PTS-STARTPTS,volume={track.volume}[a{i}]"
            filters.append(trim_filter)
            audio_inputs.append(f"[a{i}]")
        
        # Mix all audio tracks
        if len(audio_inputs) > 1:
            mix_filter = f"{''.join(audio_inputs)}amix=inputs={len(audio_inputs)}:duration=longest[outa]"
            filters.append(mix_filter)
        elif len(audio_inputs) == 1:
            filters.append(f"[a0]copy[outa]")
        
        return ";".join(filters)
    
    def _get_output_settings(self, composition: VideoComposition) -> List[str]:
        """Get output settings based on quality preset"""
        settings = []
        
        # Get optimal resolution
        resolution = self._get_optimal_resolution(composition)
        
        if composition.quality == VideoQuality.LOW:
            settings.extend(["-c:v", "libx264", "-preset", "fast", "-crf", "28", "-s", resolution])
        elif composition.quality == VideoQuality.MEDIUM:
            settings.extend(["-c:v", "libx264", "-preset", "medium", "-crf", "23", "-s", resolution])
        elif composition.quality == VideoQuality.HIGH:
            settings.extend(["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-s", resolution])
        elif composition.quality == VideoQuality.ULTRA:
            settings.extend(["-c:v", "libx264", "-preset", "veryslow", "-crf", "15", "-s", resolution])
        
        # Audio codec
        settings.extend(["-c:a", "aac", "-b:a", "128k"])
        
        # FPS
        settings.extend(["-r", str(composition.fps)])
        
        # Map outputs
        settings.extend(["-map", "[outv]", "-map", "[outa]"])
        
        return settings
    
    async def _execute_ffmpeg(self, cmd: List[str]) -> None:
        """Execute FFmpeg command asynchronously"""
        try:
            logger.info(f"Executing FFmpeg command: {' '.join(cmd)}")
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown FFmpeg error"
                logger.error(f"FFmpeg failed with return code {process.returncode}: {error_msg}")
                raise Exception(f"FFmpeg processing failed: {error_msg}")
            
            logger.info("FFmpeg processing completed successfully")
            
        except Exception as e:
            logger.error(f"FFmpeg execution failed: {str(e)}")
            raise
    
    async def _upload_result(self, local_path: Path, storage_key: str, project_id: str, user_id: str) -> str:
        """Upload the result to storage and return URL"""
        try:
            with open(local_path, 'rb') as f:
                file_data = f.read()
            
            # Upload to storage
            self.storage.save_bytes(file_data, storage_key, project_id, user_id)
            
            # Get presigned URL
            url = self.storage.get_presigned_url(storage_key)
            
            logger.info(f"Result uploaded successfully: {url}")
            return url
            
        except Exception as e:
            logger.error(f"Failed to upload result: {str(e)}")
            raise
    
    async def _update_project_json(self, project_id: str, user_id: str, composition_data: Dict[str, Any], output_url: str) -> None:
        """Update project JSON with composition results"""
        try:
            composition_record = {
                "id": str(uuid.uuid4()),
                "output_url": output_url,
                "composition_data": composition_data,
                "created_at": datetime.utcnow().isoformat(),
                "status": "completed"
            }
            
            self.json_store.append_item(
                f"users/{user_id}/projects/music-clip/{project_id}/compositions.json",
                "compositions",
                composition_record
            )
            
            logger.info(f"Project JSON updated for composition {project_id}")
            
        except Exception as e:
            logger.error(f"Failed to update project JSON: {str(e)}")
            # Don't raise - this is not critical
    
    def _cleanup_temp_files(self, file_paths: List[Path]) -> None:
        """Clean up temporary files"""
        for file_path in file_paths:
            try:
                if file_path.exists():
                    file_path.unlink()
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file {file_path}: {str(e)}")
    
    def get_composition_status(self, composition_id: str) -> Dict[str, Any]:
        """Get the status of a video composition"""
        # This would typically query a database or cache
        # For now, return a placeholder
        return {
            "composition_id": composition_id,
            "status": "completed",
            "progress": 100,
            "message": "Composition completed successfully"
        }
    
    def cancel_composition(self, composition_id: str) -> bool:
        """Cancel a running video composition"""
        # This would typically stop a running process
        # For now, return success
        logger.info(f"Cancelling composition {composition_id}")
        return True
    
    def _check_gpu_availability(self) -> bool:
        """Check if GPU acceleration is available"""
        try:
            result = subprocess.run(['ffmpeg', '-encoders'], capture_output=True, text=True)
            return 'nvenc' in result.stdout or 'qsv' in result.stdout
        except:
            return False
    
    def _get_cache_key(self, file_path: str) -> str:
        """Generate cache key for file"""
        return hashlib.md5(file_path.encode()).hexdigest()
    
    def _get_cached_file(self, file_path: str) -> Optional[Path]:
        """Get cached file if exists and is valid"""
        cache_key = self._get_cache_key(file_path)
        cached_path = self.cache_dir / f"{cache_key}_{Path(file_path).name}"
        
        if cached_path.exists() and cached_path.stat().st_size > 0:
            logger.debug(f"Using cached file: {cached_path}")
            return cached_path
        return None
    
    def _cache_file(self, file_path: str, local_path: Path) -> None:
        """Cache file for future use"""
        try:
            cache_key = self._get_cache_key(file_path)
            cached_path = self.cache_dir / f"{cache_key}_{Path(file_path).name}"
            
            if not cached_path.exists():
                import shutil
                shutil.copy2(local_path, cached_path)
                logger.debug(f"Cached file: {cached_path}")
        except Exception as e:
            logger.warning(f"Failed to cache file {file_path}: {str(e)}")
    
    async def _download_media_files_parallel(self, composition: VideoComposition) -> Dict[str, Path]:
        """Download media files in parallel for better performance"""
        temp_files = {}
        download_tasks = []
        
        # Prepare download tasks
        for i, segment in enumerate(composition.video_segments):
            temp_path = self.temp_dir / f"video_{i}_{Path(segment.file_path).name}"
            task = self._download_file_async(segment.file_path, temp_path, f"video_{i}")
            download_tasks.append(task)
        
        for i, track in enumerate(composition.audio_tracks):
            temp_path = self.temp_dir / f"audio_{i}_{Path(track.file_path).name}"
            task = self._download_file_async(track.file_path, temp_path, f"audio_{i}")
            download_tasks.append(task)
        
        for i, overlay in enumerate(composition.overlays):
            temp_path = self.temp_dir / f"overlay_{i}_{Path(overlay.file_path).name}"
            task = self._download_file_async(overlay.file_path, temp_path, f"overlay_{i}")
            download_tasks.append(task)
        
        # Execute downloads in parallel
        if composition.parallel_processing and len(download_tasks) > 1:
            results = await asyncio.gather(*download_tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Download failed: {str(result)}")
                    raise result
                elif isinstance(result, tuple):
                    key, path = result
                    temp_files[key] = path
        else:
            # Sequential download
            for task in download_tasks:
                try:
                    key, path = await task
                    temp_files[key] = path
                except Exception as e:
                    logger.error(f"Download failed: {str(e)}")
                    raise
        
        return temp_files
    
    async def _download_file_async(self, file_path: str, local_path: Path, key: str) -> Tuple[str, Path]:
        """Download a single file asynchronously"""
        # Check cache first
        cached_file = self._get_cached_file(file_path)
        if cached_file:
            import shutil
            shutil.copy2(cached_file, local_path)
            return key, local_path
        
        # Download file
        await self._download_file(file_path, local_path)
        
        # Cache the file
        self._cache_file(file_path, local_path)
        
        return key, local_path
    
    def _optimize_ffmpeg_command(self, composition: VideoComposition, cmd: List[str]) -> List[str]:
        """Apply optimizations to FFmpeg command based on composition settings"""
        optimized_cmd = cmd.copy()
        
        # GPU acceleration
        if composition.use_gpu and self.gpu_available:
            # Replace libx264 with nvenc for GPU encoding
            for i, arg in enumerate(optimized_cmd):
                if arg == "libx264":
                    optimized_cmd[i] = "h264_nvenc"
                    break
        
        # Speed optimizations
        if composition.optimize_for_speed:
            # Use faster presets
            for i, arg in enumerate(optimized_cmd):
                if arg in ["slow", "medium", "veryslow"]:
                    optimized_cmd[i] = "fast"
                    break
        
        # Memory optimizations
        optimized_cmd.extend(["-threads", str(self.max_workers)])
        
        # Buffer optimizations
        optimized_cmd.extend(["-bufsize", "2M", "-maxrate", "4M"])
        
        return optimized_cmd
    
    def _validate_media_files(self, composition: VideoComposition) -> None:
        """Validate all media files before processing"""
        all_files = []
        
        # Collect all file paths
        for segment in composition.video_segments:
            all_files.append(segment.file_path)
        
        for track in composition.audio_tracks:
            all_files.append(track.file_path)
        
        for overlay in composition.overlays:
            all_files.append(overlay.file_path)
        
        # Validate file existence and accessibility
        for file_path in all_files:
            if not self._is_file_accessible(file_path):
                raise ValueError(f"File not accessible: {file_path}")
    
    def _is_file_accessible(self, file_path: str) -> bool:
        """Check if file is accessible (URL or storage)"""
        try:
            if file_path.startswith(('http://', 'https://')):
                import aiohttp
                # This is a simplified check - in production you'd want to do a HEAD request
                return True
            else:
                # Check storage
                return self.storage.file_exists(file_path)
        except:
            return False
    
    def _estimate_processing_time(self, composition: VideoComposition) -> float:
        """Estimate processing time based on composition complexity"""
        base_time = 10.0  # Base time in seconds
        
        # Factor in video duration
        total_duration = sum(
            segment.end_time - segment.start_time 
            for segment in composition.video_segments
        )
        duration_factor = total_duration / 60.0  # Minutes
        
        # Factor in quality
        quality_factors = {
            VideoQuality.LOW: 0.5,
            VideoQuality.MEDIUM: 1.0,
            VideoQuality.HIGH: 2.0,
            VideoQuality.ULTRA: 4.0
        }
        quality_factor = quality_factors.get(composition.quality, 1.0)
        
        # Factor in overlays
        overlay_factor = 1.0 + (len(composition.overlays) * 0.2)
        
        # Factor in GPU usage
        gpu_factor = 0.5 if composition.use_gpu and self.gpu_available else 1.0
        
        estimated_time = base_time * duration_factor * quality_factor * overlay_factor * gpu_factor
        
        return max(estimated_time, 5.0)  # Minimum 5 seconds
    
    def _get_optimal_resolution(self, composition: VideoComposition) -> str:
        """Determine optimal resolution based on input videos and quality setting"""
        if composition.resolution:
            return composition.resolution
        
        # Default resolutions based on quality
        quality_resolutions = {
            VideoQuality.LOW: "854x480",
            VideoQuality.MEDIUM: "1280x720", 
            VideoQuality.HIGH: "1920x1080",
            VideoQuality.ULTRA: "3840x2160"
        }
        
        return quality_resolutions.get(composition.quality, "1920x1080")
    
    def _create_progress_callback(self, composition_id: str):
        """Create progress callback for long-running operations"""
        def progress_callback(progress: float, message: str = ""):
            logger.info(f"Composition {composition_id}: {progress:.1f}% - {message}")
            # In production, this would update a database or send WebSocket message
        
        return progress_callback

# CONVENIENCE FUNCTIONS FOR COMMON USE CASES

async def create_simple_video(
    video_files: List[str],
    audio_file: str,
    output_path: str,
    quality: VideoQuality = VideoQuality.HIGH
) -> str:
    """Create a simple video from video files and audio"""
    composition_data = {
        "videos": [
            {
                "file_path": video_file,
                "start_time": 0,
                "end_time": 10,  # Will be determined from file
                "volume": 1.0
            }
            for video_file in video_files
        ],
        "audios": [
            {
                "file_path": audio_file,
                "start_time": 0,
                "end_time": 10,  # Will be determined from file
                "volume": 1.0
            }
        ],
        "quality": quality.value,
        "fps": 30
    }
    
    # This would be called from the main service
    # return await videomaking_service.create_video_composition(...)
    pass

async def create_video_with_overlay(
    video_file: str,
    overlay_file: str,
    overlay_type: OverlayType,
    start_time: float,
    end_time: float,
    output_path: str
) -> str:
    """Create a video with an overlay"""
    composition_data = {
        "videos": [
            {
                "file_path": video_file,
                "start_time": 0,
                "end_time": 30,
                "volume": 1.0
            }
        ],
        "overlays": [
            {
                "file_path": overlay_file,
                "type": overlay_type.value,
                "start_time": start_time,
                "end_time": end_time,
                "x": 0,
                "y": 0,
                "opacity": 1.0
            }
        ],
        "quality": "high"
    }
    
    # This would be called from the main service
    pass
