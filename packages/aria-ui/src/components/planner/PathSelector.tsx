import React from "react";
import { ExecutionPath } from "@/types/planning.types";

interface PathSelectorProps {
  paths: ExecutionPath[];
  selectedPathId?: string;
  onSelect: (pathId: string) => void;
}

export function PathSelector({
  paths,
  selectedPathId,
  onSelect,
}: PathSelectorProps) {
  const strategyColors = {
    TERMINAL: "bg-purple-100 text-purple-800",
    GUI: "bg-blue-100 text-blue-800",
    HYBRID: "bg-green-100 text-green-800",
    BROWSER: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-base font-medium text-bytebot-bronze-dark-7">
        Choose an Approach
      </h3>

      <div className="space-y-2">
        {paths.map((path) => (
          <button
            key={path.id}
            onClick={() => onSelect(path.id)}
            className={`w-full rounded-lg border p-3 text-left transition-colors ${
              selectedPathId === path.id
                ? "border-bytebot-bronze-dark-7 bg-bytebot-bronze-light-3"
                : "border-bytebot-bronze-light-7 hover:border-bytebot-bronze-light-9 hover:bg-bytebot-bronze-light-2"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-bytebot-bronze-dark-7">
                    {path.name}
                  </h4>
                  <div
                    className={`rounded px-2 py-0.5 text-xs font-medium ${strategyColors[path.strategy]}`}
                  >
                    {path.strategy}
                  </div>
                </div>
                <p className="mt-1 text-xs text-bytebot-bronze-light-10">
                  {path.description}
                </p>

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-bytebot-bronze-light-10">
                  <span>{path.steps.length} steps</span>
                  <span>~{path.estimatedTokens.toLocaleString()} tokens</span>
                  <span>
                    {Math.round(path.successProbability * 100)}% success
                  </span>
                </div>

                {/* Pros and Cons */}
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="mb-1 font-medium text-bytebot-green-11">Pros</p>
                    <ul className="space-y-0.5 text-bytebot-bronze-light-10">
                      {path.pros.map((pro, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-bytebot-green-11">+</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 font-medium text-bytebot-red-light-11">Cons</p>
                    <ul className="space-y-0.5 text-bytebot-bronze-light-10">
                      {path.cons.map((con, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-bytebot-red-light-11">-</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
