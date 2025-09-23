import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('GitHub OAuth callback API route called');

    const body = await request.json();
    console.log('Request body:', body);

    const { code, state } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Try to call backend first
    try {
      const backendUrl = `${BACKEND_URL}/api/auth/github/callback`;
      console.log('Calling backend URL:', backendUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('Backend response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Backend response data:', data);
        return NextResponse.json(data);
      } else {
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }
    } catch (backendError) {
      console.log('Backend not available, handling OAuth callback directly:', backendError);
      
      // Handle OAuth callback directly
      const OAUTH_GITHUB_CLIENT_ID = process.env.OAUTH_GITHUB_CLIENT_ID || 'your_github_client_id';
      const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'your_github_client_secret';

      // Exchange code for access token
      const tokenUrl = 'https://github.com/login/oauth/access_token';
      const tokenData = {
        client_id: OAUTH_GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
      };

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenData),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('GitHub token exchange failed:', errorText);
        return NextResponse.json(
          { error: 'Failed to exchange authorization code for token' },
          { status: 400 }
        );
      }

      const tokenInfo = await tokenResponse.json();
      const accessToken = tokenInfo.access_token;

      if (!accessToken) {
        console.error('No access token received from GitHub');
        return NextResponse.json(
          { error: 'No access token received from GitHub' },
          { status: 400 }
        );
      }

      // Get user info from GitHub
      const userInfoUrl = 'https://api.github.com/user';
      const userResponse = await fetch(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!userResponse.ok) {
        console.error('Failed to get user info from GitHub');
        return NextResponse.json(
          { error: 'Failed to get user info from GitHub' },
          { status: 400 }
        );
      }

      const userInfo = await userResponse.json();

      // Get user email if not public
      let email = userInfo.email;
      if (!email) {
        const emailResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        
        if (emailResponse.ok) {
          const emails = await emailResponse.json();
          const primaryEmail = emails.find((e: any) => e.primary);
          if (primaryEmail) {
            email = primaryEmail.email;
          }
        }
      }

      // Create a simple user object
      const user = {
        id: userInfo.id.toString(),
        email: email || `${userInfo.login}@github.local`,
        name: userInfo.name || userInfo.login,
        avatar: userInfo.avatar_url,
        is_admin: false,
        is_active: true,
      };

      // Generate a simple access token (in production, use proper JWT)
      const access_token = Buffer.from(JSON.stringify({
        sub: userInfo.id.toString(),
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      })).toString('base64');

      const responseData = {
        access_token: access_token,
        refresh_token: null, // You might want to implement refresh tokens
        user: user
      };

      console.log('OAuth callback handled directly, user:', user.email);
      return NextResponse.json(responseData);
    }
  } catch (error) {
    console.error('GitHub OAuth callback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
