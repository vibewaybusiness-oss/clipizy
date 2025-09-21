#!/usr/bin/env node

/**
 * Script to update all API routes to use centralized configuration
 */

const fs = require('fs');
const path = require('path');

// Files to update
const filesToUpdate = [
  'src/app/api/music-clip/projects/[projectId]/upload-tracks-batch/route.ts',
  'src/app/api/music-clip/projects/[projectId]/route.ts',
  'src/app/api/music-clip/projects/[projectId]/tracks/route.ts',
  'src/app/api/music-clip/projects/[projectId]/tracks/[trackId]/route.ts',
  'src/app/api/music-clip/projects/[projectId]/tracks/[trackId]/url/route.ts',
  'src/app/api/music-clip/projects/[projectId]/settings/route.ts',
  'src/app/api/music-clip/projects/[projectId]/script/route.ts',
  'src/app/api/music-clip/projects/reset/route.ts',
  'src/app/api/music-clip/auto-save/route.ts',
  'src/app/api/analysis/music/route.ts',
  'src/app/api/music-analysis/analyze/comprehensive/route.ts',
  'src/app/api/projects/route.ts',
];

// Update function
function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the import and constant declaration
    content = content.replace(
      /import { NextRequest, NextResponse } from 'next\/server';\s*\n\s*const BACKEND_URL = process\.env\.BACKEND_URL \|\| '[^']+';/g,
      `import { NextRequest, NextResponse } from 'next/server';\nimport { getBackendUrl, getTimeout } from '@/lib/config';`
    );
    
    // Replace BACKEND_URL usage with getBackendUrl()
    content = content.replace(/\$\{BACKEND_URL\}/g, '${getBackendUrl()}');
    
    // Replace hardcoded timeouts with getTimeout()
    content = content.replace(/setTimeout\(\(\) => controller\.abort\(\), \d+\); \/\/ \d+ second timeout/g, 'setTimeout(() => controller.abort(), getTimeout(\'default\'));');
    content = content.replace(/setTimeout\(\(\) => controller\.abort\(\), \d+\); \/\/ \d+ minute timeout for analysis/g, 'setTimeout(() => controller.abort(), getTimeout(\'analysis\'));');
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filePath}`);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Update all files
console.log('🔄 Updating API routes to use centralized configuration...\n');

filesToUpdate.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    updateFile(filePath);
  } else {
    console.log(`⚠️  File not found: ${filePath}`);
  }
});

console.log('\n✅ All API routes updated!');
