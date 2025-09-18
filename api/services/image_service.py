import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from api.models import Image
from api.storage.metadata import extract_metadata
from api.storage.json_store import JSONStore

class ImageService:
    def __init__(self, storage, json_store: JSONStore):
        self.storage = storage
        self.json_store = json_store

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
            f"users/{user_id}/music-clip/{project_id}/script.json",
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
