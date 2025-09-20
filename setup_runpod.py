#!/usr/bin/env python3
"""
Script to help set up RunPod API key
"""
import os
import sys

def setup_runpod_api_key():
    """Help user set up RunPod API key"""
    
    print("🔑 RunPod API Key Setup")
    print("=" * 50)
    print()
    print("To create a real pod, you need a RunPod API key.")
    print()
    print("Steps to get your API key:")
    print("1. Go to: https://runpod.io/console/user/settings")
    print("2. Log in to your RunPod account")
    print("3. Navigate to 'API Keys' section")
    print("4. Create a new API key or copy an existing one")
    print()
    
    # Check current API key
    current_key = os.getenv("RUNPOD_API_KEY")
    if current_key and current_key != "your_runpod_api_key_here":
        print(f"✅ Current API key: {current_key[:8]}...")
        print("You can proceed with pod creation!")
        return True
    else:
        print("❌ No valid API key found")
        print()
        print("To set your API key, run one of these commands:")
        print()
        print("Windows PowerShell:")
        print('$env:RUNPOD_API_KEY="your_actual_api_key_here"')
        print()
        print("Windows Command Prompt:")
        print('set RUNPOD_API_KEY=your_actual_api_key_here')
        print()
        print("Linux/Mac:")
        print('export RUNPOD_API_KEY="your_actual_api_key_here"')
        print()
        print("Or create a .env file in the project root with:")
        print("RUNPOD_API_KEY=your_actual_api_key_here")
        print()
        return False

if __name__ == "__main__":
    setup_runpod_api_key()
