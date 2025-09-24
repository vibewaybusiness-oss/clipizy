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

from api.services.media.music_analyzer_service import music_analyzer_service

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
        # URL decode the file path
        import urllib.parse
        decoded_file_path = urllib.parse.unquote(file_path)
        
        # Convert different URL formats to actual file path
        if decoded_file_path.startswith("http://") or decoded_file_path.startswith("https://"):
            # Handle HTTP URLs by extracting the path after the domain
            # Example: http://localhost:8000/storage/users/... -> storage/users/...
            from urllib.parse import urlparse
            parsed_url = urlparse(decoded_file_path)
            relative_path = parsed_url.path.lstrip('/')  # Remove leading slash
            
            # Handle MinIO/S3 URL structure: clipizy/users/... -> users/...
            if relative_path.startswith("clipizy/"):
                relative_path = relative_path[8:]  # Remove "clipizy/" prefix
            
            # Map tracks to music for consistency with actual file system structure
            if "/tracks/" in relative_path:
                relative_path = relative_path.replace("/tracks/", "/music/")
            
            actual_file_path = os.path.join("storage", relative_path)
        elif decoded_file_path.startswith("file://"):
            # Remove file:// prefix and convert to actual storage path
            relative_path = decoded_file_path.replace("file://", "")
            # Map tracks to music for consistency
            if "/tracks/" in relative_path:
                relative_path = relative_path.replace("/tracks/", "/music/")
            actual_file_path = os.path.join("storage", relative_path)
        elif decoded_file_path.startswith("users/"):
            # Handle direct user path by adding storage prefix
            # Map tracks to music for consistency
            if "/tracks/" in decoded_file_path:
                decoded_file_path = decoded_file_path.replace("/tracks/", "/music/")
            actual_file_path = os.path.join("storage", decoded_file_path)
        elif not decoded_file_path.startswith("storage/"):
            # If path doesn't start with storage/, assume it's a relative path and add storage prefix
            # Map tracks to music for consistency
            if "/tracks/" in decoded_file_path:
                decoded_file_path = decoded_file_path.replace("/tracks/", "/music/")
            actual_file_path = os.path.join("storage", decoded_file_path)
        else:
            # Map tracks to music for consistency
            if "/tracks/" in decoded_file_path:
                decoded_file_path = decoded_file_path.replace("/tracks/", "/music/")
            actual_file_path = decoded_file_path
        
        # Debug: Log the path resolution process
        print(f"DEBUG: Original file_path: {file_path}")
        print(f"DEBUG: Decoded file_path: {decoded_file_path}")
        print(f"DEBUG: Actual file_path: {actual_file_path}")
        print(f"DEBUG: Current working directory: {os.getcwd()}")
        print(f"DEBUG: File exists: {os.path.exists(actual_file_path)}")
        
        # Check if file exists locally first
        if not os.path.exists(actual_file_path):
            # Try to find the file in alternative locations
            alternative_paths = [
                actual_file_path.replace("/music/", "/tracks/"),
                actual_file_path.replace("storage/", ""),
                os.path.join("storage", "projects", os.path.basename(actual_file_path))
            ]
            
            print(f"DEBUG: Trying alternative paths:")
            for alt_path in alternative_paths:
                print(f"DEBUG: Alternative path: {alt_path} - exists: {os.path.exists(alt_path)}")
                if os.path.exists(alt_path):
                    actual_file_path = alt_path
                    print(f"DEBUG: Found file at alternative path: {actual_file_path}")
                    break
            else:
                # File not found locally - try to download from MinIO/S3
                print(f"DEBUG: File not found locally, attempting to download from MinIO/S3")
                try:
                    # Extract S3 key from the original URL
                    if decoded_file_path.startswith("http://") or decoded_file_path.startswith("https://"):
                        from urllib.parse import urlparse
                        parsed_url = urlparse(decoded_file_path)
                        # Remove query parameters and get the path
                        s3_key = parsed_url.path.lstrip('/')
                        if s3_key.startswith("clipizy/"):
                            s3_key = s3_key[8:]  # Remove "clipizy/" prefix
                        
                        print(f"DEBUG: Extracted S3 key: {s3_key}")
                        
                        # Import storage service
                        from api.services.storage.storage_service import storage_service
                        
                        # Check if file exists in S3
                        if storage_service.file_exists(s3_key):
                            print(f"DEBUG: File exists in S3, downloading to temporary location")
                            
                            # Create temporary file
                            import tempfile
                            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(s3_key)[1])
                            temp_file_path = temp_file.name
                            temp_file.close()
                            
                            # Download from S3
                            storage_service.download_file(s3_key, temp_file_path)
                            actual_file_path = temp_file_path
                            print(f"DEBUG: Downloaded file from S3 to: {actual_file_path}")
                        else:
                            raise HTTPException(status_code=404, detail=f"File not found in S3: {s3_key}")
                    else:
                        raise HTTPException(status_code=404, detail=f"File not found locally and not a valid S3 URL: {actual_file_path}")
                        
                except Exception as e:
                    print(f"DEBUG: Failed to download from S3: {str(e)}")
                    # Provide more detailed error information
                    error_details = {
                        "error": "File not found",
                        "requested_path": actual_file_path,
                        "original_url": file_path,
                        "decoded_path": decoded_file_path,
                        "current_working_directory": os.getcwd(),
                        "suggestion": "The file may not have been uploaded successfully or the project may not exist in the file system"
                    }
                    print(f"DEBUG: File not found - {error_details}")
                    raise HTTPException(status_code=404, detail=f"File not found: {actual_file_path}. This may indicate a database/file system synchronization issue.")

        # Validate file type
        if not actual_file_path.lower().endswith(('.wav', '.mp3', '.flac', '.m4a', '.ogg')):
            raise HTTPException(status_code=400, detail="File must be an audio file")

        # Perform analysis based on type
        try:
            if analysis_type == "comprehensive":
                result = await music_analyzer_service.analyze_music_comprehensive(actual_file_path)
            elif analysis_type == "simple":
                result = await music_analyzer_service.analyze_music_simple(actual_file_path)
            elif analysis_type == "peaks":
                result = await music_analyzer_service.detect_peaks_only(actual_file_path)
            else:
                raise HTTPException(status_code=400, detail="Invalid analysis type")

            result['file_path'] = file_path  # Return the original path for reference
            
            # Clean up temporary file if it was downloaded from S3
            # Only clean up if this is a temporary file we created
            if actual_file_path != file_path and actual_file_path.startswith('/tmp'):
                try:
                    if os.path.exists(actual_file_path):
                        os.unlink(actual_file_path)
                        print(f"DEBUG: Cleaned up temporary file: {actual_file_path}")
                except Exception as e:
                    print(f"DEBUG: Failed to clean up temporary file {actual_file_path}: {e}")
            
            return result
        except Exception as analysis_error:
            # Clean up temporary file even if analysis failed
            if actual_file_path != file_path and actual_file_path.startswith('/tmp'):
                try:
                    if os.path.exists(actual_file_path):
                        os.unlink(actual_file_path)
                        print(f"DEBUG: Cleaned up temporary file after error: {actual_file_path}")
                except Exception as e:
                    print(f"DEBUG: Failed to clean up temporary file {actual_file_path}: {e}")
            # Re-raise the analysis error
            raise analysis_error

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

