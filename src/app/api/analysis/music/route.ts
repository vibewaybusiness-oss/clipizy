import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://172.31.247.43:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('Analysis music API route called');

    const body = await request.json();
    console.log('Request body:', body);

    // Extract track_id from the request body
    const { track_id, audio_data } = body;
    if (!track_id) {
      return NextResponse.json(
        { error: 'track_id is required' },
        { status: 400 }
      );
    }

    // For fallback analysis, we need to use the music analysis comprehensive endpoint
    // since the backend analysis endpoint expects a file upload, not audio data
    const backendUrl = `${BACKEND_URL}/api/music-analysis/analyze/comprehensive`;
    console.log('Calling backend URL:', backendUrl);

    // Convert audio_data (data URI) to a file for upload
    let formData;
    if (audio_data) {
      // Extract the base64 data from the data URI
      const base64Data = audio_data.split(',')[1];
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }

      // Create a Blob and then a File
      const blob = new Blob([bytes], { type: 'audio/wav' });
      const file = new File([blob], `track_${track_id}.wav`, { type: 'audio/wav' });

      formData = new FormData();
      formData.append('file', file);
    } else {
      return NextResponse.json(
        { error: 'audio_data is required for fallback analysis' },
        { status: 400 }
      );
    }

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
    console.error('Analysis music API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
