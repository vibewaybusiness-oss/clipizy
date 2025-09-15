import { NextRequest, NextResponse } from 'next/server';
import { getQueueManager } from '../../../../../backend/runpod-api/queue-manager';
import { ollamaClient } from '../../../../../backend/ollama/ollama-client';

export async function GET(request: NextRequest) {
  try {
    const queueManager = getQueueManager();
    const queueStatus = queueManager.getQueueStatus();
    const currentPod = ollamaClient.getCurrentPod();

    return NextResponse.json({
      success: true,
      queueStatus: {
        ...queueStatus,
        currentPod: currentPod ? {
          id: currentPod.id,
          ip: currentPod.ip,
          port: currentPod.port,
          status: currentPod.status,
          ready: currentPod.ready
        } : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting Ollama status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
