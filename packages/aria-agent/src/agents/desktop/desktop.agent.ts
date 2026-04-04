import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentResult } from '../base/base.agent';
import { SharedStateService } from '../../shared-state/shared-state.service';
import { BytezService } from '../../bytez/bytez.service';
import { GroqService } from '../../groq/groq.service';
import { PerceptionAgent } from '../perception/perception.agent';
import { AGENT_MODELS } from '../../config/agents.config';
import { getAgentSystemPrompt } from '../../config/system-prompts.config';
import { ExecutionStep } from '../orchestrator/orchestrator.types';
import { RecoveryStrategy } from '../recovery/recovery.types';
import { ActionResult } from '../shared/action-result.types';
import { ToolUseContentBlock, MessageContentType } from '@bytebot/shared';
import { parseDesktopToolCall, DesktopToolCall } from './desktop-tool-parser.util';
import { TasksGateway } from '../../tasks/tasks.gateway';
import { MessagesService } from '../../messages/messages.service';
import { BrowserLoggerService } from '../../logger/browser-logger.service';

/**
 * DesktopAgent - Executes desktop tasks using computer tools
 * Model: User-selectable (Bytez Claude Sonnet 4.6 or Groq Llama-4-Scout)
 * Uses screenshot → Perception → decide → execute pattern
 * 
 * Supports two providers:
 * - Bytez: Outputs JSON in content string (needs parsing)
 * - Groq: Returns native tool_calls (structured output)
 */
@Injectable()
export class DesktopAgent extends BaseAgent {
  private readonly model = AGENT_MODELS.DESKTOP;
  private readonly MAX_ITERATIONS = 20;
  private readonly DESKTOP_BASE_URL = process.env.ARIA_DESKTOP_BASE_URL || 'http://localhost:9990';

  constructor(
    sharedState: SharedStateService,
    private readonly bytezService: BytezService,
    private readonly groqService: GroqService,
    private readonly perceptionAgent: PerceptionAgent,
    private readonly tasksGateway: TasksGateway,
    private readonly messagesService: MessagesService,
    private readonly browserLogger: BrowserLoggerService,
  ) {
    super(sharedState, 'DesktopAgent');
  }

