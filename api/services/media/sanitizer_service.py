#!/usr/bin/env python3
"""
SANITIZER SERVICE
Comprehensive input sanitization service for all user inputs
"""
import re
import html
import json
import base64
from typing import Any, Dict, List, Optional, Union, Callable
from urllib.parse import quote, unquote
try:
    import bleach
except ImportError:
    bleach = None
    print("Warning: bleach not available. Install with: pip install bleach")
from pydantic import BaseModel, ValidationError
import logging

logger = logging.getLogger(__name__)

class SanitizerConfig(BaseModel):
    """Configuration for sanitizer behavior"""
    max_length: int = 10000
    allow_html: bool = False
    allow_scripts: bool = False
    allow_sql_keywords: bool = False
    strip_whitespace: bool = True
    normalize_unicode: bool = True
    remove_control_chars: bool = True
    allowed_tags: List[str] = []
    allowed_attributes: List[str] = []
    custom_patterns: List[str] = []

class SanitizerResult(BaseModel):
    """Result of sanitization operation"""
    original: Any
    sanitized: Any
    is_valid: bool
    warnings: List[str] = []
    errors: List[str] = []

class InputSanitizer:
    """Comprehensive input sanitizer for all data types"""
    
    def __init__(self, config: Optional[SanitizerConfig] = None):
        self.config = config or SanitizerConfig()
        self._setup_patterns()
    
    def _setup_patterns(self):
        """Setup regex patterns for various attack vectors"""
        self.patterns = {
            'sql_injection': [
                r'(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute)',
                r'(?i)(or|and)\s+\d+\s*=\s*\d+',
                r'(?i)(\'|\"|;|--|\/\*|\*\/)',
                r'(?i)(xp_|sp_|fn_)',
                r'(?i)(waitfor|delay|sleep)',
                r'(?i)(load_file|into\s+outfile|into\s+dumpfile)',
            ],
            'xss': [
                r'<script[^>]*>.*?</script>',
                r'javascript:',
                r'vbscript:',
                r'on\w+\s*=',
                r'<iframe[^>]*>',
                r'<object[^>]*>',
                r'<embed[^>]*>',
                r'<link[^>]*>',
                r'<meta[^>]*>',
                r'<style[^>]*>',
                r'expression\s*\(',
                r'url\s*\(',
            ],
            'path_traversal': [
                r'\.\./',
                r'\.\.\\',
                r'%2e%2e%2f',
                r'%2e%2e%5c',
                r'\.\.%2f',
                r'\.\.%5c',
                r'%252e%252e%252f',
                r'%252e%252e%255c',
            ],
            'command_injection': [
                r'[;&|`$]',
                r'(?i)(cmd|command|exec|system|shell)',
                r'(?i)(powershell|bash|sh|cmd)',
                r'`[^`]*`',
                r'\$\([^)]*\)',
                r'<[^>]*>',
            ],
            'ldap_injection': [
                r'[()=*!&|]',
                r'(?i)(objectclass|cn|sn|givenname|mail)',
                r'(?i)(admin|administrator|root)',
            ],
            'no_sql_injection': [
                r'(?i)(\$where|\$ne|\$gt|\$lt|\$regex|\$exists)',
                r'(?i)(true|false|null)',
                r'(?i)(and|or|not)',
            ],
            'control_chars': [
                r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]',
            ],
            'unicode_abuse': [
                r'[\u200B-\u200D\uFEFF]',
                r'[\u2028\u2029]',
                r'[\u2060-\u2064]',
            ]
        }
        
        # Compile patterns for performance
        self.compiled_patterns = {}
        for category, patterns in self.patterns.items():
            self.compiled_patterns[category] = [
                re.compile(pattern, re.IGNORECASE | re.MULTILINE) 
                for pattern in patterns
            ]
    
    def sanitize_string(self, value: str, input_type: str = "text") -> SanitizerResult:
        """Sanitize string input"""
        if not isinstance(value, str):
            return SanitizerResult(
                original=value,
                sanitized=str(value),
                is_valid=False,
                errors=["Input must be a string"]
            )
        
        original = value
        warnings = []
        errors = []
        
        # Length validation
        if len(value) > self.config.max_length:
            value = value[:self.config.max_length]
            warnings.append(f"Input truncated to {self.config.max_length} characters")
        
        # Strip whitespace if configured
        if self.config.strip_whitespace:
            value = value.strip()
        
        # Remove control characters
        if self.config.remove_control_chars:
            for pattern in self.compiled_patterns['control_chars']:
                value = pattern.sub('', value)
        
        # Normalize unicode
        if self.config.normalize_unicode:
            for pattern in self.compiled_patterns['unicode_abuse']:
                value = pattern.sub('', value)
        
        # HTML encoding
        if not self.config.allow_html:
            value = html.escape(value, quote=True)
        
        # Check for malicious patterns
        for category, patterns in self.compiled_patterns.items():
            if category in ['control_chars', 'unicode_abuse']:
                continue
                
            for pattern in patterns:
                if pattern.search(value):
                    if category == 'sql_injection' and not self.config.allow_sql_keywords:
                        errors.append(f"Potential {category} detected")
                    else:
                        warnings.append(f"Potential {category} pattern detected")
        
        # HTML sanitization with bleach if HTML is allowed
        if self.config.allow_html and self.config.allowed_tags and bleach is not None:
            value = bleach.clean(
                value,
                tags=self.config.allowed_tags,
                attributes=self.config.allowed_attributes,
                strip=True
            )
        elif self.config.allow_html and self.config.allowed_tags and bleach is None:
            # Fallback to basic HTML escaping if bleach is not available
            value = html.escape(value)
        
        return SanitizerResult(
            original=original,
            sanitized=value,
            is_valid=len(errors) == 0,
            warnings=warnings,
            errors=errors
        )
    
    def sanitize_number(self, value: Union[int, float, str], input_type: str = "number") -> SanitizerResult:
        """Sanitize numeric input"""
        original = value
        warnings = []
        errors = []
        
        try:
            if isinstance(value, str):
                # Remove any non-numeric characters except decimal point and minus
                cleaned = re.sub(r'[^\d.-]', '', value)
                if '.' in cleaned:
                    sanitized = float(cleaned)
                else:
                    sanitized = int(cleaned)
            else:
                sanitized = value
            
            # Validate range for common numeric types
            if input_type == "integer":
                if not isinstance(sanitized, int):
                    sanitized = int(sanitized)
            elif input_type == "float":
                if not isinstance(sanitized, float):
                    sanitized = float(sanitized)
            
            # Check for reasonable bounds
            if abs(sanitized) > 1e15:
                warnings.append("Number exceeds reasonable bounds")
            
        except (ValueError, TypeError) as e:
            errors.append(f"Invalid number format: {str(e)}")
            sanitized = 0
        
        return SanitizerResult(
            original=original,
            sanitized=sanitized,
            is_valid=len(errors) == 0,
            warnings=warnings,
            errors=errors
        )
    
    def sanitize_boolean(self, value: Any) -> SanitizerResult:
        """Sanitize boolean input"""
        original = value
        warnings = []
        errors = []
        
        if isinstance(value, bool):
            sanitized = value
        elif isinstance(value, str):
            sanitized = value.lower() in ('true', '1', 'yes', 'on', 'enabled')
        elif isinstance(value, (int, float)):
            sanitized = bool(value)
        else:
            sanitized = bool(value)
            warnings.append("Non-boolean value converted to boolean")
        
        return SanitizerResult(
            original=original,
            sanitized=sanitized,
            is_valid=True,
            warnings=warnings,
            errors=errors
        )
    
    def sanitize_list(self, value: List[Any], item_type: str = "string") -> SanitizerResult:
        """Sanitize list input"""
        if not isinstance(value, list):
            return SanitizerResult(
                original=value,
                sanitized=[],
                is_valid=False,
                errors=["Input must be a list"]
            )
        
        original = value
        warnings = []
        errors = []
        sanitized = []
        
        for i, item in enumerate(value):
            if item_type == "string":
                result = self.sanitize_string(str(item))
            elif item_type == "number":
                result = self.sanitize_number(item)
            elif item_type == "boolean":
                result = self.sanitize_boolean(item)
            else:
                result = self.sanitize_string(str(item))
            
            sanitized.append(result.sanitized)
            warnings.extend([f"Item {i}: {w}" for w in result.warnings])
            errors.extend([f"Item {i}: {e}" for e in result.errors])
        
        return SanitizerResult(
            original=original,
            sanitized=sanitized,
            is_valid=len(errors) == 0,
            warnings=warnings,
            errors=errors
        )
    
    def sanitize_dict(self, value: Dict[str, Any], schema: Optional[Dict[str, str]] = None) -> SanitizerResult:
        """Sanitize dictionary input"""
        if not isinstance(value, dict):
            return SanitizerResult(
                original=value,
                sanitized={},
                is_valid=False,
                errors=["Input must be a dictionary"]
            )
        
        original = value
        warnings = []
        errors = []
        sanitized = {}
        
        for key, val in value.items():
            # Sanitize key
            key_result = self.sanitize_string(str(key), "key")
            if not key_result.is_valid:
                errors.extend([f"Key '{key}': {e}" for e in key_result.errors])
                continue
            
            sanitized_key = key_result.sanitized
            
            # Determine value type from schema or auto-detect
            if schema and sanitized_key in schema:
                val_type = schema[sanitized_key]
            else:
                val_type = self._detect_type(val)
            
            # Sanitize value
            if val_type == "string":
                val_result = self.sanitize_string(str(val))
            elif val_type == "number":
                val_result = self.sanitize_number(val)
            elif val_type == "boolean":
                val_result = self.sanitize_boolean(val)
            elif val_type == "list":
                val_result = self.sanitize_list(val if isinstance(val, list) else [val])
            elif val_type == "dict":
                val_result = self.sanitize_dict(val if isinstance(val, dict) else {})
            else:
                val_result = self.sanitize_string(str(val))
            
            sanitized[sanitized_key] = val_result.sanitized
            warnings.extend([f"Key '{sanitized_key}': {w}" for w in val_result.warnings])
            errors.extend([f"Key '{sanitized_key}': {e}" for e in val_result.errors])
        
        return SanitizerResult(
            original=original,
            sanitized=sanitized,
            is_valid=len(errors) == 0,
            warnings=warnings,
            errors=errors
        )
    
    def _detect_type(self, value: Any) -> str:
        """Auto-detect the type of a value"""
        if isinstance(value, bool):
            return "boolean"
        elif isinstance(value, (int, float)):
            return "number"
        elif isinstance(value, list):
            return "list"
        elif isinstance(value, dict):
            return "dict"
        else:
            return "string"
    
    def sanitize_json(self, value: Union[str, dict], schema: Optional[Dict[str, str]] = None) -> SanitizerResult:
        """Sanitize JSON input"""
        original = value
        warnings = []
        errors = []
        
        try:
            if isinstance(value, str):
                parsed = json.loads(value)
            else:
                parsed = value
            
            if isinstance(parsed, dict):
                result = self.sanitize_dict(parsed, schema)
            elif isinstance(parsed, list):
                result = self.sanitize_list(parsed)
            else:
                result = self.sanitize_string(str(parsed))
            
            sanitized = result.sanitized
            warnings.extend(result.warnings)
            errors.extend(result.errors)
            
        except json.JSONDecodeError as e:
            errors.append(f"Invalid JSON: {str(e)}")
            sanitized = {}
        
        return SanitizerResult(
            original=original,
            sanitized=sanitized,
            is_valid=len(errors) == 0,
            warnings=warnings,
            errors=errors
        )
    
    def sanitize_file_upload(self, filename: str, content_type: str, size: int) -> SanitizerResult:
        """Sanitize file upload metadata"""
        original = {"filename": filename, "content_type": content_type, "size": size}
        warnings = []
        errors = []
        
        # Sanitize filename
        filename_result = self.sanitize_string(filename, "filename")
        if not filename_result.is_valid:
            errors.extend([f"Filename: {e}" for e in filename_result.errors])
        
        # Validate file extension
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.mp3', '.wav', '.mp4', '.avi'}
        file_ext = filename.lower().split('.')[-1] if '.' in filename else ''
        if f'.{file_ext}' not in allowed_extensions:
            errors.append(f"File extension '.{file_ext}' not allowed")
        
        # Validate content type
        allowed_types = {
            'image/jpeg', 'image/png', 'image/gif', 'application/pdf', 
            'text/plain', 'audio/mpeg', 'audio/wav', 'video/mp4', 'video/avi'
        }
        if content_type not in allowed_types:
            errors.append(f"Content type '{content_type}' not allowed")
        
        # Validate file size (10MB limit)
        max_size = 10 * 1024 * 1024
        if size > max_size:
            errors.append(f"File size {size} exceeds maximum {max_size} bytes")
        
        sanitized = {
            "filename": filename_result.sanitized,
            "content_type": content_type,
            "size": size
        }
        
        return SanitizerResult(
            original=original,
            sanitized=sanitized,
            is_valid=len(errors) == 0,
            warnings=warnings,
            errors=errors
        )

