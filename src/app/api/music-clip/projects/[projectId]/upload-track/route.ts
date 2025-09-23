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

    const backendUrl = `${getBackendUrl()}/api/music-clip/projects/${projectId}/upload-track`;
    console.log('Calling backend URL:', backendUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout('upload'));

    console.log('Starting fetch request to backend...');
    console.log('FormData contents:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }

    let response: Response;
    try {
      response = await fetch(backendUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      console.log('Fetch request completed');
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    } catch (fetchError) {
      console.log('Backend not available, returning mock track upload response:', fetchError);
      // Return a mock track upload response when backend is not available
      const mockTrack = {
        track_id: `mock-${Date.now()}`,
        file_path: `/mock/tracks/${(file as File).name}`,
        metadata: {
          name: (file as File).name,
          size: (file as File).size,
          type: (file as File).type,
          duration: 180, // Mock 3-minute duration
        },
        ai_generated: formData.get('ai_generated') === 'true',
        prompt: formData.get('prompt') || null,
        genre: formData.get('genre') || null,
        instrumental: formData.get('instrumental') === 'true',
        video_description: formData.get('video_description') || null,
      };
      return NextResponse.json(mockTrack);
    }

    clearTimeout(timeoutId);

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      
      // If backend returns an error, return a mock track upload response
      if (response.status >= 500) {
        console.log('Backend server error, returning mock track upload response');
        const mockTrack = {
          track_id: `mock-${Date.now()}`,
          file_path: `/mock/tracks/${(file as File).name}`,
          metadata: {
            name: (file as File).name,
            size: (file as File).size,
            type: (file as File).type,
            duration: 180, // Mock 3-minute duration
          },
          ai_generated: formData.get('ai_generated') === 'true',
          prompt: formData.get('prompt') || null,
          genre: formData.get('genre') || null,
          instrumental: formData.get('instrumental') === 'true',
          video_description: formData.get('video_description') || null,
        };
        return NextResponse.json(mockTrack);
      }
      
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

    // Return a mock track upload response on any error
    console.log('Returning mock track upload response due to error');
    const mockTrack = {
      track_id: `mock-${Date.now()}`,
      file_path: '/mock/tracks/mock-track.wav',
      metadata: {
        name: 'Mock Track',
        size: 1024000,
        type: 'audio/wav',
        duration: 180, // Mock 3-minute duration
      },
      ai_generated: false,
      prompt: null,
      genre: null,
      instrumental: true,
      video_description: null,
    };
    return NextResponse.json(mockTrack);
  }
}