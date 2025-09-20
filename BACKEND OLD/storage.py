"""
Storage service for handling S3/MinIO operations
"""
import boto3
import os
import uuid
from typing import Optional, Dict, Any
from botocore.exceptions import ClientError
try:
    from ..config import settings
except ImportError:
    from config import settings
import logging

logger = logging.getLogger(__name__)


class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region
        )
        self.bucket_name = settings.s3_bucket
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """Ensure the S3 bucket exists, create if it doesn't"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                    logger.info(f"Created bucket: {self.bucket_name}")
                except ClientError as create_error:
                    logger.error(f"Failed to create bucket: {create_error}")
                    raise
            else:
                logger.error(f"Error checking bucket: {e}")
                raise

    def upload_file(self, local_path: str, s3_key: str) -> str:
        """Upload a file to S3 and return the URL"""
        try:
            self.s3_client.upload_file(local_path, self.bucket_name, s3_key)
            url = f"{settings.s3_endpoint}/{self.bucket_name}/{s3_key}"
            logger.info(f"Uploaded file to S3: {s3_key}")
            return url
        except ClientError as e:
            logger.error(f"Failed to upload file {local_path} to S3: {e}")
            raise

    def upload_file_object(self, file_obj, s3_key: str, content_type: str = None) -> str:
        """Upload a file object to S3 and return the URL"""
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            self.s3_client.upload_fileobj(file_obj, self.bucket_name, s3_key, ExtraArgs=extra_args)
            url = f"{settings.s3_endpoint}/{self.bucket_name}/{s3_key}"
            logger.info(f"Uploaded file object to S3: {s3_key}")
            return url
        except ClientError as e:
            logger.error(f"Failed to upload file object to S3: {e}")
            raise

    def download_file(self, s3_key: str, local_path: str) -> str:
        """Download a file from S3 to local path"""
        try:
            self.s3_client.download_file(self.bucket_name, s3_key, local_path)
            logger.info(f"Downloaded file from S3: {s3_key}")
            return local_path
        except ClientError as e:
            logger.error(f"Failed to download file {s3_key} from S3: {e}")
            raise

    def delete_file(self, s3_key: str) -> bool:
        """Delete a file from S3"""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"Deleted file from S3: {s3_key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete file {s3_key} from S3: {e}")
            return False

    def generate_presigned_url(self, s3_key: str, expiration: int = 3600) -> str:
        """Generate a presigned URL for file access"""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL for {s3_key}: {e}")
            raise

    def generate_presigned_upload_url(self, s3_key: str, expiration: int = 3600, 
                                    content_type: str = None) -> Dict[str, Any]:
        """Generate a presigned URL for file upload"""
        try:
            conditions = []
            if content_type:
                conditions.append(['content-length-range', 1, settings.max_file_size])
                conditions.append(['starts-with', '$Content-Type', content_type])
            
            url = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=s3_key,
                Fields={'Content-Type': content_type} if content_type else {},
                Conditions=conditions,
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned upload URL for {s3_key}: {e}")
            raise

    def list_files(self, prefix: str = "") -> list:
        """List files in S3 with optional prefix"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    files.append({
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'],
                        'url': f"{settings.s3_endpoint}/{self.bucket_name}/{obj['Key']}"
                    })
            return files
        except ClientError as e:
            logger.error(f"Failed to list files with prefix {prefix}: {e}")
            return []

    def get_file_info(self, s3_key: str) -> Optional[Dict[str, Any]]:
        """Get file information from S3"""
        try:
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return {
                'key': s3_key,
                'size': response['ContentLength'],
                'content_type': response.get('ContentType', 'application/octet-stream'),
                'last_modified': response['LastModified'],
                'etag': response['ETag'],
                'url': f"{settings.s3_endpoint}/{self.bucket_name}/{s3_key}"
            }
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return None
            logger.error(f"Failed to get file info for {s3_key}: {e}")
            raise

    def generate_project_path(self, project_id: str, filename: str) -> str:
        """Generate S3 key for project file"""
        return f"projects/{project_id}/{filename}"

    def generate_temp_path(self, filename: str) -> str:
        """Generate S3 key for temporary file"""
        return f"temp/{uuid.uuid4()}/{filename}"


# Global storage service instance
storage_service = StorageService()
