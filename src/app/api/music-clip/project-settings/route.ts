import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl, getTimeout } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    console.log('Music-clip project settings API route called');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));

    const body = await request.json();
    console.log('Request body:', body);

    // Get projectId from request body
    const projectId = body.projectId;
    if (!projectId) {
      console.error('No projectId found in request body');
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const backendUrl = `${getBackendUrl()}/api/music-clip/projects/${projectId}/settings`;
    console.log('Calling backend URL:', backendUrl);
    console.log('Backend base URL:', getBackendUrl());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout('default'));

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Backend response data:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Music-clip project settings API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
