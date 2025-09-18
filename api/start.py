#!/usr/bin/env python3
"""
Vibewave Backend Startup Script
"""
import uvicorn
import os
import sys
from pathlib import Path

# Add the parent directory to the Python path so we can import the api module
sys.path.insert(0, str(Path(__file__).parent.parent))

if __name__ == "__main__":
    # Set environment variables
    os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/vibewave")
    os.environ.setdefault("BACKEND_URL", "http://localhost:8000")
    
    # Start the FastAPI server
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
