from .auth_router import router as auth_router
from .project_router import router as project_router
from .job_router import router as job_router
from .track_router import router as track_router
from .export_router import router as export_router
from .stats_router import router as stats_router
from .prompt_router import router as prompt_router
from .music_clip_router import router as music_clip_router
from .runpod_router import runpod_router
from .comfyui_router import router as comfyui_router
from .music_analysis_router import router as music_analysis_router
from .visualizer_router import router as visualizer_router
from .pricing_router import router as pricing_router
from .analysis_router import router as analysis_router
from .particle_router import router as particle_router
from .points_router import router as points_router
from .payment_router import router as payment_router

all_routers = [
    auth_router,
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
    pricing_router,
    analysis_router,
    particle_router,
    points_router,
    payment_router,
]
