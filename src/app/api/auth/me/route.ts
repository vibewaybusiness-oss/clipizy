import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    try {
      let payload: any;
      
      // Check if it's a JWT token (has 3 parts separated by dots)
      if (token.split('.').length === 3) {
        // JWT token - decode the payload (second part)
        payload = JSON.parse(atob(token.split('.')[1]));
      } else {
        // Legacy simple base64-encoded JSON object
        payload = JSON.parse(atob(token));
      }
      
      // Check if token is expired
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return NextResponse.json(
          { error: 'Token expired' },
          { status: 401 }
        );
      }

      // Return user data from token
      const user = {
        id: payload.sub,
        email: payload.email || 'user@example.com', // Fallback if email not in token
        name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'), // Use name from token or email prefix
        is_active: true,
        is_admin: false,
      };

      return NextResponse.json(user);
    } catch (error) {
      console.error('Token decode error:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Auth me API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
