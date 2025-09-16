const fs = require('fs');
const http = require('http');

const COMFYUI_URL = 'http://127.0.0.1:8188';

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const req = http.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        statusText: res.statusMessage,
                        json: () => Promise.resolve(jsonData),
                        text: () => Promise.resolve(data)
                    });
                } catch (e) {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        statusText: res.statusMessage,
                        text: () => Promise.resolve(data)
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

async function runCleanQwenWorkflow() {
    try {
        console.log('👑 Running clean Qwen Image workflow: "Queen Elizabeth eating spaghetti"');
        
        // Load the clean workflow
        const workflowData = JSON.parse(fs.readFileSync('qwen-queen-clean-workflow.json', 'utf8'));
        
        console.log('📋 Clean workflow loaded successfully');
        console.log(`   - Nodes: ${Object.keys(workflowData).length}`);
        console.log(`   - Prompt: "${workflowData['6'].inputs.text}"`);
        
        // Check ComfyUI status
        console.log('\n🔍 Checking ComfyUI status...');
        const statusResponse = await makeRequest(`${COMFYUI_URL}/system_stats`);
        if (!statusResponse.ok) {
            throw new Error('ComfyUI is not running or not accessible');
        }
        console.log('   ✅ ComfyUI is running');
        
        // Check queue status
        console.log('\n🔍 Checking queue status...');
        const queueResponse = await makeRequest(`${COMFYUI_URL}/queue`);
        const queueData = await queueResponse.json();
        console.log(`   - Queue running: ${queueData.queue_running.length} items`);
        console.log(`   - Queue pending: ${queueData.queue_pending.length} items`);
        
        // Submit the workflow
        console.log('\n📤 Submitting clean Qwen workflow...');
        const submitResponse = await makeRequest(`${COMFYUI_URL}/prompt`, {
            method: 'POST',
            body: JSON.stringify({
                prompt: workflowData,
                client_id: 'qwen-queen-clean-workflow'
            })
        });
        
        if (!submitResponse.ok) {
            const errorText = await submitResponse.text();
            console.log('   ❌ Error details:', errorText);
            throw new Error(`Failed to submit workflow: ${submitResponse.status} ${submitResponse.statusText}`);
        }
        
        const submitData = await submitResponse.json();
        console.log(`   ✅ Workflow submitted successfully!`);
        console.log(`   - Prompt ID: ${submitData.prompt_id}`);
        
        // Monitor execution
        console.log('\n⏳ Monitoring workflow execution...');
        console.log('   This may take several minutes as Qwen Image generation is resource-intensive...');
        console.log('   The workflow will generate a 1328x1328 image of Queen Elizabeth eating spaghetti');
        
        let completed = false;
        let attempts = 0;
        const maxAttempts = 120; // 10 minutes max (Qwen can be slow)
        
        while (!completed && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            
            const historyResponse = await makeRequest(`${COMFYUI_URL}/history/${submitData.prompt_id}`);
            const historyData = await historyResponse.json();
            
            if (historyData[submitData.prompt_id]) {
                const promptData = historyData[submitData.prompt_id];
                
                if (promptData.status?.status === 'success') {
                    console.log('   ✅ Workflow completed successfully!');
                    console.log(`   - Execution time: ${promptData.status.exec_time} seconds`);
                    
                    // List generated files
                    if (promptData.outputs) {
                        console.log('\n📁 Generated files:');
                        Object.values(promptData.outputs).forEach(output => {
                            if (output.images) {
                                output.images.forEach(image => {
                                    console.log(`   - ${image.filename} (${image.type})`);
                                    console.log(`   - Size: ${image.width}x${image.height}`);
                                    console.log(`   - Subfolder: ${image.subfolder || 'N/A'}`);
                                });
                            }
                        });
                    }
                    
                    completed = true;
                } else if (promptData.status?.status === 'error') {
                    console.log('   ❌ Workflow failed!');
                    console.log(`   - Error: ${JSON.stringify(promptData.status, null, 2)}`);
                    completed = true;
                } else {
                    const status = promptData.status?.status || 'running';
                    const progress = promptData.status?.exec_info?.queue_remaining || 'unknown';
                    console.log(`   ⏳ Status: ${status} (attempt ${attempts + 1}/${maxAttempts}) - Queue remaining: ${progress}`);
                }
            } else {
                console.log(`   ⏳ Waiting for execution... (attempt ${attempts + 1}/${maxAttempts})`);
            }
            
            attempts++;
        }
        
        if (!completed) {
            console.log('   ⚠️  Workflow execution timed out');
        }
        
        // Check final queue status
        console.log('\n📊 Final queue status:');
        const finalQueueResponse = await makeRequest(`${COMFYUI_URL}/queue`);
        const finalQueueData = await finalQueueResponse.json();
        console.log(`   - Queue running: ${finalQueueData.queue_running.length} items`);
        console.log(`   - Queue pending: ${finalQueueData.queue_pending.length} items`);
        
        console.log('\n🎉 Qwen Image generation completed!');
        console.log('   Check your ComfyUI output folder for the generated image.');
        
    } catch (error) {
        console.error('❌ Error running workflow:', error.message);
        process.exit(1);
    }
}

runCleanQwenWorkflow();

