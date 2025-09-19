# Vibewave Backend API Test Suite

Comprehensive test suite for the Vibewave Backend API, focusing on Qwen image generation through RunPods.

## 🏗️ Test Structure

```
api/tests/
├── __init__.py                    # Test package initialization
├── conftest.py                   # Pytest configuration and fixtures
├── test_qwen_image_generation.py # Unit tests for Qwen image generation
├── test_qwen_integration.py      # Integration tests with real RunPods
└── README.md                     # This file
```

## 🧪 Test Categories

### Unit Tests (`test_qwen_image_generation.py`)
- **Purpose**: Test individual components and functions in isolation
- **Dependencies**: Mocked RunPod services and external APIs
- **Speed**: Fast execution (seconds)
- **Coverage**: All major functions and error scenarios

### Integration Tests (`test_qwen_integration.py`)
- **Purpose**: Test the complete workflow with real RunPod services
- **Dependencies**: Real RunPod API credentials and actual pod creation
- **Speed**: Slower execution (minutes)
- **Coverage**: End-to-end workflow validation

## 🚀 Quick Start

### Prerequisites

1. **Install Dependencies**
   ```bash
   cd api
   pip install -r requirements.txt
   ```

2. **Set Environment Variables**
   ```bash
   # Required for integration tests
   export RUNPOD_API_KEY="your-runpod-api-key"
   
   # Optional
   export NODE_ENV="test"
   ```

### Running Tests

#### Using the Test Runner Script
```bash
# Run all tests
python run_tests.py

# Run unit tests only (fast, no API key needed)
python run_tests.py --unit

# Run integration tests only (requires API key)
python run_tests.py --integration

# Run with coverage report
python run_tests.py --coverage

# Run with verbose output
python run_tests.py --verbose

# Show test help
python run_tests.py --help-tests
```

#### Using Pytest Directly
```bash
# Run all tests
pytest

# Run unit tests only
pytest -m "not integration and not performance"

# Run integration tests only
pytest -m integration

# Run performance tests only
pytest -m performance

# Run with coverage
pytest --cov=api --cov-report=html

# Run specific test file
pytest tests/test_qwen_image_generation.py

# Run specific test function
pytest -k test_workflow_input_creation
```

## 📋 Test Coverage

### Unit Tests Coverage

#### Model Tests
- ✅ `WorkflowInput` creation and validation
- ✅ `WorkflowResult` success and failure scenarios
- ✅ `RunPodPod` model validation
- ✅ `RestPodConfig` configuration validation

#### Service Tests
- ✅ `RunPodGraphQLClient` initialization and methods
- ✅ `RunPodRestClient` functionality
- ✅ `WorkflowQueueManager` queue operations
- ✅ ComfyUI workflow execution (mocked)

#### Error Handling Tests
- ✅ Invalid input validation
- ✅ Network error handling
- ✅ Pod creation failures
- ✅ Workflow execution timeouts

#### Performance Tests
- ✅ Concurrent request handling
- ✅ Large input processing
- ✅ Memory usage with multiple pods

### Integration Tests Coverage

#### Real RunPod Integration
- ✅ Account information retrieval
- ✅ GPU types listing
- ✅ Pod creation and management
- ✅ Pod lifecycle operations (start/stop/terminate)

#### Image Generation Workflow
- ✅ Single image generation
- ✅ Multiple image generation
- ✅ Different image dimensions
- ✅ Error handling scenarios

#### Performance Benchmarks
- ✅ Generation speed measurement
- ✅ Concurrent generation performance
- ✅ Resource usage monitoring

## 🔧 Test Configuration

### Pytest Configuration (`pytest.ini`)
- **Test Discovery**: Automatically finds test files
- **Markers**: Unit, integration, performance, slow
- **Async Support**: Automatic asyncio mode
- **Warnings**: Filtered for cleaner output
- **Output**: Colored, verbose, with durations

### Fixtures (`conftest.py`)
- **Mock Data**: Predefined test data for all models
- **Mock Services**: Mocked RunPod clients and queue manager
- **Test Utilities**: Helper functions for test data creation
- **Environment Setup**: Automatic test environment configuration

## 🏷️ Test Markers

### Available Markers
- `@pytest.mark.unit` - Unit tests (fast, mocked)
- `@pytest.mark.integration` - Integration tests (require API key)
- `@pytest.mark.performance` - Performance tests (may take longer)
- `@pytest.mark.slow` - Slow running tests

### Using Markers
```bash
# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run only performance tests
pytest -m performance

# Skip slow tests
pytest -m "not slow"

# Run unit and performance tests
pytest -m "unit or performance"
```

## 📊 Expected Results

### Unit Tests
- **Execution Time**: < 30 seconds
- **Coverage**: > 80%
- **Success Rate**: 100% (with proper mocking)

### Integration Tests
- **Execution Time**: 10-30 minutes (depending on pod creation time)
- **Success Rate**: 100% (with valid API credentials)
- **Real Pods**: Creates actual RunPod instances
- **Generated Images**: Produces real image files

## 🛠️ Test Utilities

