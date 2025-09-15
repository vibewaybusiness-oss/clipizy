# Gemini API Integration

This directory contains the Google Gemini API integration for your video creation workflow.

## 🚀 Quick Start

### 1. Get API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" and create a new key
4. Copy the API key

### 2. Set Environment Variable
```bash
export GEMINI_API_KEY="your-api-key-here"
```

Or add to your `.env` file:
```
GEMINI_API_KEY=your-api-key-here
```

### 3. Test the Integration
```bash
npm run test:gemini
```

### 4. Run Example
```bash
npm run example:gemini
```

## 💰 Cost Information

- **Gemini 1.5 Flash**: $0.075 per 1M input tokens, $0.30 per 1M output tokens (CHEAPEST)
- **Much cheaper** than running local models
- **Faster** than local inference
- **Always available** (no GPU required)

## 🔧 Usage

```typescript
import { geminiClient } from './gemini-client';

// Set pod (for compatibility)
await geminiClient.setPod('gemini-cloud');

// Generate text
const result = await geminiClient.generate({
  prompt: 'Write a Python function to calculate fibonacci numbers',
  maxTokens: 200
});

if (result.success) {
  console.log(result.data?.response);
}
```

## 📋 Available Models

- `gemini-1.5-flash` (default, cheapest and fastest)
- `gemini-2.0-flash` (newer but more expensive)
- `gemini-1.5-pro` (more capable but slower and more expensive)

## 🧪 Testing

The test suite includes:
- API key validation
- Health check
- Model listing
- Text generation
- Code generation

Run `npm run test:gemini` to verify everything is working.
