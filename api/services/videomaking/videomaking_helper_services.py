import asyncio
import json
import os
import subprocess
import tempfile
import uuid
import math
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

class TransitionDirection(str, Enum):
    LEFT = "left"
    RIGHT = "right"
    UP = "up"
    DOWN = "down"
    IN = "in"
    OUT = "out"

class ChromaKeyType(str, Enum):
    GREEN = "green"
    BLUE = "blue"
    BLACK = "black"
    WHITE = "white"
    CUSTOM = "custom"

class EffectType(str, Enum):
    BLUR = "blur"
    SHARPEN = "sharpen"
    BRIGHTNESS = "brightness"
    CONTRAST = "contrast"
    SATURATION = "saturation"
    HUE = "hue"
    GAMMA = "gamma"
    VIGNETTE = "vignette"
    GRAIN = "grain"
    SEPIA = "sepia"
    NEGATIVE = "negative"

@dataclass
class TransitionEffect:
    transition_type: str
    duration: float
    start_time: float
    end_time: float
    direction: Optional[TransitionDirection] = None
    intensity: float = 1.0
    custom_params: Optional[Dict[str, Any]] = None

@dataclass
class ChromaKeyOverlay:
    file_path: str
    chroma_type: ChromaKeyType
    start_time: float
    end_time: float
    x: float = 0.0
    y: float = 0.0
    width: Optional[float] = None
    height: Optional[float] = None
    opacity: float = 1.0
    tolerance: float = 0.1
    smoothness: float = 0.1
    spill: float = 0.1
    custom_color: Optional[str] = None  # Hex color for custom chroma key

@dataclass
class VideoEffect:
    effect_type: EffectType
    intensity: float
    start_time: float
    end_time: float
    custom_params: Optional[Dict[str, Any]] = None

