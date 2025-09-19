"""
Pytest configuration and fixtures for Vibewave Backend API tests
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any, List
import os
import sys

# Add the api directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.models.runpod import (
    WorkflowInput, WorkflowResult, ComfyUIRequest, QueueStatus,
    RunPodPod, RunPodApiResponse, RestPodConfig
)
from api.services.runpod_client import RunPodGraphQLClient, RunPodRestClient
from api.services.runpod_queue import WorkflowQueueManager


@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_workflow_input():
    """Create a mock WorkflowInput for testing"""
    return WorkflowInput(
        prompt="A beautiful landscape with mountains and a lake",
        negative_prompt="blurry, low quality, distorted",
        width=1024,
        height=1024,
        seed=12345,
        steps=4
    )


@pytest.fixture
def mock_workflow_result():
    """Create a mock WorkflowResult for testing"""
    return WorkflowResult(
        success=True,
        files=["test_image_001.png", "test_image_002.png"],
        request_id="test-request-123",
        pod_id="test-pod-456",
        pod_ip="192.168.1.100"
    )


@pytest.fixture
def mock_pod_data():
    """Create mock pod data for testing"""
    return {
        "id": "test-pod-123",
        "name": "qwen-image-test-pod",
        "status": "running",
        "ip": "192.168.1.100",
        "public_ip": "203.0.113.100",
        "workflow_name": "qwen-image",
        "created_at": "2024-01-01T00:00:00Z",
        "gpu_count": 1,
        "memory_in_gb": 24.0
    }


@pytest.fixture
def mock_runpod_pod():
    """Create a mock RunPodPod for testing"""
    return RunPodPod(
        id="test-pod-123",
        name="qwen-image-test-pod",
        image_name="runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04",
        uptime_seconds=3600,
        cost_per_hr=0.50,
        created_at="2024-01-01T00:00:00Z",
        status="running",
        desired_status="running",
        ip="192.168.1.100",
        public_ip="203.0.113.100",
        gpu_count=1,
        memory_in_gb=24.0,
        vcpu_count=4
    )


@pytest.fixture
def mock_pod_config():
    """Create a mock RestPodConfig for testing"""
    return RestPodConfig(
        gpu_type_ids=["NVIDIA GeForce RTX 4090"],
        image_name="runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04",
        name="qwen-image-test-pod",
        container_disk_in_gb=50,
        gpu_count=1,
        support_public_ip=True,
        min_memory_in_gb=24.0,
        min_vcpu_count=4
    )


@pytest.fixture
def mock_graphql_client():
    """Create a mock RunPodGraphQLClient"""
    client = AsyncMock(spec=RunPodGraphQLClient)
    
    # Mock successful responses
    client.create_pod.return_value = RunPodApiResponse(
        success=True,
        data=RunPodPod(
            id="test-pod-123",
            name="qwen-image-test-pod",
            image_name="runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04",
            status="running",
            ip="192.168.1.100"
        )
    )
    
    client.get_pod_by_id.return_value = RunPodApiResponse(
        success=True,
        data=RunPodPod(
            id="test-pod-123",
            name="qwen-image-test-pod",
            status="running",
            ip="192.168.1.100"
        )
    )
    
    client.stop_pod.return_value = RunPodApiResponse(
        success=True,
        data={"success": True}
    )
    
    client.start_pod.return_value = RunPodApiResponse(
        success=True,
        data={"success": True}
    )
    
    return client


@pytest.fixture
def mock_rest_client():
    """Create a mock RunPodRestClient"""
    client = AsyncMock(spec=RunPodRestClient)
    
    client.get_pods.return_value = RunPodApiResponse(
        success=True,
        data=[]
    )
    
    client.get_pod_by_id.return_value = RunPodApiResponse(
        success=True,
        data=RunPodPod(
            id="test-pod-123",
            name="qwen-image-test-pod",
            status="running",
            ip="192.168.1.100"
        )
    )
    
    return client


@pytest.fixture
def mock_httpx_client():
    """Create a mock httpx client for ComfyUI API calls"""
    client = AsyncMock()
    
    # Mock ComfyUI queue response
    queue_response = MagicMock()
    queue_response.status_code = 200
    queue_response.json.return_value = {"prompt_id": "test-prompt-123"}
    queue_response.raise_for_status.return_value = None
    
    # Mock ComfyUI history response
    history_response = MagicMock()
    history_response.status_code = 200
    history_response.json.return_value = {
        "test-prompt-123": {
            "status": {
                "status": "success",
                "outputs": {
                    "60": {
                        "images": [
                            {"filename": "test_image_001.png", "subfolder": "output"},
                            {"filename": "test_image_002.png", "subfolder": "output"}
                        ]
                    }
                }
            }
        }
    }
    history_response.raise_for_status.return_value = None
    
    # Configure client responses
    client.post.return_value = queue_response
    client.get.return_value = history_response
    
    return client


@pytest.fixture
def mock_queue_manager():
    """Create a mock WorkflowQueueManager"""
    manager = AsyncMock(spec=WorkflowQueueManager)
    
    manager.active_pods = {
        "test-pod-123": {
            "id": "test-pod-123",
            "name": "qwen-image-test-pod",
            "status": "running",
            "ip": "192.168.1.100",
            "workflow_name": "qwen-image"
        }
    }
    
    manager.pending_requests = []
    manager.completed_requests = []
    manager.failed_requests = []
    
    manager.add_request.return_value = "test-request-123"
    manager.get_request_status.return_value = ComfyUIRequest(
        id="test-request-123",
        workflow_name="qwen-image",
        inputs=WorkflowInput(prompt="test prompt"),
        status="completed"
    )
    
    manager.get_queue_status.return_value = QueueStatus(
        active_pods=[{
            "id": "test-pod-123",
            "name": "qwen-image-test-pod",
            "status": "running",
            "ip": "192.168.1.100"
        }],
        pending_requests=[],
        completed_requests=[],
        failed_requests=[]
    )
    
    return manager


@pytest.fixture
def mock_workflow_file():
    """Create a mock Qwen workflow file content"""
    return {
        "3": {
            "inputs": {
                "seed": 12345,
                "steps": 4,
                "cfg": 1,
                "sampler_name": "res_multistep",
                "scheduler": "simple",
                "denoise": 1,
                "model": ["66", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["58", 0]
            },
            "class_type": "KSampler"
        },
        "6": {
            "inputs": {
                "text": "A beautiful landscape",
                "clip": ["38", 0]
            },
            "class_type": "CLIPTextEncode"
        },
        "7": {
            "inputs": {
                "text": "blurry, low quality",
                "clip": ["38", 0]
            },
            "class_type": "CLIPTextEncode"
        },
        "58": {
            "inputs": {
                "width": 1024,
                "height": 1024,
                "batch_size": 1
            },
            "class_type": "EmptySD3LatentImage"
        },
        "60": {
            "inputs": {
                "filename_prefix": "qwen_test",
                "images": ["8", 0]
            },
            "class_type": "SaveImage"
        }
    }


@pytest.fixture
def mock_comfyui_response():
    """Create mock ComfyUI API responses"""
    return {
        "queue_response": {
            "prompt_id": "test-prompt-123"
        },
        "history_response": {
            "test-prompt-123": {
                "status": {
                    "status": "success",
                    "outputs": {
                        "60": {
                            "images": [
                                {
                                    "filename": "qwen_test_001.png",
                                    "subfolder": "output"
                                }
                            ]
                        }
                    }
                }
            }
        }
    }


@pytest.fixture(autouse=True)
def setup_test_environment():
    """Set up test environment variables"""
    os.environ["RUNPOD_API_KEY"] = "test-api-key"
    os.environ["NODE_ENV"] = "test"
    yield
    # Cleanup after test
    if "RUNPOD_API_KEY" in os.environ:
        del os.environ["RUNPOD_API_KEY"]
    if "NODE_ENV" in os.environ:
        del os.environ["NODE_ENV"]


# Test utilities
class TestUtils:
    """Utility functions for tests"""
    
    @staticmethod
    def create_mock_workflow_input(**kwargs) -> WorkflowInput:
        """Create a WorkflowInput with default values and optional overrides"""
        defaults = {
            "prompt": "A beautiful landscape",
            "negative_prompt": "blurry, low quality",
            "width": 1024,
            "height": 1024,
            "seed": 12345,
            "steps": 4
        }
        defaults.update(kwargs)
        return WorkflowInput(**defaults)
    
    @staticmethod
    def create_mock_workflow_result(**kwargs) -> WorkflowResult:
        """Create a WorkflowResult with default values and optional overrides"""
        defaults = {
            "success": True,
            "files": ["test_image.png"],
            "request_id": "test-request-123",
            "pod_id": "test-pod-456",
            "pod_ip": "192.168.1.100"
        }
        defaults.update(kwargs)
        return WorkflowResult(**defaults)
    
    @staticmethod
    def create_mock_pod_data(**kwargs) -> Dict[str, Any]:
        """Create mock pod data with default values and optional overrides"""
        defaults = {
            "id": "test-pod-123",
            "name": "qwen-image-test-pod",
            "status": "running",
            "ip": "192.168.1.100",
            "workflow_name": "qwen-image"
        }
        defaults.update(kwargs)
        return defaults


@pytest.fixture
def test_utils():
    """Provide TestUtils class as a fixture"""
    return TestUtils
