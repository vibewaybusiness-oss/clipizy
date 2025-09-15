import { StableAudio2Client } from './client';

async function testIntegration() {
  console.log('🧪 Testing Stable Audio 2 Integration with Music Creation Workflow...\n');

  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    console.log('❌ STABILITY_API_KEY environment variable not set');
    console.log('Please set your Stability AI API key:');
    console.log('export STABILITY_API_KEY=your-api-key-here');
    return;
  }

  const client = new StableAudio2Client({ apiKey });

  const testPrompt = "A song in the 3/4 time signature that features cheerful acoustic guitar, live recorded drums, and rhythmic claps, The mood is happy and up-lifting.";

  console.log('🎵 Testing music generation...');
  console.log(`Prompt: ${testPrompt}`);
  console.log('Duration: 20 seconds');
  console.log('Model: stable-audio-2.5');
  console.log('Format: MP3\n');

  try {
    const result = await client.textToAudio({
      prompt: testPrompt,
      duration: 20,
      output_format: "mp3",
      model: "stable-audio-2.5"
    });

    if (result.success && result.audio) {
      console.log('✅ Music generation successful!');
      console.log(`Audio size: ${result.audio.length} bytes`);
      console.log(`Audio size: ${(result.audio.length / 1024 / 1024).toFixed(2)} MB`);
      
      // Test saving to file
      const saveResult = await client.textToAudioAndSave({
        prompt: testPrompt,
        duration: 20,
        output_format: "mp3",
        model: "stable-audio-2.5"
      }, './test-generated-music.mp3');
      
      if (saveResult.success) {
        console.log('✅ Audio saved successfully to test-generated-music.mp3');
      } else {
        console.log('❌ Failed to save audio:', saveResult.error);
      }
    } else {
      console.log('❌ Music generation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }

  console.log('\n🎯 Integration test completed!');
  console.log('\nNext steps:');
  console.log('1. Set STABILITY_API_KEY environment variable');
  console.log('2. Run the application: npm run dev');
  console.log('3. Navigate to /dashboard/create/music-clip');
  console.log('4. Try generating music with AI');
}

if (require.main === module) {
  testIntegration().catch(console.error);
}

export { testIntegration };
