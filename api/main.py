"""
Vibewave Backend - FastAPI Application
"""
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import os

# Import database and models
try:
    # Try relative imports first (when run as module)
    from .db import get_db, create_tables
    from .models import Project, Job, User
    from .schemas import (
        ProjectCreate, ProjectResponse, ProjectListResponse, ProjectStatusResponse,
        UserCreate, UserResponse, UserLogin, Token,
        JobCreate, JobResponse, JobListResponse
    )
    from .services import storage_service, analysis_service, runpod_service, auth_service
except ImportError:
    # Fall back to absolute imports (when run directly)
    from db import get_db, create_tables
    from models import Project, Job, User
    from schemas import (
        ProjectCreate, ProjectResponse, ProjectListResponse, ProjectStatusResponse,
        UserCreate, UserResponse, UserLogin, Token,
        JobCreate, JobResponse, JobListResponse
    )
    from services import storage_service, analysis_service, runpod_service, auth_service

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
    allow_origins=["http://localhost:3000", "http://localhost:9002"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()
    logger.info("Database tables created")

# Dependency to get current user
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    payload = auth_service.verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = auth_service.get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Vibewave Backend is running"}

# Authentication endpoints
@app.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        user = auth_service.create_user(db, user_data)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token"""
    user = auth_service.authenticate_user(db, login_data.email, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth_service.create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 1800  # 30 minutes
    }

@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# Project endpoints
@app.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    project = Project(
        user_id=str(current_user.id),
        name=project_data.name,
        description=project_data.description,
        settings=project_data.settings
    )
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    logger.info(f"Created project: {project.id}")
    return project

@app.get("/projects", response_model=ProjectListResponse)
async def list_projects(
    page: int = 1,
    per_page: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's projects"""
    offset = (page - 1) * per_page
    
    projects = db.query(Project).filter(
        Project.user_id == str(current_user.id)
    ).offset(offset).limit(per_page).all()
    
    total = db.query(Project).filter(
        Project.user_id == str(current_user.id)
    ).count()
    
    return ProjectListResponse(
        projects=projects,
        total=total,
        page=page,
        per_page=per_page,
        has_next=offset + per_page < total,
        has_prev=page > 1
    )

@app.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == str(current_user.id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project

@app.post("/projects/{project_id}/upload")
async def upload_audio_file(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload audio file for a project"""
    # Verify project exists and belongs to user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == str(current_user.id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Validate file type
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in [".mp3", ".wav", ".m4a", ".flac", ".aac"]:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Generate S3 key
    s3_key = storage_service.generate_project_path(project_id, file.filename)
    
    try:
        # Upload to S3
        file_url = storage_service.upload_file_object(
            file.file, 
            s3_key, 
            content_type=file.content_type
        )
        
        # Update project
        project.audio_file_path = file_url
        project.status = "uploading"
        db.commit()
        
        # Start analysis job
        analysis_job = Job(
            project_id=project_id,
            job_type="music_analysis",
            config={"file_path": file_url}
        )
        db.add(analysis_job)
        db.commit()
        
        logger.info(f"Uploaded audio file for project {project_id}")
        
        return {
            "message": "File uploaded successfully",
            "file_url": file_url,
            "project_id": project_id
        }
        
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

@app.get("/projects/{project_id}/status", response_model=ProjectStatusResponse)
async def get_project_status(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get project processing status"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == str(current_user.id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get latest job status
    latest_job = db.query(Job).filter(
        Job.project_id == project_id
    ).order_by(Job.created_at.desc()).first()
    
    return ProjectStatusResponse(
        project_id=project_id,
        status=project.status,
        progress=latest_job.progress_percentage if latest_job else 0,
        current_step=latest_job.job_type if latest_job else None,
        estimated_completion=latest_job.estimated_completion if latest_job else None,
        error_message=latest_job.error_message if latest_job else None
    )

# Job endpoints
@app.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    page: int = 1,
    per_page: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's jobs"""
    offset = (page - 1) * per_page
    
    # Get jobs for user's projects
    jobs = db.query(Job).join(Project).filter(
        Project.user_id == str(current_user.id)
    ).offset(offset).limit(per_page).all()
    
    total = db.query(Job).join(Project).filter(
        Project.user_id == str(current_user.id)
    ).count()
    
    return JobListResponse(
        jobs=jobs,
        total=total,
        page=page,
        per_page=per_page,
        has_next=offset + per_page < total,
        has_prev=page > 1
    )

@app.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific job"""
    job = db.query(Job).join(Project).filter(
        Job.id == job_id,
        Project.user_id == str(current_user.id)
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job

# Analysis endpoints
@app.post("/analysis/music")
async def analyze_music(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Analyze music file (CPU processing)"""
    # Save file temporarily
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    try:
        # Perform analysis
        analysis_result = analysis_service.analyze_music(temp_path)
        
        # Generate description
        description = analysis_service.generate_music_description(analysis_result)
        
        # Clean up temp file
        os.remove(temp_path)
        
        return {
            "analysis": analysis_result,
            "description": description
        }
        
    except Exception as e:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        logger.error(f"Error analyzing music: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")

# RunPod endpoints
@app.post("/runpod/pods")
async def create_runpod_pod(
    job_type: str,
    config: dict,
    current_user: User = Depends(get_current_user)
):
    """Create a new RunPod instance"""
    try:
        result = await runpod_service.create_pod(
            job_id="temp_job",
            job_type=job_type,
            config=config
        )
        return result
    except Exception as e:
        logger.error(f"Error creating RunPod: {e}")
        raise HTTPException(status_code=500, detail="Failed to create RunPod")

@app.get("/runpod/pods/{pod_id}")
async def get_runpod_pod(
    pod_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get RunPod instance status"""
    try:
        result = await runpod_service.get_pod_status(pod_id)
        return result
    except Exception as e:
        logger.error(f"Error getting RunPod status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get RunPod status")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