### Mock Data Generators
```python
# Create mock workflow input
input_data = test_utils.create_mock_workflow_input(
    prompt="Custom prompt",
    width=1024,
    height=1024
)

# Create mock workflow result
result = test_utils.create_mock_workflow_result(
    success=True,
    files=["image1.png", "image2.png"]
)

# Create mock pod data
pod_data = test_utils.create_mock_pod_data(
    id="custom-pod-id",
    status="running"
)
```

### Fixtures Available
- `mock_workflow_input` - Predefined WorkflowInput
- `mock_workflow_result` - Predefined WorkflowResult
- `mock_pod_data` - Predefined pod data dictionary
- `mock_runpod_pod` - Predefined RunPodPod model
- `mock_pod_config` - Predefined RestPodConfig
- `mock_graphql_client` - Mocked GraphQL client
- `mock_rest_client` - Mocked REST client
- `mock_httpx_client` - Mocked HTTP client for ComfyUI
- `mock_queue_manager` - Mocked queue manager
- `test_utils` - Test utility functions

## 🐛 Debugging Tests

### Verbose Output
```bash
# Run with detailed output
python run_tests.py --verbose

# Or with pytest
pytest -vv
```

### Specific Test Debugging
```bash
# Run specific test with verbose output
pytest -vv -k test_workflow_input_creation

# Run with print statements visible
pytest -s -k test_workflow_input_creation

# Run with debugger
pytest --pdb -k test_workflow_input_creation
```

### Test Discovery
```bash
# List all available tests
pytest --collect-only

# List tests with markers
pytest --collect-only -m integration

# Show test structure
pytest --collect-only -q
```

## 🔍 Troubleshooting

### Common Issues

1. **Import Errors**
   ```bash
   # Make sure you're in the api directory
   cd api
   
   # Install dependencies
   pip install -r requirements.txt
   ```

2. **Integration Test Failures**
   ```bash
   # Check API key is set
   echo $RUNPOD_API_KEY
   
   # Set API key if not set
   export RUNPOD_API_KEY="your-api-key"
   ```

3. **Async Test Issues**
   ```bash
   # Make sure pytest-asyncio is installed
   pip install pytest-asyncio
   
   # Check pytest.ini has asyncio_mode = auto
   ```

4. **Mock Issues**
   ```bash
   # Make sure pytest-mock is installed
   pip install pytest-mock
   
   # Check that mocks are properly configured in conftest.py
   ```

### Environment Issues

1. **Missing Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Python Path Issues**
   ```bash
   # Make sure you're running from the api directory
   pwd  # Should show .../vibewave/api
   ```

3. **API Key Issues**
   ```bash
   # Check if API key is set
   python -c "import os; print(os.getenv('RUNPOD_API_KEY'))"
   ```

## 📈 Performance Monitoring

### Test Execution Times
- **Unit Tests**: 10-30 seconds
- **Integration Tests**: 10-30 minutes
- **Performance Tests**: 5-15 minutes

### Resource Usage
- **Unit Tests**: Low CPU/memory usage
- **Integration Tests**: High resource usage (real GPU pods)
- **Performance Tests**: Variable based on test scenarios

### Benchmarking
```bash
# Run performance tests with timing
pytest -m performance --durations=0

# Run with detailed timing
pytest -m performance -vv --durations=10
```

## 🚀 Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.10
      - name: Install dependencies
        run: |
          cd api
          pip install -r requirements.txt
      - name: Run unit tests
        run: |
          cd api
          python run_tests.py --unit --coverage
      - name: Run integration tests
        if: github.event_name == 'push'
        env:
          RUNPOD_API_KEY: ${{ secrets.RUNPOD_API_KEY }}
        run: |
          cd api
          python run_tests.py --integration
```

## 📝 Contributing

### Adding New Tests

1. **Unit Tests**: Add to `test_qwen_image_generation.py`
2. **Integration Tests**: Add to `test_qwen_integration.py`
3. **New Test Files**: Follow naming convention `test_*.py`

### Test Guidelines

1. **Use Descriptive Names**: `test_workflow_input_creation_with_valid_data`
2. **One Test Per Scenario**: Each test should test one specific behavior
3. **Use Fixtures**: Leverage existing fixtures for common test data
4. **Mock External Dependencies**: Unit tests should not make real API calls
5. **Add Appropriate Markers**: Mark tests with unit/integration/performance

### Test Data

1. **Use Mock Data**: Prefer mock data over real data for unit tests
2. **Real Data for Integration**: Use real data for integration tests
3. **Clean Up**: Ensure tests clean up after themselves
4. **Isolated Tests**: Tests should not depend on each other

## 📚 Additional Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Pytest-Asyncio Documentation](https://pytest-asyncio.readthedocs.io/)
- [Pytest-Cov Documentation](https://pytest-cov.readthedocs.io/)
- [RunPod API Documentation](https://docs.runpod.io/)
- [FastAPI Testing Documentation](https://fastapi.tiangolo.com/tutorial/testing/)

## 🎯 Test Goals

### Primary Goals
- ✅ Ensure Qwen image generation works correctly
- ✅ Validate RunPod integration functionality
- ✅ Catch regressions early
- ✅ Provide confidence in code changes

### Secondary Goals
- ✅ Document expected behavior
- ✅ Provide examples of usage
- ✅ Monitor performance characteristics
- ✅ Ensure error handling works correctly

The test suite is designed to be comprehensive, fast, and reliable, providing confidence in the Qwen image generation functionality through RunPods.
