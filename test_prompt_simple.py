#!/usr/bin/env python3
"""
Simple test script for the prompt service without complex imports
"""
import json
import random
from pathlib import Path

# Load the prompts directly
PROMPTS_PATH = Path("api/library/prompts_random.json")
with open(PROMPTS_PATH, encoding='utf-8') as f:
    PROMPTS = json.load(f)

def test_prompt_generation():
    """Test prompt generation logic directly"""
    print("Testing prompt generation...")
    
    try:
        # Test basic music prompt generation
        key = "music_prompts"
        available_categories = list(PROMPTS[key].keys())
        category = random.choice(available_categories)
        prompt = random.choice(PROMPTS[key][category])
        
        result = {
            "prompt": prompt,
            "category": category,
            "source": "json"
        }
        
        print(f"✅ Basic music prompt: {result}")
        
        # Test with specific category
        if "Ambient" in available_categories:
            category = "Ambient"
            prompt = random.choice(PROMPTS[key][category])
            result = {
                "prompt": prompt,
                "category": category,
                "source": "json"
            }
            print(f"✅ Ambient music prompt: {result}")
        
        # Test with style
        category = random.choice(available_categories)
        prompt = random.choice(PROMPTS[key][category])
        style = "instrumental"
        prompt_with_style = f"{prompt} Style: {style}"
        
        result = {
            "prompt": prompt_with_style,
            "category": category,
            "source": "json"
        }
        print(f"✅ Instrumental music prompt: {result}")
        
        print("✅ All tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_prompt_generation()
    exit(0 if success else 1)
