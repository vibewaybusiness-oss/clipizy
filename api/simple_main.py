"""
Simple FastAPI scaffold for testing
Based on the provided example
"""
from fastapi import FastAPI, UploadFile, Form
import aiofiles
import uuid
import os

app = FastAPI()

# Create storage directory if it doesn't exist
os.makedirs("./storage", exist_ok=True)

@app.post("/projects")
async def create_project(file: UploadFile, user_id: str = Form(...)):
    project_id = str(uuid.uuid4())

    # Save file locally (simulate S3 upload)
    async with aiofiles.open(f"./storage/{project_id}_{file.filename}", 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)

    # Run fake CPU analysis
    analysis_result = {"beats": [0.2, 0.5, 1.0]}
    with open(f"./storage/{project_id}_analysis.json", "w") as f:
        import json; json.dump(analysis_result, f)

    return {"project_id": project_id, "status": "analysis_done"}

@app.get("/")
async def root():
    return {"message": "Vibewave Backend API - Simple Test Version"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
