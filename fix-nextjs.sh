#!/bin/bash

# Fix Next.js module resolution issue
echo "🔧 Fixing Next.js module resolution issue..."

# Navigate to project directory
cd /home/unix/code/vibewave

# Remove corrupted files
echo "🗑️  Removing corrupted files..."
rm -rf node_modules package-lock.json .next

# Reinstall dependencies
echo "📦 Reinstalling dependencies..."
npm install

# Start Next.js development server
echo "🚀 Starting Next.js development server..."
npm run dev
