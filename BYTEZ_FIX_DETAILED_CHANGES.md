# Bytez Anthropic Native Endpoint Fix - Detailed Changes

## Overview

Fixed the "Input should be a valid string" error by routing Anthropic Claude models to the native Anthropic endpoint instead of the OpenAI-compatible endpoint.

## File: `packages/aria-agent/src/bytez/bytez.service.ts`

### Change 1: Endpoint Selection Logic (Lines 75-85)

**BEFORE:**
```typescript
// Use OpenAI-compatible endpoint for tool calling
const endpoint = useTools 
  ? 'https://api.bytez.com/models/v2/openai/v1/chat/completions'
  : `${this.baseUrl}/${provider}/${modelName}`;

const requestBody: any = {
  messages: bytezMessages,
  max_tokens: useTools ? 8192 : 256,
};

// Add model for OpenAI-compatible endpoint
if (useTools) {
  requestBody.model = model;
  requestBody.tools = this.getComputerUseTools();
  requestBody.tool_choice = 'auto';
}
```

**AFTER:**
```typescript
// Determine endpoint based on provider
// For Anthropic models, ALWAYS use native endpoint (supports images + tools)
// For other providers, use OpenAI-compatible endpoint when tools are needed
const useNativeAnthropicEndpoint = provider === 'anthropic';
const endpoint = useNativeAnthropicEndpoint
  ? `${this.baseUrl}/${provider}/${modelName}`
  : useTools 
    ? 'https://api.bytez.com/models/v2/openai/v1/chat/completions'
    : `${this.baseUrl}/${provider}/${modelName}`;

const requestBody: any = {
  messages: bytezMessages,
  max_tokens: 8192,
};

// Configure request based on endpoint type
if (useNativeAnthropicEndpoint) {
  // Native Anthropic endpoint: Use params object for tools
  if (useTools) {
    requestBody.params = {
      max_tokens: 8192,
      tools: this.getAnthropicTools(),
      tool_choice: { type: 'auto' },
    };
  }
} else if (useTools) {
  // OpenAI-compatible endpoint: Use top-level tools
  requestBody.model = model;
  requestBody.tools = this.getComputerUseTools();
  requestBody.tool_choice = 'auto';
}
```

**Why:** 
- Native Anthropic endpoint supports images + tools together
- OpenAI endpoint expects string content, not arrays
- Anthropic tools use `input_schema`, not `parameters`

---

### Change 2: System Prompt Extraction (Lines 107-125)

**BEFORE:**
```typescript
} else if (provider === 'anthropic') {
  // For native Anthropic endpoint, system prompt goes as separate parameter
  // Remove system message from messages array if present
  const systemMessageIndex = bytezMessages.findIndex(m => m.role === 'system');
  this.logger.debug(`System message index: ${systemMessageIndex}, Total messages before extraction: ${bytezMessages.length}`);
  if (systemMessageIndex !== -1) {
    const systemMessage = bytezMessages.splice(systemMessageIndex, 1)[0];
    requestBody.system = systemMessage.content;
    this.logger.debug(`Extracted system message, remaining messages: ${bytezMessages.length}`);
  }
}
```

**AFTER:** (Same - already correct)

**Why:** System prompt must be extracted for native Anthropic endpoint

---

### Change 3: Image Format in User Action Blocks (Lines 360-381)

**BEFORE:**
```typescript
} else if (isImageContentBlock(block)) {
  // Bytez native image format
  contentParts.push({
    type: 'image',
    url: `data:${block.source.media_type};base64,${block.source.data}`,
  });
}
```

**AFTER:**
```typescript
} else if (isImageContentBlock(block)) {
  // Anthropic native image format
  if (block.source.data) {
    // Base64 image
    contentParts.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: block.source.media_type,
        data: block.source.data,
      },
    });
  } else if ((block.source as any).url) {
    // URL-based image
    contentParts.push({
      type: 'image',
      source: {
        type: 'url',
        url: (block.source as any).url,
      },
    });
  }
}
```

**Why:** Anthropic expects `source: {type, media_type, data}` not `url: "data:..."`

---

### Change 4: Image Format in Regular Message Blocks (Lines 304-320)

**BEFORE:**
```typescript
case MessageContentType.Image:
  hasImage = true;
  if (textParts.length > 0) {
    contentParts.push({
      type: 'text',
      text: textParts.join('\n\n'),
    });
    textParts.length = 0;
  }
  // Bytez native image format
  contentParts.push({
    type: 'image',
    url: `data:${block.source.media_type};base64,${block.source.data}`,
  });
  break;
```

**AFTER:**
```typescript
case MessageContentType.Image:
  hasImage = true;
  if (textParts.length > 0) {
    contentParts.push({
      type: 'text',
      text: textParts.join('\n\n'),
    });
    textParts.length = 0;
  }
  // Anthropic native format: use base64 or url
  if (block.source.data) {
    // Base64 image
    contentParts.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: block.source.media_type,
        data: block.source.data,
      },
    });
  } else if ((block.source as any).url) {
    // URL-based image
    contentParts.push({
      type: 'image',
      source: {
        type: 'url',
        url: (block.source as any).url,
      },
    });
  }
  break;
```

**Why:** Consistent Anthropic image format across all message types

---

### Change 5: Response Parsing - Add Native Anthropic Handler (Lines 155-175)

