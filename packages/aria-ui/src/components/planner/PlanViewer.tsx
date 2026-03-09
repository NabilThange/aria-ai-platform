import React, { useState } from "react";
import { Plan, ExecutionPath } from "@/types/planning.types";
import { PathSelector } from "./PathSelector";
import { TodoList } from "./TodoList";
import { TokenEstimate } from "./TokenEstimate";

interface PlanViewerProps {
  plan: Plan;
  onPathSelect: (pathId: string) => void;
  onStepEdit?: (stepId: string, updates: { action?: string; command?: string }) => void;
  onApprove: () => void;
  onReject: () => void;
}

export function PlanViewer({
  plan,
  onPathSelect,
  onStepEdit,
  onApprove,
  onReject,
}: PlanViewerProps) {
  const [selectedPath, setSelectedPath] = useState<ExecutionPath | null>(
    plan.selectedPathId
      ? plan.paths.find((p) => p.id === plan.selectedPathId) || null
      : null
  );

  const handlePathChange = (pathId: string) => {
    const path = plan.paths.find((p) => p.id === pathId);
    setSelectedPath(path || null);
    onPathSelect(pathId);
  };

  return (
    <div className="flex flex-col rounded-lg border border-bytebot-bronze-light-7 bg-white">
      {/* Task Header - Fixed */}
      <div className="border-b border-bytebot-bronze-light-7 p-4">
        <h2 className="text-lg font-medium text-bytebot-bronze-dark-7">
          Task Plan
        </h2>
        <p className="mt-1 text-sm text-bytebot-bronze-light-10">
          {plan.taskDescription}
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="hide-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
        {/* Path Selection */}
        <PathSelector
          paths={plan.paths}
          selectedPathId={selectedPath?.id}
          onSelect={handlePathChange}
        />

        {/* Todo List */}
        {selectedPath && (
          <>
            <TodoList steps={selectedPath.steps} onStepEdit={onStepEdit} />

            <TokenEstimate
              estimatedTokens={selectedPath.estimatedTokens}
              strategy={selectedPath.strategy}
            />
          </>
        )}
      </div>

      {/* Action Buttons - Fixed */}
      <div className="flex gap-3 border-t border-bytebot-bronze-light-7 p-4">
        <button
          onClick={onApprove}
          disabled={!selectedPath}
          className="flex-1 rounded-lg bg-bytebot-green-9 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-bytebot-green-10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Approve & Execute
        </button>
        <button
          onClick={onReject}
          className="rounded-lg border border-bytebot-bronze-light-7 px-4 py-2 text-sm font-medium text-bytebot-bronze-dark-7 transition-colors hover:bg-bytebot-bronze-light-3"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
