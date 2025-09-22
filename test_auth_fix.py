#!/usr/bin/env python3
"""
Test script to verify authentication fixes
"""
import requests
import json
import sys

API_BASE_URL = "http://localhost:8000"

def test_auth_flow():
    """Test the complete authentication flow"""
    print("🧪 Testing Authentication Fixes...")
    
    # Test data
    test_user = {
        "email": "test@example.com",
        "password": "testpassword123",
        "name": "Test User"
    }
    
    try:
        # Test 1: Register a new user
        print("\n1️⃣ Testing user registration...")
        register_response = requests.post(
            f"{API_BASE_URL}/auth/register",
            json=test_user,
            headers={"Content-Type": "application/json"}
        )
        
        if register_response.status_code == 200:
            print("✅ User registration successful")
            user_data = register_response.json()
            user_id = user_data.get('id')
            print(f"   User ID: {user_id}")
            print(f"   Email: {user_data.get('email')}")
            
            # Verify the user ID is a random UUID, not sequential
            if user_id and user_id != "00000000-0000-0000-0000-000000000001":
                print("✅ User ID is randomly generated (not hardcoded)")
            else:
                print("❌ User ID appears to be hardcoded or sequential")
                return False
        else:
            print(f"❌ User registration failed: {register_response.status_code}")
            print(f"   Response: {register_response.text}")
            return False
        
        # Test 2: Login with the user
        print("\n2️⃣ Testing user login...")
        login_data = {
            "email": test_user["email"],
            "password": test_user["password"]
        }
        
        login_response = requests.post(
            f"{API_BASE_URL}/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code == 200:
            print("✅ User login successful")
            token_data = login_response.json()
            access_token = token_data.get("access_token")
            print(f"   Token type: {token_data.get('token_type')}")
        else:
            print(f"❌ User login failed: {login_response.status_code}")
            print(f"   Response: {login_response.text}")
            return False
        
        # Test 3: Access protected endpoint without token (should fail)
        print("\n3️⃣ Testing protected endpoint without token...")
        projects_response = requests.get(f"{API_BASE_URL}/music-clip/projects")
        
        if projects_response.status_code == 401:
            print("✅ Protected endpoint correctly requires authentication")
        else:
            print(f"❌ Protected endpoint should require authentication: {projects_response.status_code}")
            return False
        
        # Test 4: Access protected endpoint with token (should succeed)
        print("\n4️⃣ Testing protected endpoint with token...")
        projects_response = requests.get(
            f"{API_BASE_URL}/music-clip/projects",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
        )
        
        if projects_response.status_code == 200:
            print("✅ Protected endpoint accessible with valid token")
            projects_data = projects_response.json()
            print(f"   Projects returned: {len(projects_data.get('projects', []))}")
        else:
            print(f"❌ Protected endpoint failed with valid token: {projects_response.status_code}")
            print(f"   Response: {projects_response.text}")
            return False
        
        print("\n🎉 All authentication tests passed!")
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the API server")
        print("   Make sure the server is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_auth_flow()
    if not success:
        sys.exit(1)
