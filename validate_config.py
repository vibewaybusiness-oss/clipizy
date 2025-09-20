#!/usr/bin/env python3
"""
Validate Pod Configuration
Tests the configuration without actually creating a pod
"""

import sys
from pathlib import Path

# Add the api directory to the path
sys.path.append(str(Path(__file__).parent / "api"))

from api.schemas.runpod import RestPodConfig

def validate_pod_config():
    """Validate that the pod configuration is correct"""
    print("🧪 ===== CONFIGURATION VALIDATION =====")
    
    try:
        # Create pod configuration using the updated approach
        pod_config = RestPodConfig(
            gpu_type_ids=["NVIDIA A40"],
            image_name="runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
            name="test-pod-validation",
            container_disk_in_gb=20,
            gpu_count=1,
            support_public_ip=True,
            ports=["22/tcp", "8080/http", "8188/http", "8888/http", "11434/tcp"],
            network_volume_id="spwpjg3lk3",
            template_id="fdcc1twlxx",
            env={
                "JUPYTER_PASSWORD": "secure-password-123",
                "OLLAMA_HOST": "0.0.0.0:11434",
                "RUNPOD_POD_ID": "will-be-set-by-runpod"
            },
            # Additional fields from old working approach
            cloud_type="SECURE",
            compute_type="GPU",
            vcpu_count=4,
            data_center_priority="availability",
            gpu_type_priority="availability",
            cpu_flavor_priority="availability",
            min_ram_per_gpu=8,
            min_vcpu_per_gpu=2,
            interruptible=False,
            locked=False,
            global_networking=True,
            # Volume configuration
            volume_in_gb=0,  # Using network volume
            volume_mount_path="/workspace"
        )
        
        print("✅ Pod configuration created successfully")
        
        # Validate required fields
        print("\n🔍 Validating configuration fields...")
        
        required_fields = [
            "gpu_type_ids", "image_name", "name", "container_disk_in_gb",
            "gpu_count", "support_public_ip", "ports", "network_volume_id",
            "template_id", "cloud_type", "compute_type", "vcpu_count",
            "data_center_priority", "gpu_type_priority", "cpu_flavor_priority",
            "min_ram_per_gpu", "min_vcpu_per_gpu", "interruptible", "locked",
            "global_networking", "volume_in_gb", "volume_mount_path"
        ]
        
        missing_fields = []
        for field in required_fields:
            if not hasattr(pod_config, field) or getattr(pod_config, field) is None:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"❌ Missing required fields: {missing_fields}")
            return False
        else:
            print("✅ All required fields are present")
        
        # Validate port configuration
        print("\n🔍 Validating port configuration...")
        ports = pod_config.ports
        required_ports = ["22/tcp", "8080/http", "8188/http", "8888/http", "11434/tcp"]
        
        for port in required_ports:
            if port in ports:
                print(f"   ✅ Port {port} is configured")
            else:
                print(f"   ❌ Port {port} is missing")
                return False
        
        # Test serialization
        print("\n🔍 Testing configuration serialization...")
        try:
            config_dict = pod_config.model_dump(by_alias=True)
            print("✅ Configuration serializes successfully")
            print(f"   Serialized fields: {len(config_dict)}")
        except Exception as e:
            print(f"❌ Configuration serialization failed: {e}")
            return False
        
        # Display final configuration
        print("\n📝 Final Configuration:")
        print("=" * 50)
        for key, value in config_dict.items():
            if key == "env" and isinstance(value, dict):
                print(f"   {key}: {len(value)} environment variables")
            elif key == "ports" and isinstance(value, list):
                print(f"   {key}: {len(value)} ports configured")
            else:
                print(f"   {key}: {value}")
        
        print("\n🎉 ===== VALIDATION SUCCESSFUL =====")
        print("✅ Pod configuration is valid and ready for use")
        print("✅ All required ports are properly configured")
        print("✅ All required fields are present")
        print("✅ Configuration serializes correctly")
        
        return True
        
    except Exception as e:
        print(f"❌ Validation failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main validation function"""
    print("🚀 Starting Configuration Validation...")
    print("This test will validate the pod configuration without creating a pod")
    print()
    
    success = validate_pod_config()
    
    if success:
        print("\n🎉 Configuration validation passed!")
        print("The updated pod recruitment system should work correctly.")
    else:
        print("\n❌ Configuration validation failed!")
        print("Please check the errors above and fix the configuration.")
        sys.exit(1)

if __name__ == "__main__":
    main()
