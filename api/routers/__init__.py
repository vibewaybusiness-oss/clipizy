from .project_router import router as project_router
from .job_router import router as job_router
from .track_router import router as track_router
from .export_router import router as export_router
from .stats_router import router as stats_router
from .prompt_router import router as prompt_router
from .music_clip_router import router as music_clip_router
from .runpod_router import router as runpod_router
from .qwen_router import router as qwen_router
from .music_analysis_router import router as music_analysis_router
from .visualizer_router import router as visualizer_router

all_routers = [
    project_router,
    job_router,
    track_router,
    export_router,
    stats_router,
    prompt_router,
    music_clip_router,
    runpod_router,
    qwen_router,
    music_analysis_router,
    visualizer_router,
]
