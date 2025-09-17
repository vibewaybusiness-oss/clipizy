import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from api.models import Export
from api.storage.metadata import extract_metadata
from api.storage.json_store import JSONStore

class ExportService:
    def __init__(self, storage, json_store: JSONStore):
        self.storage = storage
        self.json_store = json_store

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
            f"users/{user_id}/music-clip/{project_id}/script.json",
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
