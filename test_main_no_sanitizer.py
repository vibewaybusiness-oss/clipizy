#!/usr/bin/env python3
"""
Test main.py without sanitizer middleware
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Set environment variables
os.environ["DATABASE_URL"] = "sqlite:///./clipizy.db"

# Import routers
from api.routers import (
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
    analysis_router,
    particle_router,
    credits_router,
    payment_router,
    social_media_router,
    automation_router
)

# Create FastAPI app
app = FastAPI(
    title="Clipizy API",
    description="AI-powered music video generation platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to Clipizy API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "clipizy API",
        "version": "1.0.0"
    }

# Include routers
app.include_router(auth_router, tags=["auth"])
app.include_router(project_router, tags=["projects"])
app.include_router(job_router, tags=["jobs"])
app.include_router(track_router, tags=["tracks"])
app.include_router(export_router, tags=["exports"])
app.include_router(stats_router, tags=["stats"])
app.include_router(prompt_router, tags=["prompts"])
app.include_router(music_clip_router, tags=["music-clips"])
app.include_router(runpod_router, tags=["runpod"])
app.include_router(comfyui_router, tags=["comfyui"])
app.include_router(music_analysis_router, tags=["music-analysis"])
app.include_router(visualizer_router, tags=["visualizers"])
app.include_router(analysis_router, tags=["analysis"])
app.include_router(particle_router, tags=["particles"])
app.include_router(credits_router, tags=["credits"])
app.include_router(payment_router, tags=["payments"])
app.include_router(social_media_router, tags=["social-media"])
app.include_router(automation_router, tags=["automation"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
