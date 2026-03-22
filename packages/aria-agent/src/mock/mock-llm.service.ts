import { Injectable, Logger } from '@nestjs/common';
import { Message } from '@prisma/client';
import {
  BytebotAgentResponse,
} from '../agent/agent.types';
import {
  MessageContentBlock,
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
} from '@bytebot/shared';
import { v4 as uuid } from 'uuid';

@Injectable()
export class MockLlmService {
  private readonly logger = new Logger(MockLlmService.name);

  /**
   * Checks if the current task history indicates this is a mock test flow.
   */
  isMockTask(messages: Message[]): boolean {
    // Check if the first user message contains the magic string
    if (!messages || messages.length === 0) return false;
    
    // Find the first user message in the thread
    const firstUserMsg = messages.find(m => m.role === 'USER');
    if (!firstUserMsg) return false;

    const contentStr = JSON.stringify(firstUserMsg.content);
    return contentStr.includes('MOCK_TEST_COMPLEX_FLOW');
  }

  /**
   * Handles the MOCK_TEST_COMPLEX_FLOW returning predetermined responses
   * based on the agent type and conversation state.
   */
  handleMockTask(
    systemPrompt: string,
    messages: Message[],
    model: string,
  ): BytebotAgentResponse {
    this.logger.warn(`[MOCK MODE] Intercepted LLM call for MOCK_TEST_COMPLEX_FLOW`);

    const agentType = this.detectAgent(systemPrompt);
    this.logger.warn(`[MOCK MODE] Detected agent: ${agentType}`);

    // Create a response using the appropriate state machine logic
    let blocks: MessageContentBlock[] = [];

    switch (agentType) {
      case 'CLARIFIER':
        blocks = this.handleClarifierState(messages);
        break;
      case 'ORCHESTRATOR':
        blocks = this.handleOrchestratorState(messages);
        break;
      case 'WEB':
        blocks = this.handleWebState(messages);
        break;
      case 'DESKTOP':
        blocks = this.handleDesktopState(messages);
        break;
      case 'WORKFLOW':
        // The workflow agent doesn't actually call the LLM in normal flow, it executes directly.
        // But if it does, return empty or dummy.
        blocks = [{ type: MessageContentType.Text, text: 'Workflow mock executed.' } as TextContentBlock];
        break;
      default:
        blocks = [{ type: MessageContentType.Text, text: 'Mock fallback response.' } as TextContentBlock];
    }

    return {
      contentBlocks: blocks,
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
    };
  }

  private detectAgent(systemPrompt: string): string {
    if (systemPrompt.includes('ARIA-Clarifier')) return 'CLARIFIER';
    if (systemPrompt.includes('ARIA-Orchestrator')) return 'ORCHESTRATOR';
    if (systemPrompt.includes('ARIA-Web')) return 'WEB';
    if (systemPrompt.includes('ARIA-Desktop') || systemPrompt.includes('Unified desktop action tool')) return 'DESKTOP';
    // Fallback detection
    if (systemPrompt.includes('list_workflows')) return 'ORCHESTRATOR';
    if (systemPrompt.includes('pinchtab_')) return 'WEB';
    if (systemPrompt.includes('computer')) return 'DESKTOP';
    return 'UNKNOWN';
  }

  private handleClarifierState(messages: Message[]): MessageContentBlock[] {
    // Check if the user has provided a clarification response
    const hasClarification = messages.some(m => {
      const contentStr = JSON.stringify(m.content);
      return contentStr.includes('User clarification:');
    });

    if (!hasClarification) {
      // First pass: Ask questions
      const questionResponse = {
        original_input: "MOCK_TEST_COMPLEX_FLOW",
        clarified_goal: "REQUIRES_USER_CLARIFICATION",
        questions: [
          {
            id: "q_target_system",
            question: "What is the target server for the simulated breach?",
            type: "text",
            required: true,
            assumption: "localhost"
          },
          {
            id: "q_confirm_override",
            question: "Do you confirm the manual override protocols for this test?",
            type: "confirm",
            required: true
          }
        ],
        constraints: ["Must use secure mock endpoints"],
        assumptions: ["User intends to run a full UI diagnostic"],
        task_type: "mixed",
        questions_asked: 2
      };
      return [{ type: MessageContentType.Text, text: JSON.stringify(questionResponse) } as TextContentBlock];
    } else {
      // Second pass: User has answered
      const resolvedResponse = {
        original_input: "MOCK_TEST_COMPLEX_FLOW",
        clarified_goal: "Execute a simulated 5-step breach sequence (workflow, desktop, web, workflow, web) for testing the UI",
        constraints: ["Target system acknowledged", "Override protocols confirmed"],
        assumptions: [],
        task_type: "mixed",
        questions_asked: 0
      };
      return [{ type: MessageContentType.Text, text: JSON.stringify(resolvedResponse) } as TextContentBlock];
    }
  }