**BEFORE:**
```typescript
// Handle OpenAI-compatible response format
if (useTools && data.choices) {
  // Mark key as successful
  this.keyManager.markCurrentKeyAsSuccessful();
  
  // LOG ACTUAL RESPONSE CONTENT
  this.logger.log(`📝 [BytezService] OpenAI-format response:`);
  this.logger.log(`   Message content: ${data.choices[0]?.message?.content || '(empty)'}`);
  if (data.choices[0]?.message?.tool_calls) {
    this.logger.log(`   Tool calls: ${JSON.stringify(data.choices[0].message.tool_calls, null, 2)}`);
  }
  
  return this.formatOpenAIResponse(data);
}
```

**AFTER:**
```typescript
// Handle native Anthropic endpoint response (when using native endpoint)
if (useNativeAnthropicEndpoint && useTools) {
  // Mark key as successful
  this.keyManager.markCurrentKeyAsSuccessful();
  
  // LOG ACTUAL RESPONSE CONTENT
  this.logger.log(`📝 [BytezService] Native Anthropic response:`);
  this.logger.log(`   Provider content: ${JSON.stringify(data.provider?.content || [])}`);
  this.logger.log(`   Output: ${JSON.stringify(data.output || {})}`);
  
  return this.formatNativeAnthropicResponse(data);
}

// Handle OpenAI-compatible response format
if (useTools && data.choices) {
  // Mark key as successful
  this.keyManager.markCurrentKeyAsSuccessful();
  
  // LOG ACTUAL RESPONSE CONTENT
  this.logger.log(`📝 [BytezService] OpenAI-format response:`);
  this.logger.log(`   Message content: ${data.choices[0]?.message?.content || '(empty)'}`);
  if (data.choices[0]?.message?.tool_calls) {
    this.logger.log(`   Tool calls: ${JSON.stringify(data.choices[0].message.tool_calls, null, 2)}`);
  }
  
  return this.formatOpenAIResponse(data);
}
```

**Why:** Native Anthropic responses have different structure than OpenAI responses

---

### Change 6: New Method - formatNativeAnthropicResponse (Lines 517-565)

**ADDED:**
```typescript
/**
 * Format response from native Anthropic endpoint
 * Tool calls are in data.provider.content, text may be in data.output.content
 */
private formatNativeAnthropicResponse(data: any): BytebotAgentResponse {
  const blocks: MessageContentBlock[] = [];

  // Extract content from provider (where tool_use blocks live)
  const providerContent = data.provider?.content || [];
  
  // Extract content from output (where text may be)
  const outputContent = data.output?.content || [];

  // Merge both sources
  const allContent = Array.isArray(providerContent) ? providerContent : [];
  if (Array.isArray(outputContent)) {
    allContent.push(...outputContent);
  } else if (typeof outputContent === 'string') {
    allContent.push({ type: 'text', text: outputContent });
  }

  // Process content blocks
  for (const block of allContent) {
    if (!block || typeof block !== 'object') continue;

    if (block.type === 'text' && block.text) {
      blocks.push({
        type: MessageContentType.Text,
        text: block.text,
      } as TextContentBlock);
    } else if (block.type === 'tool_use') {
      // Parse tool_use block from Anthropic format
      blocks.push({
        type: MessageContentType.ToolUse,
        id: block.id,
        name: block.name,
        input: block.input || {},
      } as ToolUseContentBlock);
    }
  }

  return {
    contentBlocks: blocks,
    tokenUsage: {
      inputTokens: data.provider?.usage?.input_tokens || 0,
      outputTokens: data.provider?.usage?.output_tokens || 0,
      totalTokens:
        (data.provider?.usage?.input_tokens || 0) +
        (data.provider?.usage?.output_tokens || 0),
    },
  };
}
```

**Why:** Parse tool calls from `data.provider.content` (Anthropic format) instead of `data.choices[0].message.tool_calls` (OpenAI format)

---

### Change 7: New Method - getAnthropicTools (Lines 799-1000)

**ADDED:**
```typescript
/**
 * Get tools in Anthropic native format (for native Anthropic endpoint)
 * Uses input_schema instead of parameters
 */
private getAnthropicTools(): any[] {
  return [
    {
      name: 'computer_screenshot',
      description: 'Captures a screenshot of the current screen',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'computer_left_click',
      description: 'Performs a left mouse click at the specified coordinates',
      input_schema: {
        type: 'object',
        properties: {
          x: {
            type: 'number',
            description: 'X coordinate for the click',
          },
          y: {
            type: 'number',
            description: 'Y coordinate for the click',
          },
        },
        required: ['x', 'y'],
      },
    },
    // ... (similar for other tools)
  ];
}
```

**Why:** Anthropic tools use `input_schema` field, not `parameters` like OpenAI

---

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| **Endpoint** | Always OpenAI-compatible | Native Anthropic for Anthropic models |
| **Image Format** | `url: "data:...;base64,..."` | `source: {type, media_type, data}` |
| **Tools Format** | OpenAI `parameters` | Anthropic `input_schema` |
| **Tool Calls Location** | `data.choices[0].message.tool_calls` | `data.provider.content` |
| **System Prompt** | In messages array | Top-level `system` field |
| **Response Parser** | `formatOpenAIResponse()` | `formatNativeAnthropicResponse()` |

## Result

✅ Desktop Agent can now send images + text + tools to Claude via Bytez native endpoint
✅ Eliminates "Input should be a valid string" error
✅ Proper tool call parsing and execution
✅ Backward compatible with other providers
