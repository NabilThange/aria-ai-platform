# ARIA Planning System - Implementation Summary

## 🎯 Goal
Reduce token usage by 40-70% through intelligent upfront planning instead of iterative screenshot-based execution.

## 📊 Current vs. Proposed Flow

### Current (Inefficient)
```
User Message → Agent Executes Immediately → 
Screenshot (1500 tokens) → Analyze → Act → Repeat
```

### Proposed (Efficient)
```
User Message → Generate Plan (2000 tokens, one-time) → 
User Approves → Execute Plan (minimal tokens per step)
```

## 🏗️ Architecture Overview

### Backend Changes
**New Modules**:
- `planner/` - Generate multi-path execution plans using Claude
- `executor/` - Execute approved plans with checkpoints
- `strategies/` - Terminal, GUI, hybrid execution strategies

**Database Schema**:
- `Plan` - Overall planning session
- `ExecutionPath` - Different approaches (2-3 per plan)
- `PlanStep` - Individual actions in a path
- `Checkpoint` - Saved states for rollback

### Frontend Changes
**New Components**:
- `PlanViewer` - Display generated plans
- `PathSelector` - Choose between approaches
- `StepEditor` - Edit individual steps
- `TodoList` - Interactive checklist
- `TokenEstimate` - Show cost estimates
- `ExecutionProgress` - Real-time progress tracking

## 📁 File Structure

### Backend (packages/aria-agent/src/)
```
planner/
├── planner.module.ts
├── planner.service.ts          # Core planning logic
├── planner.controller.ts       # REST endpoints
├── planner.gateway.ts          # WebSocket events
├── planner.prompts.ts          # LLM prompts
├── planner.types.ts
├── dto/
│   ├── create-plan.dto.ts
│   ├── approve-plan.dto.ts
│   └── update-step.dto.ts
└── strategies/
    ├── terminal.strategy.ts
    ├── gui.strategy.ts
    └── hybrid.strategy.ts

executor/
├── executor.module.ts
├── executor.service.ts         # Plan execution
├── executor.gateway.ts
├── checkpoint.service.ts       # Checkpoint management
└── rollback.service.ts         # Rollback on failure
```

### Frontend (packages/aria-ui/src/components/)
```
planner/
├── PlanViewer.tsx              # Main plan display
├── PathSelector.tsx            # Choose execution approach
├── StepEditor.tsx              # Edit steps
├── TodoList.tsx                # Interactive checklist
├── TokenEstimate.tsx           # Cost display
└── ExecutionProgress.tsx       # Real-time progress

hooks/
├── usePlanner.ts               # Planning state
└── useExecutor.ts              # Execution state
```

## 🔄 Implementation Phases

### Phase 1: Database & Backend Core (3-4 days)
1. Create Prisma schema for planning tables
2. Run migrations
3. Implement `PlannerService` with LLM integration
4. Create REST endpoints and WebSocket events
5. Write unit tests

### Phase 2: Frontend UI (3-4 days)
1. Create planning UI components
2. Implement state management hooks
3. Integrate with WebSocket for real-time updates
4. Add plan editing capabilities
5. Build execution progress display

### Phase 3: Integration (2-3 days)
1. Modify task creation flow to support planning mode
2. Add "Enable Planning" toggle to chat input
3. Connect executor to existing agent processor
4. Implement checkpoint and rollback system
5. Integration testing

### Phase 4: Testing & Rollout (1-2 days)
1. End-to-end testing
2. Performance testing
3. Deploy to staging
4. Gradual production rollout
5. Monitor token usage metrics

**Total Time**: 9-13 days

## 🎨 User Experience Flow

### 1. User Creates Task with Planning Enabled
```typescript
// User types: "Install Node.js and create a React app"
// Clicks "Enable Planning" toggle
```

### 2. System Generates Plan
```
Planner analyzes task → Generates 2-3 approaches:

Path 1: Terminal Approach (Recommended)
- 3 steps, ~600 tokens, 95% success rate
- Pros: Fast, reliable, minimal tokens
- Cons: No visual feedback

Path 2: GUI Approach
- 12 steps, ~18,000 tokens, 70% success rate
- Pros: Visual confirmation at each step
- Cons: Slow, high token cost

Path 3: Hybrid Approach
- 5 steps, ~3,000 tokens, 85% success rate
- Pros: Balance of speed and visibility
- Cons: More complex
```

### 3. User Reviews and Approves
```
User sees:
- All 3 paths with pros/cons
- Detailed step breakdown
- Token cost estimates
- Can edit steps inline
- Selects "Terminal Approach"
- Clicks "Approve & Execute"
```

### 4. System Executes Plan
```
Executor runs approved plan:
✓ Step 1: sudo apt update && sudo apt install nodejs npm (200 tokens)
✓ Step 2: npx create-react-app my-app (200 tokens)
✓ Step 3: cd my-app && npm start (200 tokens)

Total: 600 tokens vs. 18,000 tokens (96.7% savings!)
```

