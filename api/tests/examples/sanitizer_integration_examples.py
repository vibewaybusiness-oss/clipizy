#!/usr/bin/env python3
"""
SANITIZER INTEGRATION EXAMPLES
Examples of how to integrate sanitizer into FastAPI endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from api.services.media.sanitizer_service import sanitize_input, SanitizerConfig, get_sanitizer
from api.middleware.sanitizer_middleware import SanitizerMiddleware

router = APIRouter(prefix="/examples", tags=["sanitizer-examples"])

# Example 1: Basic endpoint with manual sanitization
class UserInput(BaseModel):
    name: str = Field(..., description="User name")
    email: str = Field(..., description="User email")
    bio: Optional[str] = Field(None, description="User biography")
    age: Optional[int] = Field(None, description="User age")

@router.post("/user-profile")
async def create_user_profile(user_data: UserInput):
    """Example endpoint with manual sanitization"""
    
    # Sanitize each field
    name_result = sanitize_input(user_data.name, "string")
    email_result = sanitize_input(user_data.email, "string")
    bio_result = sanitize_input(user_data.bio or "", "string")
    age_result = sanitize_input(user_data.age, "number") if user_data.age else None
    
    # Check for validation errors
    errors = []
    if not name_result.is_valid:
        errors.extend([f"Name: {e}" for e in name_result.errors])
    if not email_result.is_valid:
        errors.extend([f"Email: {e}" for e in email_result.errors])
    if bio_result and not bio_result.is_valid:
        errors.extend([f"Bio: {e}" for e in bio_result.errors])
    if age_result and not age_result.is_valid:
        errors.extend([f"Age: {e}" for e in age_result.errors])
    
    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})
    
    # Log warnings if any
    warnings = []
    warnings.extend([f"Name: {w}" for w in name_result.warnings])
    warnings.extend([f"Email: {w}" for w in email_result.warnings])
    if bio_result:
        warnings.extend([f"Bio: {w}" for w in bio_result.warnings])
    if age_result:
        warnings.extend([f"Age: {w}" for w in age_result.warnings])
    
    # Return sanitized data
    return {
        "message": "User profile created successfully",
        "data": {
            "name": name_result.sanitized,
            "email": email_result.sanitized,
            "bio": bio_result.sanitized if bio_result else None,
            "age": age_result.sanitized if age_result else None,
        },
        "warnings": warnings if warnings else None
    }

# Example 2: Endpoint with custom sanitizer configuration
@router.post("/admin-content")
async def create_admin_content(
    title: str,
    content: str,
    tags: List[str],
    is_public: bool = False
):
    """Example endpoint with custom sanitizer config for admin content"""
    
    # Custom config for admin content (allows HTML)
    admin_config = SanitizerConfig(
        max_length=50000,
        allow_html=True,
        allowed_tags=["p", "br", "strong", "em", "ul", "ol", "li", "a"],
        allowed_attributes=["href", "target"],
        strip_whitespace=False
    )
    
    # Sanitize with custom config
    title_result = sanitize_input(title, "string")
    content_result = sanitize_input(content, "string")
    tags_result = sanitize_input(tags, "array")
    
    # Validate
    errors = []
    if not title_result.is_valid:
        errors.extend([f"Title: {e}" for e in title_result.errors])
    if not content_result.is_valid:
        errors.extend([f"Content: {e}" for e in content_result.errors])
    if not tags_result.is_valid:
        errors.extend([f"Tags: {e}" for e in tags_result.errors])
    
    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})
    
    return {
        "message": "Admin content created successfully",
        "data": {
            "title": title_result.sanitized,
            "content": content_result.sanitized,
            "tags": tags_result.sanitized,
            "is_public": is_public
        }
    }

# Example 3: File upload endpoint with sanitization
@router.post("/upload-file")
async def upload_file(
    filename: str,
    content_type: str,
    file_size: int,
    description: Optional[str] = None
):
    """Example file upload endpoint with sanitization"""
    
    # Sanitize file metadata
    file_result = sanitize_input({
        "filename": filename,
        "content_type": content_type,
        "size": file_size
    }, "file")
    
    description_result = sanitize_input(description or "", "string") if description else None
    
    # Validate
    errors = []
    if not file_result.is_valid:
        errors.extend([f"File: {e}" for e in file_result.errors])
    if description_result and not description_result.is_valid:
        errors.extend([f"Description: {e}" for e in description_result.errors])
    
    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})
    
    return {
        "message": "File uploaded successfully",
        "data": {
            "filename": file_result.sanitized["filename"],
            "content_type": file_result.sanitized["content_type"],
            "size": file_result.sanitized["size"],
            "description": description_result.sanitized if description_result else None
        }
    }

# Example 4: JSON endpoint with schema validation
@router.post("/complex-data")
async def process_complex_data(data: Dict[str, Any]):
    """Example endpoint for complex JSON data with schema validation"""
    
    # Define schema for validation
    schema = {
        "user_id": "string",
        "settings": "object",
        "preferences": "array",
        "metadata": "object"
    }
    
    # Sanitize with schema
    result = sanitize_input(data, "json", schema)
    
    if not result.is_valid:
        raise HTTPException(
            status_code=400, 
            detail={"errors": result.errors, "warnings": result.warnings}
        )
    
    return {
        "message": "Complex data processed successfully",
        "data": result.sanitized,
        "warnings": result.warnings if result.warnings else None
    }

# Example 5: Dependency for automatic sanitization
def get_sanitized_user_input(
    name: str,
    email: str,
    bio: Optional[str] = None,
    age: Optional[int] = None
) -> Dict[str, Any]:
    """Dependency function for automatic sanitization"""
    
    # Sanitize all inputs
    name_result = sanitize_input(name, "string")
    email_result = sanitize_input(email, "string")
    bio_result = sanitize_input(bio or "", "string") if bio else None
    age_result = sanitize_input(age, "number") if age else None
    
    # Check for errors
    errors = []
    if not name_result.is_valid:
        errors.extend([f"Name: {e}" for e in name_result.errors])
    if not email_result.is_valid:
        errors.extend([f"Email: {e}" for e in email_result.errors])
    if bio_result and not bio_result.is_valid:
        errors.extend([f"Bio: {e}" for e in bio_result.errors])
    if age_result and not age_result.is_valid:
        errors.extend([f"Age: {e}" for e in age_result.errors])
    
    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})
    
    return {
        "name": name_result.sanitized,
        "email": email_result.sanitized,
        "bio": bio_result.sanitized if bio_result else None,
        "age": age_result.sanitized if age_result else None,
        "warnings": {
            "name": name_result.warnings,
            "email": email_result.warnings,
            "bio": bio_result.warnings if bio_result else [],
            "age": age_result.warnings if age_result else []
        }
    }

@router.post("/user-with-dependency")
async def create_user_with_dependency(
    sanitized_data: Dict[str, Any] = Depends(get_sanitized_user_input)
):
    """Example endpoint using sanitization dependency"""
    
    return {
        "message": "User created successfully with dependency",
        "data": sanitized_data
    }

# Example 6: Middleware integration example
@router.get("/middleware-stats")
async def get_middleware_stats(request: Request):
    """Get sanitizer middleware statistics"""
    
    # This would be available if middleware is properly integrated
    middleware = getattr(request.app, 'sanitizer_middleware', None)
    if middleware:
        return {
            "message": "Sanitizer middleware statistics",
            "stats": middleware.get_stats()
        }
    else:
        return {
            "message": "Sanitizer middleware not configured",
            "stats": None
        }
