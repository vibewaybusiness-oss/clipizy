import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // For now, since we're not using proper refresh tokens in the OAuth callback,
    // we'll return an error indicating the refresh token is invalid
    return NextResponse.json(
      { error: 'Refresh token is invalid or expired' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Auth refresh API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
