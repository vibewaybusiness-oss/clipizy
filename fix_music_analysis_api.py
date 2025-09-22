#!/usr/bin/env python3
"""
Script to fix music-analysis API to use APIClient
"""
import re

def fix_music_analysis_api():
    """Fix music-analysis API to use APIClient"""
    file_path = "src/lib/api/music-analysis.ts"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix analyzeTrack method - replace the entire fetch block
    content = re.sub(
        r'const formData = new FormData\(\);\s*formData\.append\(\'file\', file\);\s*const startTime = Date\.now\(\);\s*console\.log\(`Making request to \${this\.baseUrl\}/analyze/comprehensive at \${new Date\(\)\.toISOString\(\)}`\);\s*const response = await fetch\(`\${this\.baseUrl\}/analyze/comprehensive`, \{\s*method: \'POST\',\s*body: formData,\s*credentials: \'include\',\s*// Add keepalive to help with connection reuse\s*keepalive: true,\s*\}\);\s*console\.log\(`Response status: \${response\.status\} \${response\.statusText\}`\);\s*if \(!response\.ok\) \{\s*let errorData;\s*try \{\s*errorData = await response\.json\(\);\s*\} catch \(e\) \{\s*errorData = \{ error: \'Unknown error\' \};\s*\}\s*throw new Error\(`Analysis failed: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*const data = await response\.json\(\);\s*const endTime = Date\.now\(\);\s*console\.log\(`Analysis completed in \${endTime - startTime\}ms`\);\s*return \{\s*trackId: track\.id,\s*analysis: data,\s*\};',
        '''const startTime = Date.now();
      console.log(`Making request to /music-analysis/analyze/comprehensive at ${new Date().toISOString()}`);
      
      const data = await APIClient.uploadFile('/music-analysis/analyze/comprehensive', file, { trackId: track.id });
      
      const endTime = Date.now();
      console.log(`Analysis completed in ${endTime - startTime}ms`);
      
      return {
        trackId: track.id,
        analysis: data,
      };''',
        content,
        flags=re.DOTALL
    )
    
    # Fix analyzeTrackFromUrl method - replace the entire fetch block
    content = re.sub(
        r'const response = await fetch\(\'/api/analysis/music\', \{\s*method: \'POST\',\s*headers: \{\s*\'Content-Type\': \'application/json\',\s*\},\s*body: JSON\.stringify\(\{\s*url: track\.url,\s*trackId: track\.id,\s*\}\)\s*\}\);\s*if \(!response\.ok\) \{\s*const errorData = await response\.json\(\)\.catch\(\(\) => \(\{ error: \'Unknown error\' \}\)\);\s*throw new Error\(`Analysis failed: \${errorData\.error \|\| response\.statusText\}`\);\s*\}\s*const data = await response\.json\(\);\s*return \{\s*trackId: track\.id,\s*analysis: data,\s*\};',
        '''const data = await APIClient.post('/analysis/music', {
        url: track.url,
        trackId: track.id,
      });
      
      return {
        trackId: track.id,
        analysis: data,
      };''',
        content,
        flags=re.DOTALL
    )
    
    # Write back the fixed content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Fixed music-analysis API to use APIClient")

if __name__ == "__main__":
    fix_music_analysis_api()
