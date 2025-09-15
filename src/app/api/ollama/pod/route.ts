import { NextRequest, NextResponse } from 'next/server';
import { ollamaClient } from '../../../../../backend/ollama/ollama-client';

export async function GET(request: NextRequest) {
  try {
    const podInfo = ollamaClient.getCurrentPod();
    
    return NextResponse.json({
      success: true,
      podInfo: podInfo ? {
        id: podInfo.id,
        ip: podInfo.ip,
        port: podInfo.port,
        status: podInfo.status,
        ready: podInfo.ready
      } : null
    });

  } catch (error) {
    console.error('❌ Error getting pod info:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { podId } = body;
    
    if (!podId) {
      return NextResponse.json(
        { success: false, error: 'Pod ID is required' },
        { status: 400 }
      );
    }

    const result = await ollamaClient.setPod(podId);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pod set successfully'
    });

  } catch (error) {
    console.error('❌ Error setting pod:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const result = await ollamaClient.releasePod();
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pod released successfully'
    });

  } catch (error) {
    console.error('❌ Error releasing pod:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
