# Google Provider Model Name Fix

## Issue
The error `model 'gemini-3-flash' does not exist` occurred because the model name was incorrect.

## Root Cause
According to [Google's official documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview), the correct model name is:
- ✅ `gemini-3-flash-preview` (CORRECT)
- ❌ `gemini-3-flash` (INCORRECT - does not exist)

## Available Google Gemini Models

Based on the official documentation, here are the correct model names:

### Gemini 3 Series
- `gemini-3-flash-preview` - Preview model with thinking capabilities and computer use
- `gemini-3.1-flash-lite-preview` - Most cost-efficient model for high-volume tasks (2.5x faster than 2.5 Flash)

### Gemini 2.5 Series
- `gemini-2.5-flash` - Stable model for production
- `gemini-2.5-flash-lite` - Lightweight version
- `gemini-2.5-pro` - Most capable model

### Gemini 2.0 Series
- `gemini-2.0-flash`
- `gemini-2.0-flash-lite`

## Function Calling Support

According to the documentation, the following models support function calling:

| Model | Function Calling | Parallel | Compositional |
|-------|-----------------|----------|---------------|
| Gemini 3.1 Pro Preview | ✔️ | ✔️ | ✔️ |
| Gemini 3 Flash Preview | ✔️ | ✔️ | ✔️ |
| Gemini 2.5 Pro | ✔️ | ✔️ | ✔️ |
| Gemini 2.5 Flash | ✔️ | ✔️ | ✔️ |
| Gemini 2.5 Flash-Lite | ✔️ | ✔️ | ✔️ |
| Gemini 2.0 Flash | ✔️ | ✔️ | ✔️ |
| Gemini 2.0 Flash-Lite | ❌ | ❌ | ❌ |

## Changes Made

### 1. Updated `packages/aria-agent/src/google/google.constants.ts`
```typescript
export const DEFAULT_MODEL = {
  name: 'gemini-3-flash-preview', // Changed from 'gemini-3-flash'
  title: 'Gemini 3 Flash Preview',
  provider: 'google',
  contextWindow: 1048576, // Updated to match official docs
};

export const GOOGLE_MODELS = [
  DEFAULT_MODEL,
  {
    name: 'gemini-3.1-flash-lite-preview', // ADDED - Most cost-efficient
    title: 'Gemini 3.1 Flash Lite Preview',
    provider: 'google',
    contextWindow: 1048576,
  },
  {
    name: 'gemini-2.5-flash',
    title: 'Gemini 2.5 Flash',
    provider: 'google',
    contextWindow: 1048576,
  },
  {
    name: 'gemini-2.5-flash-lite',
    title: 'Gemini 2.5 Flash Lite',
    provider: 'google',
    contextWindow: 1048576,
  },
];
```

### 2. Updated `packages/aria-agent/src/config/agents.config.ts`
```typescript
WEB: {
  provider: 'google',
  model: 'gemini-3-flash-preview', // Changed from 'gemini-3-flash'
  description: 'Loops 15-20x, PinchTab gives structured text',
},
```

## Key Documentation Links

1. **Function Calling**: https://ai.google.dev/gemini-api/docs/function-calling
2. **Gemini 3 Flash Preview**: https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview
3. **Gemini 2.5 Flash**: https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash
4. **Text Generation**: https://ai.google.dev/gemini-api/docs/text-generation
5. **Thinking Models**: https://ai.google.dev/gemini-api/docs/thinking

## Function Calling Implementation Notes

Your current implementation in `google.tools.ts` is correct and follows Google's OpenAPI-compatible function declaration format:

```typescript
{
  functionDeclarations: [
    {
      name: 'function_name',
      description: 'Function description',
      parameters: {
        type: 'object',
        properties: { /* ... */ },
        required: ['param1', 'param2']
      }
    }
  ]
}
```

This matches the format shown in the official documentation.

## Testing

After these changes, your Google provider should work correctly. The model will:
1. Accept function/tool declarations
2. Support parallel and compositional function calling
3. Use thinking capabilities for better reasoning
4. Handle multimodal inputs (text, images, video, audio, PDF)

## Context Window
Updated to 1,048,576 tokens (official limit) from 1,000,000.


## Gemini 3.1 Flash Lite Preview Details

**Model ID**: `gemini-3.1-flash-lite-preview`

**Key Features**:
- 2.5x faster first token response than Gemini 2.5 Flash
- 45% faster overall output speed (~380 tokens/s)
- Most cost-efficient model in the Gemini 3 series
- Priced at half the cost of Gemini 3 Flash

**Best Use Cases**:
1. **Translation**: High-volume translation of chat messages, reviews, support tickets
2. **Transcription**: Audio-to-text conversion with multimodal input support
3. **Lightweight Agentic Tasks**: Entity extraction, classification, data processing
4. **Document Processing**: PDF parsing and summarization
5. **Model Routing**: Use as a classifier to route queries to appropriate models

**Capabilities**:
- ✅ Function calling
- ✅ Structured outputs (JSON)
- ✅ Thinking (all levels: minimal, low, medium, high)
- ✅ Multimodal inputs (text, image, video, audio, PDF)
- ✅ Code execution
- ✅ Search grounding
- ✅ Context caching
- ❌ Computer use (not supported)
- ❌ Google Maps grounding (not supported)

**Performance Benchmarks**:
- GPQA Diamond: 86.9%
- MMMU Pro: 76.8%

**Context Window**: 1,048,576 tokens (input) / 65,536 tokens (output)

**Documentation**: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-preview
