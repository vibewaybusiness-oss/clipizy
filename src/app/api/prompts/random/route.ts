import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('Prompt API route called');
    const { searchParams } = new URL(request.url);
    const promptType = searchParams.get('prompt_type');
    const categories = searchParams.get('categories');
    const source = searchParams.get('source') || 'json';
    const style = searchParams.get('style');
    const instrumental = searchParams.get('instrumental');

    console.log('Request params:', { promptType, categories, source, style, instrumental });

    if (!promptType) {
      console.log('Missing prompt_type parameter');
      return NextResponse.json(
        { error: 'prompt_type is required' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      prompt_type: promptType,
      source: source,
    });

    if (categories) {
      params.append('categories', categories);
    }

    if (style) {
      params.append('style', style);
    }

    if (instrumental) {
      params.append('instrumental', instrumental);
    }

    const backendUrl = `${BACKEND_URL}/prompts/random?${params.toString()}`;
    console.log('Calling backend URL:', backendUrl);

    // Add random delay between 1-1.5 seconds to simulate processing time
    const randomDelay = Math.random() * 500 + 1000; // 1-1.5 seconds
    console.log(`Adding ${Math.round(randomDelay)}ms delay to simulate processing`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout (increased for delay)

    const [response] = await Promise.all([
      fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }),
      new Promise(resolve => setTimeout(resolve, randomDelay))
    ]);

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
    console.error('Prompt API error:', error);

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - backend server not responding' },
        { status: 504 }
      );
    }

    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'Cannot connect to backend server - is it running?' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
