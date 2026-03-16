# PinchTab Tools Analysis & Recommendations

## 🎯 Current State

Based on your guide and the codebase analysis, here's what we have vs. what PinchTab actually offers:

### ✅ What We HAVE Implemented

| Tool | Status | Notes |
|------|--------|-------|
| `pinchtab_navigate` | ✅ Implemented | Opens URL in new tab |
| `pinchtab_click` | ✅ Implemented | Click element by ref |
| `pinchtab_fill` | ⚠️ Broken | Defined but DOESN'T WORK (returns empty) |
| `pinchtab_submit` | ✅ Implemented | Submit form by ref |
| `pinchtab_scroll` | ✅ Implemented | Scroll up/down |
| `pinchtab_wait` | ✅ Implemented | Wait for duration |
| `pinchtab_get_snapshot` | ✅ Implemented | Get page elements with refs |

### ❌ What We're MISSING (From Your Guide)

Based on your PinchTab guide, these critical features are NOT exposed to the agent:

| Feature | API Endpoint | Why It Matters |
|---------|--------------|----------------|
| **Health Check** | `GET /health` | Agent can't verify PinchTab is running before starting tasks |
| **List Instances** | `GET /instances` | Agent can't see what browser instances exist |
| **Launch Instance** | `POST /instances/launch` | Agent can't create new browser instances (headed/headless) |
| **Stop Instance** | `POST /instances/{id}/stop` | Agent can't clean up browser instances |
| **List Tabs** | `GET /instances/{id}/tabs` | Agent can't see open tabs or switch between them |
| **Type Action** | `POST /tabs/{id}/action` with `kind: "type"` | ✅ WORKS (unlike fill) - but NOT exposed as tool! |
| **Press Key** | `POST /tabs/{id}/action` with `kind: "press"` | For keyboard shortcuts (Ctrl+C, etc.) |
| **Get Instance Status** | Part of instances list | Check if instance is "ready", "starting", "stopped" |

## 🔥 Critical Issues

### 1. **No `type` Tool - Using Broken `fill` Instead**

Your guide says:
- ✅ `type` action returns `{"typed":"..."}` — USE THIS ✅
- ❌ `fill` action returns `{"filled":""}` — does NOT work ❌

But our code:
- ❌ Has `pinchtab_fill` tool (broken)
- ❌ NO `pinchtab_type` tool (the one that works!)

**Impact**: Agent can't reliably enter text into forms!

### 2. **No Instance Management**

The service has `initInstance()` but:
- Agent can't launch new instances
- Agent can't switch between headed/headless modes
- Agent can't see or manage multiple browser instances
- Agent can't clean up instances when done

**Impact**: 
- Can't show browser in VNC for debugging
- Can't run multiple browser sessions
- Resource leaks from unclosed instances

### 3. **No Health Checks**

Agent can't verify PinchTab is running before attempting tasks.

**Impact**: Cryptic failures instead of clear "PinchTab not available" messages

### 4. **No Tab Management**

Agent can't:
- List open tabs
- Switch between tabs
- Close specific tabs
- Handle "opens in new tab" links

**Impact**: Agent gets confused when links open new tabs

## 🚀 Recommended New Tools

### Priority 1: Fix Text Input (CRITICAL)

```typescript
{
  type: 'function',
  function: {
    name: 'pinchtab_type',
    description: 'Type text into a focused element (WORKS, unlike fill)',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Element reference to type into'
        },
        text: {
          type: 'string',
          description: 'Text to type'
        }
      },
      required: ['ref', 'text']
    }
  }
}
```

### Priority 2: Instance Management

```typescript
{
  type: 'function',
  function: {
    name: 'pinchtab_launch_instance',
    description: 'Launch a new browser instance (headed shows in VNC, headless runs in background)',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Instance name/profile'
        },
        mode: {
          type: 'string',
          enum: ['headed', 'headless'],
          description: 'headed = visible in VNC, headless = background'
        }
      },
      required: ['name', 'mode']
    }
  }
}
```

```typescript
{
  type: 'function',
  function: {
    name: 'pinchtab_list_instances',
    description: 'List all browser instances with their status',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}
```

