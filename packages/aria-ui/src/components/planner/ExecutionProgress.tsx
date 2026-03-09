import React from "react";
import { ExecutionProgress as ExecutionProgressType } from "@/types/planning.types";

interface ExecutionProgressProps {
  progress: ExecutionProgressType;
}

export function ExecutionProgress({ progress }: ExecutionProgressProps) {
  return (
    <div className="rounded-lg border border-bytebot-bronze-light-7 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-bytebot-bronze-dark-7">
          Execution Progress
        </h3>
        <span className="text-xs text-bytebot-bronze-light-10">
          {progress.completedSteps} / {progress.totalSteps} steps
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bytebot-bronze-light-3">
        <div
          className="h-full bg-bytebot-bronze-dark-7 transition-all duration-300"
          style={{ width: `${progress.progress}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-bytebot-bronze-light-10">
        {Math.round(progress.progress)}% complete
      </p>
    </div>
  );
}
