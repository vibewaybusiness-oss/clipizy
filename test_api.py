#!/usr/bin/env python3
"""Test script to check API imports"""

try:
    from api.main import app
    print("✅ App imported successfully")
    print("✅ FastAPI app created")
except Exception as e:
    print(f"❌ Error importing app: {e}")
    import traceback
    traceback.print_exc()
