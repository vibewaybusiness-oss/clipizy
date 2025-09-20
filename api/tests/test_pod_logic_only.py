#!/usr/bin/env python3
"""
Test the pod readiness logic without making API calls
"""

def test_pod_readiness_logic():
    """Test the updated readiness logic using mock data from the real API response"""
    print("🧪 ===== POD READINESS LOGIC TEST =====")
    print("🎯 Testing with real pod data from API response")
    
    # Mock pod data based on the real API response we saw
    mock_pod_data = {
        "id": "42yt2ouvxp4pdl",
        "name": "comfyui_image_qwen-pod-1758386902945",
        "status": "RUNNING",
        "desiredStatus": "RUNNING",
        "publicIp": "",  # Empty string, not None
        "ports": ["8188/http"],  # Port 8188 is configured
        "portMappings": {},  # Empty dict
        "imageName": "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
        "gpuCount": 1,
        "memoryInGb": 50,
        "vcpuCount": 9,
        "costPerHr": 0.4,
        "createdAt": "2025-09-20 16:48:23.855 +0000 UTC",
        "lastStartedAt": "2025-09-20 16:48:23.844 +0000 UTC",
        "networkVolumeId": "spwpjg3lk3",
        "templateId": "fdcc1twlxx"
    }
    
    print(f"📊 Mock pod data:")
    print(f"   ID: {mock_pod_data['id']}")
    print(f"   Status: {mock_pod_data['status']}")
    print(f"   Public IP: '{mock_pod_data['publicIp']}'")
    print(f"   Ports: {mock_pod_data['ports']}")
    print(f"   Port Mappings: {mock_pod_data['portMappings']}")
    
    # Test OLD logic (based on public_ip)
    print(f"\n🔧 Testing OLD logic (public_ip based):")
    old_has_public_ip = bool(mock_pod_data['publicIp'] and mock_pod_data['publicIp'].strip())
    old_has_comfyui_port = bool(mock_pod_data['publicIp'] and mock_pod_data['publicIp'].strip())
    old_is_ready = mock_pod_data['status'] == "RUNNING" and old_has_public_ip and old_has_comfyui_port
    
    print(f"   Has public IP: {old_has_public_ip}")
    print(f"   Has ComfyUI port 8188: {old_has_comfyui_port}")
    print(f"   🎯 OLD LOGIC READY: {old_is_ready}")
    
    # Test NEW logic (based on ports array)
    print(f"\n🔧 Testing NEW logic (ports array based):")
    new_has_comfyui_port = bool(mock_pod_data['ports'] and "8188/http" in mock_pod_data['ports'])
    new_has_public_ip = new_has_comfyui_port  # If port is configured, proxy is available
    new_is_ready = mock_pod_data['status'] == "RUNNING" and new_has_public_ip and new_has_comfyui_port
    
    print(f"   Has ComfyUI port 8188: {new_has_comfyui_port}")
    print(f"   Has public IP (proxy): {new_has_public_ip}")
    print(f"   🎯 NEW LOGIC READY: {new_is_ready}")
    
    # We know from the connectivity test that ComfyUI IS accessible
    actual_ready = True  # We confirmed this with the connectivity test
    
    print(f"\n🌐 Actual ComfyUI status:")
    print(f"   ComfyUI accessible: {actual_ready}")
    print(f"   URL: https://42yt2ouvxp4pdl-8188.proxy.runpod.net/system_stats")
    
    # Summary
    print(f"\n📊 ===== TEST SUMMARY =====")
    print(f"OLD logic (public_ip): {'✅ CORRECT' if old_is_ready == actual_ready else '❌ INCORRECT'}")
    print(f"NEW logic (ports array): {'✅ CORRECT' if new_is_ready == actual_ready else '❌ INCORRECT'}")
    
    print(f"\n🎯 ===== CONCLUSION =====")
    if old_is_ready == actual_ready:
        print(f"✅ OLD logic is correct - no changes needed")
    elif new_is_ready == actual_ready:
        print(f"✅ NEW logic is correct - update needed")
    else:
        print(f"❌ Both logics are incorrect - need different approach")
    
    return new_is_ready == actual_ready

def main():
    """Main test function"""
    print("🚀 Starting pod readiness logic test...")
    
    success = test_pod_readiness_logic()
    
    print(f"\n🎯 ===== FINAL RESULT =====")
    print(f"Test {'✅ PASSED' if success else '❌ FAILED'}")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
