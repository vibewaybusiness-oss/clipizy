from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.db import get_db
from api.schemas import StatsRead
from api.services import StatsService

router = APIRouter(prefix="/stats", tags=["Stats"])
stats_service = StatsService(json_store=None)


@router.get("/{project_id}", response_model=list[StatsRead])
def get_project_stats(project_id: str, db: Session = Depends(get_db), user_id: str = "demo-user"):
    return db.query(StatsRead).filter_by(project_id=project_id, user_id=user_id).all()