```typescript
{
  type: 'function',
  function: {
    name: 'pinchtab_stop_instance',
    description: 'Stop and close a browser instance',
    parameters: {
      type: 'object',
      properties: {
        instanceId: {
          type: 'string',
          description: 'Instance ID to stop'
        }
      },
      required: ['instanceId']
    }
  }
}
```

### Priority 3: Tab Management

```typescript
{
  type: 'function',
  function: {
    name: 'pinchtab_list_tabs',
    description: 'List all open tabs in current instance',
    parameters: {
      type: 'object',
      properties: {
        instanceId: {
          type: 'string',
          description: 'Instance ID (optional, uses current)'
        }
      },
      required: []
    }
  }
}
```

```typescript
{
  type: 'function',
  function: {
    name: 'pinchtab_switch_tab',
    description: 'Switch to a different tab',
    parameters: {
      type: 'object',
      properties: {
        tabId: {
          type: 'string',
          description: 'Tab ID to switch to'
        }
      },
      required: ['tabId']
    }
  }
}
```

### Priority 4: Health & Diagnostics

```typescript
{
  type: 'function',
  function: {
    name: 'pinchtab_health',
    description: 'Check if PinchTab service is available',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}
```

### Priority 5: Advanced Actions

```typescript
{
  type: 'function',
  function: {
    name: 'pinchtab_press_key',
    description: 'Press a keyboard key or combination (Ctrl+C, Enter, etc.)',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Key to press (e.g., "Enter", "Escape", "Ctrl+C")'
        }
      },
      required: ['key']
    }
  }
}
```

## 📋 Implementation Checklist

### Phase 1: Critical Fixes (Do First!)

- [ ] Add `pinchtab_type` tool (replace broken `fill`)
- [ ] Update Web Agent system prompt to use `type` instead of `fill`
- [ ] Add service method: `async type(ref: string, text: string, tabId?: string)`
- [ ] Test with Google search and Gmail compose

### Phase 2: Instance Management

- [ ] Add `pinchtab_launch_instance` tool
- [ ] Add `pinchtab_list_instances` tool
- [ ] Add `pinchtab_stop_instance` tool
- [ ] Add service methods for instance management
- [ ] Update system prompt with instance management patterns

### Phase 3: Tab Management

- [ ] Add `pinchtab_list_tabs` tool
- [ ] Add `pinchtab_switch_tab` tool
- [ ] Add service methods for tab management
- [ ] Update system prompt with tab switching patterns

### Phase 4: Health & Diagnostics

- [ ] Add `pinchtab_health` tool
- [ ] Update system prompt to check health before tasks
- [ ] Add better error messages when PinchTab unavailable

### Phase 5: Advanced Features

- [ ] Add `pinchtab_press_key` tool
- [ ] Add service method for key press
- [ ] Document keyboard shortcuts in system prompt

## 🎓 System Prompt Updates Needed

### Current Issues in System Prompt

1. **Tells agent to use `fill`** - but it doesn't work!
2. **Says "type" is handled by execution layer** - confusing!
3. **No mention of instance management**
4. **No mention of tab management**
5. **No health check pattern**

### Recommended Prompt Changes

```markdown
## HOW TO TYPE TEXT INTO FIELDS
Use pinchtab_type (NOT pinchtab_fill which is broken):
1. Get snapshot to find the input ref
2. Call pinchtab_click on the ref to focus it
3. Call pinchtab_type with ref and text

Example:
- pinchtab_get_snapshot → find search box ref "e23"
- pinchtab_click {"ref": "e23"} → focus the field
- pinchtab_type {"ref": "e23", "text": "search query"} → type text

## INSTANCE MANAGEMENT
Before starting, check if you need a new instance:
- Use pinchtab_launch_instance for new browser sessions
- Use mode: "headed" to show browser in VNC (debugging)
- Use mode: "headless" for background tasks (faster)
- Use pinchtab_list_instances to see existing instances
- Use pinchtab_stop_instance to clean up when done

## TAB MANAGEMENT
When links open new tabs:
1. Call pinchtab_list_tabs to see all tabs
2. Call pinchtab_switch_tab with the new tabId
3. Continue with pinchtab_get_snapshot on new tab

## HEALTH CHECKS
Before starting any task:
1. Call pinchtab_health to verify service is available
2. If unhealthy, respond "PinchTab service unavailable. done."
```

