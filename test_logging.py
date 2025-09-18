#!/usr/bin/env python3
"""
Test script for logging functionality
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.config.logging import get_auth_logger, get_storage_logger, get_prompt_logger, get_job_logger

def test_logging():
    """Test all logging functionality"""
    print("Testing logging functionality...")
    
    # Test auth logger
    auth_logger = get_auth_logger()
    auth_logger.info("Testing auth logger - INFO level")
    auth_logger.warning("Testing auth logger - WARNING level")
    auth_logger.error("Testing auth logger - ERROR level")
    auth_logger.debug("Testing auth logger - DEBUG level")
    
    # Test storage logger
    storage_logger = get_storage_logger()
    storage_logger.info("Testing storage logger - INFO level")
    storage_logger.warning("Testing storage logger - WARNING level")
    storage_logger.error("Testing storage logger - ERROR level")
    storage_logger.debug("Testing storage logger - DEBUG level")
    
    # Test prompt logger
    prompt_logger = get_prompt_logger()
    prompt_logger.info("Testing prompt logger - INFO level")
    prompt_logger.warning("Testing prompt logger - WARNING level")
    prompt_logger.error("Testing prompt logger - ERROR level")
    prompt_logger.debug("Testing prompt logger - DEBUG level")
    
    # Test job logger
    job_logger = get_job_logger()
    job_logger.info("Testing job logger - INFO level")
    job_logger.warning("Testing job logger - WARNING level")
    job_logger.error("Testing job logger - ERROR level")
    job_logger.debug("Testing job logger - DEBUG level")
    
    print("Logging test completed! Check the logs directory for output files.")

if __name__ == "__main__":
    test_logging()
