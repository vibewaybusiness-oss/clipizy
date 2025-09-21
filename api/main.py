#!/usr/bin/env python3
"""
clipizi FastAPI Main Application
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
import os
from contextlib import asynccontextmanager

# Import routers
from api.routers import (
    auth_router,
    project_router,
    track_router,
    export_router,
    stats_router,
    job_router,
    prompt_router,
    pricing_router,
    analysis_router,
    music_analysis_router,
    music_clip_router,
    particle_router,
    visualizer_router,
    comfyui_router,
    runpod_router,
    points_router,
    payment_router,
    social_media_router,
    automation_router
)

# Import services for initialization
from api.services.comfyui_service import get_comfyui_manager
from api.services.queues_service import get_queue_manager
from api.db import create_tables
from api.config import settings
from api.fallback_db import setup_fallback_database

class LargeBodyMiddleware(BaseHTTPMiddleware):
    """Middleware to handle large request bodies"""
    def __init__(self, app, max_body_size: int = 100 * 1024 * 1024):  # 100MB default
        super().__init__(app)
        self.max_body_size = max_body_size

    async def dispatch(self, request: Request, call_next):
        # Check content length if available
        content_length = request.headers.get('content-length')
        if content_length and int(content_length) > self.max_body_size:
            return JSONResponse(
                status_code=413,
                content={"error": "Payload Too Large", "max_size": self.max_body_size}
            )

        # Read the body to prevent uvicorn's default 1MB limit
        try:
            body = await request.body()
            if len(body) > self.max_body_size:
                return JSONResponse(
                    status_code=413,
                    content={"error": "Payload Too Large", "max_size": self.max_body_size}
                )
            # Store the body for later use
            request._body = body
        except Exception as e:
            return JSONResponse(
                status_code=413,
                content={"error": "Failed to read request body", "detail": str(e)}
            )

        response = await call_next(request)
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    print("🚀 Starting clipizi API...")

    # Create database tables
    try:
        from api.db import create_tables
        create_tables()
        print("✅ Database tables created/verified")
    except Exception as e:
        print(f"⚠️ Database table creation failed: {e}")
        # Try fallback database if main database fails
        try:
            setup_fallback_database()
            print("✅ Fallback database setup successful")
        except Exception as fallback_error:
            print(f"⚠️ Fallback database setup failed: {fallback_error}")

    # Initialize default user and storage
    try:
        from api.db import get_db
        from api.models import User
        from api.services.user_safety_service import user_safety_service
        from api.services.storage_service import storage_service
        import uuid
        
        # Get database session
        db = next(get_db())
        
        # Create default user if it doesn't exist
        default_user_id = "00000000-0000-0000-0000-000000000001"
        try:
            user = user_safety_service.ensure_user_exists(db, default_user_id)
            print(f"✅ Default user ensured: {user.email}")
        except Exception as user_error:
            print(f"⚠️ User creation failed: {user_error}")
        
        # Initialize storage buckets
        try:
            storage_service.ensure_bucket_exists("clipizi")
            print("✅ Storage bucket 'clipizi' ensured")
        except Exception as storage_error:
            print(f"⚠️ Storage bucket creation failed: {storage_error}")
            
        # Ensure project folders exist for default user
        try:
            user_safety_service.ensure_project_folders_exist(default_user_id, "music-clip")
            print("✅ Project folders ensured for default user")
        except Exception as folder_error:
            print(f"⚠️ Project folder creation failed: {folder_error}")
            
        db.close()
        
    except Exception as init_error:
        print(f"⚠️ Database initialization failed: {init_error}")

    # Initialize ComfyUI manager
    try:
        comfyui_manager = get_comfyui_manager()
        await comfyui_manager.ensure_initialized()
        print("✅ ComfyUI Manager initialized")
    except Exception as e:
        print(f"⚠️ ComfyUI Manager initialization failed: {e}")

    # Initialize queue manager
    try:
        queue_manager = get_queue_manager()
        await queue_manager.start()
        print("✅ Queue Manager started")
    except Exception as e:
        print(f"⚠️ Queue Manager initialization failed: {e}")

    yield

    # Shutdown
    print("🛑 Shutting down clipizi API...")

    # Cleanup ComfyUI manager
    try:
        comfyui_manager = get_comfyui_manager()
        await comfyui_manager.cleanup()
        print("✅ ComfyUI Manager cleaned up")
    except Exception as e:
        print(f"⚠️ ComfyUI Manager cleanup failed: {e}")

    # Cleanup queue manager
    try:
        queue_manager = get_queue_manager()
        await queue_manager.cleanup()
        print("✅ Queue Manager cleaned up")
    except Exception as e:
        print(f"⚠️ Queue Manager cleanup failed: {e}")

# Create FastAPI app
app = FastAPI(
    title="clipizi API",
    description="AI-powered music video generation platform",
    version="1.0.0",
    lifespan=lifespan
)

# Add middleware for large request bodies (100MB limit)
# app.add_middleware(LargeBodyMiddleware, max_body_size=100 * 1024 * 1024)  # Disabled to fix upload timeout

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(project_router, prefix="/projects", tags=["projects"])
app.include_router(track_router, prefix="/tracks", tags=["tracks"])
app.include_router(export_router, prefix="/exports", tags=["exports"])
app.include_router(stats_router, prefix="/stats", tags=["stats"])
app.include_router(job_router, prefix="/jobs", tags=["jobs"])
app.include_router(prompt_router, prefix="/prompts", tags=["prompts"])
app.include_router(pricing_router, prefix="/pricing", tags=["pricing"])
app.include_router(analysis_router, prefix="/analysis", tags=["analysis"])
app.include_router(music_analysis_router)
app.include_router(music_clip_router)
app.include_router(particle_router, prefix="/particles", tags=["particles"])
app.include_router(visualizer_router, prefix="/visualizers", tags=["visualizers"])
app.include_router(comfyui_router, prefix="/comfyui", tags=["comfyui"])
app.include_router(runpod_router, prefix="/runpod", tags=["runpod"])
app.include_router(points_router, prefix="/api", tags=["points"])
app.include_router(payment_router, prefix="/api", tags=["payments"])
app.include_router(social_media_router, tags=["social-media"])
app.include_router(automation_router, tags=["automation"])

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "clipizi API",
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
        "service": "clipizi API",
        "version": "1.0.0"
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if os.getenv("DEBUG", "false").lower() == "true" else "An error occurred"
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
