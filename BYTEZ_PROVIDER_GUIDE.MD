# Bytez — Model Provider Integration Guide

This doc tells you everything you need to integrate Bytez as a model provider in the app. Read it fully before writing any code.

---

## What is Bytez?

Bytez is a single API that gives access to 175,000+ open-source AND closed-source AI models (Anthropic, OpenAI, Mistral, Google, Cohere, and all HuggingFace models) under one API key.

- **Base URL (Native):** `https://api.bytez.com/models/v2/`
- **Base URL (OpenAI-compatible):** `https://api.bytez.com/models/v2/openai/v1`
- **Auth Header:** `Authorization: Key YOUR_BYTEZ_API_KEY`

> ⚠️ There are TWO different endpoints. They behave differently. Read carefully.

---

## The Two Endpoints — Know the Difference

### 1. Native Bytez Endpoint ✅ (Use this for multimodal / images)

```
POST https://api.bytez.com/models/v2/{provider}/{model-id}
```

- ✅ Supports **text + image** inputs
- ✅ Works for open-source AND closed-source models
- ✅ The only way to send images on Bytez

### 2. OpenAI-Compatible Endpoint (Text + Tool Calling)

```
POST https://api.bytez.com/models/v2/openai/v1/chat/completions
```

- ✅ Drop-in replacement for OpenAI SDK (`baseURL` swap)
- ✅ Supports **OpenAI-style tool calling** (`tools` array, `tool_calls` response)
- ❌ Does **NOT** support image inputs — use native endpoint for images
- ✅ Good for text chat and tool/function calling

---

## Authentication

Add this header to every request:

```
Authorization: Key YOUR_BYTEZ_API_KEY
Content-Type: application/json
```

No Bearer prefix. Just `Key ` followed by the API key.

---

## Model IDs

Model IDs follow the pattern `provider/model-name`. Examples:

| Provider | Model ID to use |
|---|---|
| Anthropic | `anthropic/claude-haiku-4-5` |
| Anthropic | `anthropic/claude-sonnet-4-5` |
| OpenAI | `openai/gpt-4o` |
| OpenAI | `openai/gpt-4o-mini` |
| Google | `google/gemini-2.0-flash` |
| Mistral | `mistral/mistral-large-latest` |
| Meta (open-source) | `meta-llama/Llama-3.3-70B-Instruct` |
| Qwen (open-source) | `Qwen/Qwen2.5-VL-7B-Instruct` |

> For open-source models, the provider prefix is the HuggingFace org name exactly as it appears on HuggingFace.

---

## Sending Text Only (Native Endpoint)

```http
POST https://api.bytez.com/models/v2/anthropic/claude-haiku-4-5
Authorization: Key YOUR_BYTEZ_API_KEY
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "What is the capital of France?"
    }
  ],
  "max_tokens": 512
}
```

---

## Sending Text + Image (Native Endpoint) ⭐

This is the most important section. Images must use the native endpoint.

### Image via URL

```http
POST https://api.bytez.com/models/v2/anthropic/claude-haiku-4-5
Authorization: Key YOUR_BYTEZ_API_KEY
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What do you see in this image? Describe it in detail."
        },
        {
          "type": "image",
          "url": "https://example.com/your-image.jpg"
        }
      ]
    }
  ],
  "max_tokens": 512
}
```

### Critical Rules for Image Input

