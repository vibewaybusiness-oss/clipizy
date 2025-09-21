import subprocess
import json
import os
from typing import Dict, Any
from PIL import Image

# ---- FFprobe Helper ----
def _run_ffprobe(file_path: str) -> Dict[str, Any]:
    """Run ffprobe and return JSON metadata."""
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        file_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout)


# ---- Audio Metadata ----
def extract_audio_metadata(file_path: str) -> Dict[str, Any]:
    data = _run_ffprobe(file_path)

    format_data = data.get("format", {})
    stream = next((s for s in data.get("streams", []) if s["codec_type"] == "audio"), {})

    return {
        "duration": int(float(format_data.get("duration", 0))) if format_data.get("duration") else None,
        "format": format_data.get("format_name"),
        "sample_rate": int(stream.get("sample_rate", 0)) if stream.get("sample_rate") else None,
        "channels": stream.get("channels"),
        "bitrate": int(format_data.get("bit_rate", 0)) // 1000 if format_data.get("bit_rate") else None,
        "size_mb": int(format_data.get("size", 0)) // (1024 * 1024) if format_data.get("size") else None,
    }


# ---- Video Metadata ----
def extract_video_metadata(file_path: str) -> Dict[str, Any]:
    data = _run_ffprobe(file_path)

    format_data = data.get("format", {})
    stream = next((s for s in data.get("streams", []) if s["codec_type"] == "video"), {})

    width = stream.get("width")
    height = stream.get("height")

    return {
        "duration": int(float(format_data.get("duration", 0))) if format_data.get("duration") else None,
        "format": format_data.get("format_name"),
        "resolution": f"{width}x{height}" if width and height else None,
        "aspect_ratio": f"{width}:{height}" if width and height else None,
        "size_mb": int(format_data.get("size", 0)) // (1024 * 1024) if format_data.get("size") else None,
    }


# ---- Image Metadata ----
def extract_image_metadata(file_path: str) -> Dict[str, Any]:
    with Image.open(file_path) as img:
        width, height = img.size
        format_name = img.format.lower()

    file_size = os.path.getsize(file_path)

    return {
        "format": format_name,
        "resolution": f"{width}x{height}",
        "size_mb": file_size // (1024 * 1024),
    }


# ---- Dispatcher ----
def extract_metadata(file_path: str, file_type: str) -> Dict[str, Any]:
    """
    Generic metadata extractor.
    file_type = "audio" | "music" | "video" | "image"
    """
    file_type = file_type.lower()

    if file_type in ["audio", "music", "voiceover", "sfx", "track"]:
        return extract_audio_metadata(file_path)
    elif file_type in ["video", "export", "final_video"]:
        return extract_video_metadata(file_path)
    elif file_type in ["image", "thumbnail", "cover"]:
        return extract_image_metadata(file_path)
    else:
        raise ValueError(f"Unsupported file type for metadata extraction: {file_type}")