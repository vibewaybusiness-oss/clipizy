"""
Configuration management for Vibewave Backend
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./vibewave.db"
    database_echo: bool = False
    
    # Storage (S3/MinIO)
    s3_endpoint: str = "http://127.0.0.1:9000"
    s3_access_key: str = "admin"
    s3_secret_key: str = "admin123"
    s3_bucket: str = "vibewave"
    s3_region: str = "us-east-1"
    
    # RunPod
    runpod_api_key: str = "changeme"
    runpod_endpoint: str = "https://api.runpod.io/graphql"
    
    # AI Services
    gemini_api_key: Optional[str] = None
    
    # Redis (for Celery)
    redis_url: str = "redis://localhost:6379/0"
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_workers: int = 1
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # File uploads
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    allowed_audio_formats: list = [".mp3", ".wav", ".m4a", ".flac", ".aac"]
    allowed_video_formats: list = [".mp4", ".mov", ".avi", ".mkv"]
    
    # Development
    debug: bool = True
    environment: str = "development"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
