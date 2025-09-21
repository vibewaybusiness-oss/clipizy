import { NextRequest, NextResponse } from 'next/server';
import { getAccountSummary, getAccountInfo } from '@/lib/runpod-api/account';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get('summary') === 'true';

    if (summary) {
      const accountSummary = await getAccountSummary();
      return NextResponse.json(accountSummary);
    } else {
      const accountInfo = await getAccountInfo();
      return NextResponse.json({ 
        success: true, 
        data: accountInfo 
      });
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
