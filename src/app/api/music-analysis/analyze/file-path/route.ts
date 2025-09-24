import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    console.log('Music analysis file-path API route called');

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('file_path');
    const analysisType = searchParams.get('analysis_type') || 'comprehensive';

    if (!filePath) {
      return NextResponse.json(
        { error: 'file_path parameter is required' },
        { status: 400 }
      );
    }

    console.log('File path:', filePath);
    console.log('Analysis type:', analysisType);

    // Construct the backend URL with the file path
    const backendUrl = `${BACKEND_URL}/api/music-analysis/analyze/file-path?file_path=${encodeURIComponent(filePath)}&analysis_type=${analysisType}`;
    console.log('Calling backend URL:', backendUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for analysis

    const response = await fetch(backendUrl, {
      method: 'POST',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      
      // Parse error details if available
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { detail: errorText };
      }
      
      // Provide more specific error messages
      if (response.status === 404) {
        return NextResponse.json(
          { 
            error: 'File not found',
            details: errorDetails.detail || errorText,
            suggestion: 'The file may not have been uploaded successfully or the project may not exist in the file system. Please try re-uploading the file.',
            filePath: filePath
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          error: `Backend error: ${response.status}`,
          details: errorDetails.detail || errorText,
          filePath: filePath
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Backend response data:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Music analysis file-path API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
