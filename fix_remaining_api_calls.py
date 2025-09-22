#!/usr/bin/env python3
"""
Script to fix remaining API calls to use authentication
"""
import re

def fix_remaining_api_calls():
    """Fix all remaining API calls to use authentication"""
    
    # Fix ComfyUI API
    comfyui_file = "src/lib/comfyui-api.ts"
    with open(comfyui_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add auth headers to all fetch calls
    content = re.sub(
        r'headers: \{\s*\'Content-Type\': \'application/json\',\s*\}',
        '''headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }''',
        content
    )
    
    with open(comfyui_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Fix pricing service
    pricing_file = "src/lib/pricing-service.ts"
    with open(pricing_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add auth headers to pricing API call
    content = re.sub(
        r'const response = await fetch\(\'/api/pricing/config\'\);',
        '''const response = await fetch('/api/pricing/config', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });''',
        content
    )
    
    with open(pricing_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Fix social media components
    publish_dialog_file = "src/components/social-media/PublishDialog.tsx"
    with open(publish_dialog_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add auth headers to social media API calls
    content = re.sub(
        r'const response = await fetch\(\'/api/social-media/accounts\'\);',
        '''const response = await fetch('/api/social-media/accounts', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });''',
        content
    )
    
    content = re.sub(
        r'const response = await fetch\(`/api/social-media/publish/\${exportId\}`, \{\s*method: \'POST\',\s*headers: \{ \'Content-Type\': \'application/json\' \},\s*body: JSON\.stringify\(\{\s*platforms: selectedPlatforms,\s*publish_options: publishOptions\s*\}\)\s*\}\);',
        '''const response = await fetch(`/api/social-media/publish/${exportId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          publish_options: publishOptions
        })
      });''',
        content,
        flags=re.DOTALL
    )
    
    with open(publish_dialog_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Fix social media manager
    social_manager_file = "src/components/social-media/SocialMediaManager.tsx"
    with open(social_manager_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add auth headers to all social media API calls
    content = re.sub(
        r'const accountsResponse = await fetch\(\'/api/social-media/accounts\'\);',
        '''const accountsResponse = await fetch('/api/social-media/accounts', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });''',
        content
    )
    
    content = re.sub(
        r'const platformsResponse = await fetch\(\'/api/social-media/platforms\'\);',
        '''const platformsResponse = await fetch('/api/social-media/platforms', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });''',
        content
    )
    
    content = re.sub(
        r'const templatesResponse = await fetch\(\'/api/automation/templates\'\);',
        '''const templatesResponse = await fetch('/api/automation/templates', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });''',
        content
    )
    
    content = re.sub(
        r'const response = await fetch\(`/api/social-media/connect/\${platform\}`, \{\s*method: \'POST\',\s*headers: \{ \'Content-Type\': \'application/json\' \},\s*body: JSON\.stringify\(mockAuthData\)\s*\}\);',
        '''const response = await fetch(`/api/social-media/connect/${platform}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(mockAuthData)
      });''',
        content,
        flags=re.DOTALL
    )
    
    content = re.sub(
        r'const response = await fetch\(`/api/social-media/accounts/\${accountId\}`, \{\s*method: \'DELETE\'\s*\}\);',
        '''const response = await fetch(`/api/social-media/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });''',
        content,
        flags=re.DOTALL
    )
    
    content = re.sub(
        r'const response = await fetch\(`/api/automation/templates/\${templateId\}/create`, \{\s*method: \'POST\',\s*headers: \{ \'Content-Type\': \'application/json\' \},\s*body: JSON\.stringify\(\{\s*enable_scheduling: true,\s*customizations: \{\}\s*\}\)\s*\}\);',
        '''const response = await fetch(`/api/automation/templates/${templateId}/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          enable_scheduling: true,
          customizations: {}
        })
      });''',
        content,
        flags=re.DOTALL
    )
    
    with open(social_manager_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Fix Gemini generator
    gemini_file = "src/components/calendar/GeminiGenerator.tsx"
    with open(gemini_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = re.sub(
        r'const response = await fetch\(\'/api/gemini/generate\', \{\s*method: \'POST\',\s*headers: \{\s*\'Content-Type\': \'application/json\',\s*\},\s*body: JSON\.stringify\(\{\s*prompt,\s*maxTokens: 1000\s*\}\)\s*\}\);',
        '''const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          prompt,
          maxTokens: 1000
        })
      });''',
        content,
        flags=re.DOTALL
    )
    
    with open(gemini_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Fix music clip page component
    music_clip_page_file = "src/components/music-clip/MusicClipPage.tsx"
    with open(music_clip_page_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = re.sub(
        r'const response = await fetch\(`/api/music-clip/projects/\${projectId\}/analysis`\);',
        '''const response = await fetch(`/api/music-clip/projects/${projectId}/analysis`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });''',
        content
    )
    
    content = re.sub(
        r'const response = await fetch\(`/api/prompts/random\?\${params\.toString\(\)}`\);',
        '''const response = await fetch(`/api/prompts/random?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });''',
        content
    )
    
    with open(music_clip_page_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Fix ComfyUI test page
    comfyui_test_file = "src/app/comfyui-test/page.tsx"
    with open(comfyui_test_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add auth headers to all ComfyUI test API calls
    content = re.sub(
        r'const response = await fetch\(\'/api/comfyui/status\'\);',
        '''const response = await fetch('/api/comfyui/status', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });''',
        content
    )
    
    content = re.sub(
        r'const response = await fetch\(\'/api/comfyui\?action=recruit\', \{\s*method: \'POST\'\s*\}\);',
        '''const response = await fetch('/api/comfyui?action=recruit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });''',
        content,
        flags=re.DOTALL
    )
    
    content = re.sub(
        r'const response = await fetch\(\'/api/comfyui\?action=release\', \{\s*method: \'POST\'\s*\}\);',
        '''const response = await fetch('/api/comfyui?action=release', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });''',
        content,
        flags=re.DOTALL
    )
    
    content = re.sub(
        r'const response = await fetch\(\'/api/comfyui\?action=expose-port\'\);',
        '''const response = await fetch('/api/comfyui?action=expose-port', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });''',
        content
    )
    
    with open(comfyui_test_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Fixed all remaining API calls to use authentication")

if __name__ == "__main__":
    fix_remaining_api_calls()
