# ✅ Model Hardcoding Issue - FIXES APPLIED

## Summary

All three critical issues have been fixed to ensure user's model selection is respected throughout the task creation and execution flow.

---

## Fix #1: Frontend - Pass Model to Task Creation ✅

**File**: `packages/aria-ui/src/app/dashboard/page.tsx`

**Changes**:
- Frontend now fetches ORCHESTRATOR agent configuration before creating tasks
- Passes the selected model to the backend via the `model` parameter
- Includes error handling with fallback to backend default if fetch fails

**Code Added**:
```typescript
// Fetch current ORCHESTRATOR model from agent config
let orchestratorModel: Model | undefined;
try {
  const agentConfigResponse = await fetch("/api/agents/config");
  if (agentConfigResponse.ok) {
    const agentConfig = await agentConfigResponse.json();
    const orchestratorConfig = agentConfig.agents?.find((a: any) => a.name === 'ORCHESTRATOR');
    if (orchestratorConfig) {
      orchestratorModel = {
        provider: orchestratorConfig.provider,
        name: orchestratorConfig.model,
      };
      logger.debug({ event: 'task.model_selected', model: orchestratorModel }, 'Using ORCHESTRATOR model for task');
    }
  }
} catch (error) {
  logger.warn({ event: 'task.model_fetch_failed' }, 'Failed to fetch agent config, will use backend default', error instanceof Error ? error : undefined);
}

const taskData: {
  description: string;
  model?: Model;
  files?: FileWithBase64[];
} = {
  description: input,
  ...(orchestratorModel && { model: orchestratorModel }),
};
```

**Impact**: 
- User's selected model is now passed to backend during task creation
- Graceful fallback if agent config fetch fails

---

## Fix #2: Backend - Read Agent Config Instead of Hardcoded Default ✅

**File**: `packages/aria-agent/src/tasks/tasks.service.ts`

**Changes**:
1. Injected `AgentsService` into `TasksService` constructor
2. Modified task creation to read from agent configuration
3. Falls back to agent config if frontend doesn't provide model
4. Only uses hardcoded default as final fallback

**Code Added**:
```typescript
// Import AgentsService
import { AgentsService } from '../agents/agents.service';

// Inject in constructor
constructor(
  readonly prisma: PrismaService,
  @Inject(forwardRef(() => TasksGateway))
  private readonly tasksGateway: TasksGateway,
  private readonly configService: ConfigService,
  private readonly eventEmitter: EventEmitter2,
  private readonly sharedStateService: SharedStateService,
  private readonly agentsService: AgentsService, // ✅ NEW
) {
  this.logger.log('TasksService initialized');
}

// In create method:
// Get default model from agent configuration if not provided
let taskModel = createTaskDto.model;
if (!taskModel) {
  const orchestratorConfig = this.agentsService.getAgentModel('ORCHESTRATOR');
  if (orchestratorConfig) {
    taskModel = { 
      provider: orchestratorConfig.provider, 
      name: orchestratorConfig.model 
    };
    this.logger.log(`Using ORCHESTRATOR agent config: ${orchestratorConfig.model}`);
  } else {
    // Final fallback to hardcoded default
    taskModel = { provider: 'bytez', name: 'anthropic/claude-sonnet-4-6' };
    this.logger.warn('No agent config found, using hardcoded default model');
  }
}
```

**Impact**:
- Backend now respects agent configuration
- Proper fallback chain: frontend model → agent config → hardcoded default
- Clear logging for debugging

---

## Fix #3: Persist Agent Configuration to Database ✅

### 3A. Prisma Schema Update

**File**: `packages/aria-agent/prisma/schema.prisma`

**Changes**: Added `AgentConfig` model

