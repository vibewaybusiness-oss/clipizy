#!/usr/bin/env python3
"""
Script to fix remaining user_id references in music_clip_router.py
"""
import re

def fix_music_clip_router():
    """Fix all remaining user_id references in music_clip_router.py"""
    file_path = "api/routers/music_clip_router.py"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix upload_tracks_batch function
    content = re.sub(
        r'def upload_music_tracks_batch\(\s*project_id: str,\s*files: List\[UploadFile\] = File\(\.\.\.\),\s*ai_generated: bool = Form\(False\),\s*prompt: Optional\[str\] = Form\(None\),\s*genre: Optional\[str\] = Form\(None\),\s*instrumental: bool = Form\(False\),\s*video_description: Optional\[str\] = Form\(None\),\s*db: Session = Depends\(get_db\),\s*current_user: User = Depends\(get_current_user\)\s*\):\s*"""Upload multiple music tracks to a music-clip project in parallel\."""\s*try:\s*# Ensure user exists and create if needed\s*user = user_safety_service\.ensure_user_exists\(db, user_id\)',
        '''def upload_music_tracks_batch(
    project_id: str,
    files: List[UploadFile] = File(...),
    ai_generated: bool = Form(False),
    prompt: Optional[str] = Form(None),
    genre: Optional[str] = Form(None),
    instrumental: bool = Form(False),
    video_description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload multiple music tracks to a music-clip project in parallel."""
    try:
        user_id = str(current_user.id)''',
        content,
        flags=re.DOTALL
    )
    
    # Fix all other functions that need user_id extraction
    functions_to_fix = [
        'update_project_settings',
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
    
    for func_name in functions_to_fix:
        # Add user_id extraction after function definition
        pattern = rf'def {func_name}\([^)]*current_user: User = Depends\(get_current_user\)[^)]*\):\s*"""[^"]*"""\s*try:\s*# Ensure user exists and create if needed\s*user = user_safety_service\.ensure_user_exists\(db, user_id\)'
        replacement = rf'def {func_name}([^)]*current_user: User = Depends\(get_current_user\)[^)]*\):\s*"""[^"]*"""\s*try:\s*user_id = str\(current_user\.id\)'
        
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Fix process_single_file function calls
    content = re.sub(
        r'user_id=user_id,',
        'user_id=user_id,',
        content
    )
    
    # Write back the fixed content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Fixed music_clip_router.py")

if __name__ == "__main__":
    fix_music_clip_router()
