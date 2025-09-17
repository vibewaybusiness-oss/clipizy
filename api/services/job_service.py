import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from api.models import Job
from api.services import track_service, video_service, image_service, export_service
from api.storage.json_store import JSONStore

class JobService:
    def __init__(self, json_store: JSONStore):
        self.json_store = json_store

    def create_job(self, db: Session, project_id: str, job_type: str, user_id: str, params: dict, credits_spent: int):
        """Create a job record before running expensive tasks."""
        job_id = str(uuid.uuid4())
        job = Job(
            id=job_id,
            project_id=project_id,
            user_id=user_id,
            type=job_type,  # e.g. "music_generation", "analysis", "image_gen", "video_gen", "export"
            status="created",
            params=params,
            credits_spent=credits_spent,
            created_at=datetime.utcnow(),
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def run_job(self, db: Session, job: Job, storage):
        """Dispatch jobs to the correct service and update project JSON."""
        try:
            self._update_status(db, job, "processing")

            result = None
            
            if job.type == "price_calculation":
                result = price_service.calculate_price(db, job.project_id, job.params, storage, self.json_store)

            elif job.type == "music_generation":
                result = track_service.handle_music(db, job.project_id, job.params, job.user_id, storage, self.json_store)

            elif job.type == "music_analysis":
                result = track_service.analyze_track(job.project_id, storage, self.json_store)

            elif job.type == "image_generation":
                result = image_service.generate_images(db, job.project_id, job.params, storage, self.json_store)

            elif job.type == "video_generation":
                result = video_service.generate_videos(db, job.project_id, job.params, storage, self.json_store)

            elif job.type == "videomaking":
                result = videomaking_service.videomaking(db, job.project_id, job.params, storage, self.json_store)

            elif job.type == "export":
                result = export_service.assemble_export(db, job.project_id, job.params, storage, self.json_store)

            self._update_status(db, job, "completed")
            return result

        except Exception as e:
            self._update_status(db, job, "failed")
            raise e

    def _update_status(self, db: Session, job: Job, new_status: str):
        job.status = new_status
        db.commit()
        db.refresh(job)