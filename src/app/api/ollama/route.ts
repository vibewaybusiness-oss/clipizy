import { NextRequest, NextResponse } from 'next/server';
import { ollamaClient } from '../../../../backend/ollama/ollama-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model = 'deepseek-coder', stream = false } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🤖 Processing Ollama request:', { prompt: prompt.substring(0, 50) + '...', model, stream });

    const result = await ollamaClient.generate({
      prompt,
      model,
      stream
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false,
          error: result.error,
          podInfo: result.podInfo
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      model: result.data!.model,
      response: result.data!.response,
      created_at: result.data!.created_at || new Date().toISOString(),
      done: result.data!.done || true,
      metrics: {
        total_duration: result.data!.total_duration || 0,
        load_duration: result.data!.load_duration || 0,
        prompt_eval_count: result.data!.prompt_eval_count || 0,
        prompt_eval_duration: result.data!.prompt_eval_duration || 0,
        eval_count: result.data!.eval_count || 0,
        eval_duration: result.data!.eval_duration || 0
      },
      podInfo: result.podInfo
    });

  } catch (error) {
    console.error('❌ Error calling Ollama API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Getting available Ollama models...');

    const result = await ollamaClient.getModels();

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false,
          error: result.error,
          podInfo: result.podInfo
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      models: result.data?.models || result.data || [],
      podInfo: result.podInfo
    });

  } catch (error) {
    console.error('❌ Error getting Ollama models:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
