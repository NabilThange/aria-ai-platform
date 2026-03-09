import React from "react";
import { Strategy } from "@/types/planning.types";

interface TokenEstimateProps {
  estimatedTokens: number;
  strategy: Strategy;
}

export function TokenEstimate({
  estimatedTokens,
  strategy,
}: TokenEstimateProps) {
  const strategyColors = {
    TERMINAL: "bg-purple-100 text-purple-800",
    GUI: "bg-blue-100 text-blue-800",
    HYBRID: "bg-green-100 text-green-800",
    BROWSER: "bg-orange-100 text-orange-800",
  };

  const strategyLabels = {
    TERMINAL: "Terminal",
    GUI: "GUI",
    HYBRID: "Hybrid",
    BROWSER: "Browser",
  };

  return (
    <div className="rounded-lg border border-bytebot-bronze-light-7 bg-bytebot-bronze-light-2 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-bytebot-bronze-light-10">
            Estimated Token Cost
          </p>
          <p className="text-xl font-medium text-bytebot-bronze-dark-7">
            {estimatedTokens.toLocaleString()}
          </p>
        </div>
        <div
          className={`rounded px-2 py-1 text-xs font-medium ${strategyColors[strategy]}`}
        >
          {strategyLabels[strategy]}
        </div>
      </div>
    </div>
  );
}
