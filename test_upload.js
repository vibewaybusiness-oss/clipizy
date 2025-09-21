// Test script to verify file upload works
const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

async function testUpload() {
  console.log('Testing file upload...');
  
  try {
    // Create a small test file
    const testContent = 'This is a test audio file content';
    fs.writeFileSync('test_audio.wav', testContent);
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test_audio.wav'), {
      filename: 'test_audio.wav',
      contentType: 'audio/wav'
    });
    formData.append('ai_generated', 'false');
    formData.append('instrumental', 'false');
    
    // Test upload
    const projectId = '6fdf6060-02b7-4c16-b5de-922bd300ee8b';
    const uploadUrl = `http://172.31.247.43:3000/api/music-clip/projects/${projectId}/upload-track`;
    
    console.log('Uploading to:', uploadUrl);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Upload successful:', data);
    } else {
      const errorText = await response.text();
      console.error('❌ Upload failed:', errorText);
    }
    
    // Clean up
    fs.unlinkSync('test_audio.wav');
    
  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
  }
}

testUpload();
