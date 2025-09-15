import { geminiClient } from './gemini-client';

async function exampleUsage() {
  console.log('🚀 GEMINI API USAGE EXAMPLE');
  console.log('=' .repeat(40));

  try {
    // Set a dummy pod (for compatibility)
    await geminiClient.setPod('gemini-cloud');

    // Get available models
    console.log('\n📋 Available models:');
    const modelsResult = await geminiClient.getModels();
    if (modelsResult.success) {
      console.log(JSON.stringify(modelsResult.data, null, 2));
    }

    // Generate text
    console.log('\n🤖 Text generation:');
    const textResult = await geminiClient.generate({
      prompt: 'Explain how AI works in a few words',
      maxTokens: 100
    });
    
    if (textResult.success) {
      console.log(`Response: ${textResult.data?.response}`);
    } else {
      console.log(`Error: ${textResult.error}`);
    }

    // Generate code
    console.log('\n💻 Code generation:');
    const codeResult = await geminiClient.generate({
      prompt: 'Write a Python function to calculate fibonacci numbers',
      maxTokens: 200
    });
    
    if (codeResult.success) {
      console.log(`Code:\n${codeResult.data?.response}`);
    } else {
      console.log(`Error: ${codeResult.error}`);
    }

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Run the example
exampleUsage();
