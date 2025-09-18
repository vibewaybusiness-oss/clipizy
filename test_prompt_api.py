#!/usr/bin/env python3
"""
Test script for the prompt API functionality
"""
import json
import sys
import os

# Add the api directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))

from api.services.prompt_service import PromptService

def test_prompt_service():
    """Test the prompt service directly"""
    print("Testing PromptService...")
    
    try:
        # Test basic music prompt generation
        result = PromptService.get_random_prompt(
            prompt_type="music",
            source="json"
        )
        print(f"✅ Basic music prompt: {result}")
        
        # Test with specific category
        result = PromptService.get_random_prompt(
            prompt_type="music",
            categories=["Ambient"],
            source="json"
        )
        print(f"✅ Ambient music prompt: {result}")
        
        # Test with style
        result = PromptService.get_random_prompt(
            prompt_type="music",
            source="json",
            style="instrumental"
        )
        print(f"✅ Instrumental music prompt: {result}")
        
        print("✅ All tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_prompt_service()
    sys.exit(0 if success else 1)
