#!/usr/bin/env python3
"""
Simple startup script for Vibewave Backend API
Run this from the api/ directory
"""
import uvicorn
from config import settings

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        workers=settings.api_workers,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug"
    )
