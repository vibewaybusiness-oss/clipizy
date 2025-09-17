import { NextRequest, NextResponse } from 'next/server';
import { getQueueManager } from '@/lib/runpod-api/queue-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowName, requestData } = body;

    if (!workflowName) {
      return NextResponse.json(
        { error: 'Workflow name is required' },
        { status: 400 }
      );
    }

    // Get the queue manager
    const queueManager = getQueueManager();

    // Start the queue manager if it's not running
    if (!queueManager.getQueueStatus().isRunning) {
      await queueManager.start();
    }

    // Add the workflow request to the queue
    const requestId = await queueManager.addWorkflowRequest(workflowName, requestData);

    return NextResponse.json({
      success: true,
      requestId,
      message: `Workflow request added to queue for ${workflowName}`,
      queueStatus: queueManager.getQueueStatus()
    });

  } catch (error) {
    console.error('Error processing workflow request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const queueManager = getQueueManager();
    const status = queueManager.getQueueStatus();

    return NextResponse.json({
      success: true,
      queueStatus: status
    });

  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const queueManager = getQueueManager();
    
    // Stop the queue manager and cleanup
    await queueManager.stop();
    await queueManager.cleanup();

    return NextResponse.json({
      success: true,
      message: 'Queue manager stopped and cleaned up'
    });

  } catch (error) {
    console.error('Error stopping queue manager:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
