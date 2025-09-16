# Stable Audio 2 Integration

This module provides a TypeScript client for the Stability AI Stable Audio 2 API, allowing you to generate audio from text prompts.

## Features

- Text-to-audio generation using Stable Audio 2.5 and Stable Audio 2 models
- Support for multiple output formats (MP3, WAV, FLAC)
- Configurable duration and model selection
- Automatic file saving functionality
- TypeScript support with full type definitions

## Installation

```bash
npm install
```

## Usage

### Basic Usage

```typescript
import { StableAudio2Client } from './client';

const client = new StableAudio2Client({
  apiKey: 'your-api-key-here'
});

const result = await client.textToAudio({
  prompt: "A cheerful acoustic guitar song with drums",
  output_format: "mp3",
  duration: 20,
  model: "stable-audio-2.5"
});

if (result.success) {
  console.log('Audio generated successfully!');
  // result.audio contains the audio buffer
} else {
  console.error('Error:', result.error);
}
```

### Save to File

```typescript
const result = await client.textToAudioAndSave({
  prompt: "Your audio prompt here",
  output_format: "mp3",
  duration: 20
}, './output.mp3');
```

## API Reference

### StableAudio2Client

#### Constructor
- `apiKey`: Your Stability AI API key
- `baseUrl`: Optional base URL (defaults to Stability AI API)

#### Methods

##### textToAudio(request: StableAudio2Request)
Generates audio from text prompt and returns the audio buffer.

##### textToAudioAndSave(request: StableAudio2Request, outputPath: string)
Generates audio and saves it directly to a file.

### Types

#### StableAudio2Request
- `prompt`: Text description of the desired audio
- `output_format`: 'mp3' | 'wav' | 'flac' (default: 'mp3')
- `duration`: Duration in seconds (default: 20)
- `model`: 'stable-audio-2.5' | 'stable-audio-2' (default: 'stable-audio-2.5')

#### StableAudio2Response
- `success`: Boolean indicating if the request was successful
- `audio`: Buffer containing the generated audio (if successful)
- `error`: Error message (if failed)

## Examples

See `example-usage.ts` for a complete working example.

## Testing

Run the test suite:

```bash
npx ts-node test-stable-audio.ts
```

Make sure to set your API key as an environment variable:

```bash
export STABILITY_API_KEY=your-api-key-here
```

## Environment Variables

- `STABILITY_API_KEY`: Your Stability AI API key

## Error Handling

The client handles various error scenarios:
- Network errors
- API errors (invalid API key, rate limits, etc.)
- File system errors (when saving files)
- Invalid request parameters

All errors are returned in the response object with descriptive error messages.