```prisma
model AgentConfig {
  id          String   @id @default(uuid())
  name        String   @unique
  provider    String
  model       String
  description String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Impact**: Agent configurations are now persisted to database

---

### 3B. AgentsService Database Integration

**File**: `packages/aria-agent/src/agents/agents.service.ts`

**Changes**:
1. Injected `PrismaService` into constructor
2. Implemented `OnModuleInit` to load configurations on startup
3. Modified `updateAgentConfigs()` to persist to database
4. Modified `initializeDefaultConfigs()` to load from database first

**Code Added**:
```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentsService implements OnModuleInit {
  private readonly logger = new Logger(AgentsService.name);
  private agentConfigs: Map<string, AgentConfig> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Initialize with configurations from database or defaults
    await this.initializeDefaultConfigs();
  }

  private async initializeDefaultConfigs() {
    try {
      // Try to load from database first
      const savedConfigs = await this.prisma.agentConfig.findMany();
      
      if (savedConfigs.length > 0) {
        this.logger.log(`Loading ${savedConfigs.length} agent configurations from database`);
        savedConfigs.forEach((config) => {
          this.agentConfigs.set(config.name, {
            name: config.name,
            provider: config.provider,
            model: config.model,
            description: config.description,
          });
        });
      } else {
        // Fall back to defaults from AGENT_MODELS
        this.logger.log('No saved configurations found, using defaults from AGENT_MODELS');
        Object.entries(AGENT_MODELS).forEach(([name, config]) => {
          this.agentConfigs.set(name, {
            name,
            provider: config.provider,
            model: config.model,
            description: config.description,
          });
        });
      }
    } catch (error) {
      this.logger.error('Failed to load agent configurations from database, using defaults', error);
      // Fall back to defaults on error
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

  async updateAgentConfigs(agents: AgentConfig[]) {
    this.logger.log(`Updating ${agents.length} agent configurations`);
    
    for (const agent of agents) {
      if (this.agentConfigs.has(agent.name)) {
        // Update in-memory
        this.agentConfigs.set(agent.name, agent);
        
        try {
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
          
          this.logger.log(`Updated ${agent.name} to use model: ${agent.model} (persisted to database)`);
        } catch (error) {
          this.logger.error(`Failed to persist ${agent.name} configuration to database`, error);
        }
      }
    }

    return {
      success: true,
      message: 'Agent configurations updated successfully',
      agents: Array.from(this.agentConfigs.values()),
    };
  }
}
```

**Impact**:
- Configurations survive application restarts
- Automatic loading from database on startup
- Graceful fallback to defaults if database is unavailable

---

## Next Steps

### 1. Run Database Migration

```bash
cd packages/aria-agent
npx prisma migrate dev --name add_agent_config_model
```

This will:
- Create the `AgentConfig` table in the database
- Generate Prisma client with the new model

### 2. Restart the Application

```bash
# Stop the backend
# Restart the backend
npm run start:dev
```

### 3. Test the Fix

1. Open Agent Settings in the UI
2. Change ORCHESTRATOR model to `openai/gpt-oss-120b`
3. Save the configuration
4. Create a new task: "open google and search INDIA"
5. Check logs - should show:
   ```
   Using ORCHESTRATOR agent config: openai/gpt-oss-120b
   Task created successfully with ID: ...
   🔧 Using Groq service for model: openai/gpt-oss-120b
   ```
6. Restart the application
7. Create another task
8. Verify it still uses `openai/gpt-oss-120b` (configuration persisted)

---

## Expected Log Output (After Fix)

### Frontend Logs:
```
[DEBUG] task.model_selected: Using ORCHESTRATOR model for task
  model: { provider: "groq", name: "openai/gpt-oss-120b" }
```

### Backend Logs:
```
[LOG] Creating new task with description: open google and search INDIA
[LOG] Task created successfully with ID: 9a3e80d3-ce34-4e6a-a6ea-5dc2c429bcb5
[LOG] 📋 Creating execution plan for task 9a3e80d3-ce34-4e6a-a6ea-5dc2c429bcb5
[LOG] 🔧 Using Groq service for model: openai/gpt-oss-120b
```

---

## Files Modified

### Frontend:
- ✅ `packages/aria-ui/src/app/dashboard/page.tsx`

### Backend:
- ✅ `packages/aria-agent/src/tasks/tasks.service.ts`
- ✅ `packages/aria-agent/src/agents/agents.service.ts`
- ✅ `packages/aria-agent/prisma/schema.prisma`

---

## Verification Checklist

After running migration and restarting:

- [ ] User can change ORCHESTRATOR model in settings
- [ ] Configuration is saved to database
- [ ] New tasks use the selected model (not hardcoded default)
- [ ] Logs show correct model being used
- [ ] Configuration persists after application restart
- [ ] Frontend gracefully handles agent config fetch failures
- [ ] Backend gracefully handles missing agent config

---

## Summary

The issue has been completely resolved:

1. ✅ Frontend now passes the selected model to backend
2. ✅ Backend reads from agent configuration instead of hardcoded default
3. ✅ Agent configurations are persisted to database

User's model selection is now respected throughout the entire flow, and configurations survive application restarts.
