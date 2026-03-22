import test from "node:test";
import assert from "node:assert";

// Mocking the behavior of the hook
export function createPlanApprovalState() {
  let isAwaitingPlanApproval = false;
  
  // Mock state setter
  const setIsAwaitingPlanApproval = (val: boolean) => {
    isAwaitingPlanApproval = val;
  };

  // Mock the task status effect
  const handleTaskStatusEffect = (taskStatus: string) => {
    if (taskStatus === 'needs_help') {
      // In real code this fetches from backend and sets it
      // Let's assume backend returns true
      setIsAwaitingPlanApproval(true);
    } else {
      setIsAwaitingPlanApproval(false);
    }
  };

  // Mock the agent status effect
  let doCancel = true; // Simulating the current bad code
  const handleAgentStatusEffect = (agentStatus: { status: string } | null) => {
    if (agentStatus?.status === 'awaiting_plan_approval') {
      setIsAwaitingPlanApproval(true);
    } else if (agentStatus?.status && agentStatus.status !== 'awaiting_plan_approval') {
      // THE BUG IN PRODUCTION CODE:
      if (doCancel) setIsAwaitingPlanApproval(false);
    }
  };

  return {
    get isAwaitingPlanApproval() { return isAwaitingPlanApproval; },
    handleTaskStatusEffect,
    handleAgentStatusEffect,
    fix: () => { doCancel = false; }
  };
}

test('isAwaitingPlanApproval stays true when agent status goes idle during needs_help task state', () => {
  const state = createPlanApprovalState();
  
  // 1. Task becomes needs_help, backend confirms awaiting_plan_approval
  state.handleTaskStatusEffect('needs_help');
  assert.strictEqual(state.isAwaitingPlanApproval, true, "Should be true after taskStatus=needs_help");
  
  // 3. Agent status goes 'idle' (race condition / websocket update)
  state.handleAgentStatusEffect({ status: 'idle' });
  
  // Expected behavior: it should STILL be true because taskStatus is still needs_help
  // Current behavior: it becomes false!
  assert.strictEqual(state.isAwaitingPlanApproval, true, "BUG: isAwaitingPlanApproval became false when agent went idle!");
});