| Rule | Detail |
|---|---|
| Content must be an **array** | When sending image + text, `content` must be a JSON array, not a plain string |
| Image type key is `"image"` | NOT `"image_url"` (that's OpenAI format and will fail) |
| URL goes directly in `"url"` | NOT nested inside `"image_url": { "url": "..." }` |
| Use the **native endpoint** | The `/openai/v1/chat/completions` endpoint rejects image types entirely |
| Text and image order | Put text first, image second (or vice versa — both work) |

### What Will Fail ❌

```json
// WRONG — OpenAI image format, Bytez rejects this
{
  "type": "image_url",
  "image_url": { "url": "https://..." }
}

// WRONG — using OpenAI-compatible endpoint for images
POST https://api.bytez.com/models/v2/openai/v1/chat/completions
```

### What Works ✅

```json
// CORRECT — Bytez native image format
{
  "type": "image",
  "url": "https://..."
}

// CORRECT — using native endpoint
POST https://api.bytez.com/models/v2/anthropic/claude-haiku-4-5
```

---

## Multi-Turn Conversation with Image

```json
{
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image",
          "url": "https://example.com/image.jpg"
        }
      ]
    },
    {
      "role": "assistant",
      "content": "I see a plate of Indian street food..."
    },
    {
      "role": "user",
      "content": "What ingredients do you think are in it?"
    }
  ],
  "max_tokens": 512
}
```

> After the first image turn, follow-up messages can be plain strings again.

---

## System Prompt

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant specialized in food analysis."
    },
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Identify this dish." },
        { "type": "image", "url": "https://example.com/food.jpg" }
      ]
    }
  ],
  "max_tokens": 512
}
```

---

## Response Format

Bytez returns a response with two top-level fields:

```json
{
  "error": null,
  "output": {
    "role": "assistant",
    "content": "The model's reply text here..."
  },
  "provider": {
    "model": "claude-haiku-4-5-20251001",
    "id": "msg_abc123",
    "usage": {
      "input_tokens": 189,
      "output_tokens": 238
    }
  }
}
```

- `output.content` — the text reply from the model
- `error` — will be a string if something went wrong, `null` if successful
- `provider` — raw response from the underlying provider (Anthropic/OpenAI/etc), useful for token usage

### Extracting the Reply in Code

```javascript
// JavaScript
const data = await response.json();
if (data.error) throw new Error(data.error);
const reply = data.output.content;
```

```python
# Python
data = response.json()
if data["error"]:
    raise Exception(data["error"])
reply = data["output"]["content"]
```

---

## Using the OpenAI SDK (Text Only)

If using the OpenAI SDK and only need text, just swap the `baseURL`:

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.BYTEZ_API_KEY,
  baseURL: "https://api.bytez.com/models/v2/openai/v1"
});

const response = await client.chat.completions.create({
  model: "anthropic/claude-haiku-4-5",
  messages: [{ role: "user", content: "Hello!" }],
  max_tokens: 512
});
```

> ⚠️ Do NOT use the SDK's built-in image format (`image_url`) with Bytez — it will fail. For images, use raw `fetch`/`requests` with the native endpoint and Bytez image format shown above.

---

## Best Multimodal Models on Bytez

| Model ID | Type | Best For |
|---|---|---|
| `anthropic/claude-haiku-4-5` | Closed | Fast, cheap, solid vision |
| `anthropic/claude-sonnet-4-5` | Closed | Best Anthropic vision quality |
| `openai/gpt-4o` | Closed | Top-tier vision + reasoning |
| `openai/gpt-4o-mini` | Closed | Fast + affordable vision |
| `google/gemini-2.0-flash` | Closed | Fast multimodal, long context |
| `Qwen/Qwen2.5-VL-7B-Instruct` | Open | Best free open-source vision |
| `meta-llama/Llama-3.2-11B-Vision-Instruct` | Open | Free, decent vision |

---

## Tool Calling (Function Calling) ⭐

> ✅ Bytez DOES support OpenAI-style tool calling. It was tested and confirmed working.
> ❌ Bytez does NOT support Anthropic computer-use tools (`computer_screenshot`, `bash`, `str_replace_editor`). Those are Anthropic-proprietary and only work via Anthropic's direct API.

This is the most important distinction. If your agent is outputting `<function_calls>` as plain text, it means it tried to use **Anthropic computer-use format** — not OpenAI tool calling. Use the format below instead.

---

### The Two Types of Tool Calling — Know the Difference

| Type | Works on Bytez? | Format |
|---|---|---|
| ✅ OpenAI-style tool calling | **YES** | `tools` array + `tool_calls` in response |
| ❌ Anthropic computer-use tools | **NO** | `computer_screenshot`, `bash`, `str_replace_editor` |
| ❌ Anthropic tool XML format | **NO** | `<function_calls>...</function_calls>` as text |

If you see `<function_calls>` in the model output — the model is generating text, not real tool calls. This means you sent tools using the **wrong format or wrong endpoint**. Switch to the OpenAI format below.

---

### Tool Calling uses the OpenAI-Compatible Endpoint

```
POST https://api.bytez.com/models/v2/openai/v1/chat/completions
```

NOT the native endpoint. Tool calling only works on the `/openai/v1/chat/completions` path.

---

### Step 1 — Send Message + Tool Definition

The model will decide to call your tool and return a `tool_calls` object.

