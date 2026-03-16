# Desktop Agent Parser Fix - Handle Missing "name" Field

## Problem
The Desktop Agent's JSON parser was returning `undefined` for tool calls because Claude was outputting JSON in an unexpected format:

**What Claude was outputting:**
```json
{"action": "double_click", "coordinate": [69, 505]}
```

**What the parser expected:**
```json
{"name": "computer", "arguments": {"action": "double_click", "x": 69, "y": 505}}
```

The `normalizeToolCall()` function only handled cases where `parsed.name` existed, so when Claude output JSON with NO `name` field at all (just `action` directly), it fell through and returned the invalid format.

## Solution

### 1. Updated `normalizeToolCall()` Function
Added a new case to handle format where `action` is directly in the object with NO `name` field:

```typescript
// Case 1: {"action": "click", "coordinate": [x, y], ...} - NO name field
if (parsed.action && !parsed.name) {
  const action = parsed.action;
  const args: any = { ...parsed };
  delete args.action; // Remove action from args since we'll put it in arguments.action
  
  // Handle coordinate array format: [x, y] -> {x, y}
  if (args.coordinate && Array.isArray(args.coordinate)) {
    args.x = args.coordinate[0];
    args.y = args.coordinate[1];
    delete args.coordinate;
  }
  
  return {
    name: 'computer',
    arguments: {
      action: action,
      ...args,
    },
  };
}
```

Now the function handles THREE cases:
1. **No name field** - `{"action": "click", "coordinate": [x, y]}` → normalize to computer format
2. **Simplified name** - `{"name": "click", "arguments": {...}}` → convert to computer format
3. **Correct format** - `{"name": "computer", "arguments": {...}}` → pass through

### 2. Updated System Prompt
Made the system prompt even more explicit about the required format:

- Added numbered rules for clarity
- Emphasized that "name" and "arguments" are REQUIRED at top level
- Added more examples showing correct vs wrong formats
- Highlighted the wrong format that Claude was using

### 3. Updated Parser Checks
Updated the JSON parsing strategies to check for BOTH formats:
```typescript
if ((parsed.name && parsed.arguments !== undefined) || parsed.action) {
  return normalizeToolCall(parsed);
}
```

## Testing
The parser should now correctly handle:

**Input:** `{"action": "double_click", "coordinate": [69, 505]}`
**Output:** `{"name": "computer", "arguments": {"action": "double_click", "x": 69, "y": 505}}`

This will then be mapped to the VNC API format:
```json
{
  "action": "double_click_mouse",
  "coordinates": {"x": 69, "y": 505},
  "button": "left",
  "clickCount": 2
}
```

## Files Modified
- `packages/aria-agent/src/agents/desktop/desktop-tool-parser.util.ts`
  - Updated `normalizeToolCall()` to handle missing "name" field
  - Updated `buildDesktopSystemPrompt()` with clearer format requirements
  - Updated parser checks to detect both formats

## Next Steps
1. Test with actual Desktop Agent execution
2. Monitor logs to verify parser correctly converts the format
3. Verify VNC API calls are being made successfully
4. If Claude still outputs wrong format, may need to add prefill or use different prompting technique
