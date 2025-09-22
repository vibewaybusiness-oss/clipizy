import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(request: NextRequest) {
  try {
    console.log('Credits balance API route called');

    const backendUrl = `${BACKEND_URL}/api/credits/balance`;
    console.log('Calling backend URL:', backendUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
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
    console.error('Credits balance API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
