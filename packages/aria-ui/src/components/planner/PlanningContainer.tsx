import React, { useEffect, useState } from "react";
import { usePlanner } from "@/hooks/usePlanner";
import { usePlanWebSocket } from "@/hooks/usePlanWebSocket";
import { PlanViewer } from "./PlanViewer";
import { ExecutionProgress } from "./ExecutionProgress";
import { Loader } from "@/components/ui/loader";

interface PlanningContainerProps {
  taskId: string;
  taskDescription: string;
  model: string;
  onPlanApproved?: () => void;
  onPlanCancelled?: () => void;
}

export function PlanningContainer({
  taskId,
  taskDescription,
  model,
  onPlanApproved,
  onPlanCancelled,
}: PlanningContainerProps) {
  const {
    plan,
    isLoading,
    error,
    createPlan,
    fetchPlan,
    approvePlan,
    cancelPlan,
    updateStep,
    isPlanPending,
    isPlanExecuting,
  } = usePlanner({ taskId });

  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

  // Connect to WebSocket for real-time updates
  usePlanWebSocket({
    planId: plan?.id || null,
    onPlanUpdate: (updatedPlan) => {
      // Plan will be updated via the hook
      console.log("Plan updated via WebSocket", updatedPlan);
    },
  });

  // Fetch or create plan on mount
  useEffect(() => {
    const initializePlan = async () => {
      console.log("Initializing plan with:", { taskId, taskDescription, model });
      
      const existingPlan = await fetchPlan();
      if (!existingPlan) {
        // Create new plan
        console.log("No existing plan, creating new one");
        await createPlan(taskDescription, model);
      } else {
        console.log("Found existing plan:", existingPlan);
      }
    };

    initializePlan();
  }, [taskId, taskDescription, model, fetchPlan, createPlan]);

  const handleApprove = async () => {
    if (!plan || !selectedPathId) return;

    try {
      await approvePlan(plan.id, selectedPathId);
      onPlanApproved?.();
    } catch (err) {
      console.error("Failed to approve plan:", err);
    }
  };

  const handleReject = async () => {
    if (!plan) return;

    try {
      await cancelPlan(plan.id);
      onPlanCancelled?.();
    } catch (err) {
      console.error("Failed to cancel plan:", err);
    }
  };

  const handleStepEdit = async (
    stepId: string,
    updates: { action?: string; command?: string }
  ) => {
    try {
      await updateStep(stepId, updates);
    } catch (err) {
      console.error("Failed to update step:", err);
    }
  };

  if (isLoading && !plan) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-bytebot-bronze-light-7 bg-white">
        <div className="text-center">
          <Loader size={32} />
          <p className="mt-4 text-sm text-bytebot-bronze-light-10">
            Generating execution plan...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  // Show execution progress if plan is executing
  if (isPlanExecuting && plan.selectedPathId) {
    const selectedPath = plan.paths.find((p) => p.id === plan.selectedPathId);
    if (selectedPath) {
      const completedSteps = selectedPath.steps.filter(
        (s) => s.status === "COMPLETED"
      ).length;
      const totalSteps = selectedPath.steps.length;

      return (
        <div className="space-y-4">
          <ExecutionProgress
            progress={{
              currentStep: selectedPath.steps.find((s) => s.status === "EXECUTING")?.id || "",
              completedSteps,
              totalSteps,
              progress: (completedSteps / totalSteps) * 100,
            }}
          />
          {/* Show read-only todo list */}
          <div className="rounded-lg border border-bytebot-bronze-light-7 bg-white p-4">
            <h3 className="mb-4 text-lg font-semibold text-bytebot-bronze-dark-7">
              Executing: {selectedPath.name}
            </h3>
            {/* You can import and use TodoList here with readonly mode */}
          </div>
        </div>
      );
    }
  }

  // Show plan viewer if pending approval
  if (isPlanPending) {
    return (
      <PlanViewer
        plan={plan}
        onPathSelect={setSelectedPathId}
        onStepEdit={handleStepEdit}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    );
  }

  return null;
}
