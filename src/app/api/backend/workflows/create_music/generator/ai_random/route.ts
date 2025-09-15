import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const filePath = join(process.cwd(), 'backend/workflows/create_music/generator/ai_random.json');
    const fileContent = readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    
    return NextResponse.json(jsonData);
  } catch (error) {
    console.error('Error reading ai_random.json:', error);
    return NextResponse.json(
      { error: 'Failed to load AI prompts' },
      { status: 500 }
    );
  }
}
