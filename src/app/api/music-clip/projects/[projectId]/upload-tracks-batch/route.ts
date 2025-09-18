import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    console.log('Music-clip batch upload tracks API route called for project:', projectId);
    
    const backendUrl = `${BACKEND_URL}/music-clip/projects/${projectId}/upload-tracks-batch`;
    console.log('Calling backend URL:', backendUrl);

    // Forward the multipart form data to the backend
    const formData = await request.formData();
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
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
    console.error('Music-clip batch upload tracks API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
