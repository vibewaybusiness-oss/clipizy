#!/usr/bin/env python3
"""
Script to fix music-clip API to use APIClient
"""
import re

def fix_music_clip_api():
    """Fix music-clip API to use APIClient"""
    file_path = "src/lib/api/music-clip.ts"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix uploadTrack method
    content = re.sub(
        r'const response = await fetch\(`\${this\.baseUrl\}/projects/\${projectId\}/upload-track`, \{\s*method: \'POST\',\s*body: formData,\s*\}\);\s*if \(!response\.ok\) \{\s*const errorData = await response\.json\(\)\.catch\(\(\) => \(\{ error: \'Unknown error\' \}\)\);\s*throw new Error\(`Failed to upload track: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*return response\.json\(\);',
        'return await APIClient.uploadFile(`/music-clip/projects/${projectId}/upload-track`, file, options);',
        content,
        flags=re.DOTALL
    )
    
    # Fix uploadTracksBatch method
    content = re.sub(
        r'const response = await fetch\(`\${this\.baseUrl\}/projects/\${projectId\}/upload-tracks-batch`, \{\s*method: \'POST\',\s*body: formData,\s*\}\);\s*if \(!response\.ok\) \{\s*const errorData = await response\.json\(\)\.catch\(\(\) => \(\{ error: \'Unknown error\' \}\)\);\s*throw new Error\(`Failed to upload tracks: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*return response\.json\(\);',
        'return await APIClient.uploadFile(`/music-clip/projects/${projectId}/upload-tracks-batch`, files[0], { files, ...options });',
        content,
        flags=re.DOTALL
    )
    
    # Fix updateSettings method
    content = re.sub(
        r'const response = await fetch\(`\${this\.baseUrl\}/projects/\${projectId\}/settings`, \{\s*method: \'POST\',\s*headers: \{\s*\'Content-Type\': \'application/json\',\s*\},\s*body: JSON\.stringify\(settings\),\s*\}\);\s*if \(!response\.ok\) \{\s*const errorData = await response\.json\(\)\.catch\(\(\) => \(\{ error: \'Unknown error\' \}\)\);\s*throw new Error\(`Failed to update settings: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*return response\.json\(\);',
        'return await APIClient.post(`/music-clip/projects/${projectId}/settings`, settings);',
        content,
        flags=re.DOTALL
    )
    
    # Fix getScript method
    content = re.sub(
        r'const response = await fetch\(`\${this\.baseUrl\}/projects/\${projectId\}/script`\);\s*if \(!response\.ok\) \{\s*const errorData = await response\.json\(\)\.catch\(\(\) => \(\{ error: \'Unknown error\' \}\)\);\s*throw new Error\(`Failed to get script: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*return response\.json\(\);',
        'return await APIClient.get(`/music-clip/projects/${projectId}/script`);',
        content,
        flags=re.DOTALL
    )
    
    # Fix getTracks method
    content = re.sub(
        r'const response = await fetch\(`\${this\.baseUrl\}/projects/\${projectId\}/tracks`\);\s*if \(!response\.ok\) \{\s*const errorData = await response\.json\(\)\.catch\(\(\) => \(\{ error: \'Unknown error\' \}\)\);\s*throw new Error\(`Failed to get tracks: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*return response\.json\(\);',
        'return await APIClient.get(`/music-clip/projects/${projectId}/tracks`);',
        content,
        flags=re.DOTALL
    )
    
    # Fix updateTrack method
    content = re.sub(
        r'const response = await fetch\(`\${this\.baseUrl\}/projects/\${projectId\}/tracks/\${trackId\}`, \{\s*method: \'PATCH\',\s*headers: \{\s*\'Content-Type\': \'application/json\',\s*\},\s*body: JSON\.stringify\(updates\),\s*\}\);\s*if \(!response\.ok\) \{\s*const errorData = await response\.json\(\)\.catch\(\(\) => \(\{ error: \'Unknown error\' \}\)\);\s*throw new Error\(`Failed to update track: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*return response\.json\(\);',
        'return await APIClient.patch(`/music-clip/projects/${projectId}/tracks/${trackId}`, updates);',
        content,
        flags=re.DOTALL
    )
    
    # Fix getProjects method
    content = re.sub(
        r'const response = await fetch\(`\${this\.baseUrl\}/projects`\);\s*if \(!response\.ok\) \{\s*const errorData = await response\.json\(\)\.catch\(\(\) => \(\{ error: \'Unknown error\' \}\)\);\s*throw new Error\(`Failed to get projects: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*return response\.json\(\);',
        'return await APIClient.get(`/music-clip/projects`);',
        content,
        flags=re.DOTALL
    )
    
    # Fix resetProjects method
    content = re.sub(
        r'const response = await fetch\(`\${this\.baseUrl\}/projects/reset`, \{\s*method: \'DELETE\',\s*\}\);\s*if \(!response\.ok\) \{\s*const errorData = await response\.json\(\)\.catch\(\(\) => \(\{ error: \'Unknown error\' \}\)\);\s*throw new Error\(`Failed to reset projects: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*return response\.json\(\);',
        'return await APIClient.delete(`/music-clip/projects/reset`);',
        content,
        flags=re.DOTALL
    )
    
    # Fix getTrackUrl method
    content = re.sub(
        r'const response = await fetch\(`\${this\.baseUrl\}/projects/\${projectId\}/tracks/\${trackId\}/url`\);\s*if \(!response\.ok\) \{\s*const errorData = await response\.json\(\)\.catch\(\(\) => \(\{ error: \'Unknown error\' \}\)\);\s*throw new Error\(`Failed to get track URL: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*return response\.json\(\);',
        'return await APIClient.get(`/music-clip/projects/${projectId}/tracks/${trackId}/url`);',
        content,
        flags=re.DOTALL
    )
    
    # Fix updateAnalysis method
    content = re.sub(
        r'const response = await fetch\(`\${this\.baseUrl\}/projects/\${projectId\}/analysis`, \{\s*method: \'PUT\',\s*headers: \{\s*\'Content-Type\': \'application/json\',\s*\},\s*body: JSON\.stringify\(analysisData\),\s*\}\);\s*if \(!response\.ok\) \{\s*const errorData = await response\.json\(\)\.catch\(\(\) => \(\{ error: \'Unknown error\' \}\)\);\s*throw new Error\(`Failed to update analysis: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*return response\.json\(\);',
        'return await APIClient.put(`/music-clip/projects/${projectId}/analysis`, analysisData);',
        content,
        flags=re.DOTALL
    )
    
    # Fix getAnalysis method
    content = re.sub(
        r'const response = await fetch\(`\${this\.baseUrl\}/projects/\${projectId\}/analysis`, \{\s*method: \'GET\',\s*credentials: \'include\',\s*\}\);\s*if \(!response\.ok\) \{\s*const errorData = await response\.json\(\)\.catch\(\(\) => \(\{ error: \'Unknown error\' \}\)\);\s*throw new Error\(`Failed to get analysis: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*return response\.json\(\);',
        'return await APIClient.get(`/music-clip/projects/${projectId}/analysis`);',
        content,
        flags=re.DOTALL
    )
    
    # Fix deleteProject method
    content = re.sub(
        r'const response = await fetch\(`\${this\.baseUrl\}/projects/\${projectId\}`, \{\s*method: \'DELETE\',\s*\}\);\s*if \(!response\.ok\) \{\s*const errorData = await response\.json\(\)\.catch\(\(\) => \(\{ error: \'Unknown error\' \}\)\);\s*throw new Error\(`Failed to delete project: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*return response\.json\(\);',
        'return await APIClient.delete(`/music-clip/projects/${projectId}`);',
        content,
        flags=re.DOTALL
    )
    
    # Write back the fixed content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Fixed music-clip API to use APIClient")

if __name__ == "__main__":
    fix_music_clip_api()
