#!/usr/bin/env python3
"""
Run script for Vibewave Backend API
"""
import uvicorn
import sys
import os

# Add the parent directory to the path so we can import from api
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        workers=settings.api_workers,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug"
    )
