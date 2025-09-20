"""
Vibewave Backend - FastAPI Application Root
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.db import create_tables
from api.routers import all_routers
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Vibewave Backend API",
    description="AI-Powered Music Video Creation Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:9002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup hook
@app.on_event("startup")
async def startup_event():
    create_tables()
    logger.info("✅ Database tables created")

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Vibewave Backend is running"}

# Register routers
for r in all_routers:
    app.include_router(r)

# Mount ComfyUI API as sub-application
from api.comfyui.comfyui_api import app as comfyui_app
app.mount("/comfyui", comfyui_app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)

