import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from api.models import Video
from api.storage.metadata import extract_metadata
from api.storage.json_store import JSONStore

class VideoService:
    def __init__(self, storage, json_store: JSONStore):
        self.storage = storage
        self.json_store = json_store

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
            f"users/{user_id}/music-clip/{project_id}/script.json",
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