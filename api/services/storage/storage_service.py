"""
Storage service wrapper for S3 operations
"""
from api.storage.s3 import S3Storage
from fastapi import UploadFile
from typing import Optional
import os
import uuid
from api.config.logging import get_storage_logger

# Initialize logger
logger = get_storage_logger()

class StorageService:
    def __init__(self, bucket: str = None, endpoint_url: str = None):
        # Use centralized settings if not provided
        from api.config.settings import settings
        self.bucket = bucket or settings.s3_bucket
        self.endpoint_url = endpoint_url or settings.s3_endpoint_url
        logger.info(f"StorageService initialized with bucket: {self.bucket}, endpoint: {self.endpoint_url}")
        
        # Initialize S3 storage
        self.storage = S3Storage(self.bucket, self.endpoint_url)
        logger.info("✅ S3 storage initialized successfully")

    def ensure_bucket_exists(self, bucket_name: str = None):
        """Ensure the specified bucket exists, create if it doesn't"""
        bucket = bucket_name or self.bucket
        try:
            self.storage.s3.head_bucket(Bucket=bucket)
            logger.info(f"Bucket {bucket} already exists")
        except:
            try:
                self.storage.s3.create_bucket(Bucket=bucket)
                logger.info(f"✅ Created S3 bucket: {bucket}")
            except Exception as e:
                logger.error(f"⚠️ Could not create bucket {bucket}: {e}")
                raise

    def generate_project_path(self, project_id: str, filename: str) -> str:
        """Generate a project-specific path for file storage"""
        path = f"projects/{project_id}/{filename}"
        logger.debug(f"Generated project path: {path}")
        return path

    def generate_music_clip_path(self, user_id: str, project_id: str, file_type: str, filename: str) -> str:
        """Generate a music-clip specific path for S3 storage"""
        # Map music to tracks for consistency
        if file_type == "music":
            file_type = "tracks"
        path = f"users/{user_id}/projects/music-clip/{project_id}/{file_type}/{filename}"
        logger.debug(f"Generated music-clip path: {path}")
        return path

    def ensure_folder_exists(self, folder_path: str):
        """Ensure a folder exists in S3 storage"""
        try:
            self.storage.ensure_folder_exists(folder_path)
            logger.debug(f"Ensured folder exists: {folder_path}")
        except Exception as e:
            logger.warning(f"Could not ensure folder exists {folder_path}: {e}")

    def upload_music_track(self, file: UploadFile, user_id: str, project_id: str, filename: str) -> str:
        """Upload a music track to the music-clip project structure"""
        key = self.generate_music_clip_path(user_id, project_id, "tracks", filename)
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
            logger.error(f"File download failed for key '{key}': {str(e)}")
            logger.error(f"Key type: {type(key)}, Key length: {len(key) if key else 'None'}")
            raise

    def download_file_from_path(self, file_path: str, local_path: str):
        """Download a file from various path formats (S3 URL, local file, S3 key)"""
        import shutil
        
        if file_path.startswith("file://"):
            # Local file path - copy directly
            source_path = file_path.replace("file://", "")
            if not os.path.exists(source_path):
                raise FileNotFoundError(f"File not found on disk: {source_path}")
            shutil.copy2(source_path, local_path)
            logger.info(f"Copied local file: {source_path} -> {local_path}")
        elif file_path.startswith("http"):
            # S3 URL - extract key and download
            # Parse URL to extract the path after the domain
            from urllib.parse import urlparse
            parsed_url = urlparse(file_path)
            path_parts = parsed_url.path.strip('/').split('/')
            
            # For URLs like http://localhost:9000/clipizy/users/.../tracks/file.wav
            # We want to extract everything after the bucket name (clipizy)
            if len(path_parts) >= 2 and path_parts[0] == "clipizy":
                s3_key = "/".join(path_parts[1:])  # Everything after "clipizy"
                
                # Check if file exists before trying to download
                if not self.file_exists(s3_key):
                    raise FileNotFoundError(f"File does not exist in S3: {s3_key}")
                
                self.download_file(s3_key, local_path)
            else:
                # Fallback to old logic
                url_parts = file_path.split("/")
                bucket_index = -1
                for i, part in enumerate(url_parts):
                    if "clipizy" in part or "s3" in part:
                        bucket_index = i
                        break
                
                if bucket_index >= 0 and bucket_index + 1 < len(url_parts):
                    s3_key = "/".join(url_parts[bucket_index + 1:])
                    # Remove query parameters
                    s3_key = s3_key.split("?")[0]
                    
                    # Check if file exists before trying to download
                    if not self.file_exists(s3_key):
                        raise FileNotFoundError(f"File does not exist in S3: {s3_key}")
                    
                    self.download_file(s3_key, local_path)
                else:
                    raise ValueError(f"Invalid S3 URL format: {file_path}")
        else:
            # Assume it's already an S3 key
            # Check if file exists before trying to download
            if not self.file_exists(file_path):
                raise FileNotFoundError(f"File does not exist in S3: {file_path}")
            
            self.download_file(file_path, local_path)

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

# Create a default instance with proper configuration
def get_storage_service():
    from api.config.settings import settings
    return StorageService(
        bucket=settings.s3_bucket,
        endpoint_url=settings.s3_endpoint_url
    )

storage_service = get_storage_service()
