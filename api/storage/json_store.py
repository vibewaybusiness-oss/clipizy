from typing import Any, Dict
import json
import os
from .s3 import S3Storage
from api.config.logging import get_project_logger

logger = get_project_logger()

class JSONStore:
    def __init__(self, storage: S3Storage):
        self.storage = storage

    def save_json(self, key: str, data: Dict[str, Any]):
        """Save JSON data to S3, with fallback to local storage"""
        try:
            # Try S3 first
            self.storage.s3.put_object(
                Bucket=self.storage.bucket,
                Key=key,
                Body=json.dumps(data, indent=2),
                ContentType="application/json"
            )
            logger.info(f"Saved JSON to S3: {key}")
        except Exception as e:
            logger.warning(f"S3 save failed for {key}, falling back to local storage: {e}")
            # Fallback to local storage
            self._save_json_local(key, data)

    def load_json(self, key: str) -> Dict[str, Any]:
        """Load JSON data from S3, with fallback to local storage"""
        try:
            # Try S3 first
            obj = self.storage.s3.get_object(Bucket=self.storage.bucket, Key=key)
            data = json.loads(obj["Body"].read())
            logger.info(f"Loaded JSON from S3: {key}")
            return data
        except Exception as e:
            logger.warning(f"S3 load failed for {key}, trying local storage: {e}")
            # Fallback to local storage
            return self._load_json_local(key)

    def update_json(self, key: str, new_data: Dict[str, Any]):
        """Update JSON data, with fallback to local storage"""
        data = {}
        try:
            if self.storage.file_exists(key):
                data = self.load_json(key)
        except Exception as e:
            logger.warning(f"Could not check if file exists in S3 for {key}, trying local: {e}")
            # Try local storage
            local_path = self._get_local_path(key)
            if os.path.exists(local_path):
                data = self._load_json_local(key)
        
        data.update(new_data)
        self.save_json(key, data)
        return data

    def _save_json_local(self, key: str, data: Dict[str, Any]):
        """Save JSON data to local storage"""
        local_path = self._get_local_path(key)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        with open(local_path, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"Saved JSON to local storage: {local_path}")

    def _load_json_local(self, key: str) -> Dict[str, Any]:
        """Load JSON data from local storage"""
        local_path = self._get_local_path(key)
        
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Local JSON file not found: {local_path}")
        
        with open(local_path, 'r') as f:
            data = json.load(f)
        logger.info(f"Loaded JSON from local storage: {local_path}")
        return data

    def _get_local_path(self, key: str) -> str:
        """Convert S3 key to local file path"""
        # Convert S3 key to local path
        local_path = os.path.join("storage", key)
        return local_path