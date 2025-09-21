#!/usr/bin/env python3
"""
Test script to check if the music_clip_router is working correctly
"""
import sys
import os

# Add the api directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))

from fastapi import FastAPI
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))

# Direct import to avoid __init__.py issues
from routers.music_clip_router import router as music_clip_router

# Create a test FastAPI app
app = FastAPI()
app.include_router(music_clip_router)

# Print all routes
print("Registered routes:")
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        print(f"  {route.path} - {route.methods}")

# Check specifically for the projects POST route
projects_post_routes = [route for route in app.routes if hasattr(route, 'path') and route.path == '/music-clip/projects' and 'POST' in route.methods]
print(f"\nPOST /music-clip/projects routes found: {len(projects_post_routes)}")
for route in projects_post_routes:
    print(f"  Route: {route.path}, Methods: {route.methods}")
