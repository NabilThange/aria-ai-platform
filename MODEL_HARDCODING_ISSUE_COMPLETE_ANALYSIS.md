# 🔴 CRITICAL ISSUE: Model Hardcoding Despite User Selection

## Executive Summary

**Problem**: Users can change agent models in the frontend settings, but tasks are still created with hardcoded default models. The user's model selection is ignored during task creation.

**Root Cause**: The frontend does NOT pass the selected model when creating tasks, and the backend falls back to a hardcoded default.

---

## Complete Flow Analysis

### 1. ✅ Frontend Model Selection (WORKING)

**File**: `packages/aria-ui/src/components/settings/AgentSettingsModal.tsx`

- Users select models via dropdown UI
- Sends `PUT /api/agents/config` with selected models
- Example: User selects `openai/gpt-oss-120b` for ORCHESTRATOR

```typescript
const handleSave = async () => {
  const response = await fetch("/api/agents/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agents: agentConfigs }),
  });
};
```

**Status**: ✅ This works correctly

---

### 2. ✅ Backend Configuration Storage (WORKING BUT FLAWED)

**File**: `packages/aria-agent/src/agents/agents.service.ts`

```typescript
updateAgentConfigs(agents: AgentConfig[]) {
  agents.forEach((agent) => {
    if (this.agentConfigs.has(agent.name)) {
      this.agentConfigs.set(agent.name, agent);
      this.logger.log(`Updated ${agent.name} to use model: ${agent.model}`);
    }
  });
}
```

**Status**: ✅ Stores configuration in memory
**Problem**: ⚠️ Configuration is NOT persisted to database (lost on restart)

---

### 3. ❌ Frontend Task Creation (BROKEN - DOESN'T PASS MODEL)

**File**: `packages/aria-ui/src/utils/taskUtils.ts`

```typescript
export async function startTask(data: {
  description: string;
  model: Model;  // ⚠️ Model parameter exists but is NEVER passed!
  files?: FileWithBase64[];
}): Promise<Task | null> {
  return apiRequest<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
```

**File**: `packages/aria-ui/src/app/dashboard/page.tsx`

```typescript
const taskData: {
  description: string;
  files?: FileWithBase64[];
} = {
  description: input,
};

// ❌ NO MODEL PASSED!
const task = await startTask(taskData);
```

**Status**: ❌ Frontend NEVER passes the model parameter
**Impact**: Backend has no way to know which model the user selected

---

### 4. ❌ Backend Task Creation (USES HARDCODED DEFAULT)

**File**: `packages/aria-agent/src/tasks/tasks.service.ts` (Line 57)

```typescript
const task = await prisma.task.create({
  data: {
    description: createTaskDto.description,
    type: createTaskDto.type || TaskType.IMMEDIATE,
    priority: createTaskDto.priority || TaskPriority.MEDIUM,
    status: TaskStatus.PENDING,
    createdBy: createTaskDto.createdBy || Role.USER,
    model: createTaskDto.model || { 
      provider: 'bytez', 
      name: 'anthropic/claude-sonnet-4-6'  // ❌ HARDCODED DEFAULT
    },
  },
});
```

**Status**: ❌ Falls back to hardcoded `anthropic/claude-sonnet-4-6`
**Impact**: User's model selection is completely ignored

---

### 5. ⚠️ Agent Model Resolution (PARTIALLY WORKING)

**File**: `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`

```typescript
private getModel() {
  const config = this.agentsService.getAgentModel('ORCHESTRATOR');
  return config ? config : this.model;  // Falls back to AGENT_MODELS.ORCHESTRATOR
}
```

**File**: `packages/aria-agent/src/config/agents.config.ts`

```typescript
export const AGENT_MODELS = {
  ORCHESTRATOR: {
    provider: 'bytez',
    model: 'anthropic/claude-opus-4-6',  // ❌ HARDCODED DEFAULT
    description: 'Brain of system - bad plan = everything fails',
  },
  // ... other agents
};
```

