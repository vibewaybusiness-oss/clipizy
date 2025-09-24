import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from api.models import Audio, Video, Image, Track, Export
from api.storage.metadata import extract_metadata
from api.storage.json_store import JSONStore
from fastapi import UploadFile
from typing import Optional
from api.config.logging import get_storage_logger

logger = get_storage_logger()

class MediaService:
    def __init__(self, storage, json_store: JSONStore):
        self.storage = storage
        self.json_store = json_store

    # AUDIO METHODS
    def handle_audio(self, db: Session, project_id: str, params: dict, user_id: str, file=None):
        """
        Handle either:
        - AI audio generation (params["prompt"], params["voice"] etc.)
        - Upload (voiceover, narration, SFX file)
        """
        audio_id = str(uuid.uuid4())
        file_key = f"audio/{audio_id}.wav"

        # 1. Upload or AI generate
        if file:
            s3_path = self.storage.upload_file(file, file_key, project_id, user_id)
        else:
            # Stub for TTS / voice cloning API call
            audio_bytes = self._generate_ai_audio(
                params["prompt"],
                params.get("voice", "default"),
                params.get("duration", 10),
            )
            s3_path = self.storage.save_bytes(audio_bytes, file_key, project_id, user_id)

        # 2. Extract metadata
        local_tmp = self.storage.download_temp(s3_path)
        metadata = extract_metadata(local_tmp, "audio")

        # 3. DB entry
        audio = Audio(
            id=audio_id,
            project_id=project_id,
            user_id=user_id,
            file_path=s3_path,
            prompt=params.get("prompt"),
            type=params.get("type", "voiceover"),  # e.g. voiceover, narration, sfx
            duration=metadata["duration"],
            format=metadata["format"],
            sample_rate=metadata["sample_rate"],
            channels=metadata["channels"],
            size_mb=metadata["size_mb"],
            created_at=datetime.utcnow(),
        )
        db.add(audio)
        db.commit()
        db.refresh(audio)

        # 4. Update script.json
        self.json_store.append_item(
            f"users/{user_id}/projects/music-clip/{project_id}/script.json",
            "audio",
            {
                "id": audio_id,
                "file": s3_path,
                "prompt": params.get("prompt"),
                "type": params.get("type", "voiceover"),
                "credits": params.get("credits", 0),
                "created_at": audio.created_at.isoformat(),
            },
        )

        return audio

    def _generate_ai_audio(self, prompt: str, voice: str, duration: int):
        """
        Stub for Text-to-Speech / voice cloning engine.
        Could integrate with ElevenLabs, OpenAI TTS, etc.
        """
        return b"FAKE_AUDIO_DATA"

    # VIDEO METHODS
    def generate_videos(self, db: Session, project_id: str, params: dict, user_id: str):
        """
        Generate AI video (via RunPod/ComfyUI) or upload a file.
        """
        video_id = str(uuid.uuid4())
        file_key = f"video/{video_id}.mp4"

        # TODO: call actual AI video generator with params["prompt"]
        video_bytes = self._generate_ai_video(params["prompt"], params.get("duration", 10))
        s3_path = self.storage.save_bytes(video_bytes, file_key, project_id, user_id)

        # Metadata
        local_tmp = self.storage.download_temp(s3_path)
        metadata = extract_metadata(local_tmp, "video")

        # DB entry
        video = Video(
            id=video_id,
            project_id=project_id,
            user_id=user_id,
            file_path=s3_path,
            prompt=params["prompt"],
            duration=metadata["duration"],
            resolution=metadata["resolution"],
            format=metadata["format"],
            aspect_ratio=metadata["aspect_ratio"],
            size_mb=metadata["size_mb"],
            created_at=datetime.utcnow(),
        )
        db.add(video)
        db.commit()
        db.refresh(video)

        # Update script.json
        self.json_store.append_item(
            f"users/{user_id}/projects/music-clip/{project_id}/script.json",
            "visuals.videos",
            {
                "id": video_id,
                "file": s3_path,
                "prompt": params["prompt"],
                "credits": params.get("credits", 0),
                "created_at": video.created_at.isoformat(),
            },
        )

        return video

    def _generate_ai_video(self, prompt: str, duration: int):
        return b"FAKE_MP4_DATA"

    # IMAGE METHODS
    def generate_images(self, db: Session, project_id: str, params: dict, user_id: str):
        image_id = str(uuid.uuid4())
        file_key = f"image/{image_id}.png"

        # Call RunPod/ComfyUI here
        image_bytes = self._generate_ai_image(params["prompt"])
        s3_path = self.storage.save_bytes(image_bytes, file_key, project_id, user_id)

        # Metadata
        local_tmp = self.storage.download_temp(s3_path)
        metadata = extract_metadata(local_tmp, "image")

        # DB
        image = Image(
            id=image_id,
            project_id=project_id,
            user_id=user_id,
            file_path=s3_path,
            prompt=params["prompt"],
            resolution=metadata["resolution"],
            format=metadata["format"],
            size_mb=metadata["size_mb"],
            created_at=datetime.utcnow(),
        )
        db.add(image)
        db.commit()
        db.refresh(image)

        # Update script.json
        self.json_store.append_item(
            f"users/{user_id}/projects/music-clip/{project_id}/script.json",
            "visuals.images",
            {
                "id": image_id,
                "file": s3_path,
                "prompt": params["prompt"],
                "credits": params.get("credits", 0),
                "created_at": image.created_at.isoformat(),
            },
        )

        return image

    def _generate_ai_image(self, prompt: str):
        return b"FAKE_PNG_DATA"

    # TRACK/MUSIC METHODS
    def handle_music(self, db: Session, project_id: str, params: dict, user_id: str, file=None):
        """
        Handle either:
        - AI music generation (params["prompt"]) 
        - Upload (file provided)
        """

        track_id = str(uuid.uuid4())
        file_key = f"music/{track_id}.wav"

        # 1. Upload or generate
        if file:
            # User upload
            s3_path = self.storage.upload_file(file, file_key, project_id, user_id)
        else:
            # AI generation (call Stability, RunPod, etc.)
            audio_bytes = self._generate_ai_music(params["prompt"], params.get("duration", 30))
            s3_path = self.storage.save_bytes(audio_bytes, file_key, project_id, user_id)

        # 2. Extract metadata
        local_tmp = self.storage.download_temp(s3_path)
        metadata = extract_metadata(local_tmp, "music")

        # 3. Save to DB
        track = Track(
            id=track_id,
            project_id=project_id,
            file_path=s3_path,
            title=params.get("title"),
            prompt=params.get("prompt"),
            description=params.get("description"),
            track_metadata=metadata,
            created_at=datetime.utcnow(),
        )
        db.add(track)
        db.commit()
        db.refresh(track)

        # 4. Update script.json
        self.json_store.append_item(
            f"users/{user_id}/projects/music-clip/{project_id}/script.json",
            "music",
            {
                "id": track_id,
                "file": s3_path,
                "prompt": params.get("prompt"),
                "title": params.get("title"),
                "credits": params.get("credits", 0),
                "version": params.get("version", 1),
                "created_at": track.created_at.isoformat(),
            },
        )

        return track

    def analyze_track(self, project_id: str, storage, json_store: JSONStore, db: Session = None):
        """
        Run BPM/key/scene analysis and update script.json.
        """
        try:
            # Import analysis service
            from . import analysis_service
            import tempfile
            import os
            import time
            
            # Get all tracks for the project
            tracks = project_service.get_project_tracks(db=db, project_id=project_id)
            
            if not tracks:
                logger.warning(f"No tracks found for project {project_id}")
                return {"error": "No tracks found for analysis"}
            
            # Analyze each track
            analysis_results = {}
            for track in tracks:
                try:
                    # Create temporary file for analysis
                    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(track.file_path)[1]) as tmp_file:
                        # Download track from storage
                        storage_service.download_file(track.file_path, tmp_file.name)
                        
                        # Perform analysis
                        analysis_result = analysis_service.analyze_music(tmp_file.name)
                        description = analysis_service.generate_music_description(analysis_result)
                        
                        # Clean up temporary file
                        if os.path.exists(tmp_file.name):
                            os.unlink(tmp_file.name)
                        
                        # Store analysis results
                        analysis_results[track.id] = {
                            "raw": analysis_result,
                            "description": description,
                            "analyzed_at": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())
                        }
                        
                        # Update track in database
                        track.analysis = analysis_results[track.id]
                        
                except Exception as e:
                    logger.error(f"Failed to analyze track {track.id}: {str(e)}")
                    analysis_results[track.id] = {
                        "error": str(e),
                        "analyzed_at": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())
                    }
            
            # Commit database changes
            self.db.commit()
            
            # Update project analysis in JSON store
            json_store.update_field(
                f"users/{project_id}/script.json",
                ["steps", "analysis"],
                analysis_results
            )
            
            logger.info(f"Analysis completed for {len(tracks)} tracks in project {project_id}")
            return analysis_results
            
        except Exception as e:
            logger.error(f"Failed to analyze tracks for project {project_id}: {str(e)}")
            # Fallback to placeholder analysis
            analysis = {
                "bpm": 120,
                "key": "C Minor",
                "mood": "uplifting",
                "sections": [
                    {"start": 0, "end": 30, "type": "intro"},
                    {"start": 30, "end": 60, "type": "chorus"}
                ],
                "error": str(e)
            }

            json_store.update_field(
                f"users/{project_id}/script.json",
                ["steps", "analysis"],
                analysis
            )

            return analysis

    def _generate_ai_music(self, prompt: str, duration: int):
        """
        Stub for AI music gen — integrate Stability AI or RunPod here.
        """
        # TODO: real implementation
        return b"FAKE_WAV_DATA"

    # EXPORT METHODS
    def assemble_export(self, db: Session, project_id: str, params: dict, user_id: str):
        """
        Assemble final video: music + visuals + effects.
        TODO: Replace stub with ffmpeg/ComfyUI orchestration.
        """
        export_id = str(uuid.uuid4())
        file_key = f"final_video/{export_id}.mp4"

        # TODO: ffmpeg pipeline combining tracks + videos + images
        final_bytes = self._compose_final_video(params)
        s3_path = self.storage.save_bytes(final_bytes, file_key, project_id, user_id)

        # Metadata
        local_tmp = self.storage.download_temp(s3_path)
        metadata = extract_metadata(local_tmp, "video")

        # DB
        export = Export(
            id=export_id,
            project_id=project_id,
            user_id=user_id,
            file_path=s3_path,
            duration=metadata["duration"],
            resolution=metadata["resolution"],
            format=metadata["format"],
            size_mb=metadata["size_mb"],
            credits_spent=params.get("credits", 0),
            created_at=datetime.utcnow(),
        )
        db.add(export)
        db.commit()
        db.refresh(export)

        # Update script.json
        self.json_store.append_item(
            f"users/{user_id}/projects/music-clip/{project_id}/script.json",
            "export",
            {
                "id": export_id,
                "file": s3_path,
                "style": params.get("style"),
                "credits": params.get("credits", 0),
                "created_at": export.created_at.isoformat(),
            },
        )

        return export

    def _compose_final_video(self, params: dict):
        """
        Stub: replace with actual ffmpeg pipeline.
        """
        return b"FAKE_FINAL_VIDEO_DATA"

    # STORAGE UTILITY METHODS
    def generate_project_path(self, project_id: str, filename: str) -> str:
        """Generate a project-specific path for file storage"""
        path = f"projects/{project_id}/{filename}"
        logger.debug(f"Generated project path: {path}")
        return path
    
    def generate_music_clip_path(self, user_id: str, project_id: str, file_type: str, filename: str) -> str:
        """Generate a music-clip specific path for S3 storage"""
        path = f"users/{user_id}/projects/music-clip/{project_id}/{file_type}/{filename}"
        logger.debug(f"Generated music-clip path: {path}")
        return path
    
    def upload_music_track(self, file: UploadFile, user_id: str, project_id: str, filename: str) -> str:
        """Upload a music track to the music-clip project structure"""
        key = self.generate_music_clip_path(user_id, project_id, "music", filename)
        logger.info(f"Uploading music track: {file.filename} to key: {key}")
        try:
            self.storage.upload_file(file, key)
            url = self.storage.get_presigned_url(key)
            logger.info(f"Music track uploaded successfully: {key} -> {url}")
            return url
        except Exception as e:
            logger.error(f"Music track upload failed for {key}: {str(e)}")
            raise
    
    def upload_project_file(self, file: UploadFile, user_id: str, project_id: str, file_type: str, filename: str) -> str:
        """Upload a project file (video, image, thumbnail) to the music-clip project structure"""
        key = self.generate_music_clip_path(user_id, project_id, file_type, filename)
        logger.info(f"Uploading {file_type} file: {file.filename} to key: {key}")
        try:
            self.storage.upload_file(file, key)
            url = self.storage.get_presigned_url(key)
            logger.info(f"{file_type} file uploaded successfully: {key} -> {url}")
            return url
        except Exception as e:
            logger.error(f"{file_type} file upload failed for {key}: {str(e)}")
            raise
    
    def upload_file_object(self, file: UploadFile, key: str, content_type: Optional[str] = None) -> str:
        """Upload a file object to S3 and return the URL"""
        logger.info(f"Uploading file object: {file.filename} to key: {key}")
        try:
            self.storage.upload_file(file, key)
            url = self.storage.get_presigned_url(key)
            logger.info(f"File uploaded successfully: {key} -> {url}")
            return url
        except Exception as e:
            logger.error(f"File upload failed for {key}: {str(e)}")
            raise
    
    def upload_file(self, file: UploadFile, key: str) -> str:
        """Upload a file to S3 and return the URL"""
        logger.info(f"Uploading file: {file.filename} to key: {key}")
        try:
            self.storage.upload_file(file, key)
            url = self.storage.get_presigned_url(key)
            logger.info(f"File uploaded successfully: {key} -> {url}")
            return url
        except Exception as e:
            logger.error(f"File upload failed for {key}: {str(e)}")
            raise
    
    def download_file(self, key: str, local_path: str):
        """Download a file from S3 to local path"""
        logger.info(f"Downloading file: {key} to {local_path}")
        try:
            self.storage.download_file(key, local_path)
            logger.info(f"File downloaded successfully: {key} -> {local_path}")
        except Exception as e:
            logger.error(f"File download failed for {key}: {str(e)}")
            raise
    
    def delete_file(self, key: str):
        """Delete a file from S3"""
        logger.info(f"Deleting file: {key}")
        try:
            self.storage.delete_file(key)
            logger.info(f"File deleted successfully: {key}")
        except Exception as e:
            logger.error(f"File deletion failed for {key}: {str(e)}")
            raise
    
    def file_exists(self, key: str) -> bool:
        """Check if a file exists in S3"""
        logger.debug(f"Checking if file exists: {key}")
        try:
            exists = self.storage.file_exists(key)
            logger.debug(f"File exists check result for {key}: {exists}")
            return exists
        except Exception as e:
            logger.error(f"File existence check failed for {key}: {str(e)}")
            return False
    
    def get_presigned_url(self, key: str, expiration: int = 3600) -> str:
        """Get a presigned URL for a file"""
        logger.debug(f"Generating presigned URL for: {key} (expires in {expiration}s)")
        try:
            url = self.storage.get_presigned_url(key, expiration)
            logger.debug(f"Presigned URL generated: {key}")
            return url
        except Exception as e:
            logger.error(f"Presigned URL generation failed for {key}: {str(e)}")
            raise
