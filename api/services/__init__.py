from .project_services import ProjectService
from .job_service import JobService
from .media_service import MediaService
from .stats_services import StatsService
from .storage_service import storage_service
from .auth_service import auth_service
from .analysis_service import analysis_service
from .pricing_service import PRICES, points_service
from .stripe_service import stripe_service
from api.storage.json_store import JSONStore

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
    "points_service",
    "stripe_service",
]