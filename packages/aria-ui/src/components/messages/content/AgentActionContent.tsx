import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Brain02Icon,
  FileScriptIcon,
  CheckmarkCircle02Icon,
  HelpCircleIcon,
  RefreshIcon,
  FileValidationIcon,
} from "@hugeicons/core-free-icons";

interface AgentThinkingProps {
  agent: string;
  thinking: string;
}

interface AgentPlanProps {
  agent: string;
  plan: {
    steps: Array<{
      id: string;
      type: "web" | "desktop";
      description: string;
      success_criteria: string;
    }>;
  };
}

interface AgentVerifyProps {
  agent: string;
  verification: {
    action_succeeded: boolean;
    error_message?: string;
    confidence: number;
  };
}

interface AgentQuestionProps {
  agent: string;
  question: string;
}

interface AgentRecoveryProps {
  agent: string;
  strategy: {
    strategy: string;
    avoid: string[];
    approach: string;
  };
}

interface AgentReportProps {
  agent: string;
  report: {
    summary: string;
    steps_completed: number;
    total_steps: number;
  };
}

const AGENT_COLORS: Record<string, string> = {
  CLARIFIER: "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7",
  ORCHESTRATOR: "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7",
  WEB: "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7",
  DESKTOP: "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7",
  PERCEPTION: "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7",
  VERIFIER: "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7",
  RECOVERY: "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7",
  REPORTER: "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7",
};

export function AgentThinkingContent({ agent, thinking }: AgentThinkingProps) {
  const colorClass = AGENT_COLORS[agent] || "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7";
  
  return (
    <div className={`mb-2 rounded-md border ${colorClass} p-3 opacity-75`}>
      <div className="flex items-start gap-2">
        <HugeiconsIcon icon={Brain02Icon} className="mt-0.5 h-4 w-4 flex-shrink-0 text-bytebot-bronze-light-12" />
        <div className="flex-1">
          <div className="mb-1 text-xs font-semibold text-bytebot-bronze-light-12">{agent}</div>
          <div className="text-xs italic text-bytebot-bronze-light-12">{thinking}</div>
        </div>
      </div>
    </div>
  );
}

export function AgentPlanContent({ agent, plan }: AgentPlanProps) {
  const colorClass = AGENT_COLORS[agent] || "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7";
  
  return (
    <div className={`mb-2 rounded-md border ${colorClass} p-3`}>
      <div className="flex items-start gap-2">
        <HugeiconsIcon icon={FileScriptIcon} className="mt-0.5 h-4 w-4 flex-shrink-0 text-bytebot-bronze-light-12" />
        <div className="flex-1">
          <div className="mb-2 text-xs font-semibold text-bytebot-bronze-light-12">{agent} - Execution Plan</div>
          <div className="space-y-1">
            {plan.steps.map((step, index) => (
              <div key={step.id} className="text-xs text-bytebot-bronze-light-12">
                <span className="font-medium">
                  {index + 1}. [{step.type.toUpperCase()}]
                </span>{" "}
                {step.description}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AgentVerifyContent({ agent, verification }: AgentVerifyProps) {
  const colorClass = "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7";
  
  return (
    <div className={`mb-2 rounded-md border ${colorClass} p-3 opacity-75`}>
      <div className="flex items-start gap-2">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="mt-0.5 h-4 w-4 flex-shrink-0 text-bytebot-bronze-light-12" />
        <div className="flex-1">
          <div className="mb-1 text-xs font-semibold text-bytebot-bronze-light-12">
            {agent} - {verification.action_succeeded ? "✓ Success" : "✗ Failed"}
          </div>
          {verification.error_message && (
            <div className="text-xs text-bytebot-bronze-light-12">{verification.error_message}</div>
          )}
          <div className="mt-1 text-xs text-bytebot-bronze-light-12 opacity-60">
            Confidence: {(verification.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}

export function AgentQuestionContent({ agent, question }: AgentQuestionProps) {
  const colorClass = AGENT_COLORS[agent] || "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7";
  
  return (
    <div className={`mb-2 rounded-md border ${colorClass} p-3`}>
      <div className="flex items-start gap-2">
        <HugeiconsIcon icon={HelpCircleIcon} className="mt-0.5 h-4 w-4 flex-shrink-0 text-bytebot-bronze-light-12" />
        <div className="flex-1">
          <div className="mb-1 text-xs font-semibold text-bytebot-bronze-light-12">{agent} - Question</div>
          <div className="text-xs text-bytebot-bronze-light-12">{question}</div>
        </div>
      </div>
    </div>
  );
}

export function AgentRecoveryContent({ agent, strategy }: AgentRecoveryProps) {
  const colorClass = AGENT_COLORS[agent] || "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7";
  
  return (
    <div className={`mb-2 rounded-md border ${colorClass} p-3`}>
      <div className="flex items-start gap-2">
        <HugeiconsIcon icon={RefreshIcon} className="mt-0.5 h-4 w-4 flex-shrink-0 text-bytebot-bronze-light-12" />
        <div className="flex-1">
          <div className="mb-1 text-xs font-semibold text-bytebot-bronze-light-12">{agent} - Recovery Strategy</div>
          <div className="text-xs text-bytebot-bronze-light-12">
            <div className="mb-1">
              <span className="font-medium">Strategy:</span> {strategy.strategy}
            </div>
            <div className="mb-1">
              <span className="font-medium">Approach:</span> {strategy.approach}
            </div>
            {strategy.avoid.length > 0 && (
              <div>
                <span className="font-medium">Avoid:</span> {strategy.avoid.join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AgentReportContent({ agent, report }: AgentReportProps) {
  const colorClass = AGENT_COLORS[agent] || "text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border-bytebot-bronze-light-7";
  
  return (
    <div className={`mb-2 rounded-md border ${colorClass} p-3`}>
      <div className="flex items-start gap-2">
        <HugeiconsIcon icon={FileValidationIcon} className="mt-0.5 h-4 w-4 flex-shrink-0 text-bytebot-bronze-light-12" />
        <div className="flex-1">
          <div className="mb-1 text-xs font-semibold text-bytebot-bronze-light-12">{agent} - Task Report</div>
          <div className="text-xs text-bytebot-bronze-light-12">
            <div className="mb-1">{report.summary}</div>
            <div className="opacity-60">
              Completed {report.steps_completed} of {report.total_steps} steps
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
