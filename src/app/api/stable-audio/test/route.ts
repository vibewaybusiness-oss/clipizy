import { NextRequest, NextResponse } from 'next/server';
import { StableAudio2Client } from '../../../../backend/stable-audio-2/client';

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

    const client = new StableAudio2Client({ apiKey });
    const result = await client.textToAudio({
      prompt,
      duration,
      output_format: "mp3",
      model: model as "stable-audio-2.5" | "stable-audio-2"
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    if (!result.audio) {
      return NextResponse.json(
        { success: false, error: "No audio data received" },
        { status: 500 }
      );
    }

    const audioDataUri = `data:audio/mp3;base64,${result.audio.toString('base64')}`;

    return NextResponse.json({
      success: true,
      audioDataUri,
      duration,
      size: result.audio.length
    });

  } catch (error) {
    console.error('Stable Audio API error:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
