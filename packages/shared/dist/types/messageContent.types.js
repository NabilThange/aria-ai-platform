"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageContentType = void 0;
var MessageContentType;
(function (MessageContentType) {
    MessageContentType["Text"] = "text";
    MessageContentType["Image"] = "image";
    MessageContentType["Document"] = "document";
    MessageContentType["ToolUse"] = "tool_use";
    MessageContentType["ToolResult"] = "tool_result";
    MessageContentType["Thinking"] = "thinking";
    MessageContentType["RedactedThinking"] = "redacted_thinking";
    MessageContentType["UserAction"] = "user_action";
    MessageContentType["AgentThinking"] = "agent_thinking";
    MessageContentType["AgentPlan"] = "agent_plan";
    MessageContentType["AgentVerify"] = "agent_verify";
    MessageContentType["AgentQuestion"] = "agent_question";
    MessageContentType["AgentRecovery"] = "agent_recovery";
    MessageContentType["AgentReport"] = "agent_report";
})(MessageContentType || (exports.MessageContentType = MessageContentType = {}));
//# sourceMappingURL=messageContent.types.js.map