# Global sanitizer instance
sanitizer = InputSanitizer()

def sanitize_input(value: Any, input_type: str = "auto", schema: Optional[Dict[str, str]] = None) -> SanitizerResult:
    """
    Main sanitization function for any input type
    
    Args:
        value: The input value to sanitize
        input_type: Type of input ("string", "number", "boolean", "list", "dict", "json", "file", "auto")
        schema: Optional schema for dict/json validation
    
    Returns:
        SanitizerResult with sanitized value and validation info
    """
    if input_type == "auto":
        input_type = sanitizer._detect_type(value)
    
    if input_type == "string":
        return sanitizer.sanitize_string(value)
    elif input_type == "number":
        return sanitizer.sanitize_number(value)
    elif input_type == "boolean":
        return sanitizer.sanitize_boolean(value)
    elif input_type == "list":
        return sanitizer.sanitize_list(value)
    elif input_type == "dict":
        return sanitizer.sanitize_dict(value, schema)
    elif input_type == "json":
        return sanitizer.sanitize_json(value, schema)
    elif input_type == "file":
        if isinstance(value, dict) and all(k in value for k in ["filename", "content_type", "size"]):
            return sanitizer.sanitize_file_upload(
                value["filename"], 
                value["content_type"], 
                value["size"]
            )
        else:
            return SanitizerResult(
                original=value,
                sanitized=value,
                is_valid=False,
                errors=["Invalid file upload data"]
            )
    else:
        return sanitizer.sanitize_string(str(value))

def create_sanitizer_config(**kwargs) -> SanitizerConfig:
    """Create a custom sanitizer configuration"""
    return SanitizerConfig(**kwargs)

def get_sanitizer() -> InputSanitizer:
    """Get the global sanitizer instance"""
    return sanitizer
