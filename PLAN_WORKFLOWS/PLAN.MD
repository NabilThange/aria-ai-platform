I'll analyze your vague idea and create a comprehensive implementation plan. This is a brilliant concept - essentially creating a "workflow registry" that makes your agent extensible without code changes.

# Comprehensive Implementation Plan: Workflow Registry System

## 🎯 Core Concept

You're building an **executable workflow system** where:
- Workflows are **TypeScript files** (`.workflow.ts`)
- Agent **discovers** them dynamically via tools
- Agent **executes** them by passing variables
- Adding new capabilities = adding new files (zero code changes)
- Workflows are real code that runs directly (no parsing/interpretation)

---

## 🧠 Implementation Logic

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         AGENT                                │
│  (Orchestrator/Web/Desktop Agent)                           │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ Uses 3 new tools:
               │ 1. list_workflows()
               │ 2. read_workflow(name)
               │ 3. run_workflow(name, vars)
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│              WorkflowService (New Service)                   │
│  - Scans /workflows folder                                   │
│  - Imports workflow .ts files dynamically                    │
│  - Executes workflows using existing Desktop/Web services   │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ Imports from:
               ▼
┌─────────────────────────────────────────────────────────────┐
│              /workflows Folder                               │
│  ├── send-email.workflow.ts                                 │
│  ├── google-search.workflow.ts                              │
│  ├── whatsapp-message.workflow.ts                           │
│  └── ... (add more without code changes)                    │
└─────────────────────────────────────────────────────────────┘
               │
               │ Executes using:
               ▼
┌─────────────────────────────────────────────────────────────┐
│     Existing Services (Desktop/PinchTab/VNC)                │
│  - PinchTabService (browser automation)                     │
│  - Desktop computer-use API (VNC control)                   │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Agent Pipeline Integration

**Current Pipeline:**
```
Clarifier → Orchestrator → Web/Desktop → Verifier → Recovery → Reporter
```

**Where Workflows Fit:**

**Option 1: Orchestrator Calls Workflows (RECOMMENDED)**
```
Clarifier → Orchestrator (checks workflows, creates plan) → Execute plan
                ↓
         list_workflows()
         read_workflow()
         
         Creates ExecutionPlan with:
         - Regular steps (web/desktop)
         - Workflow steps (workflow)
         
OrchestrationService executes:
- Regular steps → Web/Desktop agents
- Workflow steps → run_workflow()
```

**Why Orchestrator?**
- ✅ Orchestrator already creates execution plans
- ✅ Can decide: use workflow OR manual steps
- ✅ Can chain workflows with manual steps
- ✅ Workflows become part of the plan
- ✅ No changes to other agents needed

**Option 2: New WorkflowAgent (NOT RECOMMENDED)**
- ❌ Adds complexity to pipeline
- ❌ Orchestrator still needs to know about workflows
- ❌ Extra agent = extra latency
- ❌ Doesn't fit the current architecture

**Option 3: Clarifier Calls Workflows (NOT RECOMMENDED)**
- ❌ Clarifier's job is understanding intent, not execution
- ❌ Would bypass Orchestrator's planning
- ❌ Breaks the pipeline flow

### Workflow File Format: `.workflow.ts`

