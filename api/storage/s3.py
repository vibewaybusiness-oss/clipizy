import boto3
import json
from botocore.client import Config
from fastapi import UploadFile
from typing import Optional

class S3Storage:
    def __init__(self, bucket: str, endpoint_url: Optional[str] = None,
                 access_key: str = "admin", secret_key: str = "admin123"):
        self.bucket = bucket
        self.s3 = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version="s3v4"),
        )

    # ---- File operations ----
    def upload_file(self, file: UploadFile, key: str):
        """Upload file from FastAPI UploadFile to S3"""
        self.s3.upload_fileobj(file.file, self.bucket, key)

    def download_file(self, key: str, local_path: str):
        """Download file from S3 to local"""
        self.s3.download_file(self.bucket, key, local_path)

    def delete_file(self, key: str):
        self.s3.delete_object(Bucket=self.bucket, Key=key)

    def file_exists(self, key: str) -> bool:
        try:
            self.s3.head_object(Bucket=self.bucket, Key=key)
            return True
        except:
            return False

    # ---- Presigned URLs ----
    def get_presigned_url(self, key: str, expiration: int = 3600):
        return self.s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expiration,
        )

    def get_presigned_upload_url(self, key: str, expiration: int = 3600):
        return self.s3.generate_presigned_url(
            "put_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expiration,
        )