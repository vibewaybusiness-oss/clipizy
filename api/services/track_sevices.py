import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from api.models import Track
from api.storage.metadata import extract_metadata
from api.storage.json_store import JSONStore

class TrackService:
    def __init__(self, storage, json_store: JSONStore):
        self.storage = storage
        self.json_store = json_store

    def handle_music(self, db: Session, project_id: str, params: dict, user_id: str, file=None):
        """
        Handle either:
        - AI music generation (params["prompt"]) 
        - Upload (file provided)
        """

        track_id = str(uuid.uuid4())
        file_key = f"music/{track_id}.wav"

        # 1. Upload or generate
        if file:
            # User upload
            s3_path = self.storage.upload_file(file, file_key, project_id, user_id)
        else:
            # AI generation (call Stability, RunPod, etc.)
            audio_bytes = self._generate_ai_music(params["prompt"], params.get("duration", 30))
            s3_path = self.storage.save_bytes(audio_bytes, file_key, project_id, user_id)

        # 2. Extract metadata
        local_tmp = self.storage.download_temp(s3_path)
        metadata = extract_metadata(local_tmp, "music")

        # 3. Save to DB
        track = Track(
            id=track_id,
            project_id=project_id,
            file_path=s3_path,
            title=params.get("title"),
            prompt=params.get("prompt"),
            description=params.get("description"),
            track_metadata=metadata,
            created_at=datetime.utcnow(),
        )
        db.add(track)
        db.commit()
        db.refresh(track)

        # 4. Update script.json
        self.json_store.append_item(
            f"users/{user_id}/music-clip/{project_id}/script.json",
            "music",
            {
                "id": track_id,
                "file": s3_path,
                "prompt": params.get("prompt"),
                "title": params.get("title"),
                "credits": params.get("credits", 0),
                "version": params.get("version", 1),
                "created_at": track.created_at.isoformat(),
            },
        )

        return track

    def analyze_track(self, project_id: str, storage, json_store: JSONStore):
        """
        Run BPM/key/scene analysis and update script.json.
        """
        # Placeholder — real implementation could call Essentia/Librosa
        analysis = {
            "bpm": 120,
            "key": "C Minor",
            "mood": "uplifting",
            "sections": [
                {"start": 0, "end": 30, "type": "intro"},
                {"start": 30, "end": 60, "type": "chorus"}
            ]
        }

        json_store.update_field(
            f"users/{project_id}/script.json",
            ["steps", "analysis"],
            analysis
        )

        return analysis

    def _generate_ai_music(self, prompt: str, duration: int):
        """
        Stub for AI music gen — integrate Stability AI or RunPod here.
        """
        # TODO: real implementation
        return b"FAKE_WAV_DATA"