## 🔍 Code Changes Required

### 1. Add `type` Action to Service

```typescript
// In packages/aria-agent/src/services/pinchtab.service.ts

/**
 * Type text into an element (WORKS, unlike fill)
 */
async type(ref: string, text: string, tabId?: string): Promise<{ success: boolean; message?: string }> {
  return this.action({ kind: 'type', ref, text }, tabId);
}
```

### 2. Update Action Interface

```typescript
// In packages/aria-agent/src/services/pinchtab.service.ts

export interface PinchTabAction {
  kind: 'click' | 'fill' | 'type' | 'navigate' | 'submit' | 'scroll' | 'wait' | 'press';
  ref?: string;
  value?: string;
  text?: string;  // Add this for type action
  key?: string;   // Add this for press action
  url?: string;
  direction?: 'up' | 'down';
  amount?: number;
  ms?: number;
}
```

### 3. Add Instance Management Methods

```typescript
// In packages/aria-agent/src/services/pinchtab.service.ts

/**
 * List all instances
 */
async listInstances(): Promise<any[]> {
  try {
    const data = await this.request('GET', '/instances');
    return data.instances || [];
  } catch (error) {
    this.logger.error(`Failed to list instances: ${error.message}`);
    throw error;
  }
}

/**
 * Stop an instance
 */
async stopInstance(instanceId: string): Promise<void> {
  try {
    await this.request('POST', `/instances/${instanceId}/stop`);
    this.logger.log(`Instance ${instanceId} stopped`);
  } catch (error) {
    this.logger.error(`Failed to stop instance: ${error.message}`);
    throw error;
  }
}

/**
 * List tabs in an instance
 */
async listTabs(instanceId?: string): Promise<any[]> {
  const id = instanceId || this.currentInstance?.id;
  if (!id) throw new Error('No instance available');
  
  try {
    const data = await this.request('GET', `/instances/${id}/tabs`);
    return data.tabs || [];
  } catch (error) {
    this.logger.error(`Failed to list tabs: ${error.message}`);
    throw error;
  }
}
```

### 4. Add New Tools

```typescript
// In packages/aria-agent/src/groq/pinchtab.tools.ts

// Replace pinchtab_fill with pinchtab_type
{
  type: 'function' as const,
  function: {
    name: 'pinchtab_type',
    description: 'Type text into an element (WORKS, unlike fill which is broken)',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'The element reference ID of the input field',
        },
        text: {
          type: 'string',
          description: 'The text to type into the field',
        },
      },
      required: ['ref', 'text'],
    },
  },
},

// Add instance management tools
{
  type: 'function' as const,
  function: {
    name: 'pinchtab_launch_instance',
    description: 'Launch a new browser instance (headed = visible in VNC, headless = background)',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Instance name/profile',
        },
        mode: {
          type: 'string',
          enum: ['headed', 'headless'],
          description: 'headed shows browser in VNC, headless runs in background',
        },
      },
      required: ['name', 'mode'],
    },
  },
},

// ... add other tools from recommendations above
```

### 5. Update Web Agent Tool Handling

```typescript
// In packages/aria-agent/src/agents/web/web.agent.ts

// Add case for pinchtab_type
case 'pinchtab_type':
  result = await this.pinchTabService.type(
    toolCall.input.ref,
    toolCall.input.text,
  );
  break;

// Add case for pinchtab_launch_instance
case 'pinchtab_launch_instance':
  const instance = await this.pinchTabService.initInstance(
    toolCall.input.name,
    toolCall.input.mode === 'headed',
  );
  result = { success: true, instanceId: instance.id };
  break;

// Add cases for other new tools...
```

## 🎯 Summary

You discovered PinchTab works flawlessly, but our agent isn't using it to its full potential!

**Critical gaps:**
1. Using broken `fill` instead of working `type`
2. No instance management (can't launch headed mode for VNC)
3. No tab management (can't handle multi-tab workflows)
4. No health checks (can't verify PinchTab is running)

**Next steps:**
1. Add `pinchtab_type` tool (replace `fill`)
2. Add instance management tools
3. Add tab management tools
4. Update system prompts
5. Test with your VNC setup in headed mode!

This will make the Web Agent much more powerful and reliable. 🚀
