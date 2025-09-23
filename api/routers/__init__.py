# Import from organized subdirectories
from .auth import auth_router, user_management_router
from .media import music_analysis_router, music_clip_router, analysis_router, track_router
from .ai import comfyui_router, runpod_router, prompt_router, job_router
from .business import payment_router, points_router, project_router
from .social import social_media_router, automation_router
from .content import visualizer_router, particle_router, export_router
from .analytics import stats_router

# Alias for backward compatibility
credits_router = points_router

all_routers = [
    auth_router,
    user_management_router,
    project_router,
    job_router,
    track_router,
    export_router,
    stats_router,
    prompt_router,
    music_clip_router,
    runpod_router,
    comfyui_router,
    music_analysis_router,
    visualizer_router,
    analysis_router,
    particle_router,
    credits_router,
    payment_router,
    social_media_router,
    automation_router,
]
