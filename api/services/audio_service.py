import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from api.models import Audio
from api.storage.metadata import extract_metadata
from api.storage.json_store import JSONStore

class AudioService:
    def __init__(self, storage, json_store: JSONStore):
        self.storage = storage
        self.json_store = json_store

    def handle_audio(self, db: Session, project_id: str, params: dict, user_id: str, file=None):
        """
        Handle either:
        - AI audio generation (params["prompt"], params["voice"] etc.)
        - Upload (voiceover, narration, SFX file)
        """
        audio_id = str(uuid.uuid4())
        file_key = f"audio/{audio_id}.wav"

        # 1. Upload or AI generate
        if file:
            s3_path = self.storage.upload_file(file, file_key, project_id, user_id)
        else:
            # Stub for TTS / voice cloning API call
            audio_bytes = self._generate_ai_audio(
                params["prompt"],
                params.get("voice", "default"),
                params.get("duration", 10),
            )
            s3_path = self.storage.save_bytes(audio_bytes, file_key, project_id, user_id)

        # 2. Extract metadata
        local_tmp = self.storage.download_temp(s3_path)
        metadata = extract_metadata(local_tmp, "audio")

        # 3. DB entry
        audio = Audio(
            id=audio_id,
            project_id=project_id,
            user_id=user_id,
            file_path=s3_path,
            prompt=params.get("prompt"),
            type=params.get("type", "voiceover"),  # e.g. voiceover, narration, sfx
            duration=metadata["duration"],
            format=metadata["format"],
            sample_rate=metadata["sample_rate"],
            channels=metadata["channels"],
            size_mb=metadata["size_mb"],
            created_at=datetime.utcnow(),
        )
        db.add(audio)
        db.commit()
        db.refresh(audio)

        # 4. Update script.json
        self.json_store.append_item(
            f"users/{user_id}/music-clip/{project_id}/script.json",
            "audio",
            {
                "id": audio_id,
                "file": s3_path,
                "prompt": params.get("prompt"),
                "type": params.get("type", "voiceover"),
                "credits": params.get("credits", 0),
                "created_at": audio.created_at.isoformat(),
            },
        )

        return audio

    def _generate_ai_audio(self, prompt: str, voice: str, duration: int):
        """
        Stub for Text-to-Speech / voice cloning engine.
        Could integrate with ElevenLabs, OpenAI TTS, etc.
        """
        return b"FAKE_AUDIO_DATA"
