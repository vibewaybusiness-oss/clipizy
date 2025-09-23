from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.db import get_db
from api.schemas import StatsRead
from api.services import StatsService
from ..auth.auth_router import get_current_user
from api.models import User

router = APIRouter(prefix="/stats", tags=["Stats"])
stats_service = StatsService(json_store=None)


@router.get("/{project_id}", response_model=list[StatsRead])
def get_project_stats(
    project_id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    user_id = str(current_user.id)
    return db.query(StatsRead).filter_by(project_id=project_id, user_id=user_id).all()
