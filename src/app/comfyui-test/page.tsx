'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Image as ImageIcon, RefreshCw } from 'lucide-react';

export default function ComfyUITestPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [workflows, setWorkflows] = useState([]);
  const [podInfo, setPodInfo] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/comfyui/status', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
      const data = await response.json();

      if (data.success) {
        setIsConnected(data.connected);
        setPodInfo({
          podId: data.pod_id,
          podIp: data.pod_ip,
          workflows: data.available_workflows
        });
        setWorkflows(data.available_workflows || []);
      } else {
        setError(data.error || 'Failed to connect to ComfyUI');
        setIsConnected(false);
      }
    } catch (error) {
      setError('Failed to connect to ComfyUI API');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const recruitPod = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/comfyui?action=recruit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setError('');
        await checkStatus(); // Refresh status
      } else {
        // Show the detailed error message and instructions
        const errorMsg = data.error || 'Failed to recruit pod';
        const instructions = data.instructions ?
          `\n\nInstructions:\n${Object.entries(data.instructions).map(([key, value]) => `${key}: ${value}`).join('\n')}` : '';
        const alternative = data.alternative ? `\n\nAlternative: ${data.alternative}` : '';
        setError(errorMsg + instructions + alternative);
      }
    } catch (error) {
      setError('Failed to recruit pod');
    } finally {
      setIsLoading(false);
    }
  };

  const releasePod = async () => {
    if (!confirm('Are you sure you want to release the current pod?')) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/comfyui?action=release', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setError('');
        await checkStatus(); // Refresh status
      } else {
        setError(data.error || 'Failed to release pod');
      }
    } catch (error) {
      setError('Failed to release pod');
    } finally {
      setIsLoading(false);
    }
  };

  const exposePort = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/comfyui?action=expose-port', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
      const data = await response.json();

      if (data.success) {
        setError('');
        // Show success message with instructions
        setError(`✅ ${data.message}\n\nProxy URL: ${data.proxyUrl}\n\nPlease wait for the pod to restart, then refresh this page.`);
        // Auto-refresh after 30 seconds
        setTimeout(() => {
          checkStatus();
        }, 30000);
      } else {
        setError(data.error || 'Failed to expose port 8188');
      }
    } catch (error) {
      setError('Failed to expose port 8188');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🎨 ComfyUI Test Page</h1>
        <p className="text-muted-foreground">
          Test your ComfyUI integration and pod management
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            System Status
          </CardTitle>
        <CardDescription>
          Current ComfyUI pod and connection status. Port 8188 is automatically exposed for new pods.
        </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={checkStatus}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {podInfo && (
            <div className="space-y-2 text-sm">
              <p><strong>Pod ID:</strong> {podInfo.podId || 'None'}</p>
              <p><strong>Pod IP:</strong> {podInfo.podIp || 'None'}</p>
              <p><strong>Available Workflows:</strong> {podInfo.workflows?.length || 0}</p>
            </div>
          )}

          {workflows.length > 0 && (
            <div>
              <p className="font-medium mb-2">Available Workflows:</p>
              <div className="flex flex-wrap gap-2">
                {workflows.map((workflow: string) => (
                  <Badge key={workflow} variant="secondary">
                    {workflow}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pod Management */}
      <Card>
        <CardHeader>
          <CardTitle>Pod Management</CardTitle>
          <CardDescription>
            Recruit or release ComfyUI pods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={recruitPod}
                disabled={isLoading || isConnected}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  '🚀'
                )}
                Recruit New Pod
              </Button>
              <Button
                onClick={releasePod}
                disabled={isLoading || !isConnected}
                variant="destructive"
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  '🗑️'
                )}
                Release Pod
              </Button>
            </div>

            {/* Expose Port Button */}
            <div className="border-t pt-4">
              <Button
                onClick={exposePort}
                disabled={isLoading || isConnected}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  '🔧'
                )}
                Expose Port 8188 (API)
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Expose port 8188 for existing pods (new pods have it automatically)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Link */}
      <Card>
        <CardHeader>
          <CardTitle>ComfyUI Dashboard</CardTitle>
          <CardDescription>
            Access the full ComfyUI dashboard for image generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => window.open('/api/comfyui', '_blank')}
            disabled={!isConnected}
            className="w-full"
          >
            🎨 Open ComfyUI Dashboard
          </Button>
        </CardContent>
      </Card>

      {/* Error Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {isConnected && !error && (
        <Alert>
          <AlertDescription>
            ✅ ComfyUI is connected and ready! You can now use the dashboard to generate images.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
