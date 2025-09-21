// Test script to verify WSL network connectivity
const fetch = require('node-fetch');

async function testConnection() {
  console.log('Testing WSL network connectivity...');
  
  // Test backend health
  try {
    console.log('Testing backend health at http://172.31.247.43:8000/health...');
    const backendResponse = await fetch('http://172.31.247.43:8000/health');
    const backendData = await backendResponse.json();
    console.log('✅ Backend health check:', backendData);
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
  }
  
  // Test frontend API
  try {
    console.log('Testing frontend API at http://172.31.247.43:3000/api/music-clip/projects...');
    const frontendResponse = await fetch('http://172.31.247.43:3000/api/music-clip/projects');
    const frontendData = await frontendResponse.json();
    console.log('✅ Frontend API check:', frontendData);
  } catch (error) {
    console.error('❌ Frontend API check failed:', error.message);
  }
}

testConnection();
