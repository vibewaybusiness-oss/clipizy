#!/bin/bash

# Start Next.js development server using Windows Node.js
cd /home/unix/code/vibewave

# Set environment variables
export NODE_OPTIONS="--max-old-space-size=4096"
export NEXT_TELEMETRY_DISABLED=1

# Use Windows Node.js with the correct working directory
echo "Starting Next.js development server using Windows Node.js..."
/mnt/c/Program\ Files/nodejs/node.exe /mnt/c/Users/willi/AppData/Roaming/npm/node_modules/npx/bin/npx-cli.js next dev