class AdvancedTransitionService:
    """Service for advanced video transitions and effects"""
    
    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "clipizy_transitions"
        self.temp_dir.mkdir(exist_ok=True)
    
    def create_fade_transition(self, 
                             input1: str, 
                             input2: str, 
                             duration: float,
                             output_path: str) -> str:
        """Create a fade transition between two videos"""
        try:
            cmd = [
                "ffmpeg", "-y",
                "-i", input1,
                "-i", input2,
                "-filter_complex", 
                f"[0:v]fade=t=out:st=0:d={duration}[v0];"
                f"[1:v]fade=t=in:st=0:d={duration}[v1];"
                f"[v0][v1]concat=n=2:v=1:a=0[outv]",
                "-map", "[outv]",
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Fade transition failed: {e.stderr.decode()}")
            raise
    
    def create_dissolve_transition(self, 
                                 input1: str, 
                                 input2: str, 
                                 duration: float,
                                 output_path: str) -> str:
        """Create a dissolve transition between two videos"""
        try:
            cmd = [
                "ffmpeg", "-y",
                "-i", input1,
                "-i", input2,
                "-filter_complex",
                f"[0:v][1:v]blend=all_mode=addition:all_opacity=0.5[outv]",
                "-map", "[outv]",
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Dissolve transition failed: {e.stderr.decode()}")
            raise
    
    def create_wipe_transition(self, 
                             input1: str, 
                             input2: str, 
                             duration: float,
                             direction: TransitionDirection,
                             output_path: str) -> str:
        """Create a wipe transition between two videos"""
        try:
            # Map direction to FFmpeg wipe parameters
            direction_map = {
                TransitionDirection.LEFT: "0:0:0:0",
                TransitionDirection.RIGHT: "0:0:0:0",  # Will be handled by reverse
                TransitionDirection.UP: "0:0:0:0",
                TransitionDirection.DOWN: "0:0:0:0"  # Will be handled by reverse
            }
            
            wipe_params = direction_map.get(direction, "0:0:0:0")
            
            cmd = [
                "ffmpeg", "-y",
                "-i", input1,
                "-i", input2,
                "-filter_complex",
                f"[0:v][1:v]xfade=transition=wipeleft:duration={duration}:offset=0[outv]",
                "-map", "[outv]",
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Wipe transition failed: {e.stderr.decode()}")
            raise
    
    def create_slide_transition(self, 
                              input1: str, 
                              input2: str, 
                              duration: float,
                              direction: TransitionDirection,
                              output_path: str) -> str:
        """Create a slide transition between two videos"""
        try:
            # Map direction to FFmpeg slide parameters
            slide_type_map = {
                TransitionDirection.LEFT: "slideleft",
                TransitionDirection.RIGHT: "slideright",
                TransitionDirection.UP: "slideup",
                TransitionDirection.DOWN: "slidedown"
            }
            
            slide_type = slide_type_map.get(direction, "slideleft")
            
            cmd = [
                "ffmpeg", "-y",
                "-i", input1,
                "-i", input2,
                "-filter_complex",
                f"[0:v][1:v]xfade=transition={slide_type}:duration={duration}:offset=0[outv]",
                "-map", "[outv]",
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Slide transition failed: {e.stderr.decode()}")
            raise
    
    def create_zoom_transition(self, 
                             input1: str, 
                             input2: str, 
                             duration: float,
                             direction: TransitionDirection,
                             output_path: str) -> str:
        """Create a zoom transition between two videos"""
        try:
            zoom_type_map = {
                TransitionDirection.IN: "zoomin",
                TransitionDirection.OUT: "zoomout"
            }
            
            zoom_type = zoom_type_map.get(direction, "zoomin")
            
            cmd = [
                "ffmpeg", "-y",
                "-i", input1,
                "-i", input2,
                "-filter_complex",
                f"[0:v][1:v]xfade=transition={zoom_type}:duration={duration}:offset=0[outv]",
                "-map", "[outv]",
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Zoom transition failed: {e.stderr.decode()}")
            raise
    
    def create_custom_transition(self, 
                               input1: str, 
                               input2: str, 
                               transition_filter: str,
                               duration: float,
                               output_path: str) -> str:
        """Create a custom transition using FFmpeg filter"""
        try:
            cmd = [
                "ffmpeg", "-y",
                "-i", input1,
                "-i", input2,
                "-filter_complex",
                f"[0:v][1:v]{transition_filter}[outv]",
                "-map", "[outv]",
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Custom transition failed: {e.stderr.decode()}")
            raise

class ChromaKeyService:
    """Service for chroma key (green screen) effects"""
    
    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "clipizy_chroma"
        self.temp_dir.mkdir(exist_ok=True)
    
    def apply_chroma_key(self, 
                        background_video: str,
                        foreground_video: str,
                        chroma_key: ChromaKeyOverlay,
                        output_path: str) -> str:
        """Apply chroma key effect to composite videos"""
        try:
            # Get chroma key color based on type
            chroma_color = self._get_chroma_color(chroma_key)
            
            # Build chroma key filter
            chroma_filter = self._build_chroma_filter(
                chroma_color, 
                chroma_key.tolerance, 
                chroma_key.smoothness, 
                chroma_key.spill
            )
            
            # Build positioning filter
            position_filter = self._build_position_filter(
                chroma_key.x, 
                chroma_key.y, 
                chroma_key.width, 
                chroma_key.height
            )
            
            # Combine filters
            full_filter = f"[1:v]{chroma_filter}[fg];[0:v][fg]{position_filter}[outv]"
            
            cmd = [
                "ffmpeg", "-y",
                "-i", background_video,
                "-i", foreground_video,
                "-filter_complex", full_filter,
                "-map", "[outv]",
                "-map", "0:a",  # Use background audio
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Chroma key failed: {e.stderr.decode()}")
            raise
    
    def _get_chroma_color(self, chroma_key: ChromaKeyOverlay) -> str:
        """Get chroma key color based on type"""
        if chroma_key.chroma_type == ChromaKeyType.GREEN:
            return "0x00FF00"
        elif chroma_key.chroma_type == ChromaKeyType.BLUE:
            return "0x0000FF"
        elif chroma_key.chroma_type == ChromaKeyType.BLACK:
            return "0x000000"
        elif chroma_key.chroma_type == ChromaKeyType.WHITE:
            return "0xFFFFFF"
        elif chroma_key.chroma_type == ChromaKeyType.CUSTOM and chroma_key.custom_color:
            return chroma_key.custom_color
        else:
            return "0x00FF00"  # Default to green
    
    def _build_chroma_filter(self, 
                           color: str, 
                           tolerance: float, 
                           smoothness: float, 
                           spill: float) -> str:
        """Build FFmpeg chroma key filter"""
        return (
            f"colorkey={color}:{tolerance}:{smoothness},"
            f"colorchannelmixer=rr=1:gg=1:bb=1:aa=1:ra=0:ga=0:ba=0:ar=0:ag=0:ab=0"
        )
    
    def _build_position_filter(self, 
                             x: float, 
                             y: float, 
                             width: Optional[float], 
                             height: Optional[float]) -> str:
        """Build positioning filter for overlay"""
        scale_filter = ""
        if width and height:
            scale_filter = f"scale={width}:{height},"
        
        return f"overlay={x}:{y}:{scale_filter}enable='between(t,0,10)'"
    
    def create_green_screen_composite(self, 
                                    background: str,
                                    foreground: str,
                                    output_path: str,
                                    tolerance: float = 0.1,
                                    smoothness: float = 0.1) -> str:
        """Create a simple green screen composite"""
        chroma_key = ChromaKeyOverlay(
            file_path=foreground,
            chroma_type=ChromaKeyType.GREEN,
            start_time=0,
            end_time=10,
            tolerance=tolerance,
            smoothness=smoothness
        )
        
        return self.apply_chroma_key(background, foreground, chroma_key, output_path)
    
    def create_blue_screen_composite(self, 
                                   background: str,
                                   foreground: str,
                                   output_path: str,
                                   tolerance: float = 0.1,
                                   smoothness: float = 0.1) -> str:
        """Create a blue screen composite"""
        chroma_key = ChromaKeyOverlay(
            file_path=foreground,
            chroma_type=ChromaKeyType.BLUE,
            start_time=0,
            end_time=10,
            tolerance=tolerance,
            smoothness=smoothness
        )
        
        return self.apply_chroma_key(background, foreground, chroma_key, output_path)
    
    def create_black_screen_composite(self, 
                                    background: str,
                                    foreground: str,
                                    output_path: str,
                                    tolerance: float = 0.1,
                                    smoothness: float = 0.1) -> str:
        """Create a black screen composite (useful for shadows)"""
        chroma_key = ChromaKeyOverlay(
            file_path=foreground,
            chroma_type=ChromaKeyType.BLACK,
            start_time=0,
            end_time=10,
            tolerance=tolerance,
            smoothness=smoothness
        )
        
        return self.apply_chroma_key(background, foreground, chroma_key, output_path)

class VideoEffectsService:
    """Service for video effects and filters"""
    
    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "clipizy_effects"
        self.temp_dir.mkdir(exist_ok=True)
    
    def apply_blur_effect(self, 
                         input_video: str, 
                         output_path: str,
                         intensity: float = 1.0,
                         start_time: float = 0,
                         end_time: float = 10) -> str:
        """Apply blur effect to video"""
        try:
            blur_filter = f"boxblur={intensity}:1"
            if start_time > 0 or end_time < 10:
                blur_filter = f"boxblur={intensity}:1:enable='between(t,{start_time},{end_time})'"
            
            cmd = [
                "ffmpeg", "-y",
                "-i", input_video,
                "-vf", blur_filter,
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Blur effect failed: {e.stderr.decode()}")
            raise
    
    def apply_brightness_contrast(self, 
                                input_video: str, 
                                output_path: str,
                                brightness: float = 0.0,
                                contrast: float = 1.0,
                                start_time: float = 0,
                                end_time: float = 10) -> str:
        """Apply brightness and contrast adjustments"""
        try:
            eq_filter = f"eq=brightness={brightness}:contrast={contrast}"
            if start_time > 0 or end_time < 10:
                eq_filter = f"eq=brightness={brightness}:contrast={contrast}:enable='between(t,{start_time},{end_time})'"
            
            cmd = [
                "ffmpeg", "-y",
                "-i", input_video,
                "-vf", eq_filter,
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Brightness/contrast effect failed: {e.stderr.decode()}")
            raise
    
    def apply_saturation_effect(self, 
                              input_video: str, 
                              output_path: str,
                              saturation: float = 1.0,
                              start_time: float = 0,
                              end_time: float = 10) -> str:
        """Apply saturation adjustment"""
        try:
            eq_filter = f"eq=saturation={saturation}"
            if start_time > 0 or end_time < 10:
                eq_filter = f"eq=saturation={saturation}:enable='between(t,{start_time},{end_time})'"
            
            cmd = [
                "ffmpeg", "-y",
                "-i", input_video,
                "-vf", eq_filter,
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Saturation effect failed: {e.stderr.decode()}")
            raise
    
    def apply_vignette_effect(self, 
                            input_video: str, 
                            output_path: str,
                            intensity: float = 0.5,
                            start_time: float = 0,
                            end_time: float = 10) -> str:
        """Apply vignette effect"""
        try:
            vignette_filter = f"vignette=PI/4:{intensity}"
            if start_time > 0 or end_time < 10:
                vignette_filter = f"vignette=PI/4:{intensity}:enable='between(t,{start_time},{end_time})'"
            
            cmd = [
                "ffmpeg", "-y",
                "-i", input_video,
                "-vf", vignette_filter,
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Vignette effect failed: {e.stderr.decode()}")
            raise
    
    def apply_sepia_effect(self, 
                         input_video: str, 
                         output_path: str,
                         intensity: float = 1.0,
                         start_time: float = 0,
                         end_time: float = 10) -> str:
        """Apply sepia effect"""
        try:
            sepia_filter = f"colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131"
            if start_time > 0 or end_time < 10:
                sepia_filter = f"colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:enable='between(t,{start_time},{end_time})'"
            
            cmd = [
                "ffmpeg", "-y",
                "-i", input_video,
                "-vf", sepia_filter,
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Sepia effect failed: {e.stderr.decode()}")
            raise
    
    def apply_grain_effect(self, 
                         input_video: str, 
                         output_path: str,
                         intensity: float = 0.1,
                         start_time: float = 0,
                         end_time: float = 10) -> str:
        """Apply film grain effect"""
        try:
            grain_filter = f"noise=alls={intensity}:allf=t"
            if start_time > 0 or end_time < 10:
                grain_filter = f"noise=alls={intensity}:allf=t:enable='between(t,{start_time},{end_time})'"
            
            cmd = [
                "ffmpeg", "-y",
                "-i", input_video,
                "-vf", grain_filter,
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Grain effect failed: {e.stderr.decode()}")
            raise

class VideoHelperService:
    """Main helper service that combines all video processing capabilities"""
    
    def __init__(self, storage, json_store: JSONStore):
        self.storage = storage
        self.json_store = json_store
        self.transition_service = AdvancedTransitionService()
        self.chroma_service = ChromaKeyService()
        self.effects_service = VideoEffectsService()
        self.temp_dir = Path(tempfile.gettempdir()) / "clipizy_helper"
        self.temp_dir.mkdir(exist_ok=True)
    
    async def create_advanced_composition(self, 
                                        composition_data: Dict[str, Any],
                                        project_id: str,
                                        user_id: str) -> Dict[str, Any]:
        """Create an advanced video composition with transitions and effects"""
        try:
            logger.info(f"Creating advanced composition for project {project_id}")
            
            # Parse composition data
            video_segments = composition_data.get("videos", [])
            transitions = composition_data.get("transitions", [])
            chroma_overlays = composition_data.get("chroma_overlays", [])
            effects = composition_data.get("effects", [])
            
            # Generate output path
            output_filename = f"advanced_composition_{uuid.uuid4().hex}.mp4"
            output_path = self.temp_dir / output_filename
            
            # Process video segments with transitions
            processed_videos = await self._process_video_segments_with_transitions(
                video_segments, transitions
            )
            
            # Apply chroma key overlays
            if chroma_overlays:
                processed_videos = await self._apply_chroma_overlays(
                    processed_videos, chroma_overlays
                )
            
            # Apply video effects
            if effects:
                processed_videos = await self._apply_video_effects(
                    processed_videos, effects
                )
            
            # Final composition
            final_output = await self._compose_final_video(
                processed_videos, output_path
            )
            
            # Upload result
            storage_key = f"advanced_compositions/{project_id}/{output_filename}"
            final_url = await self._upload_result(final_output, storage_key, project_id, user_id)
            
            # Cleanup
            self._cleanup_temp_files([final_output])
            
            logger.info(f"Advanced composition completed: {final_url}")
            return {
                "success": True,
                "output_url": final_url,
                "composition_id": str(uuid.uuid4()),
                "features_used": {
                    "transitions": len(transitions),
                    "chroma_overlays": len(chroma_overlays),
                    "effects": len(effects)
                }
            }
            
        except Exception as e:
            logger.error(f"Advanced composition failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "composition_id": None
            }
    
    async def _process_video_segments_with_transitions(self, 
                                                     video_segments: List[Dict],
                                                     transitions: List[Dict]) -> List[str]:
        """Process video segments with transitions"""
        processed_videos = []
        
        for i, segment in enumerate(video_segments):
            # Download video segment
            temp_path = await self._download_video_segment(segment)
            processed_videos.append(str(temp_path))
            
            # Apply transition if exists
            if i < len(transitions):
                transition = transitions[i]
                next_segment = video_segments[i + 1] if i + 1 < len(video_segments) else None
                
                if next_segment:
                    next_temp_path = await self._download_video_segment(next_segment)
                    transition_output = await self._apply_transition(
                        str(temp_path), 
                        str(next_temp_path), 
                        transition
                    )
                    processed_videos.append(transition_output)
        
        return processed_videos
    
    async def _apply_chroma_overlays(self, 
                                   video_paths: List[str],
                                   chroma_overlays: List[Dict]) -> List[str]:
        """Apply chroma key overlays to videos"""
        processed_videos = []
        
        for video_path in video_paths:
            current_video = video_path
            
            for overlay_data in chroma_overlays:
                # Download overlay video
                overlay_path = await self._download_video_segment(overlay_data)
                
                # Create chroma key overlay
                chroma_key = ChromaKeyOverlay(
                    file_path=overlay_data["file_path"],
                    chroma_type=ChromaKeyType(overlay_data["chroma_type"]),
                    start_time=overlay_data["start_time"],
                    end_time=overlay_data["end_time"],
                    x=overlay_data.get("x", 0),
                    y=overlay_data.get("y", 0),
                    width=overlay_data.get("width"),
                    height=overlay_data.get("height"),
                    tolerance=overlay_data.get("tolerance", 0.1),
                    smoothness=overlay_data.get("smoothness", 0.1),
                    spill=overlay_data.get("spill", 0.1)
                )
                
                # Apply chroma key
                output_path = self.temp_dir / f"chroma_{uuid.uuid4().hex}.mp4"
                current_video = self.chroma_service.apply_chroma_key(
                    current_video, str(overlay_path), chroma_key, str(output_path)
                )
            
            processed_videos.append(current_video)
        
        return processed_videos
    
    async def _apply_video_effects(self, 
                                 video_paths: List[str],
                                 effects: List[Dict]) -> List[str]:
        """Apply video effects to videos"""
        processed_videos = []
        
        for video_path in video_paths:
            current_video = video_path
            
            for effect_data in effects:
                effect_type = EffectType(effect_data["effect_type"])
                intensity = effect_data.get("intensity", 1.0)
                start_time = effect_data.get("start_time", 0)
                end_time = effect_data.get("end_time", 10)
                
                output_path = self.temp_dir / f"effect_{uuid.uuid4().hex}.mp4"
                
                if effect_type == EffectType.BLUR:
                    current_video = self.effects_service.apply_blur_effect(
                        current_video, str(output_path), intensity, start_time, end_time
                    )
                elif effect_type == EffectType.BRIGHTNESS:
                    brightness = effect_data.get("brightness", 0.0)
                    contrast = effect_data.get("contrast", 1.0)
                    current_video = self.effects_service.apply_brightness_contrast(
                        current_video, str(output_path), brightness, contrast, start_time, end_time
                    )
                elif effect_type == EffectType.SATURATION:
                    saturation = effect_data.get("saturation", 1.0)
                    current_video = self.effects_service.apply_saturation_effect(
                        current_video, str(output_path), saturation, start_time, end_time
                    )
                elif effect_type == EffectType.VIGNETTE:
                    current_video = self.effects_service.apply_vignette_effect(
                        current_video, str(output_path), intensity, start_time, end_time
                    )
                elif effect_type == EffectType.SEPIA:
                    current_video = self.effects_service.apply_sepia_effect(
                        current_video, str(output_path), intensity, start_time, end_time
                    )
                elif effect_type == EffectType.GRAIN:
                    current_video = self.effects_service.apply_grain_effect(
                        current_video, str(output_path), intensity, start_time, end_time
                    )
            
            processed_videos.append(current_video)
        
        return processed_videos
    
    async def _apply_transition(self, 
                              video1: str, 
                              video2: str, 
                              transition_data: Dict) -> str:
        """Apply transition between two videos"""
        transition_type = transition_data["transition_type"]
        duration = transition_data["duration"]
        direction = transition_data.get("direction")
        
        output_path = self.temp_dir / f"transition_{uuid.uuid4().hex}.mp4"
        
        if transition_type == "fade":
            return self.transition_service.create_fade_transition(
                video1, video2, duration, str(output_path)
            )
        elif transition_type == "dissolve":
            return self.transition_service.create_dissolve_transition(
                video1, video2, duration, str(output_path)
            )
        elif transition_type == "wipe":
            direction_enum = TransitionDirection(direction) if direction else TransitionDirection.LEFT
            return self.transition_service.create_wipe_transition(
                video1, video2, duration, direction_enum, str(output_path)
            )
        elif transition_type == "slide":
            direction_enum = TransitionDirection(direction) if direction else TransitionDirection.LEFT
            return self.transition_service.create_slide_transition(
                video1, video2, duration, direction_enum, str(output_path)
            )
        elif transition_type == "zoom":
            direction_enum = TransitionDirection(direction) if direction else TransitionDirection.IN
            return self.transition_service.create_zoom_transition(
                video1, video2, duration, direction_enum, str(output_path)
            )
        else:
            # Custom transition
            custom_filter = transition_data.get("custom_filter", "")
            return self.transition_service.create_custom_transition(
                video1, video2, custom_filter, duration, str(output_path)
            )
    
    async def _download_video_segment(self, segment_data: Dict) -> Path:
        """Download a video segment to temporary location"""
        file_path = segment_data["file_path"]
        temp_path = self.temp_dir / f"segment_{uuid.uuid4().hex}.mp4"
        
        if file_path.startswith(('http://', 'https://')):
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(file_path) as response:
                    with open(temp_path, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            f.write(chunk)
        else:
            self.storage.download_file(file_path, str(temp_path))
        
        return temp_path
    
    async def _compose_final_video(self, video_paths: List[str], output_path: Path) -> Path:
        """Compose final video from processed segments"""
        if len(video_paths) == 1:
            # Single video, just copy
            import shutil
            shutil.copy2(video_paths[0], output_path)
            return output_path
        
        # Multiple videos, concatenate
        try:
            # Create file list for FFmpeg concat
            file_list_path = self.temp_dir / "file_list.txt"
            with open(file_list_path, 'w') as f:
                for video_path in video_paths:
                    f.write(f"file '{video_path}'\n")
            
            cmd = [
                "ffmpeg", "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(file_list_path),
                "-c", "copy",
                str(output_path)
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Final composition failed: {e.stderr.decode()}")
            raise
    
    async def _upload_result(self, local_path: Path, storage_key: str, project_id: str, user_id: str) -> str:
        """Upload result to storage"""
        with open(local_path, 'rb') as f:
            file_data = f.read()
        
        self.storage.save_bytes(file_data, storage_key, project_id, user_id)
        return self.storage.get_presigned_url(storage_key)
    
    def _cleanup_temp_files(self, file_paths: List[Path]) -> None:
        """Clean up temporary files"""
        for file_path in file_paths:
            try:
                if file_path.exists():
                    file_path.unlink()
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file {file_path}: {str(e)}")

# CONVENIENCE FUNCTIONS

def create_green_screen_video(background_video: str, 
                            foreground_video: str, 
                            output_path: str,
                            tolerance: float = 0.1) -> str:
    """Create a simple green screen composite"""
    chroma_service = ChromaKeyService()
    return chroma_service.create_green_screen_composite(
        background_video, foreground_video, output_path, tolerance
    )

def create_blue_screen_video(background_video: str, 
                           foreground_video: str, 
                           output_path: str,
                           tolerance: float = 0.1) -> str:
    """Create a simple blue screen composite"""
    chroma_service = ChromaKeyService()
    return chroma_service.create_blue_screen_composite(
        background_video, foreground_video, output_path, tolerance
    )

def create_fade_transition_video(video1: str, 
                               video2: str, 
                               output_path: str,
                               duration: float = 2.0) -> str:
    """Create a simple fade transition"""
    transition_service = AdvancedTransitionService()
    return transition_service.create_fade_transition(
        video1, video2, duration, output_path
    )

def apply_video_effect(video_path: str, 
                      effect_type: EffectType, 
                      output_path: str,
                      intensity: float = 1.0) -> str:
    """Apply a single video effect"""
    effects_service = VideoEffectsService()
    
    if effect_type == EffectType.BLUR:
        return effects_service.apply_blur_effect(video_path, output_path, intensity)
    elif effect_type == EffectType.BRIGHTNESS:
        return effects_service.apply_brightness_contrast(video_path, output_path, 0.0, 1.0)
    elif effect_type == EffectType.SATURATION:
        return effects_service.apply_saturation_effect(video_path, output_path, intensity)
    elif effect_type == EffectType.VIGNETTE:
        return effects_service.apply_vignette_effect(video_path, output_path, intensity)
    elif effect_type == EffectType.SEPIA:
        return effects_service.apply_sepia_effect(video_path, output_path, intensity)
    elif effect_type == EffectType.GRAIN:
        return effects_service.apply_grain_effect(video_path, output_path, intensity)
    else:
        raise ValueError(f"Unsupported effect type: {effect_type}")
