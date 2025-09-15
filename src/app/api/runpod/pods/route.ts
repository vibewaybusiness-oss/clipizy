import { NextRequest, NextResponse } from 'next/server';
import { fetchPods, fetchPodById } from '@/lib/runpod-api/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const podId = searchParams.get('id');

    if (podId) {
      const result = await fetchPodById(podId);
      return NextResponse.json(result);
    } else {
      const result = await fetchPods();
      return NextResponse.json(result);
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
