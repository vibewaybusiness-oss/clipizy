import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();
    
    console.log('Next.js API route - Received code:', code ? `${code.substring(0, 10)}...` : 'None');
    console.log('Next.js API route - Received state:', state);
    
    if (!code) {
      return NextResponse.json(
        { detail: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    console.log('Next.js API route - Forwarding to backend:', `${backendUrl}/auth/google/callback`);
    console.log('Next.js API route - Sending code:', code ? `${code.substring(0, 10)}...` : 'None');
    
    // Test if backend is accessible
    try {
      const testResponse = await fetch(`${backendUrl}/auth/google`, { method: 'GET' });
      console.log('Next.js API route - Backend test response:', testResponse.status);
    } catch (testError) {
      console.log('Next.js API route - Backend test error:', testError.message);
    }
    
    const response = await fetch(`${backendUrl}/auth/google/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { detail: errorData.detail || 'OAuth authentication failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