## 📊 Token Savings Examples

### Example 1: Create File
**Task**: "Create test.txt with 'Hello World'"

| Approach | Steps | Tokens | Time |
|----------|-------|--------|------|
| Current (GUI) | 3 | 4,500 | 30s |
| With Planning (Terminal) | 1 | 200 | 2s |
| **Savings** | | **95.6%** | **93%** |

### Example 2: Install Package
**Task**: "Install Python and create virtual environment"

| Approach                 | Steps | Tokens    | Time    |
| --------------------------| -------| -----------| ---------|
| Current (GUI)            | 8     | 12,000   | 90s     |
| With Planning (Terminal) | 2     | 400       | 10s     |
| **Savings**              |       | **96.7%** | **89%** |

### Example 3: Web Task
**Task**: "Book flight on airline website"

| Approach | Steps | Tokens | Time |
|----------|-------|--------|------|
| Current (Browser) | 15 | 22,500 | 120s |
| With Planning (Browser) | 12 | 14,000 | 90s |
| **Savings** | | **37.8%** | **25%** |

*Note: Web tasks still benefit from planning but savings are lower since browser automation is inherently token-intensive*

## 🔧 API Endpoints

### Planning Endpoints
```
POST   /api/plans                    # Create new plan
GET    /api/plans/:id                # Get plan by ID
GET    /api/plans/task/:taskId       # Get plan by task ID
PUT    /api/plans/:id/approve        # Approve plan with selected path
PUT    /api/plans/:id/cancel         # Cancel plan
PUT    /api/plans/steps/:stepId      # Update step details
```

### WebSocket Events
```
Client → Server:
- join_plan(planId)
- leave_plan(planId)

Server → Client:
- plan_updated(plan)
- step_updated(step)
- execution_progress(progress)
```

## 🧪 Testing Strategy

### Unit Tests
- `planner.service.spec.ts` - Plan generation logic
- `executor.service.spec.ts` - Execution engine
- `checkpoint.service.spec.ts` - Checkpoint system

### Integration Tests
- Full flow: create plan → approve → execute
- Rollback on failure
- WebSocket event propagation

### E2E Tests
- User creates task with planning enabled
- User reviews and edits plan
- User approves and monitors execution
- System completes task successfully

## 📈 Success Metrics

### Primary KPIs
- **Token Reduction**: Target 40-70% average savings
- **User Adoption**: % of tasks using planning mode
- **Success Rate**: % of plans that execute successfully
- **Time to Completion**: Average task completion time

### Monitoring
```typescript
// Track these metrics:
{
  totalTokensWithoutPlanning: number,
  totalTokensWithPlanning: number,
  tokenSavingsPercentage: number,
  averageStepsPerPlan: number,
  planApprovalRate: number,
  executionSuccessRate: number,
  averageExecutionTime: number
}
```

## 🚀 Deployment Strategy

### Phase 1: Feature Flag (Week 1)
```typescript
// Add to .env
PLANNING_ENABLED=false  // Disabled by default
PLANNING_BETA_USERS=["user1@example.com", "user2@example.com"]
```

### Phase 2: Beta Testing (Week 2)
- Enable for beta users
- Collect feedback
- Monitor token usage
- Fix bugs

### Phase 3: Gradual Rollout (Week 3)
- Enable for 10% of users
- Monitor metrics
- Increase to 50%
- Full rollout if metrics are positive

### Phase 4: Default Enabled (Week 4)
- Make planning default for new tasks
- Allow users to opt-out if needed
- Continue monitoring

## 🔒 Security & Safety

### Considerations
1. **Command Injection**: Sanitize all terminal commands
2. **File System Access**: Restrict to user home directory
3. **Resource Limits**: Timeout for long-running commands
4. **User Data**: Don't log sensitive information in plans

### Implementation
```typescript
// Command sanitization
function sanitizeCommand(cmd: string): string {
  // Remove dangerous characters
  // Validate against whitelist
  // Add safety checks
}

// Execution timeout
const COMMAND_TIMEOUT = 30000; // 30 seconds
```

## 📚 Documentation Updates

### User Documentation
- How to enable planning mode
- How to review and edit plans
- Understanding token estimates
- Choosing between execution paths

### Developer Documentation
- Planning system architecture
- Adding new execution strategies
- Extending the planner prompts
- Testing planning features

## 🎯 Next Steps

1. **Review this plan** with the team
2. **Create GitHub issues** for each phase
3. **Set up project board** for tracking
4. **Begin Phase 1** implementation
5. **Schedule daily standups** during development

## 📞 Questions & Clarifications

Before starting implementation, clarify:
- [ ] Preferred LLM model for planning (Claude Sonnet 4?)
- [ ] Maximum plan generation time acceptable
- [ ] Should planning be opt-in or opt-out initially?
- [ ] Token budget limits per plan
- [ ] Rollback strategy preferences

---

**Ready to start implementation?** Begin with Phase 1: Database schema and backend core services.

