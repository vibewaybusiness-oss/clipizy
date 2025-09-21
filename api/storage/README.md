✅ storage/

Handles S3/MinIO interactions.

Provides reusable helpers for:

s3.py → Core S3 Client
json_store.py → Script & Stats Helpers
utils.py → Path Builders
metadata.py → Low-level extraction utils (ffmpeg, Pillow) to ensure coherence


___________________________________________________________________________________

# Initialize storage
storage = S3Storage(bucket="clipizi", endpoint_url="http://localhost:9000")

# Upload a music file
key = asset_path("john.doe@example.com", "music-clip", "123", "music", "track1.wav")
with open("track1.wav", "rb") as f:
    storage.s3.upload_fileobj(f, "clipizi", key)

# Save script.json
json_store = JSONStore(storage)
json_store.save_json(
    script_path("john.doe@example.com", "music-clip", "123"),
    {"music": [], "video": [], "images": []}
)