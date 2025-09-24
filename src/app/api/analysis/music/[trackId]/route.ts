import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;
    console.log('Analysis music by track ID API route called for track:', trackId);

    const backendUrl = `${BACKEND_URL}/api/analysis/music/${trackId}`;
    console.log('Calling backend URL:', backendUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for analysis

    // Forward authorization headers from the request
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
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
    console.log('Analysis data being returned:', data.analysis);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Analysis music by track ID API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      backendUrl: `${BACKEND_URL}/api/analysis/music/${(await params).trackId}`
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
