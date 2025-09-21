import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://172.31.247.43:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; trackId: string }> }
) {
  try {
    const { projectId, trackId } = await params;
    console.log('Music-clip get track URL API route called for project:', projectId, 'track:', trackId);
    
    const backendUrl = `${BACKEND_URL}/music-clip/projects/${projectId}/tracks/${trackId}/url`;
    console.log('Calling backend URL:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

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
    console.error('Music-clip get track URL API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
