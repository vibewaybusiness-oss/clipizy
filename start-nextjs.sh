#!/bin/bash

# Start Next.js development server
cd /home/unix/code/vibewave

# Set environment variables to avoid UNC path issues
export NODE_OPTIONS="--max-old-space-size=4096"
export NEXT_TELEMETRY_DISABLED=1

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

# Try different methods to start Next.js
echo "Starting Next.js development server..."

# Method 1: Try using npx with explicit path
if command -v npx >/dev/null 2>&1; then
    echo "Trying npx next dev..."
    npx next dev
elif [ -f "./node_modules/.bin/next" ]; then
    echo "Trying local next binary..."
    ./node_modules/.bin/next dev
else
    echo "Trying node directly..."
    node ./node_modules/next/dist/bin/next dev
fi