@router.get("/test-path")
async def test_path_handling(file_path: str):
    """Test endpoint to verify path handling logic"""
    import urllib.parse
    import os
    
    decoded_file_path = urllib.parse.unquote(file_path)
    
    if decoded_file_path.startswith("http://") or decoded_file_path.startswith("https://"):
        from urllib.parse import urlparse
        parsed_url = urlparse(decoded_file_path)
        relative_path = parsed_url.path.lstrip('/')
        
        # Handle MinIO/S3 URL structure: clipizy/users/... -> users/...
        if relative_path.startswith("clipizy/"):
            relative_path = relative_path[8:]  # Remove "clipizy/" prefix
        
        # Map tracks to music for consistency with actual file system structure
        if "/tracks/" in relative_path:
            relative_path = relative_path.replace("/tracks/", "/music/")
        
        actual_file_path = os.path.join("storage", relative_path)
    elif decoded_file_path.startswith("file://"):
        relative_path = decoded_file_path.replace("file://", "")
        # Map tracks to music for consistency
        if "/tracks/" in relative_path:
            relative_path = relative_path.replace("/tracks/", "/music/")
        actual_file_path = os.path.join("storage", relative_path)
    elif decoded_file_path.startswith("users/"):
        # Map tracks to music for consistency
        if "/tracks/" in decoded_file_path:
            decoded_file_path = decoded_file_path.replace("/tracks/", "/music/")
        actual_file_path = os.path.join("storage", decoded_file_path)
    elif not decoded_file_path.startswith("storage/"):
        # Map tracks to music for consistency
        if "/tracks/" in decoded_file_path:
            decoded_file_path = decoded_file_path.replace("/tracks/", "/music/")
        actual_file_path = os.path.join("storage", decoded_file_path)
    else:
        # Map tracks to music for consistency
        if "/tracks/" in decoded_file_path:
            decoded_file_path = decoded_file_path.replace("/tracks/", "/music/")
        actual_file_path = decoded_file_path
    
    return {
        "original_path": file_path,
        "decoded_path": decoded_file_path,
        "actual_file_path": actual_file_path,
        "file_exists": os.path.exists(actual_file_path),
        "current_working_directory": os.getcwd()
    }

