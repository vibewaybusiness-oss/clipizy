from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.db import get_db
from api.schemas import ExportCreate, ExportRead
from api.services import media_service

router = APIRouter(prefix="/exports", tags=["Exports"])


@router.post("/", response_model=ExportRead)
def create_export(payload: ExportCreate, project_id: str, db: Session = Depends(get_db), user_id: str = "demo-user"):
    return media_service.assemble_export(db, project_id, payload.dict(), user_id)
