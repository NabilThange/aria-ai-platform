"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTextContentBlock = isTextContentBlock;
exports.isThinkingContentBlock = isThinkingContentBlock;
exports.isRedactedThinkingContentBlock = isRedactedThinkingContentBlock;
exports.isImageContentBlock = isImageContentBlock;
exports.isUserActionContentBlock = isUserActionContentBlock;
exports.isDocumentContentBlock = isDocumentContentBlock;
exports.isToolUseContentBlock = isToolUseContentBlock;
exports.isComputerToolUseContentBlock = isComputerToolUseContentBlock;
exports.isToolResultContentBlock = isToolResultContentBlock;
exports.isMessageContentBlock = isMessageContentBlock;
exports.getMessageContentBlockType = getMessageContentBlockType;
exports.isMoveMouseToolUseBlock = isMoveMouseToolUseBlock;
exports.isTraceMouseToolUseBlock = isTraceMouseToolUseBlock;
exports.isClickMouseToolUseBlock = isClickMouseToolUseBlock;
exports.isCursorPositionToolUseBlock = isCursorPositionToolUseBlock;
exports.isPressMouseToolUseBlock = isPressMouseToolUseBlock;
exports.isDragMouseToolUseBlock = isDragMouseToolUseBlock;
exports.isScrollToolUseBlock = isScrollToolUseBlock;
exports.isTypeKeysToolUseBlock = isTypeKeysToolUseBlock;
exports.isPressKeysToolUseBlock = isPressKeysToolUseBlock;
exports.isTypeTextToolUseBlock = isTypeTextToolUseBlock;
exports.isPasteTextToolUseBlock = isPasteTextToolUseBlock;
exports.isWaitToolUseBlock = isWaitToolUseBlock;
exports.isScreenshotToolUseBlock = isScreenshotToolUseBlock;
exports.isApplicationToolUseBlock = isApplicationToolUseBlock;
exports.isSetTaskStatusToolUseBlock = isSetTaskStatusToolUseBlock;
exports.isCreateTaskToolUseBlock = isCreateTaskToolUseBlock;
exports.isWriteFileToolUseBlock = isWriteFileToolUseBlock;
exports.isReadFileToolUseBlock = isReadFileToolUseBlock;
const messageContent_types_1 = require("../types/messageContent.types");
function isTextContentBlock(obj) {
    if (!obj || typeof obj !== "object") {
        return false;
    }
    const block = obj;
    return (block.type === messageContent_types_1.MessageContentType.Text && typeof block.text === "string");
}
function isThinkingContentBlock(obj) {
    if (!obj || typeof obj !== "object") {
        return false;
    }
    const block = obj;
    return (block.type === messageContent_types_1.MessageContentType.Thinking &&
        typeof block.thinking === "string" &&
        typeof block.signature === "string");
}
function isRedactedThinkingContentBlock(obj) {
    if (!obj || typeof obj !== "object") {
        return false;
    }
    const block = obj;
    return (block.type === messageContent_types_1.MessageContentType.RedactedThinking &&
        typeof block.data === "string");
}
function isImageContentBlock(obj) {
    if (!obj || typeof obj !== "object") {
        return false;
    }
    const block = obj;
    return (block.type === messageContent_types_1.MessageContentType.Image &&
        block.source !== undefined &&
        typeof block.source === "object" &&
        typeof block.source.media_type === "string" &&
        typeof block.source.type === "string" &&
        typeof block.source.data === "string");
}
function isUserActionContentBlock(obj) {
    if (!obj || typeof obj !== "object") {
        return false;
    }
    const block = obj;
    return block.type === messageContent_types_1.MessageContentType.UserAction;
}
function isDocumentContentBlock(obj) {
    if (!obj || typeof obj !== "object") {
        return false;
    }
    const block = obj;
    return (block.type === messageContent_types_1.MessageContentType.Document &&
        block.source !== undefined &&
        typeof block.source === "object" &&
        typeof block.source.type === "string" &&
        typeof block.source.media_type === "string" &&
        typeof block.source.data === "string");
}
function isToolUseContentBlock(obj) {
    if (!obj || typeof obj !== "object") {
        return false;
    }
    const block = obj;
    return (block.type === messageContent_types_1.MessageContentType.ToolUse &&
        typeof block.name === "string" &&
        typeof block.id === "string" &&
        block.input !== undefined &&
        typeof block.input === "object");
}
function isComputerToolUseContentBlock(obj) {
    if (!isToolUseContentBlock(obj)) {
        return false;
    }
    return obj.name.startsWith("computer_");
}
function isToolResultContentBlock(obj) {
    if (!obj || typeof obj !== "object") {
        return false;
    }
    const block = obj;
    return (block.type === messageContent_types_1.MessageContentType.ToolResult &&
        typeof block.tool_use_id === "string");
}
function isMessageContentBlock(obj) {
    return (isTextContentBlock(obj) ||
        isImageContentBlock(obj) ||
        isDocumentContentBlock(obj) ||
        isToolUseContentBlock(obj) ||
        isToolResultContentBlock(obj) ||
        isThinkingContentBlock(obj) ||
        isRedactedThinkingContentBlock(obj) ||
        isUserActionContentBlock(obj));
}
function getMessageContentBlockType(obj) {
    if (!obj || typeof obj !== "object") {
        return null;
    }
    if (isTextContentBlock(obj)) {
        return "TextContentBlock";
    }
    if (isImageContentBlock(obj)) {
        return "ImageContentBlock";
    }
    if (isDocumentContentBlock(obj)) {
        return "DocumentContentBlock";
    }
    if (isThinkingContentBlock(obj)) {
        return "ThinkingContentBlock";
    }
    if (isRedactedThinkingContentBlock(obj)) {
        return "RedactedThinkingContentBlock";
    }
    if (isComputerToolUseContentBlock(obj)) {
        const computerBlock = obj;
        if (computerBlock.input && typeof computerBlock.input === "object") {
            return `ComputerToolUseContentBlock:${computerBlock.name.replace("computer_", "")}`;
        }
        return "ComputerToolUseContentBlock";
    }
    if (isToolUseContentBlock(obj)) {
        return "ToolUseContentBlock";
    }
    if (isToolResultContentBlock(obj)) {
        return "ToolResultContentBlock";
    }
    return null;
}
function isMoveMouseToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_move_mouse";
}
function isTraceMouseToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_trace_mouse";
}
function isClickMouseToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_click_mouse";
}
function isCursorPositionToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_cursor_position";
}
function isPressMouseToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_press_mouse";
}
function isDragMouseToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_drag_mouse";
}
function isScrollToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_scroll";
}
function isTypeKeysToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_type_keys";
}
function isPressKeysToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_press_keys";
}
function isTypeTextToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_type_text";
}
function isPasteTextToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_paste_text";
}
function isWaitToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_wait";
}
function isScreenshotToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_screenshot";
}
function isApplicationToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_application";
}
function isSetTaskStatusToolUseBlock(obj) {
    if (!isToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "set_task_status";
}
function isCreateTaskToolUseBlock(obj) {
    if (!isToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "create_task";
}
function isWriteFileToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_write_file";
}
function isReadFileToolUseBlock(obj) {
    if (!isComputerToolUseContentBlock(obj)) {
        return false;
    }
    const block = obj;
    return block.name === "computer_read_file";
}
//# sourceMappingURL=messageContent.utils.js.map