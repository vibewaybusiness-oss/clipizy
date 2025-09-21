"""
Application settings and configuration
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings"""

    # Database settings
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///C:/temp/vibewave_working.db")
    database_echo: bool = os.getenv("DATABASE_ECHO", "false").lower() == "true"

    # JWT settings
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # Storage settings
    s3_bucket: str = os.getenv("S3_BUCKET", "clipizi")
    s3_endpoint_url: str = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
    s3_access_key: str = os.getenv("S3_ACCESS_KEY", "admin")
    s3_secret_key: str = os.getenv("S3_SECRET_KEY", "admin123")

    # API settings
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # CORS settings
    cors_origins: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://clipizi.com",
        "https://www.clipizi.com"
    ]

    # Logging settings
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_file_max_size: int = int(os.getenv("LOG_FILE_MAX_SIZE", "10485760"))  # 10MB
    log_file_backup_count: int = int(os.getenv("LOG_FILE_BACKUP_COUNT", "5"))

    # External services
    gemini_api_key: Optional[str] = os.getenv("GEMINI_API_KEY")
    runpod_api_key: Optional[str] = os.getenv("RUNPOD_API_KEY")
    stripe_secret_key: Optional[str] = os.getenv("STRIPE_SECRET_KEY")
    stripe_publishable_key: Optional[str] = os.getenv("STRIPE_PUBLISHABLE_KEY")
    stripe_webhook_secret: Optional[str] = os.getenv("STRIPE_WEBHOOK_SECRET")

    # Development settings
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    environment: str = os.getenv("ENVIRONMENT", "development")

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

# Create global settings instance
settings = Settings()
