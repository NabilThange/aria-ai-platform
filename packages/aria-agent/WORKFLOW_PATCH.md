# Workflow Execution Patch for OrchestrationService

## Location
File: `packages/aria-agent/src/orchestration/orchestration.service.ts`

## Changes Needed

### 1. Find this section (around line 180):
```typescript
          const result = step.type === 'web'
            ? await this.webAgent.execute(step, taskId)
            : await this.desktopAgent.execute(step, taskId);
```

### 2. Replace with:
```typescript
          let result: any;
          
          // Handle workflow steps
          if (step.type === 'workflow') {
            this.logger.log(`   Executing WORKFLOW: ${step.workflow_name}`);
            this.emitStatus(taskId, 'executing_workflow', step.workflow_name || 'unknown');
            
            const workflowResult = await this.workflowService.runWorkflow(
              step.workflow_name!,
              step.workflow_vars!,
              taskId
            );
            
            // Convert workflow result to agent result format
            result = {
              action: workflowResult.success ? 'workflow_completed' : 'workflow_failed',
              details: workflowResult.data || {},
              error: workflowResult.error,
              message: workflowResult.message,
            };
            
            this.logger.log(`   WORKFLOW Output:`);
            this.logger.log(`      Success: ${workflowResult.success}`);
            this.logger.log(`      Message: ${workflowResult.message}`);
            if (workflowResult.data) {
              this.logger.log(`      Data: ${JSON.stringify(workflowResult.data).substring(0, 200)}...`);
            }
          } else {
            // Handle regular web/desktop steps
            result = step.type === 'web'
              ? await this.webAgent.execute(step, taskId)
              : await this.desktopAgent.execute(step, taskId);
          }
```

### 3. Also update the agentName variable (around line 172):
```typescript
const agentName = step.type === 'workflow' ? 'WORKFLOW' : (step.type === 'web' ? 'WEB' : 'DESKTOP');
```

### 4. Update the log message (around line 175):
```typescript
this.logger.log(`   Executing with ${agentName}${step.type !== 'workflow' ? '_AGENT' : ''}...`);
```

### 5. Update the step log initialization (around line 162):
```typescript
const stepLog = new TaskLogger(OrchestrationService.name, taskId, step.type === 'workflow' ? 'WORKFLOW' : (step.type === 'web' ? 'WEB' : 'DESKTOP'));
```

### 6. Update the step header log (around line 152):
```typescript
this.logger.log(`Agent: ${step.type === 'workflow' ? 'WORKFLOW' : (step.type === 'web' ? 'WEB_AGENT' : 'DESKTOP_AGENT')}`);
```

### 7. Update the plan summary (around line 125):
```typescript
const webSteps = plan.steps.filter(s => s.type === 'web').length;
const desktopSteps = plan.steps.filter(s => s.type === 'desktop').length;
const workflowSteps = plan.steps.filter(s => s.type === 'workflow').length;

this.logger.log(`Plan Summary:`);
this.logger.log(`   Total Steps: ${plan.steps.length}`);
this.logger.log(`   Web Steps: ${webSteps}`);
this.logger.log(`   Desktop Steps: ${desktopSteps}`);
this.logger.log(`   Workflow Steps: ${workflowSteps}`);
```