  private handleOrchestratorState(messages: Message[]): MessageContentBlock[] {
    // We determine orchestrator state by looking at the assistant messages in history
    const assistantMessages = messages.filter(m => m.role === 'ASSISTANT');
    
    // Check if we've already generated the plan
    const hasPlan = assistantMessages.some(m => {
      const content = JSON.stringify(m.content);
      return content.includes('estimated_duration_minutes') && content.includes('complexity');
    });

    if (hasPlan) {
      // If called again after a plan, just say we're done or wait
      return [{ type: MessageContentType.Text, text: "Wait, the plan is already generated." } as TextContentBlock];
    }

    // Determine steps taken so far
    const hasListWorkflows = assistantMessages.some(m => JSON.stringify(m.content).includes('list_workflows'));
    const hasReadWorkflow = assistantMessages.some(m => JSON.stringify(m.content).includes('read_workflow'));

    if (!hasListWorkflows) {
      // Step 1: Call list_workflows
      return [
        { type: MessageContentType.Text, text: "I need to check available workflows first." } as TextContentBlock,
        {
          type: MessageContentType.ToolUse,
          id: 'call_' + uuid().substring(0, 8),
          name: 'list_workflows',
          input: {}
        } as ToolUseContentBlock
      ];
    }

    if (!hasReadWorkflow) {
      // Step 2: Call read_workflow (e.g., google-search)
      return [
        { type: MessageContentType.Text, text: "I see workflows, let me read the details for one." } as TextContentBlock,
        {
          type: MessageContentType.ToolUse,
          id: 'call_' + uuid().substring(0, 8),
          name: 'read_workflow',
          input: { name: 'google-search' }
        } as ToolUseContentBlock
      ];
    }

    // Step 3: Output the Plan
    const planResponse = {
      estimated_duration_minutes: 5,
      complexity: "complex",
      steps: [
        {
          id: "step_1",
          type: "workflow",
          description: "Deploying automated reconnaissance crawler workflow",
          workflow_name: "google-search",
          workflow_vars: { query: "Security vulnerabilities mock data" },
          success_criteria: "Crawler completes scan and returns payload."
        },
        {
          id: "step_2",
          type: "desktop",
          description: "Breaching local mainframe (deploying payload via terminal)",
          success_criteria: "Payload echoed successfully on local terminal.",
          depends_on: ["step_1"]
        },
        {
          id: "step_3",
          type: "web",
          description: "Infiltrating target web application panel via browser",
          success_criteria: "Fake admin panel accessed.",
          depends_on: ["step_2"]
        },
        {
          id: "step_4",
          type: "workflow",
          description: "Extracting simulated data vault",
          workflow_name: "google-search",
          workflow_vars: { query: "Data extraction successful" },
          success_criteria: "Data stream secured.",
          depends_on: ["step_3"]
        },
        {
          id: "step_5",
          type: "web",
          description: "Scrubbing browser logs and exiting phantom session",
          success_criteria: "Session scrubbed without trace.",
          depends_on: ["step_4"]
        }
      ]
    };

    return [
      { type: MessageContentType.Text, text: JSON.stringify(planResponse) } as TextContentBlock
    ];
  }

  private handleDesktopState(messages: Message[]): MessageContentBlock[] {
    const assistantMessages = messages.filter(m => m.role === 'ASSISTANT');
    const hasComputerCall = assistantMessages.some(m => JSON.stringify(m.content).includes('"name":"computer"'));

    if (!hasComputerCall) {
      return [
        { type: MessageContentType.Text, text: "Deploying payload to local terminal." } as TextContentBlock,
        {
          type: MessageContentType.ToolUse,
          id: 'call_' + uuid().substring(0, 8),
          name: 'computer',
          input: {
            action: 'terminal_command',
            command: 'echo "Mock payload successfully deployed from Desktop Agent"'
          }
        } as ToolUseContentBlock
      ];
    } else {
      return [
        { type: MessageContentType.Text, text: "Action complete." } as TextContentBlock,
        {
          type: MessageContentType.ToolUse,
          id: 'call_' + uuid().substring(0, 8),
          name: 'set_task_status',
          input: {
            status: 'completed',
            message: 'Breach successful via terminal.'
          }
        } as ToolUseContentBlock
      ];
    }
  }

  private handleWebState(messages: Message[]): MessageContentBlock[] {
    const assistantMessages = messages.filter(m => m.role === 'ASSISTANT');
    const hasNavigateCall = assistantMessages.some(m => JSON.stringify(m.content).includes('pinchtab_navigate') || JSON.stringify(m.content).includes('pinchtab_eval'));

    if (!hasNavigateCall) {
      // First action
      return [
        { type: MessageContentType.Text, text: "Infiltrating target URL." } as TextContentBlock,
        {
          type: MessageContentType.ToolUse,
          id: 'call_' + uuid().substring(0, 8),
          name: 'pinchtab_navigate',
          input: { url: 'https://example.com' }
        } as ToolUseContentBlock
      ];
    } else {
      // Mark complete
      return [
        { type: MessageContentType.Text, text: "Infiltration complete." } as TextContentBlock,
        {
          type: MessageContentType.ToolUse,
          id: 'call_' + uuid().substring(0, 8),
          name: 'pinchtab_mark_complete',
          input: { message: 'Mock web operation concluded.' }
        } as ToolUseContentBlock
      ];
    }
  }
}
