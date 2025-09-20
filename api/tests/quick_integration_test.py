#!/usr/bin/env python3
"""
Quick integration test for Music Analyzer
Run this to verify the integration is working
"""

import sys
import os
from pathlib import Path

# Add the api directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

def test_imports():
    """Test that all components can be imported"""
    print("🔍 Testing imports...")
    
    try:
        # Test service classes
        exec(open('../services/music_analyzer_service.py').read())
        print("✅ Service classes imported successfully")
        
        # Test router
        exec(open('../routers/music_analysis_router.py').read())
        print("✅ Router imported successfully")
        
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_fastapi_integration():
    """Test FastAPI integration"""
    print("🔍 Testing FastAPI integration...")
    
    try:
        from fastapi.testclient import TestClient
        from fastapi import FastAPI
        
        # Import the router
        exec(open('../routers/music_analysis_router.py').read())
        
        # Create test app
        app = FastAPI()
        app.include_router(router)
        client = TestClient(app)
        
        # Test health endpoint
        response = client.get("/api/music-analysis/health")
        if response.status_code == 200:
            print("✅ Health endpoint working")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            return False
        
        # Test genres endpoint
        response = client.get("/api/music-analysis/genres")
        if response.status_code == 200:
            data = response.json()
            if len(data.get("genres", [])) > 0:
                print("✅ Genres endpoint working")
            else:
                print("❌ Genres endpoint returned empty data")
                return False
        else:
            print(f"❌ Genres endpoint failed: {response.status_code}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ FastAPI integration failed: {e}")
        return False

def main():
    """Run quick integration test"""
    print("🚀 Quick Music Analyzer Integration Test")
    print("=" * 50)
    
    tests = [
        ("Import Test", test_imports),
        ("FastAPI Integration Test", test_fastapi_integration),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🧪 {test_name}")
        if test_func():
            passed += 1
        print()
    
    print("📊 QUICK TEST SUMMARY")
    print("=" * 50)
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("🎉 All quick tests passed! Integration is working.")
        return True
    else:
        print("⚠️  Some tests failed. Check the integration.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
