import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(request: NextRequest) {
  try {
    console.log('Music analysis comprehensive API route called');

    const formData = await request.formData();
    console.log('Form data keys:', Array.from(formData.keys()));

    const backendUrl = `${BACKEND_URL}/api/music-analysis/analyze/comprehensive`;
    console.log('Calling backend URL:', backendUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for analysis

    const response = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
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
    console.error('Music analysis comprehensive API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
