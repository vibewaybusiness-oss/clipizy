# comfyui.py
# ComfyUI database models
# ----------------------------------------------------------

from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, Float, JSON
from api.db import GUID
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

# ============================================================================
# COMFYUI MODELS
# ============================================================================

class ComfyUIWorkflowExecution(Base):
    """Database model for ComfyUI workflow executions"""
    __tablename__ = "comfyui_workflow_executions"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    request_id = Column(String(255), unique=True, nullable=False, index=True)
    workflow_type = Column(String(100), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending", index=True)
    
    # Input data
    inputs = Column(JSON, nullable=False)
    output_path = Column(Text)
    
    # Pod information
    pod_id = Column(String(255), index=True)
    pod_ip = Column(String(45))
    
    # ComfyUI specific
    prompt_id = Column(String(255), index=True)
    
    # Results
    result = Column(JSON)
    error = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # User and project tracking
    user_id = Column(GUID(), index=True)
    project_id = Column(GUID(), index=True)
    
    # Credits and billing
    credits_spent = Column(Integer, default=0)
    
    def __repr__(self):
        return f"<ComfyUIWorkflowExecution(id={self.id}, request_id={self.request_id}, workflow_type={self.workflow_type}, status={self.status})>"

class ComfyUIPod(Base):
    """Database model for ComfyUI pods"""
    __tablename__ = "comfyui_pods"
    
    id = Column(String(255), primary_key=True)
    workflow_name = Column(String(100), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="running", index=True)
    
    # Pod details
    ip_address = Column(String(45))
    port = Column(Integer, default=8188)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, default=datetime.utcnow)
    paused_at = Column(DateTime)
    terminated_at = Column(DateTime)
    
    # Configuration
    template_id = Column(String(255))
    network_volume_id = Column(String(255))
    
    # Resource usage
    gpu_count = Column(Integer, default=1)
    memory_gb = Column(Integer, default=8)
    vcpu_count = Column(Integer, default=4)
    disk_gb = Column(Integer, default=20)
    
    def __repr__(self):
        return f"<ComfyUIPod(id={self.id}, workflow_name={self.workflow_name}, status={self.status})>"

class ComfyUIWorkflowConfig(Base):
    """Database model for ComfyUI workflow configurations"""
    __tablename__ = "comfyui_workflow_configs"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workflow_name = Column(String(100), unique=True, nullable=False, index=True)
    
    # Configuration
    max_queue_size = Column(Integer, default=3)
    network_volume_id = Column(String(255))
    template_id = Column(String(255))
    
    # Timeouts (in seconds)
    pause_timeout = Column(Integer, default=60)
    terminate_timeout = Column(Integer, default=300)
    
    # Resource requirements
    gpu_count = Column(Integer, default=1)
    memory_gb = Column(Integer, default=8)
    vcpu_count = Column(Integer, default=4)
    disk_gb = Column(Integer, default=20)
    
    # Metadata
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<ComfyUIWorkflowConfig(workflow_name={self.workflow_name}, max_queue_size={self.max_queue_size})>"

class ComfyUIExecutionLog(Base):
    """Database model for ComfyUI execution logs"""
    __tablename__ = "comfyui_execution_logs"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    execution_id = Column(GUID(), nullable=False, index=True)
    request_id = Column(String(255), nullable=False, index=True)
    
    # Log details
    level = Column(String(20), nullable=False)  # INFO, WARNING, ERROR, DEBUG
    message = Column(Text, nullable=False)
    details = Column(JSON)
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<ComfyUIExecutionLog(execution_id={self.execution_id}, level={self.level}, message={self.message[:50]}...)>"

class ComfyUIResourceUsage(Base):
    """Database model for ComfyUI resource usage tracking"""
    __tablename__ = "comfyui_resource_usage"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    pod_id = Column(String(255), nullable=False, index=True)
    execution_id = Column(GUID(), index=True)
    
    # Resource metrics
    cpu_usage_percent = Column(Float)
    memory_usage_gb = Column(Float)
    gpu_usage_percent = Column(Float)
    gpu_memory_usage_gb = Column(Float)
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<ComfyUIResourceUsage(pod_id={self.pod_id}, cpu_usage={self.cpu_usage_percent}%)>"

# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    'ComfyUIWorkflowExecution',
    'ComfyUIPod',
    'ComfyUIWorkflowConfig',
    'ComfyUIExecutionLog',
    'ComfyUIResourceUsage'
]
