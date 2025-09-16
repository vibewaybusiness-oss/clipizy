import { StableAudio2Client } from './client';
import { StableAudio2Request } from './types';

async function exampleUsage() {
  const client = new StableAudio2Client({
    apiKey: 'sk-MYAPIKEY', // Replace with your actual API key
  });

  const request: StableAudio2Request = {
    prompt: "A song in the 3/4 time signature that features cheerful acoustic guitar, live recorded drums, and rhythmic claps, The mood is happy and up-lifting.",
    output_format: "mp3",
    duration: 20,
    model: "stable-audio-2.5"
  };

  console.log('Generating audio with Stable Audio 2...');
  console.log('Prompt:', request.prompt);
  
  const result = await client.textToAudio(request);
  
  if (result.success) {
    console.log('✅ Audio generated successfully!');
    console.log(`Audio size: ${result.audio?.length} bytes`);
    
    // Save to file
    const saveResult = await client.textToAudioAndSave(request, './uk-bass.mp3');
    if (saveResult.success) {
      console.log('✅ Audio saved to uk-bass.mp3');
    } else {
      console.error('❌ Failed to save audio:', saveResult.error);
    }
  } else {
    console.error('❌ Failed to generate audio:', result.error);
  }
}

if (require.main === module) {
  exampleUsage().catch(console.error);
}

export { exampleUsage };
