import { NextRequest, NextResponse } from 'next/server';
import { recruitPod, releasePod, getPodStatus } from '@/lib/runpod-api/pod-management';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, podId, config } = body;

    switch (action) {
      case 'recruit':
        if (!config) {
          return NextResponse.json(
            { success: false, error: 'Recruitment config is required' },
            { status: 400 }
          );
        }
        
        const recruitmentResult = await recruitPod(config);
        return NextResponse.json(recruitmentResult);

      case 'release':
        if (!podId) {
          return NextResponse.json(
            { success: false, error: 'Pod ID is required for release' },
            { status: 400 }
          );
        }
        
        const releaseResult = await releasePod(podId);
        return NextResponse.json(releaseResult);

      case 'status':
        if (!podId) {
          return NextResponse.json(
            { success: false, error: 'Pod ID is required for status check' },
            { status: 400 }
          );
        }
        
        const statusResult = await getPodStatus(podId);
        return NextResponse.json(statusResult);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use recruit, release, or status' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
