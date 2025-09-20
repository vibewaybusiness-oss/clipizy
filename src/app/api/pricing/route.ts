import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch pricing configuration from the backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/pricing/config`);
    
    if (!response.ok) {
      throw new Error(`Backend API responded with status: ${response.status}`);
    }
    
    const pricing = await response.json();
    return NextResponse.json(pricing);
  } catch (error) {
    console.error('Error fetching pricing configuration from backend:', error);
    return NextResponse.json(
      { error: 'Failed to load pricing configuration' },
      { status: 500 }
    );
  }
}
