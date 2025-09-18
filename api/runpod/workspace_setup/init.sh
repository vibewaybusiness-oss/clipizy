set -e

echo "🚀 Starting ComfyUI setup and launch..."

# Check if ComfyUI is already installed
if [ ! -d "/workspace/ComfyUI" ]; then
    echo "📦 Installing ComfyUI..."
    
    # Install ComfyUI
    cd /workspace
    git clone https://github.com/comfyanonymous/ComfyUI.git
    cd ComfyUI
    
    # Create virtual environment
    python3.10 -m venv .comfyui
    source .comfyui/bin/activate


    # Install requirements
    python -m ensurepip --upgrade
    python -m pip install --upgrade setuptools
    pip install -r requirements.txt
    
    # Install additional packages
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126
    
    pip install onnxruntime-gpu wheel setuptools packaging ninja "accelerate >= 1.1.1" "diffusers >= 0.31.0" "transformers >= 4.39.3" Triton

    git clone https://github.com/thu-ml/SageAttention
    cd SageAttention
    pip install -e .
    
    cd ../
    cd custom_nodes

    git clone https://github.com/welltop-cn/ComfyUI-TeaCache.git
    cd ComfyUI-TeaCache
    pip install -r requirements.txt
    cd ../

    echo "✅ ComfyUI installed successfully"
else
    echo "✅ ComfyUI already installed, activating environment..."
    cd /workspace/ComfyUI
    source .comfyui/bin/activate
fi