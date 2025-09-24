# Import from organized subdirectories
from .functionalities import ProjectService, StatsService
from .ai import JobService
from .media import MediaService, analysis_service
from .storage import storage_service
from api.storage.json_store import JSONStore
from .auth import auth_service
from .business import PRICES, credits_service, stripe_service

# Initialize services
json_store = JSONStore(storage_service.storage)
project_service = ProjectService(json_store)
media_service = MediaService(storage_service.storage, json_store)

__all__ = [
    "ProjectService",
    "JobService",
    "MediaService",
    "StatsService",
    "storage_service",
    "auth_service",
    "analysis_service",
    "project_service",
    "media_service",
    "credits_service",
    "stripe_service",
]