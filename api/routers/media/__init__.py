from .music_analysis_router import router as music_analysis_router
from .music_clip_router import router as music_clip_router
from .analysis_router import router as analysis_router
from .track_router import router as track_router

__all__ = [
    "music_analysis_router",
    "music_clip_router", 
    "analysis_router",
    "track_router"
]
