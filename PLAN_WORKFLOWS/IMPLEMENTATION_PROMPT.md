# Workflow System Implementation Prompt

## Your Mission

You are implementing a **Workflow Registry System** for the Aria multi-agent desktop automation platform. This system allows the Orchestrator agent to discover and execute pre-built workflows (TypeScript files) instead of reasoning through repetitive tasks from scratch.

## Step 1: Gather Context (CRITICAL - DO THIS FIRST)

Use the **context-gatherer subagent** to understand the codebase before making any changes:

```
Use context-gatherer to investigate:

1. **Multi-Agent Pipeline Architecture**
   - How OrchestrationService coordinates agents
   - How Orchestrator creates ExecutionPlans
   - ExecutionStep type definition and structure
   - How steps are executed in the pipeline

2. **Service Infrastructure**
   - PinchTabService implementation and methods
   - Desktop/VNC service (ariad computer-use API)
   - How services are injected into agents
   - BaseAgent class structure

3. **Orchestrator Agent**
   - How Orchestrator calls LLM with tools
   - How tool responses are parsed
   - System prompt structure and location
   - How ExecutionPlans are created

4. **Test Patterns**
   - packages/aria-agent/test/pinchtab-simple-test.ts
   - How PinchTab workflows are structured
   - Pattern for browser automation
   - Error handling patterns

Focus on understanding these files:
- packages/aria-agent/src/orchestration/orchestration.service.ts
- packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts
- packages/aria-agent/src/agents/orchestrator/orchestrator.types.ts
- packages/aria-agent/src/services/pinchtab.service.ts
- packages/aria-agent/src/agents/base/base.agent.ts
- packages/aria-agent/test/pinchtab-simple-test.ts
```

## Step 2: Read the Implementation Plan

After gathering context, read the complete plan at:

**`PLAN_WORKFLOWS/PLAN.MD`**

This plan contains:
- Architecture overview
- Multi-agent integration strategy
- Complete task list with code snippets
- Technical decisions and rationale

## Step 3: Implementation Order

Follow this EXACT order:

### Phase 1: Dependencies & Infrastructure (30 min)

1. **Install Dependencies**
   ```bash
   cd packages/aria-agent
   npm install glob
   # No other dependencies needed - TypeScript handles everything
   ```

2. **Create Folder Structure**
   ```bash
   mkdir -p workflows
   mkdir -p src/workflows
   mkdir -p src/groq  # If doesn't exist
   ```

3. **Create TypeScript Interfaces**
   - Create `src/workflows/workflow.interface.ts`
   - Define WorkflowMetadata, WorkflowServices, WorkflowResult types
   - Copy from plan Phase 1, Task 1.1

### Phase 2: Core Services (1 hour)

4. **Create WorkflowService**
   - Create `src/services/workflow.service.ts`
   - Implement listWorkflows(), readWorkflow(), runWorkflow()
   - Use dynamic imports for .workflow.ts files
   - Copy pattern from plan Phase 1, Task 1.3

5. **Create WorkflowLoader**
   - Create `src/workflows/workflow.loader.ts`
   - Handle module loading and validation
   - Copy from plan Phase 1, Task 1.4

6. **Register WorkflowService**
   - Add to appropriate NestJS module
   - Inject PinchTabService and DesktopService

### Phase 3: Create 3 Example Workflows (1 hour)

7. **Workflow 1: google-search.workflow.ts (Pure Web)**
   ```typescript
   // workflows/google-search.workflow.ts
   // Copy pattern from packages/aria-agent/test/pinchtab-simple-test.ts
   // Metadata: name, description, variables: [query]
   // Execute: Launch browser, navigate, type, click, return results
   ```

8. **Workflow 2: take-screenshot.workflow.ts (Pure Desktop)**

   ```typescript
   // workflows/take-screenshot.workflow.ts
   // Metadata: name, description, variables: [filename]
   // Execute: Call desktop computer-use API, take screenshot, save
   ```

9. **Workflow 3: search-and-email.workflow.ts (Mixed)**
   ```typescript
   // workflows/search-and-email.workflow.ts
   // Metadata: name, description, variables: [query, recipient]
   // Execute: 
   //   1. Use PinchTab to search Google (web)
   //   2. Take screenshot of results (desktop)
   //   3. Navigate to Gmail and send email (web)
   ```

### Phase 4: Orchestrator Integration (1.5 hours)

10. **Create Workflow Tools**
    - Create `src/groq/workflow.tools.ts`
    - Define list_workflows, read_workflow, use_workflow tools
    - Copy from plan Phase 2, Task 2.1

