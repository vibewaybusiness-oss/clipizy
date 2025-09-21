import { NextRequest, NextResponse } from 'next/server';
import { fetchNetworkVolumes, fetchNetworkVolumeById } from '@/lib/runpod-api/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const volumeId = searchParams.get('id');

    if (volumeId) {
      const result = await fetchNetworkVolumeById(volumeId);
      return NextResponse.json(result);
    } else {
      const result = await fetchNetworkVolumes();
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
