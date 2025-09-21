# clipizi Backend Logging Guide

## Overview
The clipizi backend uses a centralized logging system that provides detailed logging across all services with different log levels and separate log files for better debugging and monitoring.

## Log Files Structure

### Main Log Files
- **`logs/info.log`** - INFO level and above (INFO, WARNING, ERROR)
- **`logs/error.log`** - ERROR level only
- **`logs/debug.log`** - DEBUG level and above (DEBUG, INFO, WARNING, ERROR)
- **`logs/services.log`** - All service-specific logs

### Log Rotation
- Each log file has a maximum size of 10MB
- Up to 5 backup files are kept
- Files are automatically rotated when they reach the size limit

## Log Levels

### DEBUG
- Detailed information for debugging
- Function entry/exit points
- Variable values and state changes
- Used for troubleshooting

### INFO
- General information about service operations
- Successful operations
- Service initialization
- Important state changes

### WARNING
- Something unexpected happened but the service can continue
- Deprecated functionality usage
- Performance issues
- Non-critical errors

### ERROR
- Error conditions that prevent normal operation
- Exceptions and failures
- Critical issues that need attention

## Service-Specific Loggers

Each service has its own logger with the naming convention `services.{service_name}`:

- `services.auth_service` - Authentication and user management
- `services.storage_service` - File storage operations (S3/MinIO)
- `services.prompt_service` - AI prompt generation
- `services.job_service` - Background job processing
- `services.project_service` - Project management
- `services.track_service` - Music track processing
- `services.video_service` - Video generation
- `services.image_service` - Image generation
- `services.audio_service` - Audio processing
- `services.export_service` - Export operations
- `services.stats_service` - Statistics and analytics
- `services.pricing_service` - Pricing calculations

## Log Format

### Console Output
```
HH:MM:SS - LEVEL - Message
```

### File Output
```
YYYY-MM-DD HH:MM:SS - logger_name - LEVEL - function_name:line_number - Message
```

## Usage Examples

### Basic Logging
```python
from api.config.logging import get_auth_logger

logger = get_auth_logger()

# Different log levels
logger.debug("Debug information for troubleshooting")
logger.info("Service operation completed successfully")
logger.warning("Unexpected condition detected")
logger.error("Operation failed with error")
```

### Service-Specific Logging
```python
# In auth_service.py
from api.config.logging import get_auth_logger
logger = get_auth_logger()

def authenticate_user(self, email: str, password: str):
    logger.info(f"Attempting to authenticate user: {email}")
    try:
        # Authentication logic
        logger.info(f"User authenticated successfully: {email}")
        return user
    except Exception as e:
        logger.error(f"Authentication failed for {email}: {str(e)}")
        raise
```

## Log Monitoring

### Real-time Monitoring
```bash
# Monitor all logs
tail -f logs/*.log

# Monitor specific service
tail -f logs/services.log | grep "services.auth_service"

# Monitor errors only
tail -f logs/error.log
```

### Log Analysis
```bash
# Count errors by service
grep "ERROR" logs/error.log | cut -d' ' -f3 | sort | uniq -c

# Find specific error patterns
grep "Authentication failed" logs/error.log

# Monitor job processing
grep "JobService" logs/services.log
```

## Best Practices

### 1. Use Appropriate Log Levels
- **DEBUG**: For detailed troubleshooting information
- **INFO**: For normal operation flow
- **WARNING**: For unexpected but recoverable conditions
- **ERROR**: For failures that need attention

### 2. Include Context
```python
# Good
logger.info(f"User {user_id} created project {project_id} of type {project_type}")

# Bad
logger.info("Project created")
```

### 3. Log Exceptions Properly
```python
try:
    # Some operation
    result = risky_operation()
    logger.info(f"Operation successful: {result}")
except Exception as e:
    logger.error(f"Operation failed: {str(e)}", exc_info=True)
    raise
```

### 4. Avoid Logging Sensitive Data
```python
# Good
logger.info(f"User {user_id} logged in")

# Bad
logger.info(f"User {user_id} logged in with password {password}")
```

### 5. Use Structured Logging
```python
# Include relevant context
logger.info(f"Processing job {job_id} for project {project_id} with params {params}")
```

## Log Cleanup

The logging system includes automatic cleanup functionality:

```python
from api.config.logging import cleanup_old_logs

# Clean up logs older than 30 days (default)
cleanup_old_logs()

# Clean up logs older than 7 days
cleanup_old_logs(days_to_keep=7)
```

## Troubleshooting

### Common Issues

1. **Logs not appearing**: Check if the logs directory exists and is writable
2. **Large log files**: Logs are automatically rotated, but you can manually clean them
3. **Missing service logs**: Ensure the service logger is properly initialized

### Debug Mode
To enable debug logging for all services, modify the logging configuration:

```python
# In api/config/logging.py
def setup_logger(name: str, level: int = logging.DEBUG):  # Changed from INFO to DEBUG
```

## Integration with Monitoring

The logging system is designed to work with external monitoring tools:

- **File-based monitoring**: Use tools like `logrotate` or `rsyslog`
- **Application monitoring**: Integrate with tools like Prometheus, Grafana, or ELK stack
- **Alerting**: Set up alerts based on ERROR level logs

## Performance Considerations

- Logging is asynchronous and should not block main operations
- DEBUG level logging can impact performance in production
- Consider using INFO level in production and DEBUG in development
- Log rotation prevents disk space issues
