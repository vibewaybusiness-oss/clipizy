// Test script to verify MusicClipAPI URL construction
const { MusicClipAPI } = require('./src/lib/api/music-clip.ts');

console.log('Testing MusicClipAPI URL construction...');

// Test in server-side context (simulate)
const originalWindow = global.window;
delete global.window;

const api = new MusicClipAPI();
console.log('Server-side baseUrl:', api.baseUrl);

// Test in client-side context (simulate)
global.window = {};

const api2 = new MusicClipAPI();
console.log('Client-side baseUrl:', api2.baseUrl);

// Restore window
global.window = originalWindow;

console.log('Test completed!');
