import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl, getTimeout } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    console.log('Music-clip projects API route called');
    console.log('BACKEND_URL env var:', process.env.BACKEND_URL);

    const backendUrl = `${getBackendUrl()}/api/music-clip/projects`;
    console.log('Calling backend URL:', backendUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout('default'));

    let response: Response;
    try {
      response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
        signal: controller.signal,
      });
    } catch (fetchError) {
      console.log('Backend not available, returning empty projects list:', fetchError);
      // Return empty projects list when backend is not available
      return NextResponse.json({
        projects: []
      });
    }

    clearTimeout(timeoutId);

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      
      // If backend returns an error, return empty projects list
      if (response.status >= 500) {
        console.log('Backend server error, returning empty projects list');
        return NextResponse.json({
          projects: []
        });
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
    console.error('Music-clip projects API error:', error);
    // Return empty projects list on any error
    console.log('Returning empty projects list due to error');
    return NextResponse.json({
      projects: []
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Music-clip create project API route called');

    const body = await request.json();
    console.log('Request body:', body);

    const backendUrl = `${getBackendUrl()}/api/music-clip/projects`;
    console.log('Calling backend URL:', backendUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getTimeout('default'));

    let response: Response;
    try {
      response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchError) {
      console.log('Backend not available, returning mock project:', fetchError);
      // Return a mock project when backend is not available
      return NextResponse.json({
        id: `mock-${Date.now()}`,
        name: body.name || 'Mock Project',
        description: body.description || '',
        status: 'created',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'mock-user'
      });
    }

    clearTimeout(timeoutId);

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      
      // If backend returns an error, return a mock project
      if (response.status >= 500) {
        console.log('Backend server error, returning mock project');
        return NextResponse.json({
          id: `mock-${Date.now()}`,
          name: body.name || 'Mock Project',
          description: body.description || '',
          status: 'created',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: 'mock-user'
        });
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
    console.error('Music-clip create project API error:', error);
    // Return a mock project on any error
    console.log('Returning mock project due to error');
    return NextResponse.json({
      id: `mock-${Date.now()}`,
      name: 'Mock Project',
      description: '',
      status: 'created',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'mock-user'
    });
  }
}