@router.get("/validate-file")
async def validate_file_exists(file_path: str):
    """Validate if a file exists before attempting analysis"""
    import urllib.parse
    import os
    
    try:
        decoded_file_path = urllib.parse.unquote(file_path)
        
        # Use the same path resolution logic as the analysis endpoint
        if decoded_file_path.startswith("http://") or decoded_file_path.startswith("https://"):
            from urllib.parse import urlparse
            parsed_url = urlparse(decoded_file_path)
            relative_path = parsed_url.path.lstrip('/')
            
            if relative_path.startswith("clipizy/"):
                relative_path = relative_path[8:]
            
            if "/tracks/" in relative_path:
                relative_path = relative_path.replace("/tracks/", "/music/")
            
            actual_file_path = os.path.join("storage", relative_path)
        elif decoded_file_path.startswith("file://"):
            relative_path = decoded_file_path.replace("file://", "")
            if "/tracks/" in relative_path:
                relative_path = relative_path.replace("/tracks/", "/music/")
            actual_file_path = os.path.join("storage", relative_path)
        elif decoded_file_path.startswith("users/"):
            if "/tracks/" in decoded_file_path:
                decoded_file_path = decoded_file_path.replace("/tracks/", "/music/")
            actual_file_path = os.path.join("storage", decoded_file_path)
        elif not decoded_file_path.startswith("storage/"):
            if "/tracks/" in decoded_file_path:
                decoded_file_path = decoded_file_path.replace("/tracks/", "/music/")
            actual_file_path = os.path.join("storage", decoded_file_path)
        else:
            if "/tracks/" in decoded_file_path:
                decoded_file_path = decoded_file_path.replace("/tracks/", "/music/")
            actual_file_path = decoded_file_path
        
        file_exists = os.path.exists(actual_file_path)
        
        return {
            "file_path": file_path,
            "resolved_path": actual_file_path,
            "exists": file_exists,
            "valid": file_exists and actual_file_path.lower().endswith(('.wav', '.mp3', '.flac', '.m4a', '.ogg'))
        }
        
    except Exception as e:
        return {
            "file_path": file_path,
            "error": str(e),
            "exists": False,
            "valid": False
        }
