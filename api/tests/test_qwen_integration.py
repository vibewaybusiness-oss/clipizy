"""
Integration tests for Qwen image generation with RunPod
"""
import pytest
import asyncio
from unittest.mock import patch, Mock
from api.models.runpod import WorkflowInput, WorkflowResult
from api.services.runpod_queue import get_queue_manager
from api.services.runpod_client import get_graphql_client, get_rest_client


class TestQwenImageIntegration:
    """Integration tests for Qwen image generation"""

    @pytest.fixture
    def sample_workflow_input(self):
        """Sample workflow input for testing"""
        return WorkflowInput(
            prompt="A beautiful sunset over mountains with a lake reflection",
            width=512,
            height=512,
            steps=8,
            seed=42,
            cfg_scale=7.5
        )

    @pytest.mark.asyncio
    async def test_queue_manager_initialization(self):
        """Test that queue manager initializes correctly"""
        queue_manager = get_queue_manager()
        assert queue_manager is not None
        assert hasattr(queue_manager, 'add_request')
        assert hasattr(queue_manager, 'get_request_status')
        assert hasattr(queue_manager, 'process_requests')

    @pytest.mark.asyncio
    async def test_workflow_input_creation(self, sample_workflow_input):
        """Test creating workflow input with various parameters"""
        assert sample_workflow_input.prompt == "A beautiful sunset over mountains with a lake reflection"
        assert sample_workflow_input.width == 512
        assert sample_workflow_input.height == 512
        assert sample_workflow_input.steps == 8
        assert sample_workflow_input.seed == 42
        assert sample_workflow_input.cfg_scale == 7.5

    @pytest.mark.asyncio
    async def test_workflow_input_serialization(self, sample_workflow_input):
        """Test workflow input serialization"""
        data = sample_workflow_input.dict()
        expected = {
            "prompt": "A beautiful sunset over mountains with a lake reflection",
            "width": 512,
            "height": 512,
            "steps": 8,
            "seed": 42,
            "cfg_scale": 7.5
        }
        assert data == expected

    @pytest.mark.asyncio
    async def test_workflow_result_creation(self):
        """Test creating workflow result"""
        result = WorkflowResult(
            success=True,
            image_url="https://example.com/generated-image.png",
            metadata={
                "generation_time": 30.5,
                "model": "qwen-image",
                "steps": 8,
                "seed": 42
            }
        )
        assert result.success is True
        assert result.image_url == "https://example.com/generated-image.png"
        assert result.metadata["generation_time"] == 30.5
        assert result.metadata["model"] == "qwen-image"
        assert result.error is None

    @pytest.mark.asyncio
    async def test_workflow_result_error_creation(self):
        """Test creating workflow result with error"""
        result = WorkflowResult(
            success=False,
            error="Generation failed: Invalid prompt"
        )
        assert result.success is False
        assert result.error == "Generation failed: Invalid prompt"
        assert result.image_url is None
        assert result.metadata is None

    @pytest.mark.asyncio
    async def test_runpod_client_initialization(self):
        """Test RunPod client initialization"""
        graphql_client = get_graphql_client()
        rest_client = get_rest_client()
        
        assert graphql_client is not None
        assert rest_client is not None
        assert hasattr(graphql_client, 'execute_query')
        assert hasattr(rest_client, 'make_request')

    @pytest.mark.asyncio
    async def test_workflow_input_validation(self):
        """Test workflow input validation"""
        # Valid input
        valid_input = WorkflowInput(
            prompt="A beautiful sunset",
            width=512,
            height=512,
            steps=8,
            seed=42,
            cfg_scale=7.5
        )
        assert valid_input.prompt == "A beautiful sunset"
        assert valid_input.width == 512
        assert valid_input.height == 512
        assert valid_input.steps == 8
        assert valid_input.seed == 42
        assert valid_input.cfg_scale == 7.5

        # Test with defaults
        default_input = WorkflowInput(prompt="Test prompt")
        assert default_input.width == 512
        assert default_input.height == 512
        assert default_input.steps == 8
        assert default_input.seed is None
        assert default_input.cfg_scale == 7.5

    @pytest.mark.asyncio
    async def test_workflow_input_validation_errors(self):
        """Test workflow input validation errors"""
        with pytest.raises(ValueError):
            WorkflowInput(prompt="", width=512, height=512)

        with pytest.raises(ValueError):
            WorkflowInput(prompt="Test", width=0, height=512)

        with pytest.raises(ValueError):
            WorkflowInput(prompt="Test", width=512, height=0)

        with pytest.raises(ValueError):
            WorkflowInput(prompt="Test", width=512, height=512, steps=0)

        with pytest.raises(ValueError):
            WorkflowInput(prompt="Test", width=512, height=512, cfg_scale=0)

    @pytest.mark.asyncio
    async def test_workflow_input_unicode_support(self):
        """Test workflow input with Unicode characters"""
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
    async def test_workflow_result_unicode_support(self):
        """Test workflow result with Unicode URLs"""
        unicode_url = "https://example.com/images/画像/beautiful-sunset.png"
        result = WorkflowResult(
            success=True,
            image_url=unicode_url
        )
        assert result.image_url == unicode_url

    @pytest.mark.asyncio
    async def test_workflow_input_large_data(self):
        """Test workflow input with large data"""
        large_prompt = "A beautiful sunset over mountains " * 1000
        input_data = WorkflowInput(prompt=large_prompt)
        assert input_data.prompt == large_prompt
        assert len(input_data.prompt) > 10000

    @pytest.mark.asyncio
    async def test_workflow_result_large_metadata(self):
        """Test workflow result with large metadata"""
        large_metadata = {
            "generation_time": 30.5,
            "model": "qwen-image",
            "steps": 8,
            "seed": 42,
            "cfg_scale": 7.5,
            "width": 512,
            "height": 512,
            "additional_data": "x" * 10000,
            "numbers": list(range(1000)),
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

    @pytest.mark.asyncio
    async def test_workflow_input_type_coercion(self):
        """Test workflow input type coercion"""
        input_data = WorkflowInput(
            prompt="Test",
            width="512",      # string
            height="512",     # string
            steps="8",        # string
            cfg_scale="7.5"   # string
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
        """Test workflow result metadata with different types"""
        metadata = {
            "string": "test",
            "int": 42,
            "float": 3.14,
            "bool": True,
            "list": [1, 2, 3],
            "dict": {"nested": "value"},
            "none": None
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
        assert result.metadata["none"] is None

    @pytest.mark.asyncio
    async def test_workflow_input_validation_messages(self):
        """Test workflow input validation error messages"""
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
    async def test_workflow_result_error_handling(self):
        """Test workflow result error handling"""
        # Test with both success=True and error present (unusual but allowed)
        result = WorkflowResult(
            success=True,
            error="Some warning",
            image_url="https://example.com/image.png"
        )
        assert result.success is True
        assert result.error == "Some warning"
        assert result.image_url == "https://example.com/image.png"

        # Test with success=False and no error
        result = WorkflowResult(success=False)
        assert result.success is False
        assert result.error is None

        # Test with success=False and error
        result = WorkflowResult(
            success=False,
            error="Generation failed"
        )
        assert result.success is False
        assert result.error == "Generation failed"

    @pytest.mark.asyncio
    async def test_workflow_input_edge_cases(self):
        """Test workflow input edge cases"""
        # Maximum reasonable values
        max_input = WorkflowInput(
            prompt="x" * 1000,
            width=4096,
            height=4096,
            steps=100,
            cfg_scale=30.0
        )
        assert len(max_input.prompt) == 1000
        assert max_input.width == 4096
        assert max_input.height == 4096
        assert max_input.steps == 100
        assert max_input.cfg_scale == 30.0

        # Minimum values
        min_input = WorkflowInput(
            prompt="a",
            width=1,
            height=1,
            steps=1,
            cfg_scale=0.1
        )
        assert min_input.prompt == "a"
        assert min_input.width == 1
        assert min_input.height == 1
        assert min_input.steps == 1
        assert min_input.cfg_scale == 0.1

    @pytest.mark.asyncio
    async def test_workflow_result_edge_cases(self):
        """Test workflow result edge cases"""
        # Success with minimal data
        minimal_result = WorkflowResult(success=True)
        assert minimal_result.success is True
        assert minimal_result.image_url is None
        assert minimal_result.metadata is None
        assert minimal_result.error is None

        # Error with minimal data
        error_result = WorkflowResult(success=False, error="Test error")
        assert error_result.success is False
        assert error_result.error == "Test error"
        assert error_result.image_url is None
        assert error_result.metadata is None

        # Success with all data
        full_result = WorkflowResult(
            success=True,
            image_url="https://example.com/image.png",
            metadata={
                "generation_time": 30.5,
                "model": "qwen-image",
                "steps": 8,
                "seed": 42,
                "cfg_scale": 7.5,
                "width": 512,
                "height": 512
            }
        )
        assert full_result.success is True
        assert full_result.image_url == "https://example.com/image.png"
        assert full_result.metadata["generation_time"] == 30.5
        assert full_result.metadata["model"] == "qwen-image"
        assert full_result.error is None