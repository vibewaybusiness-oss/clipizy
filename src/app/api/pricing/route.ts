import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the pricing configuration from the JSON file
    const pricingPath = path.join(process.cwd(), 'api', 'library', 'prices.json');
    const pricingData = fs.readFileSync(pricingPath, 'utf8');
    const pricing = JSON.parse(pricingData);
    
    return NextResponse.json(pricing);
  } catch (error) {
    console.error('Error reading pricing configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load pricing configuration' },
      { status: 500 }
    );
  }
}