```json
POST https://api.bytez.com/models/v2/openai/v1/chat/completions
Authorization: Key YOUR_BYTEZ_API_KEY
Content-Type: application/json

{
  "model": "anthropic/claude-haiku-4-5",
  "messages": [
    {
      "role": "user",
      "content": "What is the weather in Mumbai?"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get the current weather for a city",
        "parameters": {
          "type": "object",
          "properties": {
            "city": {
              "type": "string",
              "description": "The city name"
            },
            "unit": {
              "type": "string",
              "enum": ["celsius", "fahrenheit"]
            }
          },
          "required": ["city"]
        }
      }
    }
  ],
  "tool_choice": "auto",
  "max_tokens": 512
}
```

### Step 1 — Expected Response

```json
{
  "choices": [{
    "finish_reason": "tool_calls",
    "message": {
      "role": "assistant",
      "content": "",
      "tool_calls": [{
        "id": "toolu_012JhUgsLNRd4yNpLnkS6gZ7",
        "type": "function",
        "function": {
          "name": "get_weather",
          "arguments": "{\"city\": \"Mumbai\"}"
        }
      }]
    }
  }]
}
```

Key things to check in the response:
- `finish_reason` will be `"tool_calls"` (not `"stop"`) — this means the model wants to call a tool
- `tool_calls[0].function.name` — the name of the tool the model chose
- `tool_calls[0].function.arguments` — a **JSON string** (not object) — you must `JSON.parse()` it
- `tool_calls[0].id` — save this ID, you need it for Step 2

---

### Step 2 — Send Tool Result Back

Take the `tool_call id` from Step 1, actually run your function, then send the result back as a `tool` role message.

```json
POST https://api.bytez.com/models/v2/openai/v1/chat/completions
Authorization: Key YOUR_BYTEZ_API_KEY
Content-Type: application/json

{
  "model": "anthropic/claude-haiku-4-5",
  "messages": [
    {
      "role": "user",
      "content": "What is the weather in Mumbai?"
    },
    {
      "role": "assistant",
      "tool_calls": [{
        "id": "toolu_012JhUgsLNRd4yNpLnkS6gZ7",
        "type": "function",
        "function": {
          "name": "get_weather",
          "arguments": "{\"city\": \"Mumbai\"}"
        }
      }]
    },
    {
      "role": "tool",
      "tool_call_id": "toolu_012JhUgsLNRd4yNpLnkS6gZ7",
      "content": "28 degrees celsius, humid, partly cloudy"
    }
  ],
  "tools": [...same tools array as Step 1...],
  "max_tokens": 512
}
```

### Step 2 — Expected Response

```json
{
  "choices": [{
    "finish_reason": "stop",
    "message": {
      "role": "assistant",
      "content": "The weather in Mumbai is currently 28°C, humid and partly cloudy."
    }
  }]
}
```

`finish_reason` is now `"stop"` — the model is done and gave a final answer.

---

### Tool Calling in JavaScript

```javascript
const response1 = await fetch("https://api.bytez.com/models/v2/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Key ${process.env.BYTEZ_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "anthropic/claude-haiku-4-5",
    messages: [{ role: "user", content: "What is the weather in Mumbai?" }],
    tools: [{
      type: "function",
      function: {
        name: "get_weather",
        description: "Get the current weather for a city",
        parameters: {
          type: "object",
          properties: {
            city: { type: "string" },
            unit: { type: "string", enum: ["celsius", "fahrenheit"] }
          },
          required: ["city"]
        }
      }
    }],
    tool_choice: "auto",
    max_tokens: 512
  })
});

const data1 = await response1.json();
const message = data1.choices[0].message;

// Check if model wants to call a tool
if (message.tool_calls && message.tool_calls.length > 0) {
  const toolCall = message.tool_calls[0];
  const toolName = toolCall.function.name;
  const toolArgs = JSON.parse(toolCall.function.arguments); // ← Must JSON.parse()

  // Actually run your function
  let toolResult;
  if (toolName === "get_weather") {
    toolResult = await getWeather(toolArgs.city, toolArgs.unit); // your real function
  }

  // Step 2 — send result back
  const response2 = await fetch("https://api.bytez.com/models/v2/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Key ${process.env.BYTEZ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4-5",
      messages: [
        { role: "user", content: "What is the weather in Mumbai?" },
        { role: "assistant", tool_calls: message.tool_calls }, // ← paste full tool_calls array
        {
          role: "tool",
          tool_call_id: toolCall.id,   // ← must match exactly
          content: String(toolResult)  // ← must be a string
        }
      ],
      tools: [...], // same tools array
      max_tokens: 512
    })
  });

  const data2 = await response2.json();
  console.log(data2.choices[0].message.content); // final answer
}
```

