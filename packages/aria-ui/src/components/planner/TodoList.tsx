import React, { useState } from "react";
import { PlanStep, StepStatus, StepType } from "@/types/planning.types";

interface TodoListProps {
  steps: PlanStep[];
  onStepEdit?: (stepId: string, updates: { action?: string; command?: string }) => void;
  executionContext?: {
    currentStepId: string | null;
    completedSteps: string[];
  };
  readonly?: boolean;
}

export function TodoList({
  steps,
  onStepEdit,
  executionContext,
  readonly = false,
}: TodoListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAction, setEditAction] = useState("");
  const [editCommand, setEditCommand] = useState("");

  const handleEdit = (step: PlanStep) => {
    setEditingId(step.id);
    setEditAction(step.action);
    setEditCommand(step.command || "");
  };

  const handleSave = (stepId: string) => {
    if (onStepEdit) {
      onStepEdit(stepId, {
        action: editAction,
        command: editCommand || undefined,
      });
    }
    setEditingId(null);
  };

  const getStepStatus = (step: PlanStep): StepStatus => {
    if (executionContext) {
      if (executionContext.completedSteps.includes(step.id)) {
        return StepStatus.COMPLETED;
      }
      if (executionContext.currentStepId === step.id) {
        return StepStatus.EXECUTING;
      }
    }
    return step.status;
  };

  const stepTypeColors = {
    TERMINAL: "bg-purple-100 text-purple-800",
    GUI: "bg-blue-100 text-blue-800",
    BROWSER: "bg-green-100 text-green-800",
    WAIT: "bg-gray-100 text-gray-800",
    VERIFY: "bg-yellow-100 text-yellow-800",
  };

  const stepTypeLabels = {
    TERMINAL: "terminal",
    GUI: "gui",
    BROWSER: "browser",
    WAIT: "wait",
    VERIFY: "verify",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-base font-medium text-bytebot-bronze-dark-7">
        Execution Steps
      </h3>

      <div className="space-y-2">
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          const isEditing = editingId === step.id;

          return (
            <div
              key={step.id}
              className={`rounded-lg border p-3 transition-colors ${
                status === StepStatus.COMPLETED
                  ? "border-bytebot-green-7 bg-bytebot-green-2"
                  : status === StepStatus.EXECUTING
                    ? "border-blue-300 bg-blue-50"
                    : status === StepStatus.FAILED
                      ? "border-bytebot-red-light-7 bg-bytebot-red-light-2"
                      : "border-bytebot-bronze-light-7 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={status === StepStatus.COMPLETED}
                    disabled
                    className="h-4 w-4 rounded border-bytebot-bronze-light-7"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-bytebot-bronze-light-10">
                      Step {index + 1}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${stepTypeColors[step.type]}`}
                    >
                      {stepTypeLabels[step.type]}
                    </span>
                    {step.checkpoint && (
                      <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                        checkpoint
                      </span>
                    )}
                    {status === StepStatus.EXECUTING && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        executing
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={editAction}
                        onChange={(e) => setEditAction(e.target.value)}
                        className="w-full rounded-lg border border-bytebot-bronze-light-7 px-3 py-2 text-sm"
                        placeholder="Action description"
                      />
                      {step.type === StepType.TERMINAL && (
                        <input
                          type="text"
                          value={editCommand}
                          onChange={(e) => setEditCommand(e.target.value)}
                          className="w-full rounded-lg border border-bytebot-bronze-light-7 px-3 py-2 font-mono text-xs"
                          placeholder="Command"
                        />
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(step.id)}
                          className="rounded-lg bg-bytebot-bronze-dark-7 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-bytebot-bronze-dark-6"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-bytebot-bronze-light-7 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bytebot-bronze-light-3"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-bytebot-bronze-dark-7">
                        {step.action}
                      </p>
                      {step.command && (
                        <code className="mt-2 block rounded bg-bytebot-bronze-dark-2 p-2 font-mono text-xs text-bytebot-green-9">
                          $ {step.command}
                        </code>
                      )}
                      {step.description && (
                        <p className="mt-1 text-xs text-bytebot-bronze-light-10">
                          {step.description}
                        </p>
                      )}
                      {!readonly && !executionContext && (
                        <button
                          onClick={() => handleEdit(step)}
                          className="mt-2 text-xs text-bytebot-bronze-dark-7 hover:text-bytebot-bronze-dark-6"
                        >
                          Edit
                        </button>
                      )}
                      {step.error && (
                        <p className="mt-2 text-xs text-bytebot-red-light-11">
                          Error: {step.error}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Token estimate */}
                <div className="shrink-0 text-right text-xs text-bytebot-bronze-light-10">
                  ~{step.estimatedTokens}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-bytebot-bronze-light-7 pt-3">
        <p className="text-xs text-bytebot-bronze-light-10">
          {steps.length} steps · ~
          {steps
            .reduce((sum, s) => sum + s.estimatedTokens, 0)
            .toLocaleString()}{" "}
          tokens
        </p>
      </div>
    </div>
  );
}
