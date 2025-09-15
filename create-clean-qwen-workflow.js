const fs = require('fs');

// Load the original workflow
const workflowPath = '\\\\wsl.localhost\\Ubuntu\\home\\unix\\code\\ComfyUI\\user\\default\\workflows\\Qwen\\qwen-image-4steps.json';
const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

console.log('🧹 Creating clean Qwen workflow (removing unsupported nodes)...');

// Create a clean workflow with only the essential nodes
const cleanWorkflow = {};

// Essential nodes mapping
const essentialNodes = {
    37: 'UNETLoader',
    38: 'CLIPLoader', 
    39: 'VAELoader',
    6: 'CLIPTextEncode',  // Positive prompt
    7: 'CLIPTextEncode',  // Negative prompt
    58: 'EmptySD3LatentImage',
    75: 'LoraLoaderModelOnly',
    66: 'ModelSamplingAuraFlow',
    3: 'KSampler',
    8: 'VAEDecode',
    60: 'SaveImage'
};

// Convert essential nodes only
workflowData.nodes.forEach(node => {
    if (essentialNodes[node.id]) {
        const nodeId = node.id.toString();
        cleanWorkflow[nodeId] = {
            inputs: {},
            class_type: essentialNodes[node.id]
        };
        
        // Set up inputs based on node type
        switch (node.type) {
            case 'UNETLoader':
                cleanWorkflow[nodeId].inputs.unet_name = 'qwen_image_fp8_e4m3fn.safetensors';
                cleanWorkflow[nodeId].inputs.weight_dtype = 'default';
                break;
                
            case 'CLIPLoader':
                cleanWorkflow[nodeId].inputs.clip_name = 'qwen_2.5_vl_7b_fp8_scaled.safetensors';
                cleanWorkflow[nodeId].inputs.type = 'qwen_image';
                cleanWorkflow[nodeId].inputs.device = 'default';
                break;
                
            case 'VAELoader':
                cleanWorkflow[nodeId].inputs.vae_name = 'qwen_image_vae.safetensors';
                break;
                
            case 'CLIPTextEncode':
                if (node.id === 6) {
                    // Positive prompt
                    cleanWorkflow[nodeId].inputs.text = "Queen Elizabeth eating spaghetti, royal dining, elegant, detailed, high quality, photorealistic";
                    cleanWorkflow[nodeId].inputs.clip = ['38', 0];
                } else if (node.id === 7) {
                    // Negative prompt
                    cleanWorkflow[nodeId].inputs.text = "blurry, low quality, distorted, ugly, bad anatomy";
                    cleanWorkflow[nodeId].inputs.clip = ['38', 0];
                }
                break;
                
            case 'EmptySD3LatentImage':
                cleanWorkflow[nodeId].inputs.width = 1328;
                cleanWorkflow[nodeId].inputs.height = 1328;
                cleanWorkflow[nodeId].inputs.batch_size = 1;
                break;
                
            case 'LoraLoaderModelOnly':
                cleanWorkflow[nodeId].inputs.model = ['37', 0];
                cleanWorkflow[nodeId].inputs.lora_name = 'Qwen-Image-Lightning-4steps-V1.0-bf16.safetensors';
                cleanWorkflow[nodeId].inputs.strength_model = 1;
                break;
                
            case 'ModelSamplingAuraFlow':
                cleanWorkflow[nodeId].inputs.model = ['75', 0];
                cleanWorkflow[nodeId].inputs.shift = 3;
                break;
                
            case 'KSampler':
                cleanWorkflow[nodeId].inputs.model = ['66', 0];
                cleanWorkflow[nodeId].inputs.positive = ['6', 0];
                cleanWorkflow[nodeId].inputs.negative = ['7', 0];
                cleanWorkflow[nodeId].inputs.latent_image = ['58', 0];
                cleanWorkflow[nodeId].inputs.seed = 42;
                cleanWorkflow[nodeId].inputs.steps = 4;
                cleanWorkflow[nodeId].inputs.cfg = 1;
                cleanWorkflow[nodeId].inputs.sampler_name = 'euler';
                cleanWorkflow[nodeId].inputs.scheduler = 'simple';
                cleanWorkflow[nodeId].inputs.denoise = 1;
                break;
                
            case 'VAEDecode':
                cleanWorkflow[nodeId].inputs.samples = ['3', 0];
                cleanWorkflow[nodeId].inputs.vae = ['39', 0];
                break;
                
            case 'SaveImage':
                cleanWorkflow[nodeId].inputs.images = ['8', 0];
                cleanWorkflow[nodeId].inputs.filename_prefix = 'Queen_Elizabeth_Spaghetti';
                break;
        }
    }
});

// Save the clean workflow
const outputPath = 'qwen-queen-clean-workflow.json';
fs.writeFileSync(outputPath, JSON.stringify(cleanWorkflow, null, 2));

console.log(`\n📁 Clean workflow saved to: ${outputPath}`);
console.log(`📊 Clean workflow has ${Object.keys(cleanWorkflow).length} nodes`);

// Display the clean workflow structure
console.log('\n📋 Clean workflow structure:');
Object.keys(cleanWorkflow).forEach(nodeId => {
    const node = cleanWorkflow[nodeId];
    console.log(`Node ${nodeId}: ${node.class_type}`);
    console.log(`  Inputs: ${Object.keys(node.inputs).join(', ')}`);
});

console.log('\n✅ Clean workflow created successfully!');
console.log('   - Removed unsupported nodes (MarkdownNote, Note)');
console.log('   - Set up proper node connections');
console.log('   - Updated prompt to "Queen Elizabeth eating spaghetti"');
