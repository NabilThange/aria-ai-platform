# Desktop Agent - Final Fix Implementation

## What Was Changed

Implemented the **Image + JSON Parsing Architecture** discovered by your team after 2 hours of testing.

## The Problem

Bytez does NOT return proper `tool_calls` JSON object when an image is present in the request. Instead, `claude-sonnet-4-6` outputs the tool call as JSON inside the `content` string.

## The Solution

1. **Use native Bytez endpoint** (not OpenAI-compatible) to support images
2. **Force JSON-only output** with strict system prompt
3. **Parse JSON from content string** instead of expecting `tool_calls` object
4. **Retry on parse failure** with fresh screenshot

## Files Changed

### 1. `packages/aria-agent/src/agents/desktop/desktop-tool-parser.util.ts` (NEW)

Created parser utility with:
- `parseDesktopToolCall()` - Extracts JSON from content (handles multiple formats)
- `buildDesktopSystemPrompt()` - System prompt that forces JSON-only output

### 2. `packages/aria-agent/src/agents/desktop/desktop.agent.ts` (MODIFIED)

Changes:
- Import parser utilities
- Use `buildDesktopSystemPrompt()` instead of generic system prompt
- Call Bytez with `useTools: false` to use native endpoint
- Parse tool call from `response.content` string
- Handle parse failures with retry logic
- Execute tool calls based on parsed JSON

### 3. `packages/aria-agent/src/byt