**Status**: ⚠️ Reads from AgentsService, but falls back to hardcoded config
**Impact**: If AgentsService loses configuration (restart), uses hardcoded default

---

## 🚩 Three Critical Issues

### Issue #1: Frontend Doesn't Pass Model to Task Creation

**Location**: `packages/aria-ui/src/app/dashboard/page.tsx`

**Problem**:
```typescript
// Current (BROKEN):
const taskData = {
  description: input,
};

// Should be:
const taskData = {
  description: input,
  model: selectedModel,  // ❌ MISSING!
};
```

**Impact**: Backend has no way to know which model to use

---

### Issue #2: Backend Uses Hardcoded Default

**Location**: `packages/aria-agent/src/tasks/tasks.service.ts` (Line 57)

**Problem**:
```typescript
model: createTaskDto.model || { 
  provider: 'bytez', 
  name: 'anthropic/claude-sonnet-4-6'  // ❌ HARDCODED
}
```

**Should be**:
```typescript
model: createTaskDto.model || this.getDefaultModelFromAgentConfig('ORCHESTRATOR')
```

**Impact**: Even if frontend passed model, backend would still use hardcoded default if model is undefined

---

### Issue #3: Agent Configuration Not Persisted

**Location**: `packages/aria-agent/src/agents/agents.service.ts`

**Problem**: Configuration stored in memory only (Map)
```typescript
private agentConfigs: Map<string, AgentConfig> = new Map();
```

**Impact**: 
- Configuration lost on application restart
- Configuration lost if service is re-initialized
- No way to retrieve user's model selection after restart

---

## 📊 Current vs Expected Flow

### Current Flow (BROKEN):
```
1. User selects "openai/gpt-oss-120b" for ORCHESTRATOR
   ↓
2. Frontend saves to /api/agents/config
   ↓
3. AgentsService stores in memory Map ✅
   ↓
4. User creates task "open google and search INDIA"
   ↓
5. Frontend sends: { description: "..." }  ❌ NO MODEL
   ↓
6. Backend creates task with: anthropic/claude-sonnet-4-6  ❌ HARDCODED
   ↓
7. OrchestratorAgent reads from AgentsService
   ↓
8. If config exists: uses openai/gpt-oss-120b ✅
   If config lost: uses anthropic/claude-opus-4-6 ❌ HARDCODED
```

### Expected Flow (FIXED):
```
1. User selects "openai/gpt-oss-120b" for ORCHESTRATOR
   ↓
2. Frontend saves to /api/agents/config
   ↓
3. AgentsService stores in database (persistent) ✅
   ↓
4. User creates task "open google and search INDIA"
   ↓
5. Frontend reads ORCHESTRATOR config and sends:
   { description: "...", model: { provider: "groq", name: "openai/gpt-oss-120b" } } ✅
   ↓
6. Backend creates task with user-selected model ✅
   ↓
7. OrchestratorAgent uses task.model ✅
```

---

## 🔧 Required Fixes

### Fix #1: Frontend - Pass Model to Task Creation

**File**: `packages/aria-ui/src/app/dashboard/page.tsx`

**Before**:
```typescript
const taskData: {
  description: string;
  files?: FileWithBase64[];
} = {
  description: input,
};
```

**After**:
```typescript
// Fetch current ORCHESTRATOR model from agent config
const agentConfigResponse = await fetch("/api/agents/config");
const agentConfig = await agentConfigResponse.json();
const orchestratorConfig = agentConfig.agents.find(a => a.name === 'ORCHESTRATOR');

const taskData: {
  description: string;
  model?: Model;
  files?: FileWithBase64[];
} = {
  description: input,
  model: orchestratorConfig ? {
    provider: orchestratorConfig.provider,
    name: orchestratorConfig.model,
  } : undefined,
};
```

---

### Fix #2: Backend - Read Agent Config Instead of Hardcoded Default

**File**: `packages/aria-agent/src/tasks/tasks.service.ts`

