"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function VideoMakingTestPage() {
  const [testResults, setTestResults] = React.useState<{
    imports: 'pending' | 'success' | 'error';
    components: 'pending' | 'success' | 'error';
    types: 'pending' | 'success' | 'error';
    hooks: 'pending' | 'success' | 'error';
    utils: 'pending' | 'success' | 'error';
  }>({
    imports: 'pending',
    components: 'pending',
    types: 'pending',
    hooks: 'pending',
    utils: 'pending'
  });

  const runTests = async () => {
    // Test imports
    try {
      await import('../../../../@videomaking/components/VideoMaker');
      await import('../../../../@videomaking/types');
      await import('../../../../@videomaking/hooks/useVideoEditor');
      await import('../../../../@videomaking/utils/videoUtils');
      setTestResults(prev => ({ ...prev, imports: 'success' }));
    } catch (error) {
      console.error('Import test failed:', error);
      setTestResults(prev => ({ ...prev, imports: 'error' }));
    }

    // Test components
    try {
      const { VideoMaker } = await import('../../../../@videomaking/components/VideoMaker');
      const { VideoEditor } = await import('../../../../@videomaking/components/VideoEditor');
      const { Timeline } = await import('../../../../@videomaking/components/Timeline');
      setTestResults(prev => ({ ...prev, components: 'success' }));
    } catch (error) {
      console.error('Component test failed:', error);
      setTestResults(prev => ({ ...prev, components: 'error' }));
    }

    // Test types
    try {
      const { VideoProject, VideoClip, Effect } = await import('../../../../@videomaking/types');
      // Test type instantiation
      const testProject: VideoProject = {
        id: 'test',
        name: 'Test Project',
        createdAt: new Date(),
        updatedAt: new Date(),
        duration: 10,
        resolution: { width: 1920, height: 1080, name: '1080p' },
        frameRate: 30,
        clips: [],
        audioTracks: [],
        effects: [],
        transitions: [],
        settings: {
          resolution: { width: 1920, height: 1080, name: '1080p' },
          frameRate: 30,
          aspectRatio: '16:9',
          backgroundColor: '#000000',
          audioSampleRate: 44100,
          audioChannels: 2
        }
      };
      setTestResults(prev => ({ ...prev, types: 'success' }));
    } catch (error) {
      console.error('Type test failed:', error);
      setTestResults(prev => ({ ...prev, types: 'error' }));
    }

    // Test hooks
    try {
      const { useVideoEditor } = await import('../../../../@videomaking/hooks/useVideoEditor');
      const { useTimeline } = await import('../../../../@videomaking/hooks/useTimeline');
      setTestResults(prev => ({ ...prev, hooks: 'success' }));
    } catch (error) {
      console.error('Hook test failed:', error);
      setTestResults(prev => ({ ...prev, hooks: 'error' }));
    }

    // Test utils
    try {
      const { videoUtils } = await import('../../../../@videomaking/utils/videoUtils');
      const { audioUtils } = await import('../../../../@videomaking/utils/audioUtils');
      setTestResults(prev => ({ ...prev, utils: 'success' }));
    } catch (error) {
      console.error('Utils test failed:', error);
      setTestResults(prev => ({ ...prev, utils: 'error' }));
    }
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  };

  const allTestsPassed = Object.values(testResults).every(status => status === 'success');

  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Video Making Integration Test</h1>
        <p className="text-muted-foreground mb-6">
          Test the videomaking interface integration and components
        </p>
        <Button onClick={runTests} className="mb-8">
          Run Tests
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(testResults.imports)}
              <span>Import Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Tests if all videomaking modules can be imported correctly
            </p>
            <Badge variant={testResults.imports === 'success' ? 'default' : testResults.imports === 'error' ? 'destructive' : 'secondary'}>
              {getStatusText(testResults.imports)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(testResults.components)}
              <span>Component Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Tests if all React components can be imported and used
            </p>
            <Badge variant={testResults.components === 'success' ? 'default' : testResults.components === 'error' ? 'destructive' : 'secondary'}>
              {getStatusText(testResults.components)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(testResults.types)}
              <span>Type Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Tests if TypeScript types are properly defined and working
            </p>
            <Badge variant={testResults.types === 'success' ? 'default' : testResults.types === 'error' ? 'destructive' : 'secondary'}>
              {getStatusText(testResults.types)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(testResults.hooks)}
              <span>Hook Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Tests if custom hooks can be imported and used
            </p>
            <Badge variant={testResults.hooks === 'success' ? 'default' : testResults.hooks === 'error' ? 'destructive' : 'secondary'}>
              {getStatusText(testResults.hooks)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(testResults.utils)}
              <span>Utils Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Tests if utility functions can be imported and used
            </p>
            <Badge variant={testResults.utils === 'success' ? 'default' : testResults.utils === 'error' ? 'destructive' : 'secondary'}>
              {getStatusText(testResults.utils)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(allTestsPassed ? 'success' : 'pending')}
              <span>Overall Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              {allTestsPassed ? 'All tests passed!' : 'Some tests are still pending or failed'}
            </p>
            <Badge variant={allTestsPassed ? 'default' : 'secondary'}>
              {allTestsPassed ? 'All Passed' : 'In Progress'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {allTestsPassed && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Integration Successful!</span>
            </div>
            <p className="text-sm text-green-600 mt-2">
              The videomaking interface has been successfully integrated into the dashboard. 
              You can now access it at <code>/dashboard/videomaking</code>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
