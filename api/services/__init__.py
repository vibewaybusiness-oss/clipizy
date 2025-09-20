from .project_services import ProjectService
from .job_service import JobService
from .track_sevices import TrackService
from .video_service import VideoService
from .image_service import ImageService
from .audio_service import AudioService
from .export_service import ExportService
from .stats_services import StatsService
from .storage_service import storage_service
from .auth_service import auth_service
from .analysis_service import analysis_service
from .points_service import points_service
from .stripe_service import stripe_service
from .pricing_service import PRICES, calculate_music_price, calculate_image_price, calculate_looped_animation_price, calculate_video_price
from api.storage.json_store import JSONStore

# Initialize services
json_store = JSONStore(storage_service.storage)
project_service = ProjectService(json_store)

__all__ = [
    "ProjectService",
    "JobService",
    "TrackService",
    "VideoService",
    "ImageService",
    "AudioService",
    "ExportService",
    "StatsService",
    "storage_service",
    "auth_service",
    "analysis_service",
    "project_service",
    "points_service",
    "stripe_service",
]