import { geminiClient } from './gemini-client';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

class GeminiTester {
  private results: TestResult[] = [];

  async runTest(): Promise<void> {
    console.log('🧪 TESTING GEMINI API INTEGRATION');
    console.log('=' .repeat(50));

    try {
      // Step 1: Check API key
      await this.checkApiKey();

      // Step 2: Test health check
      await this.testHealth();

      // Step 3: Test get models
      await this.testGetModels();

      // Step 4: Test text generation
      await this.testGeneration();

      // Step 5: Test code generation
      await this.testCodeGeneration();

      // Display results
      this.displayResults();

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.addResult('FATAL_ERROR', false, 'Test execution failed', null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async checkApiKey(): Promise<void> {
    console.log('\n🔑 STEP 1: Checking API key...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-api-key-here') {
      console.log('❌ GEMINI_API_KEY not set or using placeholder');
      this.addResult('CHECK_API_KEY', false, 'GEMINI_API_KEY not configured', null, 'Please set GEMINI_API_KEY environment variable');
    } else {
      console.log('✅ GEMINI_API_KEY is configured');
      this.addResult('CHECK_API_KEY', true, 'GEMINI_API_KEY is configured');
    }
  }

  private async testHealth(): Promise<void> {
    console.log('\n🏥 STEP 2: Testing health check...');
    
    try {
      const healthResult = await geminiClient.checkHealth();
      
      if (healthResult.success) {
        console.log('✅ Health check passed');
        console.log(`📋 Status: ${JSON.stringify(healthResult.data, null, 2)}`);
        this.addResult('TEST_HEALTH', true, 'Health check passed', healthResult.data);
      } else {
        console.log('❌ Health check failed');
        console.log(`📄 Error: ${healthResult.error}`);
        this.addResult('TEST_HEALTH', false, 'Health check failed', null, healthResult.error);
      }

    } catch (error) {
      console.log('❌ Health check error:', error);
      this.addResult('TEST_HEALTH', false, 'Health check error', null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testGetModels(): Promise<void> {
    console.log('\n📋 STEP 3: Testing get models...');
    
    try {
      const modelsResult = await geminiClient.getModels();
      
      if (modelsResult.success) {
        console.log('✅ Successfully retrieved models');
        console.log(`📋 Models: ${JSON.stringify(modelsResult.data, null, 2)}`);
        this.addResult('TEST_GET_MODELS', true, 'Successfully retrieved models', modelsResult.data);
      } else {
        console.log('❌ Failed to retrieve models');
        console.log(`📄 Error: ${modelsResult.error}`);
        this.addResult('TEST_GET_MODELS', false, 'Failed to retrieve models', null, modelsResult.error);
      }

    } catch (error) {
      console.log('❌ Get models error:', error);
      this.addResult('TEST_GET_MODELS', false, 'Get models error', null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testGeneration(): Promise<void> {
    console.log('\n🤖 STEP 4: Testing text generation...');
    
    try {
      const generateResult = await geminiClient.generate({
        prompt: 'Hello! This is a test of the Gemini API. Please respond with a simple greeting.',
        maxTokens: 100
      });
      
      if (generateResult.success) {
        console.log('✅ Text generation successful');
        console.log(`📄 Response: ${generateResult.data?.response}`);
        this.addResult('TEST_GENERATION', true, 'Text generation successful', generateResult.data);
      } else {
        console.log('❌ Text generation failed');
        console.log(`📄 Error: ${generateResult.error}`);
        this.addResult('TEST_GENERATION', false, 'Text generation failed', null, generateResult.error);
      }

    } catch (error) {
      console.log('❌ Text generation error:', error);
      this.addResult('TEST_GENERATION', false, 'Text generation error', null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testCodeGeneration(): Promise<void> {
    console.log('\n💻 STEP 5: Testing code generation...');
    
    try {
      const generateResult = await geminiClient.generate({
        prompt: 'Write a simple Python function to calculate fibonacci numbers. Return only the code, no explanations.',
        maxTokens: 200
      });
      
      if (generateResult.success) {
        console.log('✅ Code generation successful');
        console.log(`📄 Response: ${generateResult.data?.response}`);
        this.addResult('TEST_CODE_GENERATION', true, 'Code generation successful', generateResult.data);
      } else {
        console.log('❌ Code generation failed');
        console.log(`📄 Error: ${generateResult.error}`);
        this.addResult('TEST_CODE_GENERATION', false, 'Code generation failed', null, generateResult.error);
      }

    } catch (error) {
      console.log('❌ Code generation error:', error);
      this.addResult('TEST_CODE_GENERATION', false, 'Code generation error', null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private addResult(step: string, success: boolean, message: string, data?: any, error?: string): void {
    this.results.push({ step, success, message, data, error });
  }

  private displayResults(): void {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 GEMINI API TEST RESULTS');
    console.log('=' .repeat(50));

    const successCount = this.results.filter(r => r.success).length;
    const totalCount = this.results.length;

    console.log(`\n✅ Successful: ${successCount}/${totalCount}`);
    console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);

    console.log('\n📋 Detailed Results:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`\n${index + 1}. ${status} ${result.step}`);
      console.log(`   Message: ${result.message}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.data && typeof result.data === 'object') {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
      }
    });

    console.log('\n' + '=' .repeat(50));
    
    if (successCount === totalCount) {
      console.log('🎉 ALL TESTS PASSED! Gemini API is working perfectly.');
      console.log('✅ You can now use the Gemini API for your video creation workflow.');
    } else if (successCount > 0) {
      console.log('🎉 PARTIAL SUCCESS! Some features are working.');
      console.log('✅ Check the failed tests and fix any issues.');
    } else {
      console.log('⚠️ All tests failed. Check your API key and configuration.');
      console.log('💡 Make sure to set GEMINI_API_KEY environment variable.');
    }
    
    console.log('=' .repeat(50));
  }
}

// MAIN EXECUTION
async function main() {
  const tester = new GeminiTester();
  await tester.runTest();
}

// Run the test if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { GeminiTester };
