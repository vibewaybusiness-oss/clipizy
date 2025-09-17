# api/storage/json_store.py
import json
import tempfile
import boto3

class JSONStore:
    def __init__(self, s3_client: boto3.client, bucket: str):
        self.s3 = s3_client
        self.bucket = bucket

    def save_json(self, key: str, data: dict):
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=json.dumps(data))

    def load_json(self, key: str) -> dict:
        obj = self.s3.get_object(Bucket=self.bucket, Key=key)
        return json.loads(obj["Body"].read())

    def update_field(self, key: str, path: list, value):
        data = self.load_json(key)
        d = data
        for p in path[:-1]:
            d = d.setdefault(p, {})
        d[path[-1]] = value
        self.save_json(key, data)

    def append_item(self, key: str, section: str, item: dict):
        data = self.load_json(key)
        section_parts = section.split(".")
        d = data
        for part in section_parts:
            d = d.setdefault(part, [])
        if not isinstance(d, list):
            raise ValueError(f"Section {section} is not a list in {key}")
        d.append(item)
        self.save_json(key, data)