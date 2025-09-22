# Fix Next.js Module Resolution Issue

## Problem
The `next-flight-client-entry-loader` module resolution error is caused by corrupted node_modules due to WSL/Windows file system conflicts.

## Solution

### Option 1: Clean Install (Recommended)
Run these commands in WSL:

```bash
cd /home/unix/code/vibewave
rm -rf node_modules package-lock.json .next
npm install
npm run dev
```

### Option 2: Use Yarn Instead
```bash
cd /home/unix/code/vibewave
rm -rf node_modules package-lock.json .next
yarn install
yarn dev
```

### Option 3: Manual Fix
1. Delete the entire `node_modules` directory
2. Delete `package-lock.json`
3. Delete `.next` directory
4. Run `npm install` from WSL terminal
5. Run `npm run dev` from WSL terminal

## Why This Happens
- WSL/Windows file system conflicts cause permission issues
- UNC paths cause Node.js to default to Windows directory
- Corrupted symlinks in node_modules/.bin/

## Prevention
Always run npm/yarn commands from within WSL, not from Windows PowerShell.
