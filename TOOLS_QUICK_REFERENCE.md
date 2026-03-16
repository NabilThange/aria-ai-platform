# Tools Quick Reference

## File: `packages/aria-agent/src/bytez/bytez.service.ts`

## 9 Tools Total

### Where They're Defined

| Method | Line | Format | Used For |
|--------|------|--------|----------|
| `getAnthropicTools()` | 815 | Anthropic (input_schema) | Native Anthropic endpoint |
| `getComputerUseTools()` | 631 | OpenAI (parameters) | OpenAI-compatible endpoint |

### Where They're Attached to API Body

| Endpoint | Line | Code |
|----------|------|------|
| **Anthropic** | 97 | `requestBody.params.tools = this.getAnthropicTools()` |
| **OpenAI** | 104 | `requestBody.tools = this.getComputerUseTools()` |

---

## The 9 Tools

```
1. computer_screenshot      → Take screenshot
2. computer_left_click      → Click at (x, y)
3. computer_right_click     → Right-click at (x, y)
4. computer_double_click    → Double-click at (x, y)
5. computer_type_text       → Type text
6. computer_type_keys       → Press keyboard keys
7. computer_application     → Open/switch app
8. computer_scroll          → Scroll up/down/left/right
9. set_task_status          → Mark task complete/failed
```

---

## Example: How Tools Appear in API Body

### Anthropic Format (Native Endpoint)
```json
{
  "params": {
    "tools": [
      {
        "name": "computer_left_click",
        "description": "Performs a left mouse click at the specified coordinates",
        "input_schema": {
          "type": "object",
          "properties": {
            "x": {"type": "number"},
            "y": {"type": "number"}
          },
          "required": ["x", "y"]
        }
      },
      ... (8 more tools)
    ],
    "tool_choice": {"type": "auto"}
  }
}
```

### OpenAI Format (Compatible Endpoint)
```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "computer_left_click",
        "description": "Performs a left mouse click at the specified coordinates",
        "parameters": {
          "type": "object",
          "properties": {
            "x": {"type": "number"},
            "y": {"type": "number"}
          },
          "required": ["x", "y"]
        }
      }
    },
    ... (8 more tools)
  ],
  "tool_choice": "auto"
}
```

---

## Key Difference

| Aspect | Anthropic | OpenAI |
|--------|-----------|--------|
| **Schema Field** | `input_schema` | `parameters` |
| **Tool Wrapper** | Direct object | `{type: "function", function: {...}}` |
| **Location in Body** | `params.tools` | Top-level `tools` |

---

## When Tools Are Sent

✅ Desktop Agent executing steps
✅ `useTools: true` parameter
✅ Anthropic or OpenAI models

❌ Clarifier Agent
❌ Orchestrator Agent
❌ Perception Agent
❌ Text-only responses
