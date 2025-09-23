import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('Google auth API route called');

    const backendUrl = `${BACKEND_URL}/api/auth/google`;
    console.log('Calling backend URL:', backendUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      
      // If backend is not available, return an error
      if (response.status === 500 || !response.ok) {
        console.log('Backend not available');
        return NextResponse.json(
          { error: 'Backend authentication service is not available. Please try again later.' },
          { status: 503 }
        );
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
    console.error('Google auth API error:', error);
    
    // Return error instead of fallback
    return NextResponse.json(
      { error: 'Backend authentication service is not available. Please try again later.' },
      { status: 503 }
    );
  }
}