---

### tool_choice Options

| Value | Behaviour |
|---|---|
| `"auto"` | Model decides whether to call a tool or reply directly |
| `"required"` | Model MUST call a tool, no plain text reply |
| `"none"` | Model will NOT call any tools, plain text only |
| `{"type":"function","function":{"name":"get_weather"}}` | Force a specific tool to be called |

---

### Critical Rules for Tool Calling

| Rule | Detail |
|---|---|
| Use `/openai/v1/chat/completions` endpoint | NOT the native `/models/v2/{model}` endpoint |
| `arguments` is a JSON **string** | Always `JSON.parse(toolCall.function.arguments)` before using |
| `tool_call_id` must match exactly | Copy the `id` from Step 1 response exactly into Step 2 |
| `role: "tool"` for results | NOT `role: "assistant"` or `role: "user"` |
| `content` must be a string | Convert your result to string before sending back |
| Include `tools` array in Step 2 | Send the same tools definition again in the second request |
| Do NOT use Anthropic computer-use tools | `computer_screenshot`, `bash` etc. will output text, not real calls |

---

### What Your Agent Got Wrong

Your agent used Anthropic's **computer-use tool format** which looks like this (this is WRONG for Bytez):

```json
// ❌ WRONG — Anthropic computer-use format, does not work via Bytez
{
  "tools": [
    { "type": "computer_20241022", "name": "computer", "display_width_px": 1280 },
    { "type": "bash_20241022", "name": "bash" }
  ]
}
```

This caused the model to output `<function_calls>` as plain text because Bytez doesn't route these proprietary Anthropic tool types. Use the standard OpenAI `tools` array format shown above instead.

---

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `Cannot POST /models/v1/...` | Using old v1 URL | Change to `/models/v2/` |
| `unsupported content item of type: image_url` | Using OpenAI image format | Change type to `"image"`, key to `"url"` |
| `unsupported content item of type: image_url` | Using OpenAI-compatible endpoint for images | Switch to native endpoint |
| `Model does not exist` | Wrong model ID spelling | Double-check ID in Bytez model catalog |
| `401 Unauthorized` | Wrong auth format | Header must be `Authorization: Key YOUR_KEY` (not Bearer) |
| Model outputs `<function_calls>` as plain text | Using Anthropic computer-use tool format | Switch to OpenAI `tools` array format |
| Tool calling not working | Using native endpoint for tool calls | Switch to `/openai/v1/chat/completions` endpoint |

---

## Environment Variable

Store the API key as:

```
BYTEZ_API_KEY=your_key_here
```

Access it in code as `process.env.BYTEZ_API_KEY` (Node) or `os.environ["BYTEZ_API_KEY"]` (Python).

---

## Quick Reference Cheatsheet

```
Text only:
  POST https://api.bytez.com/models/v2/{provider}/{model}
  Body: { messages: [{ role: "user", content: "your text" }], max_tokens: 512 }

Text + Image:
  POST https://api.bytez.com/models/v2/{provider}/{model}          ← native endpoint
  Body: {
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "your question" },
        { type: "image", url: "https://..." }
      ]
    }],
    max_tokens: 512
  }

Tool Calling Step 1:
  POST https://api.bytez.com/models/v2/openai/v1/chat/completions  ← openai endpoint
  Body: {
    model: "anthropic/claude-haiku-4-5",
    messages: [{ role: "user", content: "..." }],
    tools: [{ type: "function", function: { name, description, parameters } }],
    tool_choice: "auto",
    max_tokens: 512
  }

Tool Calling Step 2 (after getting tool_calls back):
  POST https://api.bytez.com/models/v2/openai/v1/chat/completions  ← openai endpoint
  Body: {
    model: "anthropic/claude-haiku-4-5",
    messages: [
      { role: "user", content: "original question" },
      { role: "assistant", tool_calls: [...from step 1 response] },
      { role: "tool", tool_call_id: "id from step 1", content: "your function result" }
    ],
    tools: [...same tools array],
    max_tokens: 512
  }

Auth header (always):
  Authorization: Key YOUR_BYTEZ_API_KEY
```