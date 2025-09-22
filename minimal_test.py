#!/usr/bin/env python3
"""
Minimal FastAPI test without sanitizer middleware
"""
import os
from fastapi import FastAPI

# Set environment variables
os.environ["DATABASE_URL"] = "sqlite:///./clipizy.db"

app = FastAPI(title="Clipizy API", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "Hello World", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "clipizy API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)