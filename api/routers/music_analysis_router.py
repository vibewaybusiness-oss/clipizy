"""
Music Analysis Router for clipizy API
Provides endcredits for comprehensive music analysis
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends
from typing import Optional, Dict, Any
import os
import sys

# Add the api directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath('.')))

from api.services.music_analyzer_service import music_analyzer_service

router = APIRouter(prefix="/api/music-analysis", tags=["Music Analysis"])

@router.get("/health")
async def health_check():
    """Health check for music analysis service"""
    return {"status": "healthy", "service": "music-analysis"}

@router.post("/analyze/comprehensive")
async def analyze_music_comprehensive(
    file: UploadFile = File(..., description="Audio file to analyze"),
    include_peaks: bool = Query(True, description="Include peak detection analysis")
):
    """
    Perform comprehensive music analysis including:
    - Metadata extraction
    - Audio feature analysis
    - Genre classification
    - Music theory analysis
    - Peak detection (optional)
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")

        # Create temporary file with correct extension
        import tempfile
        import os

        # Get the original file extension
        original_filename = file.filename or "audio_file"
        file_ext = os.path.splitext(original_filename)[1].lower()
        if not file_ext:
            file_ext = '.wav'  # Default to wav if no extension

        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name

        try:
            # Perform comprehensive analysis
            result = await music_analyzer_service.analyze_music_comprehensive(tmp_file_path)
            result['original_filename'] = file.filename
            result['file_size'] = len(content)

            # Remove peak analysis if not requested
            if not include_peaks:
                result.pop('peak_analysis', None)

            return result
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Router error: {str(e)}")
        print(f"Full traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/analyze/simple")
async def analyze_music_simple(
    file: UploadFile = File(..., description="Audio file to analyze")
):
    """
    Perform simplified music analysis focused on essential features:
    - Basic metadata
    - Core audio features
    - Human-readable descriptors
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")

        # Create temporary file with correct extension
        import tempfile
        import os

        # Get the original file extension
        original_filename = file.filename or "audio_file"
        file_ext = os.path.splitext(original_filename)[1].lower()
        if not file_ext:
            file_ext = '.wav'  # Default to wav if no extension

        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name

        try:
            # Perform simple analysis
            result = await music_analyzer_service.analyze_music_simple(tmp_file_path)
            result['original_filename'] = file.filename
            result['file_size'] = len(content)

            return result
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/analyze/peaks")
async def detect_music_peaks(
    file: UploadFile = File(..., description="Audio file to analyze"),
    min_peaks: int = Query(2, ge=1, le=50, description="Minimum number of peaks to detect"),
    min_gap_seconds: float = Query(2.0, ge=0.5, le=10.0, description="Minimum gap between peaks in seconds")
):
    """
    Detect musical peaks and segments in audio:
    - Peak detection using moving average difference
    - Segment analysis
    - Tempo-aware peak spacing
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")

        # Create temporary file with correct extension
        import tempfile
        import os

        # Get the original file extension
        original_filename = file.filename or "audio_file"
        file_ext = os.path.splitext(original_filename)[1].lower()
        if not file_ext:
            file_ext = '.wav'  # Default to wav if no extension

        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name

        try:
            # Perform peak detection
            result = await music_analyzer_service.detect_peaks_only(
                tmp_file_path, min_peaks, min_gap_seconds
            )
            result['original_filename'] = file.filename
            result['file_size'] = len(content)
            result['parameters'] = {
                'min_peaks': min_peaks,
                'min_gap_seconds': min_gap_seconds
            }

            return result
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Peak detection failed: {str(e)}")

@router.post("/analyze/file-path")
async def analyze_file_by_path(
    file_path: str = Query(..., description="Path to audio file on server"),
    analysis_type: str = Query("comprehensive", regex="^(comprehensive|simple|peaks)$",
                              description="Type of analysis to perform")
):
    """
    Analyze audio file by server file path (for internal use):
    - comprehensive: Full analysis with all features
    - simple: Basic analysis with essential features
    - peaks: Peak detection only
    """
    try:
        # Validate file exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        # Validate file type
        if not file_path.lower().endswith(('.wav', '.mp3', '.flac', '.m4a', '.ogg')):
            raise HTTPException(status_code=400, detail="File must be an audio file")

        # Perform analysis based on type
        if analysis_type == "comprehensive":
            result = await music_analyzer_service.analyze_music_comprehensive(file_path)
        elif analysis_type == "simple":
            result = await music_analyzer_service.analyze_music_simple(file_path)
        elif analysis_type == "peaks":
            result = await music_analyzer_service.detect_peaks_only(file_path)
        else:
            raise HTTPException(status_code=400, detail="Invalid analysis type")

        result['file_path'] = file_path
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/genres")
async def get_available_genres():
    """Get list of available genres for classification"""
    return {
        "genres": music_analyzer_service.theory_categorizer.genres,
        "total_count": len(music_analyzer_service.theory_categorizer.genres)
    }

@router.get("/analysis-types")
async def get_analysis_types():
    """Get available analysis types and their descriptions"""
    return {
        "analysis_types": {
            "comprehensive": {
                "description": "Full analysis including metadata, features, genre classification, music theory, and peak detection",
                "includes": ["metadata", "audio_features", "genre_scores", "music_theory", "peak_analysis"]
            },
            "simple": {
                "description": "Basic analysis focused on essential features and human-readable descriptors",
                "includes": ["metadata", "core_features", "descriptors"]
            },
            "peaks": {
                "description": "Peak detection and segment analysis using moving average difference method",
                "includes": ["peak_times", "peak_scores", "segment_analysis"]
            }
        }
    }
