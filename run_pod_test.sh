#!/bin/bash

echo "🧪 Running Pod Recruitment Test"
echo "================================"

# Check if we're in the right directory
if [ ! -f "api/services/runpod_manager.py" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed or not in PATH"
    exit 1
fi

echo "✅ Environment check passed"
echo ""

# Run the quick test
echo "🚀 Running quick pod test..."
python3 quick_pod_test.py

echo ""
echo "🎯 Test completed. Check the output above for results."