11. **Update Orchestrator Agent**
    - Import workflow tools
    - Add to tool list when calling LLM
    - Handle use_workflow tool calls
    - Create workflow steps in ExecutionPlan
    - Update from plan Phase 2, Task 2.2

12. **Update Orchestrator System Prompt**
    - Add workflow guidance to system prompt
    - Explain when to use workflows
    - Provide examples
    - Copy from plan Phase 2, Task 2.3

13. **Extend ExecutionStep Type**
    - Update `src/agents/orchestrator/orchestrator.types.ts`
    - Add 'workflow' to type union
    - Add workflow_name and workflow_vars fields
    - Copy from plan Phase 6, Task 6.2

### Phase 5: Execution Integration (1 hour)

14. **Update OrchestrationService**
    - Inject WorkflowService
    - Add workflow execution branch in step loop
    - Handle workflow results
    - Trigger escalation on failure
    - Copy from plan Phase 6, Task 6.3

15. **Test Workflow Execution**
    - Create test task that uses google-search workflow
    - Verify Orchestrator discovers workflows
    - Verify OrchestrationService executes workflow
    - Check VNC to see browser actions

### Phase 6: Testing & Validation (30 min)

16. **Create Workflow Tests**
    - Create `test/workflow-execution.test.ts`
    - Test each workflow individually
    - Test workflow discovery
    - Test workflow execution

17. **Manual Testing**
    - Start services: `npm run start:dev`
    - Create task: "Search Google for AI news"
    - Verify Orchestrator uses google-search workflow
    - Watch VNC to see execution

## Critical Implementation Notes

### DO:
- ✅ Use context-gatherer FIRST to understand the codebase
- ✅ Follow the test pattern from pinchtab-simple-test.ts
- ✅ Copy code snippets from the plan
- ✅ Test each workflow individually before integration
- ✅ Use headed mode for workflows (visible in VNC)
- ✅ Handle errors gracefully
- ✅ Log workflow execution steps

### DON'T:
- ❌ Skip context gathering - you'll make mistakes
- ❌ Add workflow tools to Web/Desktop agents (only Orchestrator)
- ❌ Use YAML/JSON - workflows are TypeScript files
- ❌ Create a new WorkflowAgent - use existing Orchestrator
- ❌ Modify Clarifier - it doesn't need workflows
- ❌ Use fill() in PinchTab - use type() instead

## Example Workflow Structure

```typescript
// workflows/example.workflow.ts
import { PinchTabService } from '../src/services/pinchtab.service';

export const metadata = {
  name: 'example',
  description: 'Example workflow',
  version: '1.0',
  timeout_ms: 10000,
  variables: [
    { name: 'input', type: 'string', required: true }
  ]
};

export async function execute(
  variables: { input: string },
  services: { pinchTab: PinchTabService }
): Promise<{ success: boolean; message?: string; data?: any }> {
  const { pinchTab } = services;
  const { input } = variables;
  
  try {
    // Your workflow logic here
    return { success: true, message: 'Completed' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
```

## Success Criteria

Your implementation is complete when:

1. ✅ WorkflowService can list and load .workflow.ts files
2. ✅ Three example workflows exist and work independently
3. ✅ Orchestrator has workflow tools and can call them
4. ✅ Orchestrator creates workflow steps in ExecutionPlan
5. ✅ OrchestrationService executes workflow steps
6. ✅ Workflow failures trigger normal escalation
7. ✅ You can see workflows execute in VNC (headed mode)
8. ✅ Tests pass for workflow discovery and execution

## Estimated Time: 5-6 hours

- Context gathering: 30 min
- Infrastructure: 30 min
- Core services: 1 hour
- Example workflows: 1 hour
- Orchestrator integration: 1.5 hours
- Execution integration: 1 hour
- Testing: 30 min

## Questions to Ask if Stuck

1. "How does Orchestrator currently parse tool calls from LLM responses?"
2. "Where is the system prompt for Orchestrator defined?"
3. "How does OrchestrationService currently handle web vs desktop steps?"
4. "What's the pattern for injecting services in NestJS modules?"
5. "How do I test a workflow without running the full pipeline?"

## Final Checklist

Before marking complete:
- [ ] All dependencies installed
- [ ] Folder structure created
- [ ] TypeScript interfaces defined
- [ ] WorkflowService implemented
- [ ] Three workflows created (web, desktop, mixed)
- [ ] Workflow tools defined
- [ ] Orchestrator updated with tools
- [ ] System prompt updated
- [ ] ExecutionStep type extended
- [ ] OrchestrationService updated
- [ ] Tests created and passing
- [ ] Manual test successful (can see in VNC)

Good luck! Remember: **Use context-gatherer first**, then follow the plan carefully.
