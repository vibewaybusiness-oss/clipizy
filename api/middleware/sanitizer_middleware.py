#!/usr/bin/env python3
"""
SANITIZER MIDDLEWARE
FastAPI middleware for automatic input sanitization
"""
import json
import logging
from typing import Dict, Any, Optional, List, Set
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from api.services.media.sanitizer_service import sanitize_input, SanitizerConfig, SanitizerResult

logger = logging.getLogger(__name__)

class SanitizerMiddleware(BaseHTTPMiddleware):
    """Middleware for automatic input sanitization"""
    
    def __init__(
        self,
        app,
        config: Optional[SanitizerConfig] = None,
        skip_paths: Optional[List[str]] = None,
        skip_methods: Optional[List[str]] = None,
        log_violations: bool = True
    ):
        super().__init__(app)
        self.config = config or SanitizerConfig()
        self.skip_paths = set(skip_paths or [])
        self.skip_methods = set(skip_methods or ['GET', 'HEAD', 'OPTIONS'])
        self.log_violations = log_violations
        self.violation_stats = {
            'total_requests': 0,
            'sanitized_requests': 0,
            'violations_detected': 0,
            'patterns_triggered': {}
        }
    
    async def dispatch(self, request: Request, call_next):
        """Process request through sanitization middleware"""
        self.violation_stats['total_requests'] += 1
        
        # Skip sanitization for certain paths and methods
        if self._should_skip_request(request):
            return await call_next(request)
        
        try:
            # Sanitize request data
            sanitized_data = await self._sanitize_request(request)
            
            if sanitized_data:
                self.violation_stats['sanitized_requests'] += 1
                
                # Log violations if enabled
                if self.log_violations and self._has_violations(sanitized_data):
                    await self._log_violations(request, sanitized_data)
            
            # Continue with sanitized request
            response = await call_next(request)
            return response
            
        except Exception as e:
            logger.error(f"Sanitizer middleware error: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"error": "Sanitization failed", "detail": str(e)}
            )
    
    def _should_skip_request(self, request: Request) -> bool:
        """Check if request should be skipped"""
        # Skip by method
        if request.method in self.skip_methods:
            return True
        
        # Skip by path
        for skip_path in self.skip_paths:
            if request.url.path.startswith(skip_path):
                return True
        
        return False
    
    async def _sanitize_request(self, request: Request) -> Optional[Dict[str, Any]]:
        """Sanitize request data"""
        sanitized_data = {}
        has_violations = False
        
        # Sanitize query parameters
        if request.query_params:
            query_result = self._sanitize_query_params(request.query_params)
            if query_result:
                sanitized_data['query'] = query_result
                if self._has_violations_in_result(query_result):
                    has_violations = True
        
        # Sanitize path parameters
        if request.path_params:
            path_result = self._sanitize_path_params(request.path_params)
            if path_result:
                sanitized_data['path'] = path_result
                if self._has_violations_in_result(path_result):
                    has_violations = True
        
        # Sanitize request body
        if request.method in ['POST', 'PUT', 'PATCH']:
            body_result = await self._sanitize_request_body(request)
            if body_result:
                sanitized_data['body'] = body_result
                if self._has_violations_in_result(body_result):
                    has_violations = True
        
        # Sanitize headers
        header_result = self._sanitize_headers(request.headers)
        if header_result:
            sanitized_data['headers'] = header_result
            if self._has_violations_in_result(header_result):
                has_violations = True
        
        if has_violations:
            self.violation_stats['violations_detected'] += 1
        
        return sanitized_data if sanitized_data else None
    
    def _sanitize_query_params(self, query_params) -> Optional[Dict[str, Any]]:
        """Sanitize query parameters"""
        sanitized = {}
        has_violations = False
        
        for key, value in query_params.items():
            result = sanitize_input(value, "string")
            sanitized[key] = result.sanitized
            
            if not result.is_valid or result.warnings:
                has_violations = True
                self._update_pattern_stats(result)
        
        return sanitized if has_violations else None
    
    def _sanitize_path_params(self, path_params: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """Sanitize path parameters"""
        sanitized = {}
        has_violations = False
        
        for key, value in path_params.items():
            result = sanitize_input(value, "string")
            sanitized[key] = result.sanitized
            
            if not result.is_valid or result.warnings:
                has_violations = True
                self._update_pattern_stats(result)
        
        return sanitized if has_violations else None
    
    async def _sanitize_request_body(self, request: Request) -> Optional[Dict[str, Any]]:
        """Sanitize request body"""
        try:
            # Read body
            body = await request.body()
            if not body:
                return None
            
            # Parse JSON
            try:
                data = json.loads(body.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                # If not JSON or not valid UTF-8 (binary data), skip sanitization
                # This is likely a file upload or binary data
                return None
            
            # Sanitize JSON data
            result = sanitize_input(data, "json")
            
            if not result.is_valid or result.warnings:
                self._update_pattern_stats(result)
                return {"json": result.sanitized}
            
            return None
            
        except Exception as e:
            logger.error(f"Error sanitizing request body: {str(e)}")
            return None
    
    def _sanitize_headers(self, headers) -> Optional[Dict[str, Any]]:
        """Sanitize request headers"""
        sanitized = {}
        has_violations = False
        
        # Only sanitize certain headers that might contain user input
        sensitive_headers = {
            'user-agent', 'referer', 'origin', 'x-forwarded-for',
            'x-real-ip', 'x-forwarded-proto', 'x-forwarded-host'
        }
        
        for key, value in headers.items():
            if key.lower() in sensitive_headers:
                result = sanitize_input(value, "string")
                sanitized[key] = result.sanitized
                
                if not result.is_valid or result.warnings:
                    has_violations = True
                    self._update_pattern_stats(result)
        
        return sanitized if has_violations else None
    
    def _has_violations(self, sanitized_data: Dict[str, Any]) -> bool:
        """Check if sanitized data contains violations"""
        for section_data in sanitized_data.values():
            if self._has_violations_in_result(section_data):
                return True
        return False
    
    def _has_violations_in_result(self, result: Any) -> bool:
        """Check if a sanitization result contains violations"""
        if isinstance(result, dict):
            return any(self._has_violations_in_result(v) for v in result.values())
        elif isinstance(result, list):
            return any(self._has_violations_in_result(item) for item in result)
        else:
            return False
    
    def _update_pattern_stats(self, result: SanitizerResult):
        """Update violation pattern statistics"""
        for warning in result.warnings:
            pattern = warning.split(' ')[1] if ' ' in warning else 'unknown'
            self.violation_stats['patterns_triggered'][pattern] = \
                self.violation_stats['patterns_triggered'].get(pattern, 0) + 1
        
        for error in result.errors:
            pattern = error.split(' ')[1] if ' ' in error else 'unknown'
            self.violation_stats['patterns_triggered'][pattern] = \
                self.violation_stats['patterns_triggered'].get(pattern, 0) + 1
    
    async def _log_violations(self, request: Request, sanitized_data: Dict[str, Any]):
        """Log security violations"""
        violation_info = {
            'method': request.method,
            'path': request.url.path,
            'client_ip': request.client.host if request.client else 'unknown',
            'user_agent': request.headers.get('user-agent', 'unknown'),
            'violations': sanitized_data,
            'timestamp': str(request.state.get('timestamp', ''))
        }
        
        logger.warning(f"Security violation detected: {json.dumps(violation_info)}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get sanitization statistics"""
        return self.violation_stats.copy()

def create_sanitizer_middleware(
    config: Optional[SanitizerConfig] = None,
    skip_paths: Optional[List[str]] = None,
    skip_methods: Optional[List[str]] = None,
    log_violations: bool = True
) -> SanitizerMiddleware:
    """Create sanitizer middleware with configuration"""
    return SanitizerMiddleware(
        app=None,  # Will be set by FastAPI
        config=config,
        skip_paths=skip_paths,
        skip_methods=skip_methods,
        log_violations=log_violations
    )
