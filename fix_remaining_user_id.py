#!/usr/bin/env python3
"""
Script to fix all remaining user_id references in music_clip_router.py
"""
import re

def fix_remaining_user_id():
    """Fix all remaining user_id references"""
    file_path = "api/routers/music_clip_router.py"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match function definitions with current_user parameter
    pattern = r'(def \w+\([^)]*current_user: User = Depends\(get_current_user\)[^)]*\):\s*"""[^"]*"""\s*try:\s*)(# Ensure user exists and create if needed\s*user = user_safety_service\.ensure_user_exists\(db, user_id\))'
    
    # Replace with user_id extraction
    replacement = r'\1user_id = str(current_user.id)'
    
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Fix any remaining patterns that might have been missed
    # Look for functions that have current_user but still use user_id without defining it
    functions_with_issues = [
        'get_project_script',
        'get_project_tracks', 
        'update_track',
        'get_track_url',
        'delete_project',
        'reset_user_projects',
        'update_project_analysis',
        'get_project_analysis',
        'analyze_project_tracks_parallel',
        'get_analysis_progress'
    ]
    
    for func in functions_with_issues:
        # More specific pattern for each function
        pattern = rf'(def {func}\([^)]*current_user: User = Depends\(get_current_user\)[^)]*\):\s*"""[^"]*"""\s*try:\s*)(# Ensure user exists and create if needed\s*user = user_safety_service\.ensure_user_exists\(db, user_id\))'
        replacement = rf'\1user_id = str(current_user.id)'
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Write back the fixed content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Fixed remaining user_id references in music_clip_router.py")

if __name__ == "__main__":
    fix_remaining_user_id()
