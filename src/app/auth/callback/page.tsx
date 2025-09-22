'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function OAuthCallbackContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, setUser } = useAuth();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log('Frontend callback - Received code:', code ? `${code.substring(0, 10)}...` : 'None');
        console.log('Frontend callback - Received state:', state);
        console.log('Frontend callback - Received error:', error);

        if (error) {
          setStatus('error');
          setMessage(`Authentication failed: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          return;
        }

        // Determine provider from referrer or state
        const provider = state || 'google'; // Default to google if no state
        
        setMessage('Completing authentication...');

        // Call the backend OAuth callback endpoint via Next.js rewrites
        const response = await fetch(`/api/auth/${provider}/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Authentication failed');
        }

        const data = await response.json();

        // Store the token and user data
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
          }
        }

        // Update auth context
        setUser(data.user);

        // Log user ID to console after successful OAuth login
        console.log('🎉 OAuth Login Successful!');
        console.log('👤 User ID:', data.user.id);
        console.log('📧 User Email:', data.user.email);
        console.log('👨‍💼 User Name:', data.user.name);

        setStatus('success');
        setMessage('Authentication successful! Redirecting...');

        // Redirect to dashboard/create for new users after a short delay
        setTimeout(() => {
          router.push('/dashboard/create');
        }, 2000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
      }
    };

    handleOAuthCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            OAuth Authentication
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">
                Please wait while we complete your authentication...
              </p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-2">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
              <p className="text-sm text-green-600">
                You will be redirected to the dashboard shortly.
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-4">
              <XCircle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-sm text-red-600">
                {message}
              </p>
              <button
                onClick={() => router.push('/auth/login')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              OAuth Authentication
            </CardTitle>
            <CardDescription>
              Loading...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">
                Please wait while we load the authentication page...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
