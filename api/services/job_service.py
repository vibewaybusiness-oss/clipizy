import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from api.models import Job
from api.storage.json_store import JSONStore
from api.config.logging import get_job_logger

# Initialize logger
logger = get_job_logger()

class JobService:
    def __init__(self, json_store: JSONStore):
        logger.info("JobService initialized")
        self.json_store = json_store

    def create_job(self, db: Session, project_id: str, job_type: str, user_id: str, params: dict, credits_spent: int):
        """Create a job record before running expensive tasks."""
        job_id = str(uuid.uuid4())
        logger.info(f"Creating job: {job_id} for project: {project_id}, type: {job_type}, user: {user_id}")
        
        try:
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
            logger.info(f"Job created successfully: {job_id}")
            return job
        except Exception as e:
            logger.error(f"Failed to create job {job_id}: {str(e)}")
            db.rollback()
            raise

    def run_job(self, db: Session, job: Job, storage):
        """Dispatch jobs to the correct service and update project JSON."""
        logger.info(f"Starting job execution: {job.id} (type: {job.type})")
        try:
            # Import services here to avoid circular imports
            from . import media_service
            from . import pricing_service as price_service
            from . import videomaking_service
            
            self._update_status(db, job, "processing")
            logger.info(f"Job {job.id} status updated to processing")

            result = None
            
            if job.type == "price_calculation":
                logger.info(f"Executing price calculation for job {job.id}")
                result = price_service.calculate_price(db, job.project_id, job.params, storage, self.json_store)

            elif job.type == "music_generation":
                logger.info(f"Executing music generation for job {job.id}")
                result = media_service.handle_music(db, job.project_id, job.params, job.user_id, storage, self.json_store)

            elif job.type == "music_analysis":
                logger.info(f"Executing music analysis for job {job.id}")
                result = media_service.analyze_track(job.project_id, storage, self.json_store, db)

            elif job.type == "image_generation":
                logger.info(f"Executing image generation for job {job.id}")
                result = media_service.generate_images(db, job.project_id, job.params, job.user_id)

            elif job.type == "video_generation":
                logger.info(f"Executing video generation for job {job.id}")
                result = media_service.generate_videos(db, job.project_id, job.params, job.user_id)

            elif job.type == "videomaking":
                logger.info(f"Executing videomaking for job {job.id}")
                result = videomaking_service.videomaking(db, job.project_id, job.params, storage, self.json_store)

            elif job.type == "export":
                logger.info(f"Executing export for job {job.id}")
                result = export_service.assemble_export(db, job.project_id, job.params, storage, self.json_store)

            else:
                logger.warning(f"Unknown job type: {job.type} for job {job.id}")

            self._update_status(db, job, "completed")
            logger.info(f"Job {job.id} completed successfully")
            return result

        except Exception as e:
            logger.error(f"Job {job.id} failed with error: {str(e)}")
            self._update_status(db, job, "failed")
            raise e

    def _update_status(self, db: Session, job: Job, new_status: str):
        logger.debug(f"Updating job {job.id} status to: {new_status}")
        job.status = new_status
        if new_status == "completed":
            job.completed_at = datetime.utcnow()
            logger.info(f"Job {job.id} marked as completed")
        elif new_status == "failed":
            job.completed_at = datetime.utcnow()
            logger.warning(f"Job {job.id} marked as failed")
        db.commit()
        db.refresh(job)