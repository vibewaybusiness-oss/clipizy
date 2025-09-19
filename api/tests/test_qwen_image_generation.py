"""
Unit tests for Qwen image generation functionality
"""
import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from api.models.runpod import WorkflowInput, WorkflowResult
from api.services.runpod_queue import WorkflowQueueManager
from api.services.runpod_client import get_graphql_client, get_rest_client


class TestQwenImageGeneration:
    """Test cases for Qwen image generation"""

    @pytest.fixture
    def sample_workflow_input(self):
        """Sample workflow input for testing"""
        return WorkflowInput(
            prompt="A beautiful sunset over mountains",
            width=512,
            height=512,
            steps=8,
            seed=42,
            cfg_scale=7.5
        )

    @pytest.fixture
    def mock_queue_manager(self):
        """Mock queue manager for testing"""
        manager = Mock(spec=WorkflowQueueManager)
        manager.add_request = AsyncMock(return_value="test-request-id")
        manager.get_request_status = AsyncMock(return_value={
            "status": "completed",
            "result": WorkflowResult(
                success=True,
                image_url="https://example.com/generated-image.png",
                metadata={"generation_time": 30.5, "model": "qwen-image"}
            )
        })
        return manager

    @pytest.mark.asyncio
    async def test_workflow_input_validation(self, sample_workflow_input):
        """Test that WorkflowInput validates correctly"""
        assert sample_workflow_input.prompt == "A beautiful sunset over mountains"
        assert sample_workflow_input.width == 512
        assert sample_workflow_input.height == 512
        assert sample_workflow_input.steps == 8
        assert sample_workflow_input.seed == 42
        assert sample_workflow_input.cfg_scale == 7.5

    @pytest.mark.asyncio
    async def test_workflow_input_defaults(self):
        """Test WorkflowInput with default values"""
        input_data = WorkflowInput(prompt="Test prompt")
        assert input_data.width == 512
        assert input_data.height == 512
        assert input_data.steps == 8
        assert input_data.seed is None
        assert input_data.cfg_scale == 7.5

    @pytest.mark.asyncio
    async def test_workflow_result_success(self):
        """Test successful WorkflowResult creation"""
        result = WorkflowResult(
            success=True,
            image_url="https://example.com/image.png",
            metadata={"generation_time": 25.0}
        )
        assert result.success is True
        assert result.image_url == "https://example.com/image.png"
        assert result.metadata["generation_time"] == 25.0
        assert result.error is None

    @pytest.mark.asyncio
    async def test_workflow_result_error(self):
        """Test error WorkflowResult creation"""
        result = WorkflowResult(
            success=False,
            error="Generation failed: Invalid prompt"
        )
        assert result.success is False
        assert result.error == "Generation failed: Invalid prompt"
        assert result.image_url is None
        assert result.metadata is None

    @pytest.mark.asyncio
    async def test_queue_manager_add_request(self, mock_queue_manager, sample_workflow_input):
        """Test adding a request to the queue"""
        request_id = await mock_queue_manager.add_request("qwen-image", sample_workflow_input)
        assert request_id == "test-request-id"
        mock_queue_manager.add_request.assert_called_once_with("qwen-image", sample_workflow_input)

    @pytest.mark.asyncio
    async def test_queue_manager_get_status(self, mock_queue_manager):
        """Test getting request status from queue"""
        status = await mock_queue_manager.get_request_status("test-request-id")
        assert status["status"] == "completed"
        assert isinstance(status["result"], WorkflowResult)
        assert status["result"].success is True

    @pytest.mark.asyncio
    async def test_workflow_input_validation_errors(self):
        """Test WorkflowInput validation with invalid data"""
        with pytest.raises(ValueError):
            WorkflowInput(prompt="", width=512, height=512)  # Empty prompt

        with pytest.raises(ValueError):
            WorkflowInput(prompt="Test", width=0, height=512)  # Invalid width

        with pytest.raises(ValueError):
            WorkflowInput(prompt="Test", width=512, height=0)  # Invalid height

        with pytest.raises(ValueError):
            WorkflowInput(prompt="Test", width=512, height=512, steps=0)  # Invalid steps

    @pytest.mark.asyncio
    async def test_workflow_input_edge_cases(self):
        """Test WorkflowInput with edge case values"""
        # Maximum values
        input_data = WorkflowInput(
            prompt="Test",
            width=2048,
            height=2048,
            steps=50,
            cfg_scale=20.0
        )
        assert input_data.width == 2048
        assert input_data.height == 2048
        assert input_data.steps == 50
        assert input_data.cfg_scale == 20.0

        # Minimum values
        input_data = WorkflowInput(
            prompt="Test",
            width=64,
            height=64,
            steps=1,
            cfg_scale=1.0
        )
        assert input_data.width == 64
        assert input_data.height == 64
        assert input_data.steps == 1
        assert input_data.cfg_scale == 1.0

    @pytest.mark.asyncio
    async def test_workflow_result_metadata(self):
        """Test WorkflowResult with various metadata"""
        metadata = {
            "generation_time": 30.5,
            "model": "qwen-image",
            "steps": 8,
            "seed": 42,
            "cfg_scale": 7.5,
            "width": 512,
            "height": 512
        }
        result = WorkflowResult(
            success=True,
            image_url="https://example.com/image.png",
            metadata=metadata
        )
        assert result.metadata == metadata
        assert result.metadata["generation_time"] == 30.5
        assert result.metadata["model"] == "qwen-image"

    @pytest.mark.asyncio
    async def test_workflow_input_serialization(self, sample_workflow_input):
        """Test WorkflowInput serialization to dict"""
        data = sample_workflow_input.dict()
        expected = {
            "prompt": "A beautiful sunset over mountains",
            "width": 512,
            "height": 512,
            "steps": 8,
            "seed": 42,
            "cfg_scale": 7.5
        }
        assert data == expected

    @pytest.mark.asyncio
    async def test_workflow_result_serialization(self):
        """Test WorkflowResult serialization to dict"""
        result = WorkflowResult(
            success=True,
            image_url="https://example.com/image.png",
            metadata={"generation_time": 25.0}
        )
        data = result.dict()
        expected = {
            "success": True,
            "image_url": "https://example.com/image.png",
            "metadata": {"generation_time": 25.0},
            "error": None
        }
        assert data == expected

    @pytest.mark.asyncio
    async def test_workflow_input_from_dict(self):
        """Test creating WorkflowInput from dictionary"""
        data = {
            "prompt": "Test prompt",
            "width": 1024,
            "height": 768,
            "steps": 12,
            "seed": 123,
            "cfg_scale": 8.0
        }
        input_data = WorkflowInput(**data)
        assert input_data.prompt == "Test prompt"
        assert input_data.width == 1024
        assert input_data.height == 768
        assert input_data.steps == 12
        assert input_data.seed == 123
        assert input_data.cfg_scale == 8.0

    @pytest.mark.asyncio
    async def test_workflow_result_from_dict(self):
        """Test creating WorkflowResult from dictionary"""
        data = {
            "success": True,
            "image_url": "https://example.com/image.png",
            "metadata": {"generation_time": 25.0},
            "error": None
        }
        result = WorkflowResult(**data)
        assert result.success is True
        assert result.image_url == "https://example.com/image.png"
        assert result.metadata == {"generation_time": 25.0}
        assert result.error is None

    @pytest.mark.asyncio
    async def test_workflow_input_optional_fields(self):
        """Test WorkflowInput with optional fields"""
        input_data = WorkflowInput(
            prompt="Test prompt",
            width=512,
            height=512
            # steps, seed, cfg_scale use defaults
        )
        assert input_data.prompt == "Test prompt"
        assert input_data.width == 512
        assert input_data.height == 512
        assert input_data.steps == 8  # default
        assert input_data.seed is None  # default
        assert input_data.cfg_scale == 7.5  # default

    @pytest.mark.asyncio
    async def test_workflow_result_optional_fields(self):
        """Test WorkflowResult with optional fields"""
        result = WorkflowResult(success=True)
        assert result.success is True
        assert result.image_url is None
        assert result.metadata is None
        assert result.error is None

    @pytest.mark.asyncio
    async def test_workflow_input_validation_messages(self):
        """Test WorkflowInput validation error messages"""
        with pytest.raises(ValueError, match="Prompt cannot be empty"):
            WorkflowInput(prompt="", width=512, height=512)

        with pytest.raises(ValueError, match="Width must be positive"):
            WorkflowInput(prompt="Test", width=-1, height=512)

        with pytest.raises(ValueError, match="Height must be positive"):
            WorkflowInput(prompt="Test", width=512, height=-1)

        with pytest.raises(ValueError, match="Steps must be positive"):
            WorkflowInput(prompt="Test", width=512, height=512, steps=-1)

        with pytest.raises(ValueError, match="CFG scale must be positive"):
            WorkflowInput(prompt="Test", width=512, height=512, cfg_scale=-1.0)

    @pytest.mark.asyncio
    async def test_workflow_input_boundary_values(self):
        """Test WorkflowInput with boundary values"""
        # Test minimum valid values
        input_data = WorkflowInput(
            prompt="a",  # minimum length
            width=1,     # minimum width
            height=1,    # minimum height
            steps=1,     # minimum steps
            cfg_scale=0.1  # minimum cfg_scale
        )
        assert input_data.prompt == "a"
        assert input_data.width == 1
        assert input_data.height == 1
        assert input_data.steps == 1
        assert input_data.cfg_scale == 0.1

        # Test maximum reasonable values
        input_data = WorkflowInput(
            prompt="x" * 1000,  # long prompt
            width=4096,         # large width
            height=4096,        # large height
            steps=100,          # many steps
            cfg_scale=30.0      # high cfg_scale
        )
        assert len(input_data.prompt) == 1000
        assert input_data.width == 4096
        assert input_data.height == 4096
        assert input_data.steps == 100
        assert input_data.cfg_scale == 30.0

    @pytest.mark.asyncio
    async def test_workflow_result_error_handling(self):
        """Test WorkflowResult error handling scenarios"""
        # Test with both success=True and error present (should not happen in practice)
        result = WorkflowResult(
            success=True,
            error="Some error",
            image_url="https://example.com/image.png"
        )
        assert result.success is True
        assert result.error == "Some error"  # This is allowed but unusual

        # Test with success=False and no error
        result = WorkflowResult(success=False)
        assert result.success is False
        assert result.error is None  # This is allowed

        # Test with success=False and error
        result = WorkflowResult(
            success=False,
            error="Generation failed"
        )
        assert result.success is False
        assert result.error == "Generation failed"

    @pytest.mark.asyncio
    async def test_workflow_input_type_coercion(self):
        """Test WorkflowInput type coercion"""
        # Test string to int conversion
        input_data = WorkflowInput(
            prompt="Test",
            width="512",  # string
            height="512",  # string
            steps="8",     # string
            cfg_scale="7.5"  # string
        )
        assert isinstance(input_data.width, int)
        assert isinstance(input_data.height, int)
        assert isinstance(input_data.steps, int)
        assert isinstance(input_data.cfg_scale, float)
        assert input_data.width == 512
        assert input_data.height == 512
        assert input_data.steps == 8
        assert input_data.cfg_scale == 7.5

    @pytest.mark.asyncio
    async def test_workflow_result_metadata_types(self):
        """Test WorkflowResult metadata with different types"""
        metadata = {
            "string": "test",
            "int": 42,
            "float": 3.14,
            "bool": True,
            "list": [1, 2, 3],
            "dict": {"nested": "value"}
        }
        result = WorkflowResult(
            success=True,
            image_url="https://example.com/image.png",
            metadata=metadata
        )
        assert result.metadata == metadata
        assert isinstance(result.metadata["string"], str)
        assert isinstance(result.metadata["int"], int)
        assert isinstance(result.metadata["float"], float)
        assert isinstance(result.metadata["bool"], bool)
        assert isinstance(result.metadata["list"], list)
        assert isinstance(result.metadata["dict"], dict)

    @pytest.mark.asyncio
    async def test_workflow_input_unicode_prompts(self):
        """Test WorkflowInput with Unicode prompts"""
        unicode_prompts = [
            "A beautiful sunset 🌅 over mountains",
            "Un château français avec des fleurs 🌸",
            "日本の桜の花びらが舞い散る",
            "Русский пейзаж с берёзами",
            "العربية: منظر طبيعي جميل"
        ]
        
        for prompt in unicode_prompts:
            input_data = WorkflowInput(prompt=prompt)
            assert input_data.prompt == prompt
            assert len(input_data.prompt) > 0

    @pytest.mark.asyncio
    async def test_workflow_result_unicode_urls(self):
        """Test WorkflowResult with Unicode URLs"""
        unicode_url = "https://example.com/images/画像/beautiful-sunset.png"
        result = WorkflowResult(
            success=True,
            image_url=unicode_url
        )
        assert result.image_url == unicode_url

    @pytest.mark.asyncio
    async def test_workflow_input_large_prompts(self):
        """Test WorkflowInput with very large prompts"""
        large_prompt = "A beautiful sunset over mountains " * 1000  # Very long prompt
        input_data = WorkflowInput(prompt=large_prompt)
        assert input_data.prompt == large_prompt
        assert len(input_data.prompt) > 10000

    @pytest.mark.asyncio
    async def test_workflow_result_large_metadata(self):
        """Test WorkflowResult with large metadata"""
        large_metadata = {
            "generation_time": 30.5,
            "model": "qwen-image",
            "steps": 8,
            "seed": 42,
            "cfg_scale": 7.5,
            "width": 512,
            "height": 512,
            "additional_data": "x" * 10000,  # Large string
            "numbers": list(range(1000)),    # Large list
            "nested": {
                "level1": {
                    "level2": {
                        "level3": "deep value"
                    }
                }
            }
        }
        result = WorkflowResult(
            success=True,
            image_url="https://example.com/image.png",
            metadata=large_metadata
        )
        assert result.metadata == large_metadata
        assert len(result.metadata["additional_data"]) == 10000
        assert len(result.metadata["numbers"]) == 1000
        assert result.metadata["nested"]["level1"]["level2"]["level3"] == "deep value"