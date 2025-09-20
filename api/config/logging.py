"""
Centralized logging configuration for clipizi Backend
"""
import logging
import os
from pathlib import Path
from datetime import datetime
import logging.handlers

# Create logs directory
LOGS_DIR = Path(__file__).parent.parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# Log file paths
INFO_LOG = LOGS_DIR / "info.log"
ERROR_LOG = LOGS_DIR / "error.log"
DEBUG_LOG = LOGS_DIR / "debug.log"
SERVICE_LOG = LOGS_DIR / "services.log"

def setup_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """
    Set up a logger with file and console handlers
    
    Args:
        name: Logger name (usually __name__)
        level: Logging level (default: INFO)
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    simple_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(simple_formatter)
    
    # Info file handler (rotating)
    info_handler = logging.handlers.RotatingFileHandler(
        INFO_LOG, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8'
    )
    info_handler.setLevel(logging.INFO)
    info_handler.setFormatter(detailed_formatter)
    
    # Error file handler (rotating)
    error_handler = logging.handlers.RotatingFileHandler(
        ERROR_LOG, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(detailed_formatter)
    
    # Debug file handler (rotating)
    debug_handler = logging.handlers.RotatingFileHandler(
        DEBUG_LOG, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8'
    )
    debug_handler.setLevel(logging.DEBUG)
    debug_handler.setFormatter(detailed_formatter)
    
    # Add handlers to logger
    logger.addHandler(console_handler)
    logger.addHandler(info_handler)
    logger.addHandler(error_handler)
    logger.addHandler(debug_handler)
    
    return logger

def get_service_logger(service_name: str) -> logging.Logger:
    """
    Get a specialized logger for services with additional service-specific file handler
    
    Args:
        service_name: Name of the service (e.g., 'auth_service', 'storage_service')
    
    Returns:
        Configured service logger
    """
    logger = setup_logger(f"services.{service_name}")
    
    # Add service-specific file handler if it doesn't exist
    service_handler_exists = any(
        isinstance(handler, logging.handlers.RotatingFileHandler) and 
        handler.baseFilename == str(SERVICE_LOG)
        for handler in logger.handlers
    )
    
    if not service_handler_exists:
        service_handler = logging.handlers.RotatingFileHandler(
            SERVICE_LOG, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8'
        )
        service_handler.setLevel(logging.INFO)
        service_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        ))
        logger.addHandler(service_handler)
    
    return logger

# Pre-configured loggers for common use cases
def get_auth_logger():
    return get_service_logger("auth_service")

def get_storage_logger():
    return get_service_logger("storage_service")

def get_prompt_logger():
    return get_service_logger("prompt_service")

def get_job_logger():
    return get_service_logger("job_service")

def get_project_logger():
    return get_service_logger("project_service")

def get_track_logger():
    return get_service_logger("track_service")

def get_video_logger():
    return get_service_logger("video_service")

def get_image_logger():
    return get_service_logger("image_service")

def get_audio_logger():
    return get_service_logger("audio_service")

def get_export_logger():
    return get_service_logger("export_service")

def get_stats_logger():
    return get_service_logger("stats_service")

def get_pricing_logger():
    return get_service_logger("pricing_service")

# Log cleanup function
def cleanup_old_logs(days_to_keep: int = 30):
    """
    Clean up log files older than specified days
    
    Args:
        days_to_keep: Number of days to keep log files
    """
    import time
    current_time = time.time()
    cutoff_time = current_time - (days_to_keep * 24 * 60 * 60)
    
    for log_file in LOGS_DIR.glob("*.log*"):
        if log_file.stat().st_mtime < cutoff_time:
            log_file.unlink()
            print(f"Deleted old log file: {log_file}")

# Initialize main application logger
app_logger = setup_logger("clipizi_app")
