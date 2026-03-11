"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isApplicationAction = exports.isCursorPositionAction = exports.isScreenshotAction = exports.isWaitAction = exports.isTypeTextAction = exports.isPressKeysAction = exports.isTypeKeysAction = exports.isScrollAction = exports.isDragMouseAction = exports.isPressMouseAction = exports.isClickMouseAction = exports.isTraceMouseAction = exports.isMoveMouseAction = void 0;
exports.convertMoveMouseActionToToolUseBlock = convertMoveMouseActionToToolUseBlock;
exports.convertTraceMouseActionToToolUseBlock = convertTraceMouseActionToToolUseBlock;
exports.convertClickMouseActionToToolUseBlock = convertClickMouseActionToToolUseBlock;
exports.convertPressMouseActionToToolUseBlock = convertPressMouseActionToToolUseBlock;
exports.convertDragMouseActionToToolUseBlock = convertDragMouseActionToToolUseBlock;
exports.convertScrollActionToToolUseBlock = convertScrollActionToToolUseBlock;
exports.convertTypeKeysActionToToolUseBlock = convertTypeKeysActionToToolUseBlock;
exports.convertPressKeysActionToToolUseBlock = convertPressKeysActionToToolUseBlock;
exports.convertTypeTextActionToToolUseBlock = convertTypeTextActionToToolUseBlock;
exports.convertPasteTextActionToToolUseBlock = convertPasteTextActionToToolUseBlock;
exports.convertWaitActionToToolUseBlock = convertWaitActionToToolUseBlock;
exports.convertScreenshotActionToToolUseBlock = convertScreenshotActionToToolUseBlock;
exports.convertCursorPositionActionToToolUseBlock = convertCursorPositionActionToToolUseBlock;
exports.convertApplicationActionToToolUseBlock = convertApplicationActionToToolUseBlock;
exports.convertWriteFileActionToToolUseBlock = convertWriteFileActionToToolUseBlock;
exports.convertReadFileActionToToolUseBlock = convertReadFileActionToToolUseBlock;
exports.convertComputerActionToToolUseBlock = convertComputerActionToToolUseBlock;
const messageContent_types_1 = require("../types/messageContent.types");
function createActionTypeGuard(actionType) {
    return (obj) => {
        if (!obj || typeof obj !== "object") {
            return false;
        }
        const action = obj;
        return action.action === actionType;
    };
}
exports.isMoveMouseAction = createActionTypeGuard("move_mouse");
exports.isTraceMouseAction = createActionTypeGuard("trace_mouse");
exports.isClickMouseAction = createActionTypeGuard("click_mouse");
exports.isPressMouseAction = createActionTypeGuard("press_mouse");
exports.isDragMouseAction = createActionTypeGuard("drag_mouse");
exports.isScrollAction = createActionTypeGuard("scroll");
exports.isTypeKeysAction = createActionTypeGuard("type_keys");
exports.isPressKeysAction = createActionTypeGuard("press_keys");
exports.isTypeTextAction = createActionTypeGuard("type_text");
exports.isWaitAction = createActionTypeGuard("wait");
exports.isScreenshotAction = createActionTypeGuard("screenshot");
exports.isCursorPositionAction = createActionTypeGuard("cursor_position");
exports.isApplicationAction = createActionTypeGuard("application");
function createToolUseBlock(toolName, toolUseId, input) {
    return {
        type: messageContent_types_1.MessageContentType.ToolUse,
        id: toolUseId,
        name: toolName,
        input,
    };
}
function conditionallyAdd(obj, conditions) {
    const result = { ...obj };
    conditions.forEach(([condition, key, value]) => {
        if (condition) {
            result[key] = value;
        }
    });
    return result;
}
function convertMoveMouseActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_move_mouse", toolUseId, {
        coordinates: action.coordinates,
    });
}
function convertTraceMouseActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_trace_mouse", toolUseId, conditionallyAdd({ path: action.path }, [
        [action.holdKeys !== undefined, "holdKeys", action.holdKeys],
    ]));
}
function convertClickMouseActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_click_mouse", toolUseId, conditionallyAdd({
        button: action.button,
        clickCount: action.clickCount,
    }, [
        [action.coordinates !== undefined, "coordinates", action.coordinates],
        [action.holdKeys !== undefined, "holdKeys", action.holdKeys],
    ]));
}
function convertPressMouseActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_press_mouse", toolUseId, conditionallyAdd({
        button: action.button,
        press: action.press,
    }, [[action.coordinates !== undefined, "coordinates", action.coordinates]]));
}
function convertDragMouseActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_drag_mouse", toolUseId, conditionallyAdd({
        path: action.path,
        button: action.button,
    }, [[action.holdKeys !== undefined, "holdKeys", action.holdKeys]]));
}
function convertScrollActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_scroll", toolUseId, conditionallyAdd({
        direction: action.direction,
        scrollCount: action.scrollCount,
    }, [
        [action.coordinates !== undefined, "coordinates", action.coordinates],
        [action.holdKeys !== undefined, "holdKeys", action.holdKeys],
    ]));
}
function convertTypeKeysActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_type_keys", toolUseId, conditionallyAdd({ keys: action.keys }, [
        [typeof action.delay === "number", "delay", action.delay],
    ]));
}
function convertPressKeysActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_press_keys", toolUseId, {
        keys: action.keys,
        press: action.press,
    });
}
function convertTypeTextActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_type_text", toolUseId, conditionallyAdd({ text: action.text }, [
        [typeof action.delay === "number", "delay", action.delay],
        [typeof action.sensitive === "boolean", "isSensitive", action.sensitive],
    ]));
}
function convertPasteTextActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_paste_text", toolUseId, {
        text: action.text,
    });
}
function convertWaitActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_wait", toolUseId, {
        duration: action.duration,
    });
}
function convertScreenshotActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_screenshot", toolUseId, {});
}
function convertCursorPositionActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_cursor_position", toolUseId, {});
}
function convertApplicationActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_application", toolUseId, {
        application: action.application,
    });
}
function convertWriteFileActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_write_file", toolUseId, {
        path: action.path,
        data: action.data,
    });
}
function convertReadFileActionToToolUseBlock(action, toolUseId) {
    return createToolUseBlock("computer_read_file", toolUseId, {
        path: action.path,
    });
}
function convertComputerActionToToolUseBlock(action, toolUseId) {
    switch (action.action) {
        case "move_mouse":
            return convertMoveMouseActionToToolUseBlock(action, toolUseId);
        case "trace_mouse":
            return convertTraceMouseActionToToolUseBlock(action, toolUseId);
        case "click_mouse":
            return convertClickMouseActionToToolUseBlock(action, toolUseId);
        case "press_mouse":
            return convertPressMouseActionToToolUseBlock(action, toolUseId);
        case "drag_mouse":
            return convertDragMouseActionToToolUseBlock(action, toolUseId);
        case "scroll":
            return convertScrollActionToToolUseBlock(action, toolUseId);
        case "type_keys":
            return convertTypeKeysActionToToolUseBlock(action, toolUseId);
        case "press_keys":
            return convertPressKeysActionToToolUseBlock(action, toolUseId);
        case "type_text":
            return convertTypeTextActionToToolUseBlock(action, toolUseId);
        case "paste_text":
            return convertPasteTextActionToToolUseBlock(action, toolUseId);
        case "wait":
            return convertWaitActionToToolUseBlock(action, toolUseId);
        case "screenshot":
            return convertScreenshotActionToToolUseBlock(action, toolUseId);
        case "cursor_position":
            return convertCursorPositionActionToToolUseBlock(action, toolUseId);
        case "application":
            return convertApplicationActionToToolUseBlock(action, toolUseId);
        case "write_file":
            return convertWriteFileActionToToolUseBlock(action, toolUseId);
        case "read_file":
            return convertReadFileActionToToolUseBlock(action, toolUseId);
        default:
            const exhaustiveCheck = action;
            throw new Error(`Unknown action type: ${exhaustiveCheck.action}`);
    }
}
//# sourceMappingURL=computerAction.utils.js.map