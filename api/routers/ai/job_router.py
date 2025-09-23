from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.db import get_db
from api.schemas import JobResponse, JobCreate
from api.models import Job, Project, User
from ..auth.auth_router import get_current_user

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("/", response_model=list[JobResponse])
def list_jobs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Job).join(Project).filter(Project.user_id == str(current_user.id)).all()

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    job = db.query(Job).join(Project).filter(Job.id == job_id, Project.user_id == str(current_user.id)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
