// Test script to verify parallel upload functionality
const fs = require('fs');
const path = require('path');

// Test the batch upload endpoint directly
async function testParallelUpload() {
    const testFiles = [
        'test.wav',
        'test_long.wav'
    ];
    
    console.log('Testing parallel upload functionality...');
    
    try {
        // First create a project
        const createResponse = await fetch('http://localhost:8000/api/music-clip/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Parallel Upload Test' })
        });
        
        if (!createResponse.ok) {
            throw new Error(`Failed to create project: ${createResponse.statusText}`);
        }
        
        const project = await createResponse.json();
        console.log('Created project:', project.project_id);
        
        // Prepare FormData for batch upload
        const formData = new FormData();
        
        // Add test files to FormData
        for (const filename of testFiles) {
            const filePath = path.join(__dirname, filename);
            if (fs.existsSync(filePath)) {
                const fileBuffer = fs.readFileSync(filePath);
                const file = new File([fileBuffer], filename, { type: 'audio/wav' });
                formData.append('files', file);
                console.log(`Added ${filename} to upload queue`);
            } else {
                console.log(`Warning: ${filename} not found, skipping`);
            }
        }
        
        formData.append('ai_generated', 'false');
        formData.append('instrumental', 'false');
        
        // Test batch upload
        console.log('Starting parallel upload...');
        const startTime = Date.now();
        
        const uploadResponse = await fetch(`http://localhost:8000/api/music-clip/projects/${project.project_id}/upload-tracks-batch`, {
            method: 'POST',
            body: formData
        });
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${uploadResponse.statusText} - ${errorText}`);
        }
        
        const result = await uploadResponse.json();
        
        console.log('Upload completed!');
        console.log(`Duration: ${duration.toFixed(2)}s`);
        console.log(`Total files: ${result.total_files}`);
        console.log(`Successful uploads: ${result.successful_uploads}`);
        console.log(`Failed uploads: ${result.failed_uploads}`);
        console.log(`Processing time: ${result.processing_time_seconds}s`);
        
        if (result.successful_tracks.length > 0) {
            console.log('Successfully uploaded tracks:');
            result.successful_tracks.forEach(track => {
                console.log(`- ${track.filename} (ID: ${track.track_id})`);
            });
        }
        
        if (result.failed_tracks.length > 0) {
            console.log('Failed tracks:');
            result.failed_tracks.forEach(track => {
                console.log(`- ${track.filename}: ${track.error}`);
            });
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Run the test
testParallelUpload();
