import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('GitHub auth API route called');

    const backendUrl = `${BACKEND_URL}/api/auth/github`;
    console.log('Calling backend URL:', backendUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      
      // If backend is not available, return a fallback response
      if (response.status === 500 || !response.ok) {
        console.log('Backend not available, using fallback GitHub OAuth URL');
        
        // Use environment variables or fallback values
        const OAUTH_GITHUB_CLIENT_ID = process.env.OAUTH_GITHUB_CLIENT_ID || 'your_github_client_id';
        const redirect_uri = process.env.OAUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/auth/callback`;
        
        const params = {
          client_id: OAUTH_GITHUB_CLIENT_ID,
          redirect_uri: redirect_uri,
          scope: 'user:email',
          response_type: 'code',
        };
        
        const query_string = Object.entries(params)
          .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
          .join('&');
        
        const auth_url = `https://github.com/login/oauth/authorize?${query_string}`;
        
        return NextResponse.json({ auth_url });
      }
      
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Backend response data:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('GitHub auth API error:', error);
    
    // Fallback to direct GitHub OAuth URL generation
    console.log('Using fallback GitHub OAuth URL generation');
    
    const OAUTH_GITHUB_CLIENT_ID = process.env.OAUTH_GITHUB_CLIENT_ID || 'your_github_client_id';
    const redirect_uri = process.env.OAUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/auth/callback`;
    
    const params = {
      client_id: OAUTH_GITHUB_CLIENT_ID,
      redirect_uri: redirect_uri,
      scope: 'user:email',
      response_type: 'code',
    };
    
    const query_string = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    
    const auth_url = `https://github.com/login/oauth/authorize?${query_string}`;
    
    return NextResponse.json({ auth_url });
  }
}
