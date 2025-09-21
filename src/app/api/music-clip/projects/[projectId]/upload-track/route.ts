import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl, getTimeout } from '@/lib/config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    console.log('Music-clip upload track API route called for project:', projectId);
    console.log('BACKEND_URL env var:', process.env.BACKEND_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    const formData = await request.formData();
    console.log('Form data keys:', Array.from(formData.keys()));
    
    // Check if file exists in form data
    const file = formData.get('file');
    if (!file) {
      console.error('No file found in form data');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    console.log('File details:', {
      name: (file as File).name,
      size: (file as File).size,
      type: (file as File).type
    });
    
    const backendUrl = `${getBackendUrl()}/music-clip/projects/${projectId}/upload-track`;
    console.log('Calling backend URL:', backendUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout('upload'));
    
    console.log('Starting fetch request to backend...');
    console.log('FormData contents:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    console.log('Fetch request completed');
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
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
    console.error('Music-clip upload track API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Upload timeout - file too large or network too slow. Please try again.' },
          { status: 408 }
        );
      }
      if (error.message.includes('fetch')) {
        return NextResponse.json(
          { error: 'Failed to connect to backend server. Please check if the backend is running.' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}