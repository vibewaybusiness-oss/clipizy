from typing import Any, Dict
import json
from .s3 import S3Storage

class JSONStore:
    def __init__(self, storage: S3Storage):
        self.storage = storage

    def save_json(self, key: str, data: Dict[str, Any]):
        self.storage.s3.put_object(
            Bucket=self.storage.bucket,
            Key=key,
            Body=json.dumps(data, indent=2),
            ContentType="application/json"
        )

    def load_json(self, key: str) -> Dict[str, Any]:
        obj = self.storage.s3.get_object(Bucket=self.storage.bucket, Key=key)
        return json.loads(obj["Body"].read())

    def update_json(self, key: str, new_data: Dict[str, Any]):
        data = {}
        if self.storage.file_exists(key):
            data = self.load_json(key)
        data.update(new_data)
        self.save_json(key, data)
        return data