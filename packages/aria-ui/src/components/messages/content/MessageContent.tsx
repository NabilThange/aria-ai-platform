import React from "react";
import {
  MessageContentBlock,
  isTextContentBlock,
  isImageContentBlock,
  isComputerToolUseContentBlock,
  isToolResultContentBlock,
  isAgentThinkingContentBlock,
  isAgentPlanContentBlock,
  isAgentVerifyContentBlock,
  isAgentQuestionContentBlock,
  isAgentRecoveryContentBlock,
  isAgentReportContentBlock,
} from "@bytebot/shared";
import { TextContent } from "./TextContent";
import { ImageContent } from "./ImageContent";
import { ComputerToolContent } from "./ComputerToolContent";
import { ErrorContent } from "./ErrorContent";
import {
  AgentThinkingContent,
  AgentPlanContent,
  AgentVerifyContent,
  AgentQuestionContent,
  AgentRecoveryContent,
  AgentReportContent,
} from "./AgentActionContent";

interface MessageContentProps {
  content: MessageContentBlock[];
  isTakeOver?: boolean;
}

export function MessageContent({
  content,
  isTakeOver = false,
}: MessageContentProps) {
  // Filter content blocks and check if any visible content remains
  const visibleBlocks = content.filter((block) => {
    // Filter logic from the original code
    if (
      isToolResultContentBlock(block) &&
      block.content &&
      block.content.some((contentBlock) => isImageContentBlock(contentBlock))
    ) {
      return true;
    }
    if (
      isToolResultContentBlock(block) &&
      block.tool_use_id !== "set_task_status" &&
      !block.is_error
    ) {
      return false;
    }
    return true;
  });

  // Skip rendering if no visible content
  if (visibleBlocks.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {visibleBlocks.map((block, index) => (
        <div key={index}>
          {isTextContentBlock(block) && <TextContent block={block} />}

          {isToolResultContentBlock(block) &&
            !block.is_error &&
            block.content.map((contentBlock, contentBlockIndex) => {
              if (isImageContentBlock(contentBlock)) {
                return (
                  <ImageContent key={contentBlockIndex} block={contentBlock} />
                );
              }
              return null;
            })}

          {isComputerToolUseContentBlock(block) && (
            <ComputerToolContent block={block} isTakeOver={isTakeOver} />
          )}

          {isToolResultContentBlock(block) && block.is_error && (
            <ErrorContent block={block} />
          )}

          {isToolResultContentBlock(block) &&
            !block.is_error &&
            block.tool_use_id === "set_task_status" &&
            block.content?.[0].type === "text" && (
              <TextContent block={block.content?.[0]} />
            )}

          {/* Multi-agent action blocks */}
          {isAgentThinkingContentBlock(block) && (
            <AgentThinkingContent
              agent={block.agent}
              thinking={block.thinking}
            />
          )}

          {isAgentPlanContentBlock(block) && (
            <AgentPlanContent
              agent={block.agent}
              plan={block.plan}
            />
          )}

          {isAgentVerifyContentBlock(block) && (
            <AgentVerifyContent
              agent={block.agent}
              verification={block.verification}
            />
          )}

          {isAgentQuestionContentBlock(block) && (
            <AgentQuestionContent
              agent={block.agent}
              question={block.question}
            />
          )}

          {isAgentRecoveryContentBlock(block) && (
            <AgentRecoveryContent
              agent={block.agent}
              strategy={block.strategy}
            />
          )}

          {isAgentReportContentBlock(block) && (
            <AgentReportContent
              agent={block.agent}
              report={block.report}
            />
          )}
        </div>
      ))}
    </div>
  );
}