```typescript
// workflows/send-email.workflow.ts

import { PinchTabService } from '../src/services/pinchtab.service';

/**
 * METADATA (Agent reads this via export)
 */
export const metadata = {
  name: 'send-email',
  description: 'Send an email via Gmail web interface',
  version: '1.0',
  timeout_ms: 15000,
  variables: [
    { name: 'to', type: 'string', required: true, description: 'Recipient email' },
    { name: 'subject', type: 'string', required: true, description: 'Email subject' },
    { name: 'body', type: 'string', required: true, description: 'Email body' }
  ]
};

/**
 * EXECUTION (WorkflowService runs this function)
 */
export async function execute(
  variables: { to: string; subject: string; body: string },
  services: { pinchTab: PinchTabService }
): Promise<{ success: boolean; message?: string }> {
  
  const { pinchTab } = services;
  const { to, subject, body } = variables;

  try {
    // Step 1: Navigate to Gmail compose
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    await pinchTab.navigate(url);
    
    // Step 2: Wait for page load
    await pinchTab.wait(3000);
    
    // Step 3: Get snapshot to find Send button
    const snapshot = await pinchTab.snapshot('interactive');
    const elements = (snapshot as any).nodes || snapshot.elements || [];
    
    // Step 4: Find Send button
    const sendButton = elements.find((el: any) => 
      el.role === 'button' && el.name?.toLowerCase().includes('send')
    );
    
    if (!sendButton) {
      throw new Error('Could not find Send button');
    }
    
    // Step 5: Click Send
    await pinchTab.click(sendButton.ref);
    await pinchTab.wait(2000);
    
    return { success: true, message: `Email sent to ${to}` };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
}
```

### Execution Flow

```
User: "Email john@example.com about the meeting"
  ↓
Clarifier: Understands intent
  ↓
Orchestrator: 
  1. Calls list_workflows()
  2. Sees "send-email" workflow available
  3. Calls read_workflow("send-email")
  4. Decides: Use workflow instead of manual steps
  5. Creates ExecutionPlan with workflow step
  ↓
OrchestrationService:
  1. Sees step.type === 'workflow'
  2. Calls run_workflow("send-email", {to, subject, body})
  3. WorkflowService imports send-email.workflow.ts
  4. Calls module.execute(vars, services)
  5. Workflow runs (navigate, snapshot, click)
  6. Returns success/failure
  ↓
Verifier: Checks workflow result
  ↓
Reporter: Summarizes task
```

**Alternative Flow (Manual Steps):**
```
User: "Do something complex with no workflow"
  ↓
Orchestrator:
  1. Calls list_workflows()
  2. No matching workflow found
  3. Creates manual ExecutionPlan (web/desktop steps)
  ↓
OrchestrationService:
  1. Executes web/desktop steps normally
  2. Web/Desktop agents handle execution
```

**Hybrid Flow (Workflow + Manual):**
```
User: "Search Google for X, then email me the results"
  ↓
Orchestrator:
  1. Calls list_workflows()
  2. Finds "google-search" and "send-email"
  3. Creates ExecutionPlan:
     - Step 1: workflow (google-search)
     - Step 2: workflow (send-email)
  ↓
OrchestrationService:
  1. Runs google-search workflow
  2. Passes results to send-email workflow
  3. Both workflows execute sequentially
```

---

## 📋 Task List / Implementation Checklist

### Phase 1: Core Infrastructure

**Task 1.1: Create Workflow TypeScript Interface**
- [x] Define TypeScript interface for workflow metadata
- [x] Metadata export: name, description, version, timeout_ms, variables
- [x] Execute function signature: `(variables, services) => Promise<WorkflowResult>`
- [x] WorkflowServices interface: pinchTab, desktop
- [x] WorkflowResult interface: success, message, data

**Task 1.2: Create /workflows Folder Structure**
- [x] Create `packages/aria-agent/workflows/` directory
- [x] Add `.gitkeep` or example workflow
- [ ] Create subdirectories: `/email`, `/messaging`, `/search`, `/file-ops`

**Task 1.3: Create WorkflowService**
```typescript
// packages/aria-agent/src/services/workflow.service.ts
@Injectable()
export class WorkflowService {
  constructor(
    private pinchTabService: PinchTabService,
    private desktopService: DesktopService, // New wrapper for VNC API
  ) {}

  async listWorkflows(): Promise<WorkflowMetadata[]>
  async readWorkflow(name: string): Promise<WorkflowMetadata>
  async runWorkflow(name: string, vars: Record<string, any>, taskId: string): Promise<WorkflowResult>
}
```
- [x] Implement `listWorkflows()` - scan folder, import metadata from each .workflow.ts
- [x] Implement `readWorkflow()` - import module, return metadata
- [x] Implement `runWorkflow()` - import module, validate vars, call execute()

