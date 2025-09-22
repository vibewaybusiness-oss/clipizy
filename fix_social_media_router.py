#!/usr/bin/env python3
"""
Script to fix user_id references in social_media_router.py
"""
import re

def fix_social_media_router():
    """Fix all user_id references in social_media_router.py"""
    file_path = "api/routers/social_media_router.py"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix all functions that need user_id extraction
    functions_to_fix = [
        'disconnect_account',
        'publish_video',
        'schedule_publish',
        'test_connection'
    ]
    
    for func in functions_to_fix:
        # Pattern to match function definition and add user_id extraction
        pattern = rf'(def {func}\([^)]*current_user: User = Depends\(get_current_user\)[^)]*\):\s*"""[^"]*"""\s*)([^u]*?)(user_id)'
        replacement = rf'\1user_id = str(current_user.id)\n    \2\3'
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Write back the fixed content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Fixed social_media_router.py")

if __name__ == "__main__":
    fix_social_media_router()
