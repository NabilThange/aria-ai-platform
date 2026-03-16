/**
 * Desktop Agent Tool Call Parser
 * 
 * Bytez does NOT return proper tool_calls when images are present.
 * Instead, claude-sonnet-4-6 outputs JSON in the content string.
 * This parser extracts and validates that JSON.
 */

export interface DesktopToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Parse tool call JSON from Bytez response content string
 * Handles multiple formats: pure JSON, code blocks, nested JSON
 */
export function parseDesktopToolCall(content: string): DesktopToolCall | null {
  if (!content || content.trim() === '') {
    return null;
  }

  const cleaned = content.trim();

  // Strategy 1: Content is already pure JSON (ideal case - strict prompt works)
  try {
    const parsed = JSON.parse(cleaned);
    if ((parsed.name && parsed.arguments !== undefined) || parsed.action) {
      return normalizeToolCall(parsed);
    }
  } catch {
    // Not pure JSON, try other strategies
  }

  // Strategy 2: JSON inside ```json ... ``` code block
  const jsonCodeBlock = cleaned.match(/```json\s*\n?([\s\S]*?)\n?\s*```/);
  if (jsonCodeBlock) {
    try {
      const parsed = JSON.parse(jsonCodeBlock[1].trim());
      // Check for both formats: {name, arguments} or {action, ...}
      if ((parsed.name && parsed.arguments !== undefined) || parsed.action) {
        return normalizeToolCall(parsed);
      }
    } catch {
      // Invalid JSON in code block
    }
  }

  // Strategy 3: JSON inside ``` ... ``` code block (no language tag)
  const codeBlock = cleaned.match(/```\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlock) {
    try {
      const parsed = JSON.parse(codeBlock[1].trim());
      // Check for both formats: {name, arguments} or {action, ...}
      if ((parsed.name && parsed.arguments !== undefined) || parsed.action) {
        return normalizeToolCall(parsed);
      }
    } catch {
      // Invalid JSON in code block
    }
  }

  // Strategy 4: Find first { ... } JSON object anywhere in the string
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if ((parsed.name && parsed.arguments !== undefined) || parsed.action) {
        return normalizeToolCall(parsed);
      }
    } catch {
      // Invalid JSON object
    }
  }

  // Strategy 5: Model output Anthropic XML format <tool_name>{...}</tool_name>
  const xmlMatch = cleaned.match(/<(\w+)>([\s\S]*?)<\/\1>/);
  if (xmlMatch) {
    try {
      const toolName = xmlMatch[1];
      const args = JSON.parse(xmlMatch[2].trim());
      return normalizeToolCall({ name: toolName, arguments: args });
    } catch {
      // Invalid XML format
    }
  }

  // Nothing worked
  console.warn('[DesktopToolParser] Failed to parse tool call from content:', cleaned.substring(0, 200));
  return null;
}

/**
 * Normalize tool call to standard format
 * Handles cases where Claude outputs simplified names like "click" instead of "computer"
 * Also handles format where action is directly in the object: {"action": "click", "coordinate": [x, y]}
 */
function normalizeToolCall(parsed: any): DesktopToolCall | null {
  // Valid actions that desktop agent supports (simplified names)
  const validComputerActions = [
    'click', 'double_click', 'right_click',  // Mouse clicks
    'type', 'paste',  // Text input (paste is faster for long text)
    'key', 'key_press',  // Keyboard shortcuts
    'scroll',  // Scrolling
    'screenshot',  // Screen capture
    'application',  // App launching
    'terminal_command'  // Terminal commands
  ];
  const invalidActions = ['success', 'mark_complete', 'complete', 'done', 'wait', 'verify', 'check', 'confirm'];
  
  // Case 1: {"action": "click", "coordinate": [x, y], ...} - NO name field
  if (parsed.action && !parsed.name) {
    const action = parsed.action;
    
    // Reject invalid actions that should use set_task_status instead
    if (invalidActions.includes(action)) {
      console.warn(`[DesktopToolParser] Invalid action "${action}" - use set_task_status with status="completed" instead`);
      return null;
    }
    
    // Validate it's a known computer action
    if (!validComputerActions.includes(action)) {
      console.warn(`[DesktopToolParser] Unknown computer action: ${action}`);
      return null;
    }
    
    const args: any = { ...parsed };
    delete args.action; // Remove action from args since we'll put it in arguments.action
    
    // Handle coordinate array format: [x, y] -> {x, y}
    if (args.coordinate && Array.isArray(args.coordinate)) {
      args.x = args.coordinate[0];
      args.y = args.coordinate[1];
      delete args.coordinate;
    }
    
    return {
      name: 'computer',
      arguments: {
        action: action,
        ...args,
      },
    };
  }
  
  // Case 2: {"name": "click", "arguments": {...}} - simplified name
  if (validComputerActions.includes(parsed.name)) {
    const args = parsed.arguments || {};
    
    // Handle coordinate array format: [x, y] -> {x, y}
    if (args.coordinate && Array.isArray(args.coordinate)) {
      args.x = args.coordinate[0];
      args.y = args.coordinate[1];
      delete args.coordinate;
    }
    
    // Map simplified names to action types
    const actionMap: Record<string, string> = {
      'click': 'click',
      'double_click': 'double_click',
      'right_click': 'right_click',
      'type': 'type',
      'paste': 'paste',
      'key': 'key',
      'key_press': 'key',
      'scroll': 'scroll',
      'screenshot': 'screenshot',
      'application': 'application',
      'terminal_command': 'terminal_command',
    };
    
    return {
      name: 'computer',
      arguments: {
        action: actionMap[parsed.name] || parsed.name,
        ...args,
      },
    };
  }
  
  // Case 2b: Invalid action names that should use set_task_status
  if (invalidActions.includes(parsed.name)) {
    console.warn(`[DesktopToolParser] Invalid tool name "${parsed.name}" - use set_task_status with status="completed" instead`);
    return null;
  }
  
  // Case 3: Already in correct format {"name": "computer", "arguments": {...}}
  if (parsed.name && parsed.arguments !== undefined) {
    return parsed as DesktopToolCall;
  }
  
  // Invalid format
  console.warn('[DesktopToolParser] Invalid tool call format:', parsed);
  return null;
}

// REMOVED: buildDesktopSystemPrompt() - Dead code, never called
// Desktop agent uses centralized system prompt from system-prompts.config.ts