  /**
   * Execute a desktop task step
   * @param input - ExecutionStep from Orchestrator
   * @param taskId - Task ID for shared state access
   */
  async run(input: any, taskId: string): Promise<AgentResult> {
    try {
      this.logger.log(`Executing desktop step for task ${taskId}`);

      const step = input as ExecutionStep;

      // Read user-selected model from shared state (if available)
      const taskModel = await this.readState<any>(taskId, 'task_model');
      const modelToUse = taskModel?.name || this.model.model;
      const providerToUse = taskModel?.provider || this.model.provider;
      
      this.logger.log(`📱 Desktop Agent using model: ${modelToUse} (provider: ${providerToUse})`);

      // Check for recovery strategy
      const recoveryStrategy = await this.readState<RecoveryStrategy>(
        taskId,
        'recovery_strategy',
      );

      if (recoveryStrategy) {
        this.logger.log(`Using recovery strategy: ${recoveryStrategy.strategy}`);
      }

      // Execute the step with the selected model
      const result = await this.executeStep(step, taskId, recoveryStrategy, modelToUse, providerToUse);

      return {
        success: true,
        data: result,
        tokensUsed: result.tokensUsed || 0,
        cost: result.cost || 0,
      };
    } catch (error) {
      this.logger.error(`Desktop step execution failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute a step (convenience method for OrchestrationService)
   */
  async execute(step: ExecutionStep, taskId: string): Promise<ActionResult> {
    const result = await this.run(step, taskId);

    if (!result.success) {
      return {
        action: 'error',
        details: { error: result.error },
        error: result.error,
        timestamp: new Date().toISOString(),
      };
    }

    return result.data as ActionResult;
  }

  private async executeStep(
    step: ExecutionStep,
    taskId: string,
    recoveryStrategy?: RecoveryStrategy | null,
    modelName?: string,
    providerName?: string,
  ): Promise<ActionResult & { tokensUsed: number; cost: number }> {
    let totalTokens = 0;
    let totalCost = 0;

    // Use provided model or fall back to default
    const model = modelName || this.model.model;
    const provider = providerName || this.model.provider;

    // Check for downloaded files (wait logic)
    const downloadedFiles = await this.readState<string[]>(taskId, 'downloaded_files') || [];
    
    // Read execution plan for context
    const executionPlan = await this.readState<any>(taskId, 'execution_plan');
    
    // Calculate per-step iteration budget
    let iterationsPerStep = 5; // Default
    if (executionPlan && executionPlan.steps) {
      const totalSteps = executionPlan.steps.length;
      iterationsPerStep = Math.max(3, Math.floor(this.MAX_ITERATIONS / totalSteps));
      this.logger.log(`📊 Step iteration budget: ${iterationsPerStep} (${totalSteps} total steps)`);
    }

    // Execute step with iteration loop
    let iteration = 0;
    let stepCompleted = false;
    let lastAction = '';
    let lastScreenshot: string | null = null;
    
    // Track repeated actions to detect loops
    const actionHistory: string[] = [];
    
    // Message history accumulation for conversation context
    const conversationMessages: any[] = [];

    while (!stepCompleted && iteration < this.MAX_ITERATIONS) {
      iteration++;
      this.logger.log(`Desktop step iteration ${iteration}/${this.MAX_ITERATIONS} (budget: ${iterationsPerStep})`);
      
      // Check if exceeded step budget
      if (iteration > iterationsPerStep) {
        this.logger.warn(`⚠️  Step ${step.id} exceeded iteration budget (${iterationsPerStep})`);
        return {
          action: 'set_task_status',
          details: { 
            status: 'failed', 
            message: `Step exceeded iteration budget of ${iterationsPerStep}. The step may be too complex or the success criteria unclear.`
          },
          error: 'Iteration budget exceeded',
          timestamp: new Date().toISOString(),
          tokensUsed: totalTokens,
          cost: totalCost,
        };
      }

      // Take screenshot
      const screenshot = await this.takeScreenshot();
      lastScreenshot = screenshot;

      // Use Perception to analyze screenshot
      const perceptionResult = await this.perceptionAgent.run(screenshot, taskId);
      
      if (!perceptionResult.success) {
        this.logger.warn('Perception failed, continuing with raw screenshot');
      }

      const perception = perceptionResult.data;
      totalTokens += perceptionResult.tokensUsed || 0;
      totalCost += perceptionResult.cost || 0;

      // Build decision prompt with plan context
      const prompt = this.buildDecisionPrompt(
        step,
        perception,
        iteration,
        lastAction,
        recoveryStrategy,
        downloadedFiles,
        executionPlan,
      );

      // Add user message to conversation history (with screenshot for vision)
      conversationMessages.push({
        role: 'USER',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshot,
            },
          },
        ],
      });

      // LOG AGENT START TO BROWSER
      this.browserLogger.logAgentStart(taskId, 'DESKTOP_AGENT', {
        systemPrompt: this.getSystemPrompt(),
        userPrompt: prompt,
        context: {
          iteration,
          stepId: step.id,
          stepDescription: step.description,
          perception: perception?.ui_state || 'Unknown',
          lastAction,
        },
      });

      // Determine provider from model name
      const isGroqModel = model.includes('llama-4-scout') || model.includes('gpt-oss') || provider === 'groq';
      
      this.logger.debug(`📚 Conversation history: ${conversationMessages.length} messages`);
      this.logger.debug(`🔧 Using provider: ${isGroqModel ? 'Groq' : 'Bytez'} (model: ${model})`);
      
      // ===== SYSTEM PROMPT OPTIMIZATION =====
      const isFirstMessage = iteration === 1; // Only send system prompt on first iteration
      // ===== END OPTIMIZATION =====
      
      let response: any;
      let toolCall: DesktopToolCall | null = null;
      let responseContent = ''; // Store response content for error handling
      
      if (isGroqModel) {
        // Groq: Returns native tool_calls (structured output)
        // Import desktop-specific tools
        const { groqDesktopTools } = await import('./desktop.tools');
        
        response = await this.groqService.generateMessage(
          this.getSystemPrompt(),
          conversationMessages as any,
          model,
          true, // Enable tools for structured output
          undefined, // No abort signal
          groqDesktopTools, // Pass desktop-specific tools
          { isFirstMessage }, // NEW: Optimization flag
        );
        
        const tokensUsed = response.tokenUsage?.totalTokens || 0;
        totalTokens += tokensUsed;
        totalCost += this.calculateCost(tokensUsed);
        
        // LOG AGENT RESPONSE - DETAILED
        this.logger.log(`\n   🤖 DESKTOP_AGENT LLM Response (Iteration ${iteration}):`);
        this.logger.log(`      Provider: Groq`);
        this.logger.log(`      Model: ${model}`);
        this.logger.log(`      Tokens: ${tokensUsed} | Cost: $${this.calculateCost(tokensUsed).toFixed(6)}`);
        this.logger.log(`      Content Blocks: ${response.contentBlocks?.length || 0}`);
        
        // Log all content blocks
        response.contentBlocks?.forEach((block: any, idx: number) => {
          this.logger.log(`      Block ${idx + 1}: ${block.type}`);
          if (block.type === 'text') {
            this.logger.log(`         Text: ${block.text?.substring(0, 150)}${block.text?.length > 150 ? '...' : ''}`);
          } else if (block.type === 'tool_use') {
            this.logger.log(`         Tool: ${block.name}`);
            this.logger.log(`         Input: ${JSON.stringify(block.input)}`);
          }
        });
        
        this.logger.log(`\n   🔧 Processing response...`);

        // LOG AGENT RESPONSE TO BROWSER
        this.browserLogger.logAgentResponse(taskId, 'DESKTOP_AGENT', {
          model,
          provider: 'groq',
          contentBlocks: response.contentBlocks || [],
          tokenUsage: response.tokenUsage || {},
        });
        
        // Extract tool call from tool_calls (native structured output)
        const toolUseBlock = response.contentBlocks?.find((block: any) => block.type === 'tool_use') as ToolUseContentBlock;
        
        if (toolUseBlock) {
          toolCall = {
            name: toolUseBlock.name,
            arguments: toolUseBlock.input as Record<string, unknown>,
          };
          this.logger.log(`   ✅ Tool call detected: ${toolCall.name}`);
        }
        
        // Also log any text content
        const textBlock = response.contentBlocks?.find((block: any) => block.type === 'text') as any;
        if (textBlock?.text) {
          responseContent = textBlock.text;
          this.logger.log(`   Text: ${responseContent.substring(0, 200)}...`);
        }
      } else {
        // Use OpenAI-compatible endpoint WITH proper tool calling
        // This prevents tool name hallucination by enforcing schema
        response = await this.bytezService.generateMessage(
          this.getSystemPrompt(),
          conversationMessages as any,
          model,
          true, // ✅ USE TOOLS - enforces schema, prevents hallucination
          undefined, // No abort signal
          undefined, // Use default tools
          { isFirstMessage }, // NEW: Optimization flag
        );
        
        const tokensUsed = response.tokenUsage?.totalTokens || 0;
        totalTokens += tokensUsed;
        totalCost += this.calculateCost(tokensUsed);
        
        // LOG AGENT RESPONSE - DETAILED
        this.logger.log(`\n   🤖 DESKTOP_AGENT LLM Response (Iteration ${iteration}):`);
        this.logger.log(`      Provider: Bytez`);
        this.logger.log(`      Model: ${model}`);
        this.logger.log(`      Tokens: ${tokensUsed} | Cost: $${this.calculateCost(tokensUsed).toFixed(6)}`);
        this.logger.log(`      Content Blocks: ${response.contentBlocks?.length || 0}`);
        
        // Log all content blocks
        response.contentBlocks?.forEach((block: any, idx: number) => {
          this.logger.log(`      Block ${idx + 1}: ${block.type}`);
          if (block.type === 'text') {
            this.logger.log(`         Text: ${block.text?.substring(0, 150)}${block.text?.length > 150 ? '...' : ''}`);
          } else if (block.type === 'tool_use') {
            this.logger.log(`         Tool: ${block.name}`);
            this.logger.log(`         Input: ${JSON.stringify(block.input)}`);
          }
        });
        
        this.logger.log(`\n   🔧 Processing response...`);

        // LOG AGENT RESPONSE TO BROWSER
        this.browserLogger.logAgentResponse(taskId, 'DESKTOP_AGENT', {
          model,
          provider: 'bytez',
          contentBlocks: response.contentBlocks || [],
          tokenUsage: response.tokenUsage || {},
        });
        
        // Extract structured tool call from response
        const toolUseBlock = response.contentBlocks?.find((block: any) => block.type === 'tool_use') as any;
        if (toolUseBlock) {
          toolCall = {
            name: toolUseBlock.name,
            arguments: toolUseBlock.input as Record<string, unknown>,
          };
          this.logger.log(`   ✅ Tool call detected: ${toolCall.name}`);
        }
        
        // Also log any text content (reasoning)
        const textBlock = response.contentBlocks?.find((block: any) => block.type === 'text') as any;
        if (textBlock?.text) {
          responseContent = textBlock.text;
          this.logger.log(`   Text: ${responseContent.substring(0, 200)}...`);
        }
      }
      
      if (!toolCall) {
        this.logger.warn(`   ⚠️  No tool call in response, retrying...`);
        
        let errorMessage = `ERROR: You must call a tool. You have TWO tools available:

1. "computer" - Main tool for desktop actions (takes "action" parameter)
   Actions: click, double_click, right_click, type, paste, key, scroll, application, terminal_command, screenshot
   
   Example: {"name":"computer","arguments":{"action":"click","x":100,"y":200}}

2. "set_task_status" - Mark step as completed or failed
   Example: {"name":"set_task_status","arguments":{"status":"completed","message":"Task done"}}

❌ WRONG: There is NO "computer_left_click", "computer_type_text", etc.
✅ CORRECT: Use "computer" tool with "action" parameter.

You MUST call one of these tools. Do not output text only.`;
        
        lastAction = 'wait(2000ms) - no tool call';
        // Add error feedback to conversation
        conversationMessages.push({
          role: 'ASSISTANT',
          content: [{ type: 'text', text: responseContent || '(no response)' }],
        });
        conversationMessages.push({
          role: 'USER',
          content: [{ type: 'text', text: errorMessage }],
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }

      this.logger.log(`   Tool: ${toolCall.name}`);
      this.logger.log(`   Arguments: ${JSON.stringify(toolCall.arguments)}`);

      // LOG TOOL CALL TO BROWSER
      this.browserLogger.logToolCall(taskId, 'DESKTOP_AGENT', {
        name: toolCall.name,
        input: toolCall.arguments,
      });

      // Handle tool call
      if (toolCall.name === 'set_task_status') {
        const status = toolCall.arguments.status as string;
        const message = toolCall.arguments.message || toolCall.arguments.description as string;
        
        this.logger.log(`   Status: ${status}`);
        this.logger.log(`   Message: ${message}`);
        
        if (status === 'completed') {
          stepCompleted = true;
          return {
            action: 'set_task_status',
            details: { status, message: message || 'Step completed' },
            timestamp: new Date().toISOString(),
            tokensUsed: totalTokens,
            cost: totalCost,
          };
        } else if (status === 'failed') {
          return {
            action: 'set_task_status',
            details: { status, message: message || 'Step failed' },
            error: (message || 'Step failed') as string,
            timestamp: new Date().toISOString(),
            tokensUsed: totalTokens,
            cost: totalCost,
          };
        }
      } else if (toolCall.name === 'computer') {
        // Unified computer tool - extract action from arguments
        const action = toolCall.arguments.action as string;
        if (!action) {
          this.logger.warn(`   ⚠️  Computer tool call missing action parameter, skipping`);
          continue;
        }
        
        // Validate action is known
        const validActions = ['click', 'double_click', 'right_click', 'type', 'paste', 'key', 'scroll', 'screenshot', 'application', 'terminal_command'];
        if (!validActions.includes(action)) {
          this.logger.error(`   ❌ Invalid computer action: ${action}`);
          this.logger.error(`   Valid actions: ${validActions.join(', ')}`);
          continue;
        }
        
        // Execute computer tool
        const actionKey = `${toolCall.name}_${action}_${JSON.stringify(toolCall.arguments)}`;
        lastAction = actionKey;
        
        // Check for repeated actions (loop detection)
        actionHistory.push(actionKey);
        const recentActions = actionHistory.slice(-3); // Last 3 actions
        const allSame = recentActions.length === 3 && recentActions.every(a => a === recentActions[0]);
        
        if (allSame) {
          this.logger.warn(`   ⚠️  LOOP DETECTED: Same action repeated 3 times without progress`);
          this.logger.warn(`   Action: ${actionKey}`);
          
          // Add strong feedback to force different approach
          conversationMessages.push({
            role: 'ASSISTANT',
            content: [{ type: 'text', text: responseContent }],
          });
          conversationMessages.push({
            role: 'USER',
            content: [{ type: 'text', text: `❌ LOOP DETECTED: You tried "${action}" at the same location 3 times and it didn't work.

You MUST try a DIFFERENT approach now:
1. If you were single-clicking, try DOUBLE-CLICKING
2. If clicking didn't work, try using TERMINAL command
3. If clicking an icon, try using APPLICATION launcher
4. If typing didn't work, try KEYBOARD shortcuts

DO NOT repeat the same action again. Try something completely different or mark as failed.` }],
          });
          
          await this.wait(2000);
          continue;
        }
        
        // Map to executeToolCall format and execute
        const mappedCall = this.mapToExecuteFormat(toolCall);
        
        // Create tool use content block for message
        const toolUseBlock = this.createComputerToolUseBlock(toolCall);
        
        const toolStartTime = Date.now();
        try {
          await this.executeToolCall(mappedCall);
          const toolDuration = Date.now() - toolStartTime;
          this.logger.log(`   Executed: ${action}`);

          // LOG TOOL SUCCESS TO BROWSER
          this.browserLogger.logToolResult(taskId, 'DESKTOP_AGENT', {
            toolName: toolCall.name,
            success: true,
            output: { action, status: 'completed' },
            duration: toolDuration,
          });
        } catch (toolError) {
          const toolDuration = Date.now() - toolStartTime;
          this.logger.error(`   Tool execution failed: ${toolError.message}`);

          // LOG TOOL FAILURE TO BROWSER
          this.browserLogger.logToolResult(taskId, 'DESKTOP_AGENT', {
            toolName: toolCall.name,
            success: false,
            error: toolError.message,
            duration: toolDuration,
          });
        }
        
        // Save action as message (with screenshot if available)
        await this.messagesService.createAgentActionMessage(
          taskId,
          'DESKTOP',
          'computer_action',
          {
            toolUseBlock,
            screenshot: lastScreenshot,
          },
        );
        
        // Wait for action to settle
        await this.wait(1000);
      } else {
        // Unknown tool - log warning and continue
        this.logger.warn(`   ⚠️  Unknown tool: ${toolCall.name}, skipping`);
      }

      // Add tool result to conversation
      conversationMessages.push({
        role: 'ASSISTANT',
        content: [{ type: 'text', text: responseContent }],
      });
      conversationMessages.push({
        role: 'USER',
        content: [{ type: 'text', text: 'Action executed successfully. Continue with next action.' }],
      });
    }

    if (!stepCompleted) {
      this.logger.warn(`Desktop step reached max iterations (${this.MAX_ITERATIONS})`);
    }

    // Log to action history
    await this.appendToHistory(taskId, {
      agent: 'DESKTOP',
      action: lastAction,
      result: stepCompleted ? 'success' : 'failure',
      timestamp: new Date().toISOString(),
      details: {
        iterations: iteration,
        step_id: step.id,
      },
    });

    return {
      action: lastAction,
      details: {
        iterations: iteration,
        completed: stepCompleted,
      },
      screenshot: lastScreenshot || undefined,
      timestamp: new Date().toISOString(),
      tokensUsed: totalTokens,
      cost: totalCost,
    };
  }

  private getSystemPrompt(): string {
    // Use centralized system prompt from config
    return getAgentSystemPrompt('DESKTOP');
  }

  /**
   * Map tool call from unified computer tool to executeToolCall format
   */
  private mapToExecuteFormat(toolCall: { name: string; arguments: any }): { name: string; input: any } {
    // The tool call has "computer" as name with action in arguments
    if (toolCall.name === 'computer') {
      const action = toolCall.arguments.action;
      
      // Map action to internal tool name format for executeToolCall
      const actionToToolName: Record<string, string> = {
        'click': 'computer_left_click',
        'double_click': 'computer_double_click',
        'right_click': 'computer_right_click',
        'type': 'computer_type_text',
        'paste': 'computer_paste_text',
        'key': 'computer_type_keys',
        'scroll': 'computer_scroll',
        'screenshot': 'computer_screenshot',
        'application': 'computer_application',
        'terminal_command': 'computer_terminal_command',
      };
      
      const toolName = actionToToolName[action];
      
      // Map arguments to input format
      let input: any = {};
      
      if (action === 'click' || action === 'double_click' || action === 'right_click') {
        input = { x: toolCall.arguments.x, y: toolCall.arguments.y };
      } else if (action === 'type') {
        input = { text: toolCall.arguments.text };
      } else if (action === 'paste') {
        input = { text: toolCall.arguments.text };
      } else if (action === 'key') {
        // Handle both single key and key combinations
        const key = toolCall.arguments.text || toolCall.arguments.key;
        if (key.includes('+')) {
          // Key combination like "ctrl+c"
          input = { keys: key.split('+').map((k: string) => this.mapKeyName(k.trim())) };
        } else {
          input = { keys: [this.mapKeyName(key)] };
        }
      } else if (action === 'scroll') {
        input = {
          direction: toolCall.arguments.direction,
          amount: toolCall.arguments.amount || 3,
        };
      } else if (action === 'application') {
        input = { application: toolCall.arguments.application };
      } else if (action === 'terminal_command') {
        input = { command: toolCall.arguments.command };
      }
      
      return { name: toolName, input };
    }
    
    // For other tools (like set_task_status), pass through
    return {
      name: toolCall.name,
      input: toolCall.arguments,
    };
  }

  /**
   * Map key names from system prompt format to VNC format
   */
  private mapKeyName(key: string): string {
    const keyMap: Record<string, string> = {
      'ctrl': 'LeftControl',
      'control': 'LeftControl',
      'shift': 'LeftShift',
      'alt': 'LeftAlt',
      'cmd': 'LeftCmd',
      'win': 'LeftWin',
      'enter': 'Return',
      'return': 'Return',
      'esc': 'Escape',
      'escape': 'Escape',
      'space': 'Space',
      'tab': 'Tab',
      'backspace': 'Backspace',
      'delete': 'Delete',
      'up': 'Up',
      'down': 'Down',
      'left': 'Left',
      'right': 'Right',
      'home': 'Home',
      'end': 'End',
      'pageup': 'PageUp',
      'pagedown': 'PageDown',
    };
    
    const lowerKey = key.toLowerCase();
    return keyMap[lowerKey] || key;
  }

  private buildDecisionPrompt(
    step: ExecutionStep,
    perception: any,
    iteration: number,
    lastAction: string,
    recoveryStrategy?: RecoveryStrategy | null,
    downloadedFiles?: string[],
    executionPlan?: any,
  ): string {
    // Add plan context if available
    let planContext = '';
    if (executionPlan && executionPlan.steps) {
      const currentStepIndex = executionPlan.steps.findIndex((s: any) => s.id === step.id);
      const totalSteps = executionPlan.steps.length;
      const remainingSteps = executionPlan.steps.slice(currentStepIndex + 1);
      
      planContext = `🎯 ULTIMATE GOAL: Complete all ${totalSteps} steps to finish the task

**CURRENT STEP: ${step.id} (${currentStepIndex + 1}/${totalSteps})**
Description: ${step.description}
Success Criteria: ${step.success_criteria}

${remainingSteps.length > 0 ? `📋 Steps After This (DO NOT DO THESE YET):
${remainingSteps.map((s: any, i: number) => `  ${i + 1}. [${s.type.toUpperCase()}] ${s.description}`).join('\n')}

⚠️  FOCUS ONLY ON CURRENT STEP - Do not perform future steps!
${remainingSteps.some((s: any) => s.type === 'web') ? '⚠️  Some future steps require Web Agent - you will hand off after completing this step!' : ''}
` : '✅ This is the FINAL step - complete it and you are done!'}

`;
    }

    let prompt = `${planContext}**Current Step Details**:
- Description: ${step.description}
- Success Criteria: ${step.success_criteria}
- Iteration: ${iteration}/${this.MAX_ITERATIONS}
- Last Action: ${lastAction || 'None'}

**What You See (Perception Analysis)**:
- Active Window: ${perception?.active_window || 'Unknown'}
- UI State: ${perception?.ui_state || 'Unknown'}
- Clickable Elements: ${perception?.clickable_elements?.join(', ') || 'None'}
- Errors Visible: ${perception?.errors_visible ? 'Yes' : 'No'}
- Task Info: ${perception?.task_relevant_info || 'None'}

🔍 IMPORTANT: You also have the SCREENSHOT attached to this message. Look at it!
   - If you can SEE the success criteria is already met in the screenshot, mark complete NOW
   - Do NOT take unnecessary actions just because you have iterations left`;

    if (downloadedFiles && downloadedFiles.length > 0) {
      prompt += `

**Downloaded Files**: ${downloadedFiles.join(', ')}`;
    }

    if (recoveryStrategy) {
      prompt += `

**Recovery Strategy**: ${recoveryStrategy.strategy}
**Avoid**: ${recoveryStrategy.avoid.join(', ')}
**Approach**: ${recoveryStrategy.approach}`;
    }

    prompt += `

Decide next action. Optional: Start with "REASONING: [brief plan]" then output JSON.`;

    return prompt;
  }

  /**
   * Execute a tool call from the LLM
   */
  private async executeToolCall(toolCall: { name: string; input: any }): Promise<void> {
    const { name, input } = toolCall;
    
    this.logger.log(`🖥️  [DesktopAgent] Executing tool: ${name}`);
    
    // Log input safely - avoid logging large data
    const inputPreview = { ...input };
    if (inputPreview.image && typeof inputPreview.image === 'string' && inputPreview.image.length > 100) {
      inputPreview.image = `[base64 image: ${(inputPreview.image.length / 1024).toFixed(1)}KB]`;
    }
    this.logger.debug(`   Tool input: ${JSON.stringify(inputPreview)}`);
    
    try {
      // Build request body based on tool
      let requestBody: any = {};
      
      if (name === 'computer_left_click' || name === 'computer_right_click' || name === 'computer_double_click') {
        // All clicks use 'click_mouse' action, differentiated by button and clickCount
        requestBody.action = 'click_mouse';
        requestBody.coordinates = { x: input.x, y: input.y };
        requestBody.button = name.includes('right') ? 'right' : 'left';
        requestBody.clickCount = name.includes('double') ? 2 : 1;
        this.logger.log(`   → Clicking at [${input.x}, ${input.y}] (${requestBody.button}, count: ${requestBody.clickCount})`);
      } else if (name === 'computer_type_text') {
        requestBody.action = 'type_text';
        requestBody.text = input.text;
        requestBody.delay = 50;
        this.logger.log(`   → Typing: ${input.text.substring(0, 50)}...`);
      } else if (name === 'computer_paste_text') {
        requestBody.action = 'paste_text';
        requestBody.text = input.text;
        this.logger.log(`   → Pasting: ${input.text.substring(0, 50)}...`);
      } else if (name === 'computer_type_keys') {
        requestBody.action = 'type_keys';
        requestBody.keys = input.keys;
        this.logger.log(`   → Pressing keys: ${input.keys.join('+')}`);
      } else if (name === 'computer_scroll') {
        requestBody.action = 'scroll';
        requestBody.direction = input.direction;
        requestBody.scrollCount = input.amount || 3;
        this.logger.log(`   → Scrolling: ${input.direction}`);
      } else if (name === 'computer_application') {
        requestBody.action = 'application';
        requestBody.application = input.application;
        this.logger.log(`   → Opening application: ${input.application}`);
      } else if (name === 'computer_terminal_command') {
        // Special handling for terminal commands
        // Type command in existing terminal, then press Enter
        this.logger.log(`   → Running terminal command: ${input.command}`);
        
        // Step 1: Type command (assumes terminal is already open)
        this.logger.log(`   → Step 1: Typing command: ${input.command}`);
        const typeResponse = await fetch(`${this.DESKTOP_BASE_URL}/computer-use`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'type_text',
            text: input.command,
            delay: 50,
          }),
        });
        
        if (!typeResponse.ok) {
          throw new Error(`Terminal command typing failed: ${typeResponse.statusText}`);
        }
        
        await this.wait(1000); // Wait for typing to complete
        
        // Step 2: Press Enter to execute
        this.logger.log(`   → Step 2: Pressing Enter to execute`);
        requestBody.action = 'type_keys';
        requestBody.keys = ['Return'];
        
        // This will be sent by the final API call below
        // Don't return early - let it fall through to execute the Enter press
      } else if (name === 'computer_screenshot') {
        this.logger.log(`   → Taking screenshot (already captured)`);
        this.logger.log(`   ✓ Tool Result: Screenshot available (captured before tool call)`);
        return; // No need to call API, we already have screenshot
      } else {
        this.logger.warn(`   ⚠️  Unknown tool: ${name}, skipping API call`);
        return;
      }
      
      // Call computer-use API
      this.logger.log(`   📤 Sending to VNC API: ${JSON.stringify(requestBody)}`);
      
      const response = await fetch(`${this.DESKTOP_BASE_URL}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`   ❌ VNC API error: ${response.status} ${response.statusText}`);
        this.logger.error(`   ❌ Response body: ${errorText}`);
        throw new Error(`Computer use API failed: ${response.statusText}`);
      }
      
      // Parse and log response
      const responseData = await response.json() as any;
      this.logger.log(`   ✓ Tool Result: VNC API responded with status ${response.status}`);
      
      // Log specific result details based on action type
      if (responseData) {
        if (responseData.success !== undefined) {
          this.logger.log(`      Success: ${responseData.success}`);
        }
        if (responseData.message) {
          this.logger.log(`      Message: ${responseData.message}`);
        }
        if (responseData.coordinates) {
          this.logger.log(`      Coordinates: [${responseData.coordinates.x}, ${responseData.coordinates.y}]`);
        }
        if (responseData.text) {
          this.logger.log(`      Text: ${responseData.text.substring(0, 50)}${responseData.text.length > 50 ? '...' : ''}`);
        }
      }
      
      this.logger.log(`✅ [DesktopAgent] Tool execution completed: ${name}`);
      
      // Wait for UI to update after action (especially important for terminal commands)
      if (name === 'computer_terminal_command' || name === 'computer_application') {
        this.logger.log(`   ⏳ Waiting 2s for UI to update...`);
        await this.wait(2000);
      } else if (name === 'computer_left_click' || name === 'computer_right_click' || 
                 name === 'computer_double_click' || name === 'computer_type_text' || 
                 name === 'computer_paste_text' || name === 'computer_type_keys' || 
                 name === 'computer_scroll') {
        this.logger.log(`   ⏳ Waiting 1s for UI to update...`);
        await this.wait(1000);
      }
      // No wait for computer_screenshot - it's instant
    } catch (error) {
      this.logger.error(`❌ [DesktopAgent] Tool execution failed: ${error.message}`);
      throw error;
    }
  }

  private async takeScreenshot(): Promise<string> {
    try {
      const response = await fetch(`${this.DESKTOP_BASE_URL}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'screenshot' }),
      });

      if (!response.ok) {
        throw new Error(`Screenshot failed: ${response.statusText}`);
      }

      const data = await response.json() as { image?: string };
      if (!data.image) {
        throw new Error('No image data in screenshot response');
      }
      return data.image; // Base64 encoded
    } catch (error) {
      this.logger.error(`Screenshot failed: ${error.message}`);
      throw error;
    }
  }

  private async wait(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a ComputerToolUseContentBlock from a tool call
   */
  private createComputerToolUseBlock(toolCall: DesktopToolCall): any {
    const toolUseId = `toolu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const action = toolCall.arguments.action as string;
    
    // Map action to tool name
    const actionToToolName: Record<string, string> = {
      'click': 'computer_click_mouse',
      'double_click': 'computer_click_mouse',
      'right_click': 'computer_click_mouse',
      'type': 'computer_type_text',
      'paste': 'computer_paste_text',
      'key': 'computer_type_keys',
      'scroll': 'computer_scroll',
      'screenshot': 'computer_screenshot',
      'application': 'computer_application',
      'terminal_command': 'computer_terminal_command',
    };
    
    const toolName = actionToToolName[action] || 'computer_unknown';
    
    // Build input based on action
    let input: any = {};
    
    if (action === 'click' || action === 'double_click' || action === 'right_click') {
      input = {
        coordinates: { x: toolCall.arguments.x, y: toolCall.arguments.y },
        button: action.includes('right') ? 'right' : 'left',
        clickCount: action.includes('double') ? 2 : 1,
      };
    } else if (action === 'type') {
      input = { text: toolCall.arguments.text };
    } else if (action === 'paste') {
      input = { text: toolCall.arguments.text };
    } else if (action === 'key') {
      const key = (toolCall.arguments.text || toolCall.arguments.key) as string;
      input = { keys: key.includes('+') ? key.split('+') : [key] };
    } else if (action === 'scroll') {
      input = {
        direction: toolCall.arguments.direction,
        scrollCount: toolCall.arguments.amount || 3,
      };
    } else if (action === 'application') {
      input = { application: toolCall.arguments.application };
    } else if (action === 'terminal_command') {
      input = { command: toolCall.arguments.command };
    }
    
    return {
      type: MessageContentType.ToolUse,
      name: toolName,
      id: toolUseId,
      input,
    };
  }

  private calculateCost(tokens: number): number {
    // Bytez Claude Opus 4.6 pricing (approximate)
    // Input: $15 per 1M tokens, Output: $75 per 1M tokens
    // Average: ~$45 per 1M tokens
    const costPerToken = 45 / 1_000_000;
    return tokens * costPerToken;
  }
}
