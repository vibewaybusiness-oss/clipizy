#!/usr/bin/env python3
"""
Check if backend is running and accessible
"""
import requests
import sys

def check_backend():
    """Check if the backend server is running"""
    try:
        # Check if backend is running
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running on port 8000")
            return True
        else:
            print(f"⚠️ Backend responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend server is not running on port 8000")
        return False
    except Exception as e:
        print(f"❌ Error checking backend: {e}")
        return False

def check_music_clip_api():
    """Check if music-clip API is working"""
    try:
        response = requests.get("http://localhost:8000/music-clip/projects", timeout=10)
        if response.status_code == 200:
            print("✅ Music-clip API is working")
            data = response.json()
            print(f"   Found {len(data.get('projects', []))} projects")
            return True
        else:
            print(f"⚠️ Music-clip API returned status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error checking music-clip API: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Checking backend server...")
    
    if check_backend():
        check_music_clip_api()
    else:
        print("\n💡 To start the backend server, run from WSL:")
        print("   cd /mnt/c/Users/willi/code/vibewave")
        print("   source .venv/bin/activate")
        print("   python init_db.py")
        print("   python api/main.py")
