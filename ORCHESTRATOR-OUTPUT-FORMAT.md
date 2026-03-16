# Orchestrator Output Format

## Expected Format

Yes, the orchestrator is expected to return JSON in this exact format:

```json
{
  "steps": [
    {
      "id": "step_1",
      "type": "web",
      "description": "Navigate to wikipedia.org",
      "success_criteria": "Wikipedia homepage is loaded",
      "context": "URL: https://wikipedia.org",
      "depends_on": []
    },
    {
      "id": "step_2",
      "type": "web",
      "description": "Search for 'India' on Wikipedia",
      "success_criteria": "Search results for India are displayed",
      "context": "Search term: India",
      "depends_on": ["step_1"]
    }
  ],
  "estimated_duration_minutes": 5,
  "complexity": "simple"
}
```

## How It Works

### 1. Orchestrator Agent Configuration

**Location**: `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`

```typescript
// Call Bytez Claude Opus for planning
const response = await this.bytezService.generateMessage(
  this.getSystemPrompt(useExtendedThinking),
  [
    {
      role: 'USER',
      content: [{ type: 'text', text: prompt }],
    },
  ] as any,
  this.model.model,
  false, // No tools needed - expects raw JSON output
);
```

**Key point**: `false` means no tool calling - the LLM returns raw JSON text.

### 2. System Prompt

**Location**: `packages/aria-agent/src/config/system-prompts.config.ts`

The system prompt explicitly tells the orchestrator:

```
## RESPONSE FORMAT

YOU MUST RETURN ONLY THIS EXACT JSON STRUCTURE:
{
  "steps": [
    {
      "id": "step_1",
      "type": "web" | "desktop",
      "description": "what to do",
      "success_criteria": "how to verify it worked",
      "context": "extra info the agent needs",
      "depends_on": ["step_ids that must complete first"]
    }
  ],
  "estimated_duration_minutes": number,
  "complexity": "simple" | "moderate" | "complex"
}
```

### 3. JSON Parsing

**Location**: `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`

```typescript
private parseExecutionPlan(response: any): ExecutionPlan {
  const content = response.contentBlocks?.[0]?.text || '';

  try {
    const parsed = extractJSON(content);

    // Flexible parsing - accepts multiple formats
    let stepsArray: any[] = [];
    
    if (parsed.steps && Array.isArray(parsed.steps)) {
      // Format: { steps: [...] } ✅ EXPECTED
      stepsArray = parsed.steps;
    } else if (parsed.plan && Array.isArray(parsed.plan)) {
      // Format: { plan: [...] } ✅ FALLBACK
      stepsArray = parsed.plan;
    } else if (parsed.plan && parsed.plan.steps && Array.isArray(parsed.plan.steps)) {
      // Format: { plan: { steps: [...] } } ✅ FALLBACK
      stepsArray = parsed.plan.steps;
    }
    
    // Normalize each step
    const steps = stepsArray.map((s: any, i: number) => {
      return {
        id: s.id || s.step || `step_${i + 1}`,
        type: s.type || 'desktop',
        description: s.description || s.action || '',
        success_criteria: s.success_criteria || s.expected_outcome || '',
        context: s.context || s.fallback || '',
        depends_on: s.depends_on || [],
      };
    });

    const plan: ExecutionPlan = {
      steps,
      estimated_duration_minutes: parsed.estimated_duration_minutes || 5,
      complexity: parsed.complexity || 'simple',
    };

    return plan;
  } catch (error) {
    throw new Error(`Failed to parse execution plan: ${error.message}`);
  }
}
```

## Why Flexible Parsing?

The parser accepts multiple formats as a **safety net** because:

1. **LLMs are unpredictable**: Even with clear instructions, Claude might return slightly different structures
2. **Graceful degradation**: Better to accept `{ plan: [...] }` than fail completely
3. **Field name variations**: Accepts `expected_outcome` if `success_criteria` is missing
4. **Backward compatibility**: If the prompt changes, old responses still work

## Field Mapping

The parser is forgiving with field names:

| Expected Field | Alternative Names Accepted |
|----------------|---------------------------|
| `id` | `step` |
| `type` | Inferred from `tool` field if missing |
| `description` | `action` |
| `success_criteria` | `expected_outcome`, `expected_output` |
| `context` | `fallback` |
| `depends_on` | Defaults to `[]` if missing |
| `estimated_duration_minutes` | `estimated_time` |
| `complexity` | Defaults to `'simple'` if missing |

## Example Outputs

### Expected Format (Ideal)
```json
{
  "steps": [
    {
      "id": "step_1",
      "type": "desktop",
      "description": "Open Firefox browser",
      "success_criteria": "Firefox window is open and visible",
      "context": "",
      "depends_on": []
    }
  ],
  "estimated_duration_minutes": 2,
  "complexity": "simple"
}
```

### Alternative Format 1 (Accepted)
```json
{
  "plan": [
    {
      "step": "step_1",
      "type": "desktop",
      "action": "Open Firefox browser",
      "expected_outcome": "Firefox window is open and visible"
    }
  ],
  "estimated_time": 2,
  "complexity": "simple"
}
```

### Alternative Format 2 (Accepted)
```json
{
  "plan": {
    "steps": [
      {
        "id": "step_1",
        "type": "desktop",
        "description": "Open Firefox browser",
        "success_criteria": "Firefox window is open and visible"
      }
    ]
  },
  "estimated_duration_minutes": 2
}
```

All three formats above will be normalized to the same internal `ExecutionPlan` structure.

## Validation

After parsing, the orchestrator validates:

```typescript
// Validate we have at least one step
if (!plan.steps || plan.steps.length === 0) {
  throw new Error('Orchestrator generated empty plan - cannot proceed');
}
```

Empty plans cause immediate failure - the system cannot proceed without steps.

## Summary

**Q: Does the orchestrator return JSON in that format?**

**A: Yes!** The system prompt explicitly instructs it to return:
```json
{
  "steps": [...],
  "estimated_duration_minutes": number,
  "complexity": "simple" | "moderate" | "complex"
}
```

The orchestrator uses Bytez Claude Opus 4.6 without tool calling, so it returns raw JSON text. The parser extracts and normalizes this JSON, with flexible fallbacks for slight variations in structure or field names.

The flexibility is intentional - it makes the system more robust against LLM unpredictability while still expecting a specific format.
