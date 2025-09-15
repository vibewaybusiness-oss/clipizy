import { geminiClient } from './gemini-client';

async function quickTest() {
  console.log('🚀 GEMINI API QUICK TEST');
  console.log('=' .repeat(30));

  // Check if API key is loaded
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`API Key loaded: ${apiKey ? 'Yes' : 'No'}`);
  
  if (!apiKey) {
    console.log('❌ Please set GEMINI_API_KEY in your .env.local file');
    console.log('Example: GEMINI_API_KEY=your-api-key-here');
    return;
  }

  try {
    // Set pod
    await geminiClient.setPod('gemini-cloud');
    console.log('✅ Pod set');

    // Test health
    const health = await geminiClient.checkHealth();
    console.log(`Health: ${health.success ? '✅' : '❌'}`);

    // Test generation
    const result = await geminiClient.generate({
      prompt: 'Hello! This is a test of Gemini API. Please respond with a simple greeting.',
      maxTokens: 50
    });

    if (result.success) {
      console.log('✅ Generation successful!');
      console.log(`Response: ${result.data?.response}`);
    } else {
      console.log('❌ Generation failed');
      console.log(`Error: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

quickTest();
