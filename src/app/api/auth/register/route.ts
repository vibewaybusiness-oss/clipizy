import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // For now, return an error since we're only supporting OAuth
    return NextResponse.json(
      { error: 'Email/password registration not supported. Please use Google or GitHub login.' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Auth register API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