**Before**:
```typescript
model: createTaskDto.model || { 
  provider: 'bytez', 
  name: 'anthropic/claude-sonnet-4-6' 
}
```

**After**:
```typescript
// Inject AgentsService in constructor
constructor(
  private readonly agentsService: AgentsService,
  // ... other services
) {}

// In create method:
const orchestratorConfig = this.agentsService.getAgentModel('ORCHESTRATOR');
const defaultModel = orchestratorConfig || { 
  provider: 'bytez', 
  name: 'anthropic/claude-sonnet-4-6' 
};

model: createTaskDto.model || defaultModel
```

---

### Fix #3: Persist Agent Configuration to Database

**File**: `packages/aria-agent/src/agents/agents.service.ts`

**Add database persistence**:
```typescript
async updateAgentConfigs(agents: AgentConfig[]) {
  this.logger.log(`Updating ${agents.length} agent configurations`);
  
  for (const agent of agents) {
    if (this.agentConfigs.has(agent.name)) {
      // Update in-memory
      this.agentConfigs.set(agent.name, agent);
      
      // Persist to database
      await this.prisma.agentConfig.upsert({
        where: { name: agent.name },
        update: {
          provider: agent.provider,
          model: agent.model,
          description: agent.description,
        },
        create: {
          name: agent.name,
          provider: agent.provider,
          model: agent.model,
          description: agent.description,
        },
      });
      
      this.logger.log(`Updated ${agent.name} to use model: ${agent.model}`);
    }
  }
}

// Load from database on initialization
private async initializeDefaultConfigs() {
  // Load from database first
  const savedConfigs = await this.prisma.agentConfig.findMany();
  
  if (savedConfigs.length > 0) {
    savedConfigs.forEach((config) => {
      this.agentConfigs.set(config.name, config);
    });
  } else {
    // Fall back to defaults from AGENT_MODELS
    Object.entries(AGENT_MODELS).forEach(([name, config]) => {
      this.agentConfigs.set(name, {
        name,
        provider: config.provider,
        model: config.model,
        description: config.description,
      });
    });
  }
}
```

**Add Prisma schema**:
```prisma
model AgentConfig {
  id          String   @id @default(cuid())
  name        String   @unique
  provider    String
  model       String
  description String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 🎯 Priority Order

1. **CRITICAL**: Fix #1 - Frontend must pass model to task creation
2. **CRITICAL**: Fix #2 - Backend must read agent config instead of hardcoded default
3. **HIGH**: Fix #3 - Persist agent configuration to database

---

## 📝 Testing Checklist

After applying fixes:

1. ✅ User changes ORCHESTRATOR model to `openai/gpt-oss-120b`
2. ✅ User creates task "open google and search INDIA"
3. ✅ Task is created with `openai/gpt-oss-120b` (not hardcoded default)
4. ✅ OrchestratorAgent uses `openai/gpt-oss-120b` during execution
5. ✅ Restart application
6. ✅ User creates another task
7. ✅ Task still uses `openai/gpt-oss-120b` (configuration persisted)

---

## 🔍 Files Requiring Changes

### Frontend:
- `packages/aria-ui/src/app/dashboard/page.tsx` - Pass model to task creation
- `packages/aria-ui/src/utils/taskUtils.ts` - Ensure model parameter is used

### Backend:
- `packages/aria-agent/src/tasks/tasks.service.ts` - Read agent config instead of hardcoded default
- `packages/aria-agent/src/agents/agents.service.ts` - Add database persistence
- `packages/aria-agent/prisma/schema.prisma` - Add AgentConfig model

---

## 📌 Summary

The issue is NOT in the OrchestratorAgent or RecoveryAgent - they correctly read from AgentsService. The issue is:

1. Frontend doesn't pass the model when creating tasks
2. Backend uses a hardcoded default when model is not provided
3. Agent configuration is not persisted to database

All three issues must be fixed to ensure user's model selection is respected.
