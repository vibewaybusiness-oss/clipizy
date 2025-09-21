import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  try {
    const { prompt, duration = 20, model = "stable-audio-2.5" } = await request.json();

    if (!prompt || prompt.length < 10) {
      return NextResponse.json(
        { success: false, error: "Prompt must be at least 10 characters" },
        { status: 400 }
      );
    }

    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Stability AI API key not configured" },
        { status: 500 }
      );
    }

    // Call backend API for stable audio generation
    const backendUrl = `${BACKEND_URL}/api/stable-audio/generate`;
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        duration,
        output_format: "mp3",
        model: model as "stable-audio-2.5" | "stable-audio-2"
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: errorData.error || `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    if (!result.audioDataUri) {
      return NextResponse.json(
        { success: false, error: "No audio data received" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      audioDataUri: result.audioDataUri,
      duration: result.duration || duration,
      size: result.size || 0
    });

  } catch (error) {
    console.error('Stable Audio API error:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
