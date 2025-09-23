import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('Google OAuth callback API route called');

    const body = await request.json();
    console.log('Request body:', body);

    const { code, state } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Try to call backend first
    try {
      const backendUrl = `${BACKEND_URL}/api/auth/google/callback`;
      console.log('Calling backend URL:', backendUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('Backend response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Backend response data:', data);
        return NextResponse.json(data);
      } else {
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }
    } catch (backendError) {
      console.log('Backend not available, handling OAuth callback directly:', backendError);
      
      // Return error instead of handling OAuth directly
      return NextResponse.json(
        { error: 'Backend authentication service is not available. Please try again later.' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Google OAuth callback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
