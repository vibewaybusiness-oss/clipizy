#!/usr/bin/env python3
"""
Test the simple FastAPI app
"""
import uvicorn

if __name__ == "__main__":
    print("🚀 Starting simple FastAPI test server...")
    print("📁 API will be available at: http://localhost:8000")
    print("📚 API docs will be at: http://localhost:8000/docs")
    print("🛑 Press Ctrl+C to stop")
    print("-" * 50)
    
    uvicorn.run(
        "simple_main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
