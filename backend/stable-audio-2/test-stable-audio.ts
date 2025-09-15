import { StableAudio2Client } from './client';
import { StableAudio2Request } from './types';

async function testStableAudio2() {
  console.log('🧪 Testing Stable Audio 2 Integration...\n');

  const client = new StableAudio2Client({
    apiKey: process.env.STABILITY_API_KEY || 'sk-MYAPIKEY',
  });

  const testCases: StableAudio2Request[] = [
    {
      prompt: "A song in the 3/4 time signature that features cheerful acoustic guitar, live recorded drums, and rhythmic claps, The mood is happy and up-lifting.",
      output_format: "mp3",
      duration: 20,
      model: "stable-audio-2.5"
    },
    {
      prompt: "Ambient electronic music with soft synthesizers and gentle beats",
      output_format: "wav",
      duration: 15,
      model: "stable-audio-2"
    },
    {
      prompt: "Jazz piano solo with walking bass line",
      output_format: "flac",
      duration: 30,
      model: "stable-audio-2.5"
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`Test ${i + 1}: ${testCase.prompt.substring(0, 50)}...`);
    console.log(`Format: ${testCase.output_format}, Duration: ${testCase.duration}s, Model: ${testCase.model}`);
    
    const result = await client.textToAudio(testCase);
    
    if (result.success) {
      console.log(`✅ Success! Audio size: ${result.audio?.length} bytes\n`);
    } else {
      console.log(`❌ Failed: ${result.error}\n`);
    }
  }
}

if (require.main === module) {
  testStableAudio2().catch(console.error);
}

export { testStableAudio2 };