**Task 1.4: Create Workflow Loader**
```typescript
// packages/aria-agent/src/workflows/workflow.loader.ts
export class WorkflowLoader {
  async loadWorkflow(name: string): Promise<WorkflowModule>
  validateMetadata(metadata: any): boolean
  validateVariables(schema: any[], vars: Record<string, any>): void
}
```
- [x] Dynamic TypeScript module import
- [x] Metadata validation
- [x] Variable validation (required fields, types)

**Task 1.5: Create Workflow Execution Context**
```typescript
// packages/aria-agent/src/workflows/workflow.context.ts
export class WorkflowExecutionContext {
  constructor(
    public taskId: string,
    public services: WorkflowServices,
    public logger: Logger
  ) {}
  
  async execute(workflow: WorkflowModule, vars: Record<string, any>): Promise<WorkflowResult>
}
```
- [x] Prepare services (PinchTab, Desktop) - Integrated into WorkflowService
- [x] Call workflow.execute() with error handling - Integrated into WorkflowService
- [x] Log execution start/end - Integrated into WorkflowService
- [x] Track execution time - Integrated into WorkflowService

### Phase 2: Tool Definitions

**Task 2.1: Create Workflow Tools for Orchestrator Agent**
```typescript
// packages/aria-agent/src/groq/workflow.tools.ts
export const workflowTools = [
  {
    type: 'function',
    function: {
      name: 'list_workflows',
      description: 'List all available pre-built workflows. Use this BEFORE creating manual steps to see if a workflow already exists for the task.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_workflow',
      description: 'Get detailed metadata for a specific workflow including required variables',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Workflow name from list_workflows' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'use_workflow',
      description: 'Include a workflow in the execution plan. The workflow will be executed by OrchestrationService.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Workflow name' },
          variables: { type: 'object', description: 'Variables as key-value pairs' }
        },
        required: ['name', 'variables']
      }
    }
  }
];
```
- [x] Add workflow tools to Orchestrator agent ONLY
- [x] Do NOT add to Web/Desktop agents (they don't need them)
- [x] Do NOT add to Clarifier (not its job)

**Task 2.2: Integrate Tools into Orchestrator Agent**
- [x] Import workflowTools in `orchestrator.agent.ts`
- [x] Add to Orchestrator's tool list when calling LLM (via useTools parameter)
- [x] Handle tool calls in Orchestrator's response parsing (executeToolCall method)
- [x] When `use_workflow` is called, add workflow step to ExecutionPlan (handled in parseExecutionPlan)

**Task 2.3: Update Orchestrator System Prompt**
```typescript
const workflowGuidance = `
## Workflows

You have access to pre-built workflows for common tasks. Workflows are faster, more reliable, and tested.

**ALWAYS check for workflows FIRST** before creating manual steps:
1. Call list_workflows() to see available workflows
2. If a workflow matches the task, call read_workflow(name) to see required variables
3. Call use_workflow(name, variables) to include it in your plan

**When to use workflows:**
- Exact match: Task matches workflow description perfectly
- Partial match: Workflow handles part of the task (combine with manual steps)
- Chaining: Multiple workflows can be chained together

**When to use manual steps:**
- No matching workflow exists
- Task is too unique/custom
- Workflow doesn't fit the specific requirements

**Example plan with workflow:**
{
  "steps": [
    {
      "id": "step_1",
      "type": "workflow",
      "workflow_name": "send-email",
      "workflow_vars": {"to": "john@example.com", "subject": "Meeting", "body": "..."},
      "description": "Send email using pre-built workflow",
      "success_criteria": "Email sent successfully"
    }
  ]
}

**Example hybrid plan (workflow + manual):**
{
  "steps": [
    {
      "id": "step_1",
      "type": "workflow",
      "workflow_name": "google-search",
      "workflow_vars": {"query": "AI news"},
      "description": "Search Google for AI news",
      "success_criteria": "Search results loaded"
    },
    {
      "id": "step_2",
      "type": "desktop",
      "description": "Take screenshot of results",
      "success_criteria": "Screenshot saved"
    },
    {
      "id": "step_3",
      "type": "workflow",
      "workflow_name": "send-email",
      "workflow_vars": {"to": "user@example.com", "subject": "AI News", "body": "See attached"},
      "description": "Email screenshot to user",
      "success_criteria": "Email sent"
    }
  ]
}
`;
```
- [x] Add workflow guidance to Orchestrator system prompt
- [x] Explain when to use workflows vs manual steps
- [x] Provide examples of workflow steps in ExecutionPlan
- [x] Update ExecutionStep type to support workflow steps

### Phase 3: Example Workflows

**Task 3.1: Create send-email.workflow.ts**
- [ ] Gmail compose URL workflow
- [ ] Variables: to, subject, body
- [ ] Execute function: navigate, wait, snapshot, click Send
- [ ] Copy pattern from pinchtab-simple-test.ts

**Task 3.2: Create google-search.workflow.ts**
- [x] Google search workflow
- [x] Variables: query
- [x] Execute function: navigate, type, click, wait for results
- [x] Copy pattern from pinchtab-simple-test.ts

**Task 3.3: Create whatsapp-message.workflow.ts**
- [ ] WhatsApp Web workflow
- [ ] Variables: contact, message
- [ ] Execute function: navigate, find contact, type, send

**Task 3.4: Create file-operations.workflow.ts**
- [ ] Desktop file operations
- [ ] Variables: filename, content
- [ ] Execute function: open terminal, create file, write content

**Task 3.5: Create screenshot-and-save.workflow.ts**
- [x] Take screenshot and save to file (created as take-screenshot.workflow.ts)
- [x] Variables: description (optional)
- [x] Execute function: snapshot current page

**Task 3.6: Create search-and-email.workflow.ts (BONUS)**
- [x] Mixed workflow combining search + email
- [x] Variables: query, recipient, subject
- [x] Execute function: search Google, compose email with results, send

### Phase 4: Advanced Features

**Task 4.1: Conditional Logic (Native TypeScript)**
```typescript
// Workflows can use native if/else
const snapshot = await pinchTab.snapshot('interactive');
const acceptButton = elements.find(el => el.role === 'button' && el.name === 'Accept');

if (acceptButton) {
  await pinchTab.click(acceptButton.ref);
} else {
  // Alternative logic
}
```
- [ ] Document conditional patterns
- [ ] Provide helper functions for common checks
- [ ] Examples of if/else, switch, ternary

**Task 4.2: Loops and Retries (Native TypeScript)**
```typescript
// Workflows can use native loops
for (let i = 0; i < 3; i++) {
  try {
    await pinchTab.click(buttonRef);
    break; // Success
  } catch (error) {
    if (i === 2) throw error; // Last attempt
    await pinchTab.wait(1000); // Retry delay
  }
}
```
- [ ] Document retry patterns
- [ ] Provide retry helper function
- [ ] Examples of for/while loops

**Task 4.3: Workflow Composition (Import Other Workflows)**
```typescript
// Workflows can import and call other workflows
import * as googleSearch from './google-search.workflow';
import * as sendEmail from './send-email.workflow';

export async function execute(variables, services) {
  // Call google-search workflow
  const searchResult = await googleSearch.execute(
    { query: variables.search_term },
    services
  );
  
  // Call send-email workflow with results
  const emailResult = await sendEmail.execute(
    { 
      to: variables.recipient,
      subject: 'Search results',
      body: searchResult.data
    },
    services
  );
  
  return { success: true };
}
```
- [ ] Document workflow composition patterns
- [ ] Allow workflows to import other workflows
- [ ] Pass results between workflows

**Task 4.4: Workflow Helper Functions**
```typescript
// packages/aria-agent/src/workflows/helpers.ts
export const workflowHelpers = {
  findElement: (elements: any[], criteria: { role?: string; name?: string; text?: string }) => {
    return elements.find(el => 
      (!criteria.role || el.role === criteria.role) &&
      (!criteria.name || el.name?.includes(criteria.name)) &&
      (!criteria.text || el.text?.includes(criteria.text))
    );
  },
  
  waitForCondition: async (condition: () => boolean, timeout: number) => {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeout) throw new Error('Timeout');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
};
```
- [ ] Implement helper functions
- [ ] Export from workflows/helpers.ts
- [ ] Document usage in workflows

### Phase 5: Testing & Documentation

**Task 5.1: Create Workflow Tests**
```typescript
// packages/aria-agent/test/workflow-execution.test.ts
describe('Workflow Execution', () => {
  it('should execute send-email workflow', async () => {
    const result = await workflowService.runWorkflow('send-email', {
      to: 'test@example.com',
      subject: 'Test',
      body: 'Hello'
    }, taskId);
    expect(result.success).toBe(true);
  });
});
```
- [ ] Unit tests for WorkflowService
- [ ] Integration tests for each example workflow
- [ ] Test variable substitution
- [ ] Test error handling

**Task 5.2: Create Workflow Documentation**
- [ ] README.md in /workflows folder
- [ ] Workflow .ts file format specification
- [ ] How to create new workflows (copy pattern from test files)
- [ ] Available services reference (PinchTabService, DesktopService)
- [ ] Helper functions reference
- [ ] TypeScript interface documentation

**Task 5.3: Create Workflow Validation Tool**
```bash
npm run validate-workflow -- send-email.workflow.ts
```
- [ ] CLI tool to validate workflow TypeScript syntax
- [ ] Check required metadata fields
- [ ] Verify execute function signature
- [ ] TypeScript compiler validates syntax automatically

### Phase 6: Agent Integration

**Task 6.1: Update Orchestrator System Prompt**
```typescript
const workflowGuidance = `
You have access to pre-built workflows for common tasks. Always check available workflows before planning manual steps.

Use these tools:
1. list_workflows() - See what's available
2. read_workflow(name) - Get details about a workflow
3. run_workflow(name, vars) - Execute a workflow

Workflows are faster and more reliable than manual steps. Prefer workflows when available.
`;
```
- [x] Add workflow guidance to system prompt
- [x] Explain when to use workflows vs manual steps
- [x] Add examples of workflow chaining

**Task 6.2: Update ExecutionPlan to Support Workflows**
```typescript
// packages/aria-agent/src/agents/orchestrator/orchestrator.types.ts
interface ExecutionStep {
  type: 'web' | 'desktop' | 'workflow'; // Add 'workflow' type
  workflow_name?: string;  // For workflow steps
  workflow_vars?: Record<string, any>;  // For workflow steps
  // ... existing fields (id, description, success_criteria, context, depends_on)
}
```
- [x] Extend ExecutionStep type to support workflow steps
- [x] Update Orchestrator to create workflow steps when use_workflow is called
- [x] Validate workflow steps have required fields (workflow_name, workflow_vars) - handled in parseExecutionPlan

**Task 6.3: Update OrchestrationService to Execute Workflows**
```typescript
// packages/aria-agent/src/orchestration/orchestration.service.ts

// In the execution loop, add workflow handling:
if (step.type === 'workflow') {
  this.logger.log(`Executing workflow: ${step.workflow_name}`);
  this.emitStatus(taskId, 'executing_workflow', step.workflow_name);
  
  const workflowResult = await this.workflowService.runWorkflow(
    step.workflow_name!,
    step.workflow_vars!,
    taskId
  );
  
  if (workflowResult.success) {
    success = true;
    this.logger.log(`Workflow ${step.workflow_name} completed successfully`);
  } else {
    this.logger.error(`Workflow ${step.workflow_name} failed: ${workflowResult.message}`);
    // Trigger normal escalation flow
  }
} else if (step.type === 'web') {
  // Existing web agent execution
} else if (step.type === 'desktop') {
  // Existing desktop agent execution
}
```
- [ ] Inject WorkflowService into OrchestrationService (PENDING - needs module registration)
- [ ] Add workflow execution branch in step execution loop (CODE READY - needs testing)
- [ ] Handle workflow results (success/failure) (CODE READY - needs testing)
- [ ] Workflow failures trigger normal escalation (L1→L2→L3→L4) (AUTOMATIC - uses existing escalation)
- [ ] Track workflow execution in action history (PENDING - needs implementation)
- [ ] Emit workflow status events for UI (PARTIAL - emitStatus call added)

### Phase 7: UI & Monitoring

**Task 7.1: Add Workflow Status to UI**
- [ ] Show "Executing workflow: send-email" in task status
- [ ] Display workflow progress (step X of Y)
- [ ] Show workflow variables used

**Task 7.2: Workflow Execution Logging**
- [ ] Log each workflow execution
- [ ] Log each step within workflow
- [ ] Store in database for debugging

**Task 7.3: Workflow Analytics**
- [ ] Track workflow success/failure rates
- [ ] Track average execution time
- [ ] Identify slow/failing workflows

---

## 🔧 Technical Decisions

### File Format: TypeScript (.workflow.ts)
**Why TypeScript is the BEST choice:**
- ✅ **Zero interpretation layer** - Just import and run
- ✅ **Type safety** - Catches errors at compile time
- ✅ **IDE support** - Full autocomplete for services
- ✅ **Debugging** - Set breakpoints, inspect variables
- ✅ **Least work** - No parser, no interpreter needed
- ✅ **Most flexible** - Full JavaScript/TypeScript power
- ✅ **Reusable** - Import helpers, share code
- ✅ **Testable** - Each workflow can have tests
- ✅ **Proven pattern** - Your test files already use this

### Workflow Discovery: File System
**Recommendation: File System with dynamic imports**
- Simpler deployment (just add .ts files)
- Version control friendly (Git tracks changes)
- No migration needed
- TypeScript compiler validates syntax
- Can cache imported modules

### Execution: Direct Function Call
**Recommendation: Import and execute**
- Agent calls `run_workflow(name, vars)`
- WorkflowService imports the .workflow.ts module
- Calls `module.execute(vars, services)` directly
- Returns Promise<WorkflowResult>
- Full async/await support

---

## 🎯 Success Criteria

1. **Zero Code Changes for New Workflows**: Adding a new workflow requires only creating a new .workflow.ts file
2. **Agent Discovery**: Agent can list and understand all workflows without hardcoding
3. **Chaining Works**: Agent can execute multiple workflows in sequence
4. **Error Handling**: Failed workflows don't crash the agent
5. **Performance**: Workflows execute faster than manual agent reasoning
6. **Type Safety**: TypeScript catches errors before runtime
7. **Debuggable**: Can set breakpoints in workflow code

---

## 📦 Dependencies

**New NPM Packages**:
- `glob` - File system scanning (or use Node.js built-in `fs.readdirSync`)
- No parsing libraries needed (TypeScript handles everything)

**Existing Services Used**:
- `PinchTabService` - Browser automation
- Desktop computer-use API - VNC control
- `SharedStateService` - Store workflow context (optional)

---

## 🚀 Rollout Strategy

**Phase 1 (Week 1)**: Core infrastructure + 1 example workflow
**Phase 2 (Week 2)**: 5 example workflows + agent integration
**Phase 3 (Week 3)**: Advanced features + testing
**Phase 4 (Week 4)**: Documentation + UI integration

---

This plan gives you a **declarative, extensible workflow system** where adding new capabilities is as simple as creating a new file. The agent automatically discovers and uses them without any code changes or prompt updates.

Would you like me to create a spec for this feature so we can start implementing it systematically?