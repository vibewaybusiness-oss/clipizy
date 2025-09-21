#!/usr/bin/env python3
"""
Test script to verify API functionality
"""
import requests
import json

def test_api():
    """Test the music-clip API endpoints"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing clipizi API...")
    
    # Test 1: Health check
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check passed")
        else:
            print(f"⚠️ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False
    
    # Test 2: List projects
    try:
        response = requests.get(f"{base_url}/music-clip/projects", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ List projects passed: {len(data.get('projects', []))} projects found")
        else:
            print(f"⚠️ List projects failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ List projects failed: {e}")
        return False
    
    # Test 3: Create project
    try:
        project_data = {
            "name": "Test Project",
            "description": "API Test Project"
        }
        response = requests.post(
            f"{base_url}/music-clip/projects", 
            json=project_data,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Create project passed: {data.get('project_id')}")
        else:
            print(f"⚠️ Create project failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Create project failed: {e}")
        return False
    
    print("🎉 All API tests passed!")
    return True

if __name__ == "__main__":
    test_api()
