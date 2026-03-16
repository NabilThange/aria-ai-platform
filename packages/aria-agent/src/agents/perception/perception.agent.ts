import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentResult } from '../base/base.agent';
import { SharedStateService } from '../../shared-state/shared-state.service';
import { GroqService } from '../../groq/groq.service';
import { AGENT_MODELS } from '../../config/agents.config';
import { getAgentSystemPrompt } from '../../config/system-prompts.config';
import { PERCEPTION_SCHEMA, PerceptionResult } from './perception.schema';
import { extractJSON } from '../../utils/json.util';

/**
 * PerceptionAgent - Processes screenshots and returns structured JSON
 * Model: Groq Llama 4 Scout (vision)
 * Runs after every desktop action, must be fast
 */
@Injectable()
export class PerceptionAgent extends BaseAgent {
  private readonly model = AGENT_MODELS.PERCEPTION;

  constructor(
    sharedState: SharedStateService,
    private readonly groqService: GroqService,
  ) {
    super(sharedState, 'PerceptionAgent');
  }

  /**
   * Process a screenshot and extract UI state
   * @param input - Screenshot data (base64 or buffer)
   * @param taskId - Task ID for shared state access
   */
  async run(input: any, taskId: string): Promise<AgentResult> {
    try {
      this.logger.log(`Processing screenshot for task ${taskId}`);

      // Extract screenshot from input
      const screenshot = this.extractScreenshot(input);

      // Build perception prompt
      const prompt = this.buildPerceptionPrompt(taskId);

      // Use Groq Llama 4 Scout
      const response = await this.groqService.generateMessage(
        this.getSystemPrompt(),
        this.buildMessages(prompt, screenshot),
        this.model.model,
        false, // No tools needed
      );

      // Parse perception result
      const perceptionResult = this.parsePerceptionResult(response);

      // LOG PERCEPTION OUTPUT
      this.logger.log(`👁️ [PerceptionAgent] Screen analysis:`);
      this.logger.log(`   Active window: ${perceptionResult.active_window}`);
      this.logger.log(`   UI state: ${perceptionResult.ui_state}`);
      this.logger.log(`   Clickable elements: ${perceptionResult.clickable_elements.length} found`);
      this.logger.log(`   Errors visible: ${perceptionResult.errors_visible}`);
      this.logger.log(`   Task info: ${perceptionResult.task_relevant_info.substring(0, 200)}...`);

      // Write to shared state for Desktop Agent to read
      await this.writeState(taskId, 'perception_result', perceptionResult);

      // Log to action history
      await this.appendToHistory(taskId, {
        agent: 'PERCEPTION',
        action: 'process_screenshot',
        result: 'success',
        timestamp: new Date().toISOString(),
        details: {
          active_window: perceptionResult.active_window,
          errors_visible: perceptionResult.errors_visible,
        },
      });

      const tokensUsed = response.tokenUsage?.totalTokens || 0;
      this.logCost(tokensUsed, this.model.model);

      return {
        success: true,
        data: perceptionResult,
        tokensUsed,
        cost: this.calculateCost(tokensUsed),
      };
    } catch (error) {
      this.logger.error(`Perception failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private getSystemPrompt(): string {
    return getAgentSystemPrompt('PERCEPTION');
  }

  private buildPerceptionPrompt(taskId: string): string {
    return `Analyze this screenshot and extract the UI state.

Respond with JSON only, following the exact schema provided in the system prompt.`;
  }

  private buildMessages(prompt: string, screenshot: string): any[] {
    // Build message with image content
    return [
      {
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
      },
    ];
  }


  private extractScreenshot(input: any): string {
    // Handle different input formats
    if (typeof input === 'string') {
      // Already base64
      return input.replace(/^data:image\/\w+;base64,/, '');
    }
    
    if (input.screenshot) {
      return this.extractScreenshot(input.screenshot);
    }
    
    if (Buffer.isBuffer(input)) {
      return input.toString('base64');
    }
    
    throw new Error('Invalid screenshot format');
  }

  private parsePerceptionResult(response: any): PerceptionResult {
    // Extract JSON from response content
    const content = response.contentBlocks?.[0]?.text || '';
    
    try {
      const parsed = extractJSON(content);
      
      // Validate required fields
      if (
        typeof parsed.active_window !== 'string' ||
        typeof parsed.ui_state !== 'string' ||
        !Array.isArray(parsed.clickable_elements) ||
        typeof parsed.errors_visible !== 'boolean' ||
        typeof parsed.task_relevant_info !== 'string'
      ) {
        throw new Error('Invalid perception result structure');
      }

      return parsed as PerceptionResult;
    } catch (error) {
      this.logger.error(`Failed to parse perception result: ${error.message}`);
      this.logger.error(`Response content: ${content.substring(0, 500)}...`);
      
      // Return safe default
      return {
        active_window: 'Unknown',
        ui_state: 'Failed to parse UI state',
        clickable_elements: [],
        errors_visible: false,
        task_relevant_info: 'Perception parsing failed',
      };
    }
  }

  private calculateCost(tokens: number): number {
    // Groq Llama 4 Scout pricing (approximate)
    const costPerToken = 0.10 / 1_000_000;
    return tokens * costPerToken;
  }
}
