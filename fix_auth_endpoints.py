#!/usr/bin/env python3
"""
Script to fix hardcoded user IDs in API endcredits
"""
import os
import re
from pathlib import Path

def fix_router_file(file_path):
    """Fix hardcoded user IDs in a router file"""
    print(f"Processing {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if file already has auth import
    if 'from api.routers.auth_router import get_current_user' not in content:
        # Add auth import after other imports
        import_pattern = r'(from api\.config\.logging import get_\w+_logger\n)'
        if re.search(import_pattern, content):
            content = re.sub(
                import_pattern,
                r'\1from api.routers.auth_router import get_current_user\n',
                content
            )
        else:
            # Add after the last import
            import_pattern = r'(from typing import.*?\n)'
            if re.search(import_pattern, content):
                content = re.sub(
                    import_pattern,
                    r'\1from api.routers.auth_router import get_current_user\n',
                    content
                )
    
    # Replace hardcoded user_id parameters with current_user
    pattern = r'user_id: str = "00000000-0000-0000-0000-000000000001"'
    replacement = 'current_user: User = Depends(get_current_user)'
    content = re.sub(pattern, replacement, content)
    
    # Replace other hardcoded user_id patterns
    pattern2 = r'user_id: str = "00000000-0000-0000-0000-000000000001",'
    replacement2 = 'current_user: User = Depends(get_current_user),'
    content = re.sub(pattern2, replacement2, content)
    
    # Add user_id extraction at the beginning of functions
    # This is a more complex replacement that needs to be done carefully
    function_pattern = r'def (\w+)\([^)]*current_user: User = Depends\(get_current_user\)[^)]*\):'
    
    def add_user_id_extraction(match):
        func_name = match.group(1)
        # Find the function body and add user_id extraction
        return match.group(0) + '\n    user_id = str(current_user.id)\n'
    
    # Apply the replacement
    content = re.sub(function_pattern, add_user_id_extraction, content)
    
    # Write back the modified content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Fixed {file_path}")

def main():
    """Main function to fix all router files"""
    api_dir = Path("api/routers")
    
    if not api_dir.exists():
        print("❌ api/routers directory not found")
        return
    
    # Files to process
    router_files = [
        "music_clip_router.py",
        "credits_router.py", 
        "social_media_router.py",
        "automation_router.py"
    ]
    
    for file_name in router_files:
        file_path = api_dir / file_name
        if file_path.exists():
            fix_router_file(file_path)
        else:
            print(f"⚠️  File not found: {file_path}")
    
    print("\n🎉 All router files processed!")

if __name__ == "__main__":
    main()
