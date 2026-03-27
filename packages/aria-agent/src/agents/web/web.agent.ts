import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentResult } from '../base/base.agent';
import { SharedStateService } from '../../shared-state/shared-state.service';
import { GroqService } from '../../groq/groq.service';
import { BytezService } from '../../bytez/bytez.service';
import { GoogleService } from '../../google/google.service';
import { PinchTabService } from '../../services/pinchtab.service';
import { PerceptionAgent } from '../perception/perception.agent';
import { AGENT_MODELS } from '../../config/agents.config';
import { getAgentSystemPrompt } from '../../config/system-prompts.config';
import { ExecutionStep } from '../orchestrator/orchestrator.types';
import { RecoveryStrategy } from '../recovery/recovery.types';
import { ActionResult } from '../shared/action-result.types';
import { pinchTabTools } from '../../groq/pinchtab.tools';
import { MessagesService } from '../../messages/messages.service';
import { MessageContentType } from '@bytebot/shared';
import { BrowserLoggerService } from '../../logger/browser-logger.service';

/**
 * WebAgent - Executes web-based tasks using PinchTab
 * Model: Google Gemini 3 Flash (loops 15-20x, PinchTab gives structured text)
 * Uses snapshot → perception → pick element → execute pattern
 * 
 * EAGER INITIALIZATION: Browser instance is launched immediately when WebAgent starts
 * and metadata is provided to the LLM in the system prompt to prevent duplicate launches
 */
@Injectable()
export class WebAgent extends BaseAgent {
  private readonly model = AGENT_MODELS.WEB;
  private readonly MAX_ITERATIONS = 20;
  private instanceMetadata: any = null;

  constructor(
    sharedState: SharedStateService,
    private readonly groqService: GroqService,
    private readonly bytezService: BytezService,
    private readonly googleService: GoogleService,
    private readonly pinchTabService: PinchTabService,
    private readonly perceptionAgent: PerceptionAgent,
    private readonly messagesService: MessagesService,
    private readonly browserLogger: BrowserLoggerService,
  ) {
    super(sharedState, 'WebAgent');
  }

  /**
   * Execute a web task step
   * @param input - ExecutionStep from Orchestrator
   * @param taskId - Task ID for shared state access
   */
  async run(input: any, taskId: string): Promise<AgentResult> {
    try {
      this.logger.log(`Executing web step for task ${taskId}`);

      const step = input as ExecutionStep;

      // EAGER INITIALIZATION: Launch browser instance immediately if not already running
      await this.initializeBrowserInstance(taskId);

      // Check for recovery strategy
      const recoveryStrategy = await this.readState<RecoveryStrategy>(
        taskId,
        'recovery_strategy',
      );

      if (recoveryStrategy) {
        this.logger.log(`Using recovery strategy: ${recoveryStrategy.strategy}`);
      }

      // Execute the step
      const result = await this.executeStep(step, taskId, recoveryStrategy);

      return {
        success: true,
        data: result,
        tokensUsed: result.tokensUsed || 0,
        cost: result.cost || 0,
      };
    } catch (error) {
      this.logger.error(`Web step execution failed: ${error.message}`);
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

  /**
   * EAGER INITIALIZATION: Initialize browser instance immediately when WebAgent starts
   * NOW USES PROFILE-BASED PERSISTENCE for session data
   */
  private async initializeBrowserInstance(taskId: string): Promise<void> {
    // Check if instance already exists for this task
    const existingInstance = this.pinchTabService.getTaskInstance(taskId);
    
    if (existingInstance) {
      this.logger.log(`✅ Browser instance already running for task ${taskId}: ${existingInstance.id}`);
      // Update metadata
      await this.collectInstanceMetadata(taskId, existingInstance);
      return;
    }

    const headedMode = process.env.PINCHTAB_HEADED_MODE === 'true';
    this.logger.log(`🚀 EAGER INITIALIZATION: Launching ${headedMode ? 'HEADED (visible)' : 'HEADLESS'} browser for task ${taskId}`);
    
    try {
      // PHASE 1: Profile-based persistence
      // 1. Check if default profile exists
      const profileName = 'web-agent-default';
      let profileId: string;
      
      try {
        const profiles = await this.pinchTabService.listProfiles();
        const existingProfile = profiles.find(p => p.name === profileName);
        
        if (existingProfile) {
          profileId = existingProfile.id;
          this.logger.log(`📁 Using existing profile: ${profileName} (${profileId})`);
        } else {
          // 2. Create profile if it doesn't exist
          this.logger.log(`📁 Creating new persistent profile: ${profileName}`);
          const newProfile = await this.pinchTabService.createProfile(
            profileName,
            'Persistent profile for web agent - preserves cookies and session data'
          );
          profileId = newProfile.id;
          this.logger.log(`📁 Profile created: ${profileId}`);
        }
      } catch (profileError) {
        // Fallback to non-profile mode if profile system fails
        this.logger.warn(`⚠️  Profile system unavailable: ${profileError.message}`);
        this.logger.log(`⚠️  Falling back to ephemeral instance (no session persistence)`);
        const instance = await this.pinchTabService.initInstance('default', headedMode, taskId);
        this.logger.log(`✅ Browser instance launched successfully: ${instance.id}`);
        await this.collectInstanceMetadata(taskId, instance);
        this.logger.log(`📊 Instance metadata collected and ready for LLM`);
        return;
      }
      
      // 3. Start instance with profile
      const instance = await this.pinchTabService.startInstanceWithProfile(
        profileId,
        headedMode ? 'headed' : 'headless'
      );
      
      // Register the instance with taskId
      this.pinchTabService.registerTaskInstance(taskId, instance);
      
      this.logger.log(`✅ Browser instance launched with persistent profile: ${instance.id}`);
      this.logger.log(`🔒 Session data will persist across restarts`);
      
      // Collect and store instance metadata
      await this.collectInstanceMetadata(taskId, instance);
      
      this.logger.log(`📊 Instance metadata collected and ready for LLM`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize browser: ${error.message}`);
      throw error;
    }
  }

  /**
   * Collect comprehensive metadata about the browser instance
   * This metadata will be injected into the system prompt
   */
  private async collectInstanceMetadata(taskId: string, instance: any): Promise<void> {
    try {
      // Get health status
      const health = await this.pinchTabService.getHealth();
      
      // Get list of tabs
      const tabs = await this.pinchTabService.listTabs(instance.id);
      
      // Get current tab info if available
      const currentTabId = this.pinchTabService.getTaskTabId(taskId);
      
      this.instanceMetadata = {
        instanceId: instance.id,
        status: 'active',
        mode: process.env.PINCHTAB_HEADED_MODE === 'true' ? 'headed' : 'headless',
        health: health.status,
        tabs: {
          count: tabs.length,
          currentTabId: currentTabId || null,
          list: tabs.map((tab: any) => ({
            id: tab.id,
            url: tab.url || 'about:blank',
            title: tab.title || 'New Tab',
          })),
        },
        capabilities: [
          'navigate',
          'click',
          'type',
          'scroll',
          'screenshot',
          'wait',
          'submit_form',
          'press_key',
        ],
        launchedAt: new Date().toISOString(),
      };
      
      this.logger.debug(`Instance metadata: ${JSON.stringify(this.instanceMetadata, null, 2)}`);
    } catch (error) {
      this.logger.warn(`Failed to collect full instance metadata: ${error.message}`);
      // Fallback to basic metadata
      this.instanceMetadata = {
        instanceId: instance.id,
        status: 'active',
        mode: process.env.PINCHTAB_HEADED_MODE === 'true' ? 'headed' : 'headless',
        launchedAt: new Date().toISOString(),
      };
    }
  }

  private async executeStep(
    step: ExecutionStep,
    taskId: string,
    recoveryStrategy?: RecoveryStrategy | null,
  ): Promise<ActionResult & { tokensUsed: number; cost: number }> {
    let totalTokens = 0;
    let totalCost = 0;

    // Read execution plan for context (coordination with other agents)
    const executionPlan = await this.readState<any>(taskId, 'execution_plan');

    // NOTE: Browser instance is EAGERLY initialized in run() method
    // No need for lazy initialization - instance is already running

    // Track downloads
    const downloadsBefore = await this.readState<string[]>(taskId, 'downloaded_files') || [];

    // Initialize conversation history OUTSIDE the iteration loop
    // This allows the agent to learn from previous actions
    const conversationMessages: any[] = [];

    // Execute step with iteration loop
    let iteration = 0;
    let stepCompleted = false;
    let lastAction = '';
    let lastSnapshot: any = null;

    // Check if we need to open a tab first (for navigation steps)
    const needsInitialNavigation = !this.pinchTabService.getTaskTabId(taskId) && 
      (step.description.toLowerCase().includes('navigate') || 
       step.description.toLowerCase().includes('open') ||
       step.description.toLowerCase().includes('go to'));
    
    if (needsInitialNavigation) {
      // Extract URL from step description
      const urlMatch = step.description.match(/https?:\/\/[^\s)]+/);
      if (urlMatch) {
        const url = urlMatch[0];
        this.logger.log(`Opening initial tab with URL: ${url}`);
        await this.pinchTabService.navigate(url, undefined, taskId);
        await this.pinchTabService.wait(2000); // Wait for page to load
      } else {
        // No URL found, open a blank tab
        this.logger.log(`Opening blank tab for navigation step`);
        await this.pinchTabService.navigate('about:blank', undefined, taskId);
      }
    }

    while (!stepCompleted && iteration < this.MAX_ITERATIONS) {
      iteration++;
      this.logger.log(`Web step iteration ${iteration}/${this.MAX_ITERATIONS}`);

      // Get current page snapshot (only if we have a tab)
      let snapshot: any;
      if (this.pinchTabService.getTaskTabId(taskId)) {
        snapshot = await this.pinchTabService.snapshot('interactive', undefined, taskId);
        lastSnapshot = snapshot;
      } else {
        // No tab yet, provide empty snapshot
        snapshot = { html: '', elements: [] };
        this.logger.warn(`No tab available yet, using empty snapshot`);
      }

      // Get perception analysis of current page (every 2 iterations to save tokens)
      let perception = null;
      if (iteration % 2 === 0 && snapshot && snapshot.html) {
        perception = await this.getPagePerception(taskId);
      }

      // Check if success criteria are met (auto-completion)
      if (iteration > 2 && snapshot && snapshot.html) {
        const successMet = this.evaluateSuccessCriteria(step.success_criteria, snapshot);
        if (successMet) {
          this.logger.log(`✅ SUCCESS CRITERIA MET: "${step.success_criteria}"`);
          this.logger.log(`   Current URL: ${snapshot.url}`);
          this.logger.log(`   Page title: ${snapshot.title}`);
          this.logger.log(`   Elements found: ${snapshot.elements?.length || 0}`);
          stepCompleted = true;
          lastAction = `Step completed - success criteria met: ${step.success_criteria}`;
          break;
        }
      }

      // Build decision prompt
      const prompt = this.buildDecisionPrompt(
        step,
        snapshot,
        iteration,
        lastAction,
        recoveryStrategy,
        executionPlan,
        taskId,
        perception,
      );

      const systemPrompt = this.getSystemPrompt();
      
      // Browser log: Agent start with full input
      this.browserLogger.logAgentStart(taskId, 'WEB_AGENT', {
        systemPrompt,
        userPrompt: prompt,
        context: {
          iteration,
          stepId: step.id,
          stepDescription: step.description,
          snapshot: {
            url: snapshot?.url,
            title: snapshot?.title,
            elementCount: snapshot?.elements?.length || 0,
          },
          perception: perception ? {
            active_window: (perception as any)?.active_window,
            ui_state: (perception as any)?.ui_state?.substring(0, 100),
            clickable_elements: (perception as any)?.clickable_elements?.length || 0,
          } : null,
        },
      });

      // Add user message to conversation history
      conversationMessages.push({
        role: 'user',
        content: [{ type: 'text', text: prompt }],
      });

      // Trim conversation history if it gets too long (keep last 20 messages)
      if (conversationMessages.length > 20) {
        // Keep first 5 messages (initial context) and last 15 messages
        conversationMessages.splice(5, conversationMessages.length - 20);
        this.logger.log(`   Trimmed conversation history to 20 messages`);
      }

      // Call the appropriate service based on model provider with accumulated history
      let response;
      if (this.model.provider === 'google') {
        this.logger.log(`🔧 Using Google service for model: ${this.model.model}`);
        response = await this.googleService.generateMessage(
          systemPrompt,
          conversationMessages, // Pass accumulated conversation history
          this.model.model,
          true, // Enable tool calling
          undefined, // No abort signal
          pinchTabTools, // Pass PinchTab tools
        );
      } else if (this.model.provider === 'bytez') {
        this.logger.log(`🔧 Using Bytez service for model: ${this.model.model}`);
        response = await this.bytezService.generateMessage(
          systemPrompt,
          conversationMessages, // Pass accumulated conversation history
          this.model.model,
          true, // Enable tool calling
          undefined, // No abort signal
        );
      } else {
        // Default to Groq
        this.logger.log(`🔧 Using Groq service for model: ${this.model.model}`);
        response = await this.groqService.generateMessage(
          systemPrompt,
          conversationMessages, // Pass accumulated conversation history
          this.model.model,
          true, // Enable tool calling
          undefined, // No abort signal
          pinchTabTools, // Pass PinchTab tools
        );
      }

      const tokensUsed = response.tokenUsage?.totalTokens || 0;
      totalTokens += tokensUsed;
      totalCost += this.calculateCost(tokensUsed);

      // Add assistant's response to conversation history
      conversationMessages.push({
        role: 'assistant',
        content: response.contentBlocks || [],
      });

      // Browser log: Agent response
      this.browserLogger.logAgentResponse(taskId, 'WEB_AGENT', {
        model: this.model.model,
        provider: this.model.provider,
        contentBlocks: response.contentBlocks || [],
        tokenUsage: response.tokenUsage,
      });

      // LOG AGENT RESPONSE - DETAILED
      this.logger.log(`\n   🤖 WEB_AGENT LLM Response (Iteration ${iteration}):`);
      this.logger.log(`      Model: ${this.model.model}`);
      this.logger.log(`      Tokens: ${tokensUsed} | Cost: $${this.calculateCost(tokensUsed).toFixed(6)}`);
      this.logger.log(`      Content Blocks: ${response.contentBlocks?.length || 0}`);
      
      // Log all content blocks
      response.contentBlocks?.forEach((block: any, idx: number) => {
        this.logger.log(`      Block ${idx + 1}: ${block.type}`);
        if (block.type === MessageContentType.Text) {
          this.logger.log(`         Text: ${block.text.substring(0, 150)}${block.text.length > 150 ? '...' : ''}`);
        } else if (block.type === MessageContentType.ToolUse) {
          this.logger.log(`         Tool: ${block.name}`);
          this.logger.log(`         Input: ${JSON.stringify(block.input)}`);
        }
      });
      
      // LOG AGENT RESPONSE
      const firstBlock = response.contentBlocks?.[0];
      this.logger.log(`\n   🔧 Processing response...`);
      
      // Handle tool calls - check if it's a ToolUseContentBlock
      if (firstBlock && firstBlock.type === MessageContentType.ToolUse) {
        const toolCall = firstBlock as { type: MessageContentType.ToolUse; name: string; id: string; input: any };
        this.logger.log(`   ✅ Tool call detected: ${toolCall.name}`);

        // Check for completion tool
        if (toolCall.name === 'pinchtab_mark_complete') {
          this.logger.log(`   ✅ Step marked as COMPLETED by agent via pinchtab_mark_complete`);
          stepCompleted = true;
          lastAction = toolCall.input.message || 'Step completed successfully';
          break;
        }

        // Check for completion (no tool call means reasoning/completion)
        if (toolCall.name === 'pinchtab_get_snapshot') {
          // Just getting snapshot, continue loop
          this.logger.log(`   📸 Getting snapshot (no action needed)`);
          lastAction = 'get_snapshot';
        } else {
          // Execute the tool call
          this.logger.log(`   🚀 Executing tool: ${toolCall.name}`);
          const toolFeedback = await this.executeToolCall(toolCall, taskId);
          lastAction = toolFeedback; // Use rich feedback instead of raw tool call
          
          // Add tool result to conversation history
          conversationMessages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: [{ type: 'text', text: toolFeedback }],
            }],
          });
          
          // Save web action as message
          const toolUseBlock = {
            type: MessageContentType.ToolUse,
            name: toolCall.name,
            id: toolCall.id,
            input: toolCall.input,
          };
          
          await this.messagesService.createAgentActionMessage(
            taskId,
            'WEB',
            'computer_action',
            { toolUseBlock },
          );
          
          // Wait for page to settle after action
          this.logger.log(`   ⏳ Waiting 1s for page to settle...`);
          await this.pinchTabService.wait(1000);
        }
      } else if (firstBlock && firstBlock.type === MessageContentType.Text) {
        // Model returned text instead of tool call - check if it's signaling completion
        const textBlock = firstBlock as { type: MessageContentType.Text; text: string };
        const responseText = textBlock.text.toLowerCase();
        this.logger.log(`   💬 Text response received`);
        
        if (responseText.includes('complete') || responseText.includes('success') || responseText.includes('done')) {
          this.logger.log(`   ✅ Step marked as COMPLETED by agent`);
          stepCompleted = true;
          lastAction = 'Step completed successfully';
          break;
        } else {
          // Model didn't call a tool and didn't signal completion - wait and retry
          this.logger.warn(`   ⚠️  No tool call and no completion signal - retrying...`);
          await this.pinchTabService.wait(2000);
          lastAction = 'wait (no tool call)';
        }
      } else {
        // Unexpected response format
        this.logger.error(`   ❌ Unexpected response format: ${JSON.stringify(firstBlock)}`);
        await this.pinchTabService.wait(2000);
        lastAction = 'wait (unexpected response)';
      }
    }

    if (!stepCompleted) {
      this.logger.warn(`Web step reached max iterations (${this.MAX_ITERATIONS}) - forcing completion`);
      // Force completion at max iterations to prevent infinite loops
      stepCompleted = true;
      lastAction = `Forced completion after ${this.MAX_ITERATIONS} iterations`;
    }

    // Check for new downloads
    const downloadsAfter = await this.readState<string[]>(taskId, 'downloaded_files') || [];
    const newDownloads = downloadsAfter.filter(f => !downloadsBefore.includes(f));
    
    if (newDownloads.length > 0) {
      this.logger.log(`Detected ${newDownloads.length} new downloads: ${newDownloads.join(', ')}`);
    }

    // Log to action history
    await this.appendToHistory(taskId, {
      agent: 'WEB',
      action: lastAction,
      result: stepCompleted ? 'success' : 'failure',
      timestamp: new Date().toISOString(),
      details: {
        iterations: iteration,
        step_id: step.id,
        downloads: newDownloads,
      },
    });

    return {
      action: lastAction,
      details: {
        iterations: iteration,
        completed: stepCompleted,
        downloads: newDownloads,
      },
      url: lastSnapshot?.url,
      elements: (lastSnapshot?.elements || []).map((e: any) => e.ref),
      timestamp: new Date().toISOString(),
      tokensUsed: totalTokens,
      cost: totalCost,
    };
  }

  private getSystemPrompt(): string {
    const basePrompt = getAgentSystemPrompt('WEB');
    
    // Inject browser instance metadata into system prompt
    if (this.instanceMetadata) {
      const metadataSection = `

🌐 BROWSER INSTANCE INFORMATION (PRE-INITIALIZED):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ A Chromium browser instance is ALREADY RUNNING and ready for use!

Instance Details:
  • Instance ID: ${this.instanceMetadata.instanceId}
  • Status: ${this.instanceMetadata.status}
  • Mode: ${this.instanceMetadata.mode.toUpperCase()} (${this.instanceMetadata.mode === 'headed' ? 'visible browser window' : 'background'})
  • Health: ${this.instanceMetadata.health || 'active'}
  • Launched At: ${this.instanceMetadata.launchedAt}

Current Tabs:
  • Total Tabs: ${this.instanceMetadata.tabs?.count || 0}
  • Active Tab: ${this.instanceMetadata.tabs?.currentTabId || 'none'}
${this.instanceMetadata.tabs?.list?.length > 0 ? `  • Open Tabs:\n${this.instanceMetadata.tabs.list.map((tab: any) => `    - [${tab.id}] ${tab.title} (${tab.url})`).join('\n')}` : ''}

Available Capabilities:
  ${this.instanceMetadata.capabilities?.map((cap: string) => `✓ ${cap}`).join('\n  ') || '✓ All standard browser actions'}

⚠️  IMPORTANT INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DO NOT call pinchtab_launch_instance - the browser is ALREADY RUNNING
2. Use the existing instance ID: ${this.instanceMetadata.instanceId}
3. You can immediately start using navigation, clicking, typing, etc.
4. If you need a new tab, use pinchtab_navigate with a URL
5. Only launch a NEW instance if explicitly required by the task AND the current instance fails

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
      
      return basePrompt + metadataSection;
    }
    
    return basePrompt;
  }

  private buildDecisionPrompt(
    step: ExecutionStep,
    snapshot: any,
    iteration: number,
    lastAction: string,
    recoveryStrategy?: RecoveryStrategy | null,
    executionPlan?: any,
    taskId?: string,
    perception?: any,
  ): string {
    // Add plan context if available (coordination with other agents)
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
${remainingSteps.some((s: any) => s.type === 'desktop') ? '⚠️  Some future steps require Desktop Agent - you will hand off after completing this step!' : ''}
` : '✅ This is the FINAL step - complete it and you are done!'}

`;
    }

    // Add browser state context with instance metadata
    let browserStateContext = '';
    if (taskId && this.instanceMetadata) {
      const tabId = this.pinchTabService.getTaskTabId(taskId);
      
      browserStateContext = `🌐 BROWSER INSTANCE (PRE-INITIALIZED):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Instance: ${this.instanceMetadata.instanceId} (${this.instanceMetadata.status.toUpperCase()})
✅ Mode: ${this.instanceMetadata.mode.toUpperCase()}
✅ Current Tab: ${tabId || 'none'}
✅ Current URL: ${snapshot.url || 'about:blank'}
✅ Page Title: ${snapshot.title || 'N/A'}

⚠️  CRITICAL: Browser is ALREADY RUNNING - DO NOT launch another instance!
✅ Use existing instance for all actions (navigate, click, type, etc.)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
    }

    // Add perception analysis if available
    let perceptionContext = '';
    if (perception) {
      perceptionContext = `👁️ PAGE PERCEPTION ANALYSIS:
- Active Window: ${perception.active_window || 'Unknown'}
- UI State: ${perception.ui_state || 'Unknown'}
- Clickable Elements: ${perception.clickable_elements?.join(', ') || 'None detected'}
- Errors Visible: ${perception.errors_visible ? 'YES ⚠️' : 'No'}
- Task Info: ${perception.task_relevant_info || 'None'}

`;
    }

    const elementsText = (snapshot.elements || [])
      .map((el: any) => `[${el.ref}] <${el.tag}> ${el.text || ''} ${JSON.stringify(el.attributes || {})}`)
      .join('\n');

    let prompt = `${planContext}${browserStateContext}${perceptionContext}**Step**: ${step.description}
**Success Criteria**: ${step.success_criteria}
**Iteration**: ${iteration}/${this.MAX_ITERATIONS}
**Last Action**: ${lastAction || 'None'}

**Current Page Snapshot** (${(snapshot.elements || []).length} elements):
${elementsText}`;

    if (recoveryStrategy) {
      prompt += `

**Recovery Strategy**: ${recoveryStrategy.strategy}
**Avoid**: ${recoveryStrategy.avoid.join(', ')}
**Approach**: ${recoveryStrategy.approach}`;
    }

    prompt += `

Decide the next action. Respond with JSON only.`;

    return prompt;
  }

  /**
   * Evaluate if success criteria are met based on current page state
   * Uses heuristic matching against page content, URL, and elements
   */
  private evaluateSuccessCriteria(criteria: string, snapshot: any): boolean {
    if (!criteria || !snapshot) return false;

    const criteriaLower = criteria.toLowerCase();
    const htmlLower = (snapshot.html || '').toLowerCase();
    const titleLower = (snapshot.title || '').toLowerCase();
    const urlLower = (snapshot.url || '').toLowerCase();
    const elementTexts = (snapshot.elements || [])
      .map((el: any) => (el.text || '').toLowerCase())
      .join(' ');

    // Extract key terms from success criteria
    const keyTerms = criteriaLower
      .split(/[\s,;.!?]+/)
      .filter((term: string) => term.length > 3 && !['and', 'the', 'for', 'with', 'that', 'this', 'from', 'are', 'page', 'loads', 'displays', 'visible', 'shown'].includes(term));

    // Check if key terms appear in page content
    const matchedTerms = keyTerms.filter((term: string) => 
      htmlLower.includes(term) || 
      titleLower.includes(term) || 
      urlLower.includes(term) ||
      elementTexts.includes(term)
    );

    // Success if at least 60% of key terms are found
    const matchPercentage = keyTerms.length > 0 ? (matchedTerms.length / keyTerms.length) : 0;
    
    this.logger.debug(`Success criteria evaluation:`);
    this.logger.debug(`  Criteria: "${criteria}"`);
    this.logger.debug(`  Key terms: ${keyTerms.join(', ')}`);
    this.logger.debug(`  Matched: ${matchedTerms.join(', ')}`);
    this.logger.debug(`  Match percentage: ${(matchPercentage * 100).toFixed(0)}%`);

    return matchPercentage >= 0.6;
  }

  /**
   * Ensure PinchTab instance is initialized
   * NOTE: With eager initialization, this is now a no-op safety check
   * The instance is already created in initializeBrowserInstance()
   */
  private async ensurePinchTabInstance(taskId: string): Promise<void> {
    const instance = this.pinchTabService.getTaskInstance(taskId);
    if (!instance) {
      this.logger.warn(`⚠️  Instance not found for task ${taskId} - this should not happen with eager initialization`);
      // Fallback: initialize now
      await this.initializeBrowserInstance(taskId);
    }
  }

  /**
   * Execute a tool call from the LLM
   */
  /**
   * Generate rich, actionable feedback for the LLM based on tool execution results
   */
  private generateToolFeedback(toolName: string, input: any, result: any, error?: any): string {
    if (error) {
      // Error feedback with recovery suggestions
      if (error.message?.includes('409')) {
        return `❌ ERROR: Instance name "${input.name}" already exists (409 Conflict).
💡 SOLUTION: Try launching with a different name like "aria-${Math.floor(Math.random() * 1000)}" or use the existing instance.
📋 NEXT STEP: Call pinchtab_list_instances to see active instances, or try a new unique name.`;
      }
      
      if (error.message?.includes('timeout')) {
        return `❌ ERROR: Operation timed out.
💡 SOLUTION: The page may be slow to load. Try waiting longer with pinchtab_wait or check if the URL is correct.
📋 NEXT STEP: Call pinchtab_get_snapshot to see current page state.`;
      }
      
      if (error.message?.includes('element not found') || error.message?.includes('ref')) {
        return `❌ ERROR: Element "${input.ref}" not found on page.
💡 SOLUTION: The element may not be visible or the page hasn't loaded yet.
📋 NEXT STEP: Call pinchtab_get_snapshot to get updated element refs, or wait for page to load with pinchtab_wait.`;
      }
      
      return `❌ ERROR: ${error.message}
💡 SOLUTION: Review the error and try a different approach.
📋 NEXT STEP: Call pinchtab_get_snapshot to assess current state.`;
    }
    
    // Success feedback with context
    switch (toolName) {
      case 'pinchtab_launch_instance':
        return `✅ SUCCESS: Chromium ${input.mode} browser instance launched successfully!
🆔 Instance ID: ${result.id}
🌐 Browser Type: ${input.mode === 'headed' ? 'Visible (headed)' : 'Headless (background)'}
📋 NEXT STEP: Use pinchtab_navigate to go to a URL, or pinchtab_get_snapshot to see current page.`;

      case 'pinchtab_navigate':
        return `✅ SUCCESS: Navigation to ${input.url} initiated successfully!
🌐 Target URL: ${input.url}
⏳ Page is loading...
📋 NEXT STEP: Wait 2-3 seconds with pinchtab_wait, then call pinchtab_get_snapshot to see loaded page.`;

      case 'pinchtab_click':
        return `✅ SUCCESS: Clicked element "${input.ref}" successfully!
🖱️ Element: ${input.ref}
⏳ Action triggered, page may be updating...
📋 NEXT STEP: Wait 1-2 seconds with pinchtab_wait, then call pinchtab_get_snapshot to see result.`;

      case 'pinchtab_type':
        return `✅ SUCCESS: Typed ${input.text.length} characters into element "${input.ref}"!
⌨️ Text entered: "${input.text.substring(0, 50)}${input.text.length > 50 ? '...' : ''}"
📋 NEXT STEP: Press Enter with pinchtab_press if needed, or continue to next element.`;

      case 'pinchtab_press':
        return `✅ SUCCESS: Pressed key "${input.key}" successfully!
⌨️ Key: ${input.key}
📋 NEXT STEP: Wait for page response with pinchtab_wait, then call pinchtab_get_snapshot.`;

      case 'pinchtab_submit':
        return `✅ SUCCESS: Form submitted successfully!
📝 Form element: ${input.ref}
⏳ Form is being processed...
📋 NEXT STEP: Wait 2-3 seconds with pinchtab_wait, then call pinchtab_get_snapshot to see result.`;

      case 'pinchtab_scroll':
        return `✅ SUCCESS: Scrolled ${input.direction} successfully!
📜 Direction: ${input.direction}
📏 Amount: ${input.amount || 3} units
📋 NEXT STEP: Call pinchtab_get_snapshot to see newly visible elements.`;

      case 'pinchtab_wait':
        return `✅ SUCCESS: Waited ${input.ms}ms for page to settle.
⏱️ Duration: ${input.ms}ms
📋 NEXT STEP: Call pinchtab_get_snapshot to see current page state.`;

      case 'pinchtab_get_snapshot':
        const elementCount = result.elements?.length || 0;
        const sampleElements = result.elements?.slice(0, 3).map((e: any) => e.ref).join(', ') || 'none';
        return `✅ SUCCESS: Page snapshot captured!
🌐 URL: ${result.url || 'N/A'}
📄 Title: ${result.title || 'N/A'}
🔢 Interactive Elements: ${elementCount}
${elementCount > 0 ? `📋 Sample Elements: ${sampleElements}` : '⚠️ No interactive elements found'}
💡 TIP: Use element refs (like [1], [2]) to interact with page elements.`;

      case 'pinchtab_list_instances':
        const count = result.length || 0;
        return `✅ SUCCESS: Found ${count} active browser instance${count !== 1 ? 's' : ''}.
${count > 0 ? `🆔 Instances: ${result.slice(0, 3).map((i: any) => i.id).join(', ')}` : ''}
📋 NEXT STEP: ${count > 0 ? 'Use an existing instance or launch a new one.' : 'Launch a new instance with pinchtab_launch_instance.'}`;

      case 'pinchtab_list_tabs':
        const tabCount = result.length || 0;
        return `✅ SUCCESS: Found ${tabCount} open tab${tabCount !== 1 ? 's' : ''}.
📑 Tabs: ${tabCount}
📋 NEXT STEP: Use pinchtab_switch_tab to switch tabs, or continue with current tab.`;

      case 'pinchtab_switch_tab':
        return `✅ SUCCESS: Switched to tab "${input.tabId}" successfully!
📑 Active Tab: ${input.tabId}
📋 NEXT STEP: Call pinchtab_get_snapshot to see the new tab's content.`;

      case 'pinchtab_stop_instance':
        return `✅ SUCCESS: Browser instance stopped successfully!
🛑 Instance: ${input.instanceId}
📋 NEXT STEP: Launch a new instance if needed with pinchtab_launch_instance.`;

      case 'pinchtab_health':
        return `✅ SUCCESS: PinchTab service is healthy!
💚 Status: ${result.status}
${result.instances ? `🆔 Active Instances: ${result.instances}` : ''}
📋 NEXT STEP: Continue with your task.`;

      case 'pinchtab_mark_complete':
        return `✅ STEP COMPLETED: ${input.message}
🎯 Success criteria met - step execution finished.
📋 The orchestrator will now proceed to the next step in the plan.`;

      // Profile management tools
      case 'pinchtab_create_profile':
        return `✅ SUCCESS: Profile created!
📁 Profile ID: ${result.id}
📝 Name: ${result.name || input.name}
📋 NEXT STEP: Use pinchtab_start_with_profile to launch an instance with this profile.`;

      case 'pinchtab_list_profiles':
        return `✅ SUCCESS: Found ${result.length} profiles!
${result.length > 0 ? result.map((p: any, i: number) => `${i + 1}. ${p.name} (ID: ${p.id}, Running: ${p.running || false})`).join('\n') : 'No profiles found.'}
📋 NEXT STEP: Use pinchtab_start_with_profile to start an instance with a profile.`;

      case 'pinchtab_start_with_profile':
        return `✅ SUCCESS: Instance started with persistent profile!
🆔 Instance ID: ${result.id}
📁 Profile: ${input.profileId}
🔒 Session data will persist across restarts
📋 NEXT STEP: Use pinchtab_navigate to go to a URL.`;

      case 'pinchtab_check_profile':
        return `✅ SUCCESS: Profile status checked!
📁 Profile: ${input.profileId}
${result.running ? `✅ Running (Instance ID: ${result.id})` : '❌ Not running'}
📋 NEXT STEP: ${result.running ? 'Use existing instance' : 'Start instance with pinchtab_start_with_profile'}.`;

      case 'pinchtab_get_profile':
        return `✅ SUCCESS: Profile details retrieved!
📁 Name: ${result.name}
🆔 ID: ${result.id}
${result.running ? '✅ Currently running' : '❌ Not running'}
📋 NEXT STEP: Continue with your task.`;

      case 'pinchtab_stop_by_profile':
        return `✅ SUCCESS: Instance stopped (profile preserved)!
📁 Profile: ${input.profileId}
🔒 Session data saved and will persist
📋 NEXT STEP: Restart with pinchtab_start_with_profile to resume session.`;

      // New action tools
      case 'pinchtab_hover':
        return `✅ SUCCESS: Element hovered!
🎯 Element: ${input.ref}
📋 NEXT STEP: Check if tooltip/menu appeared with pinchtab_get_snapshot.`;

      case 'pinchtab_focus':
        return `✅ SUCCESS: Element focused!
🎯 Element: ${input.ref}
📋 NEXT STEP: Type into the focused element with pinchtab_type.`;

      case 'pinchtab_select':
        return `✅ SUCCESS: Dropdown option selected!
🎯 Element: ${input.ref}
📝 Value: ${input.value}
📋 NEXT STEP: Continue with your task.`;

      // New read tools
      case 'pinchtab_get_text':
        return `✅ SUCCESS: Page text extracted!
📄 Length: ${result.length} characters
📋 NEXT STEP: Analyze the text content.`;

      case 'pinchtab_screenshot':
        return `✅ SUCCESS: Screenshot captured!
📸 Screenshot data available
📋 NEXT STEP: Use for visual debugging or analysis.`;

      case 'pinchtab_eval':
        return `✅ SUCCESS: JavaScript executed!
📜 Result: ${JSON.stringify(result).substring(0, 200)}
📋 NEXT STEP: Use the result for debugging or data extraction.`;

      case 'pinchtab_find':
        return `✅ SUCCESS: Elements found!
🔍 Query: ${input.query}
📊 Found: ${result.length} elements
📋 NEXT STEP: Interact with found elements.`;

      default:
        return `✅ SUCCESS: Tool "${toolName}" executed successfully.
📋 NEXT STEP: Continue with your task.`;
    }
  }

  private async executeToolCall(toolCall: any, taskId: string): Promise<string> {
    const { name, input } = toolCall;
    
    this.logger.log(`🌐 [WebAgent] Executing tool: ${name}`);
    
    // Browser log: Tool call
    this.browserLogger.logToolCall(taskId, 'WEB_AGENT', {
      name,
      input,
    });
    
    const toolStartTime = Date.now();
    
    // Log input safely - avoid logging large data
    const inputPreview = { ...input };
    if (inputPreview.image && typeof inputPreview.image === 'string' && inputPreview.image.length > 100) {
      inputPreview.image = `[base64 image: ${(inputPreview.image.length / 1024).toFixed(1)}KB]`;
    }
    this.logger.debug(`   Tool input: ${JSON.stringify(inputPreview)}`);
    
    try {
      let result: any;
      
      switch (name) {
        case 'pinchtab_health':
          this.logger.log(`   → Checking PinchTab health`);
          result = await this.pinchTabService.getHealth();
          this.logger.log(`   ✓ Tool Result: Health status = ${result.status}`);
          if (result.instances) {
            this.logger.log(`      Active instances: ${result.instances}`);
          }
          break;

        case 'pinchtab_launch_instance':
          // GUARD: Prevent launching multiple instances for the same task
          const existingInstance = this.pinchTabService.getTaskInstance(taskId);
          if (existingInstance) {
            this.logger.warn(`   ⚠️  Instance already exists for task ${taskId}: ${existingInstance.id}`);
            result = {
              error: `Browser instance already exists (${existingInstance.id}). Use existing instance instead.`,
              suggestion: 'Use pinchtab_navigate to go to a URL, or pinchtab_get_snapshot to see current page',
              instanceId: existingInstance.id
            };
            this.logger.log(`   ✓ Tool Result: ${JSON.stringify(result)}`);
            break;
          }
          
          // Launch the requested instance directly (do NOT call ensurePinchTabInstance first)
          this.logger.log(`   → Launching instance: ${input.name} (${input.mode})`);
          result = await this.pinchTabService.launchInstance(input.name, input.mode);
          
          // CRITICAL FIX: Register the instance with taskId so it can be retrieved in next iteration
          this.pinchTabService.registerTaskInstance(taskId, result);
          this.logger.log(`   ✓ Tool Result: Instance launched with ID = ${result.id}`);
          this.logger.log(`   ✓ Instance registered for task ${taskId}`);
          break;

        case 'pinchtab_list_instances':
          this.logger.log(`   → Listing instances`);
          result = await this.pinchTabService.listInstances();
          this.logger.log(`   ✓ Tool Result: Found ${result.length} instances`);
          if (result.length > 0) {
            result.forEach((inst: any, idx: number) => {
              this.logger.log(`      ${idx + 1}. ID: ${inst.id}, Status: ${inst.status || 'active'}`);
            });
          }
          break;

        case 'pinchtab_stop_instance':
          this.logger.log(`   → Stopping instance: ${input.instanceId}`);
          result = await this.pinchTabService.stopInstance(input.instanceId);
          this.logger.log(`   ✓ Tool Result: Instance stopped successfully`);
          break;

        case 'pinchtab_list_tabs':
          // Ensure instance is initialized before listing tabs
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Listing tabs for instance: ${input.instanceId}`);
          result = await this.pinchTabService.listTabs(input.instanceId);
          this.logger.log(`   ✓ Tool Result: Found ${result.length} tabs`);
          if (result.length > 0) {
            result.slice(0, 5).forEach((tab: any, idx: number) => {
              this.logger.log(`      ${idx + 1}. ${tab.title || 'Untitled'} - ${tab.url?.substring(0, 60) || 'about:blank'}`);
            });
            if (result.length > 5) {
              this.logger.log(`      ... and ${result.length - 5} more tabs`);
            }
          }
          break;

        case 'pinchtab_switch_tab':
          this.logger.log(`   → Switching to tab: ${input.tabId}`);
          result = await this.pinchTabService.switchTab(input.tabId);
          this.logger.log(`   ✓ Tool Result: Tab switched successfully`);
          break;

        case 'pinchtab_navigate':
          // Ensure instance is initialized before navigating
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Navigating to: ${input.url}`);
          result = await this.pinchTabService.navigate(input.url, undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Navigation initiated to ${input.url}`);
          break;

        case 'pinchtab_click':
          // Ensure instance is initialized before clicking
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Clicking element: ${input.ref}`);
          result = await this.pinchTabService.click(input.ref, undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Element clicked successfully`);
          break;

        case 'pinchtab_type':
          // Ensure instance is initialized before typing
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Typing into element ${input.ref}: ${input.text.substring(0, 50)}...`);
          result = await this.pinchTabService.type(input.ref, input.text, undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Text typed successfully (${input.text.length} characters)`);
          break;

        case 'pinchtab_press':
          // Ensure instance is initialized before pressing key
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Pressing key: ${input.key}`);
          result = await this.pinchTabService.press(input.key, undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Key pressed successfully`);
          break;

        case 'pinchtab_fill':
          // Ensure instance is initialized before filling
          await this.ensurePinchTabInstance(taskId);
          this.logger.warn(`   ⚠️  Using deprecated pinchtab_fill (use pinchtab_type instead)`);
          this.logger.log(`   → Filling element ${input.ref} with: ${input.value.substring(0, 50)}...`);
          result = await this.pinchTabService.fill(input.ref, input.value, undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Element filled successfully`);
          break;

        case 'pinchtab_submit':
          // Ensure instance is initialized before submitting
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Submitting form: ${input.ref}`);
          result = await this.pinchTabService.submit(input.ref, undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Form submitted successfully`);
          break;

        case 'pinchtab_scroll':
          // Ensure instance is initialized before scrolling
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Scrolling: ${input.direction} (amount: ${input.amount || 3})`);
          result = await this.pinchTabService.scroll(input.direction, input.amount || 3, undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Page scrolled ${input.direction}`);
          break;

        case 'pinchtab_wait':
          const waitMs = Math.min(input.ms || 2000, 5000); // Cap at 5s
          this.logger.log(`   → Waiting: ${waitMs}ms`);
          result = await this.pinchTabService.wait(waitMs);
          this.logger.log(`   ✓ Tool Result: Wait completed`);
          break;

        case 'pinchtab_get_snapshot':
          // Ensure instance is initialized before getting snapshot
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Getting page snapshot`);
          result = await this.pinchTabService.snapshot('interactive', undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Snapshot captured`);
          this.logger.log(`      URL: ${result.url || 'N/A'}`);
          this.logger.log(`      Title: ${result.title || 'N/A'}`);
          this.logger.log(`      Elements: ${result.elements?.length || 0} interactive elements`);
          if (result.elements && result.elements.length > 0) {
            this.logger.log(`      Sample elements: ${result.elements.slice(0, 3).map((e: any) => e.ref).join(', ')}`);
          }
          break;

        case 'pinchtab_mark_complete':
          this.logger.log(`   → Marking step as complete: ${input.message}`);
          result = { success: true, message: input.message, completed: true };
          this.logger.log(`   ✓ Tool Result: Step marked as complete`);
          break;

        // ============================================================================
        // PHASE 1: PROFILE MANAGEMENT TOOLS
        // ============================================================================

        case 'pinchtab_create_profile':
          this.logger.log(`   → Creating profile: ${input.name}`);
          result = await this.pinchTabService.createProfile(input.name, input.description);
          this.logger.log(`   ✓ Tool Result: Profile created with ID = ${result.id}`);
          break;

        case 'pinchtab_list_profiles':
          this.logger.log(`   → Listing profiles`);
          result = await this.pinchTabService.listProfiles();
          this.logger.log(`   ✓ Tool Result: Found ${result.length} profiles`);
          if (result.length > 0) {
            result.forEach((profile: any, idx: number) => {
              this.logger.log(`      ${idx + 1}. ${profile.name} (ID: ${profile.id}, Running: ${profile.running || false})`);
            });
          }
          break;

        case 'pinchtab_start_with_profile':
          this.logger.log(`   → Starting instance with profile: ${input.profileId} (${input.mode})`);
          result = await this.pinchTabService.startInstanceWithProfile(input.profileId, input.mode);
          
          // Register the instance with taskId
          this.pinchTabService.registerTaskInstance(taskId, result);
          this.logger.log(`   ✓ Tool Result: Instance started with ID = ${result.id}`);
          this.logger.log(`   ✓ Instance registered for task ${taskId}`);
          break;

        case 'pinchtab_check_profile':
          this.logger.log(`   → Checking profile instance: ${input.profileId}`);
          result = await this.pinchTabService.getProfileInstance(input.profileId);
          this.logger.log(`   ✓ Tool Result: Running = ${result.running}, ID = ${result.id || 'N/A'}`);
          break;

        case 'pinchtab_get_profile':
          this.logger.log(`   → Getting profile: ${input.idOrName}`);
          result = await this.pinchTabService.getProfile(input.idOrName);
          this.logger.log(`   ✓ Tool Result: Profile found - ${result.name} (ID: ${result.id})`);
          break;

        case 'pinchtab_stop_by_profile':
          this.logger.log(`   → Stopping instance by profile: ${input.profileId}`);
          result = await this.pinchTabService.stopInstanceByProfile(input.profileId);
          this.logger.log(`   ✓ Tool Result: Instance stopped for profile ${input.profileId}`);
          break;

        // ============================================================================
        // PHASE 2: MISSING ACTIONS (hover, focus, select)
        // ============================================================================

        case 'pinchtab_hover':
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Hovering over element: ${input.ref}`);
          result = await this.pinchTabService.hover(input.ref, undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Element hovered successfully`);
          break;

        case 'pinchtab_focus':
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Focusing element: ${input.ref}`);
          result = await this.pinchTabService.focus(input.ref, undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Element focused successfully`);
          break;

        case 'pinchtab_select':
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Selecting option in ${input.ref}: ${input.value}`);
          result = await this.pinchTabService.select(input.ref, input.value, undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Option selected successfully`);
          break;

        // ============================================================================
        // PHASE 2: MISSING READ ENDPOINTS
        // ============================================================================

        case 'pinchtab_get_text':
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Getting page text`);
          result = await this.pinchTabService.getPageText(undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Page text extracted (${result.length} characters)`);
          break;

        case 'pinchtab_screenshot':
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Taking screenshot`);
          result = await this.pinchTabService.takeScreenshot(undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Screenshot captured`);
          break;

        case 'pinchtab_eval':
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Evaluating JavaScript: ${input.script.substring(0, 100)}...`);
          result = await this.pinchTabService.evalJavaScript(input.script, undefined, taskId);
          this.logger.log(`   ✓ Tool Result: JavaScript executed, result = ${JSON.stringify(result).substring(0, 200)}`);
          break;

        case 'pinchtab_find':
          await this.ensurePinchTabInstance(taskId);
          this.logger.log(`   → Finding elements: ${input.query}`);
          result = await this.pinchTabService.findElements(input.query, undefined, taskId);
          this.logger.log(`   ✓ Tool Result: Found ${result.length} elements`);
          break;

        default:
          this.logger.warn(`   ⚠️  Unknown tool: ${name}`);
      }
      
      this.logger.log(`✅ [WebAgent] Tool execution completed: ${name}`);
      
      // Generate rich feedback for the LLM
      const feedback = this.generateToolFeedback(name, input, result);
      this.logger.log(`📝 Feedback to LLM:\n${feedback}`);
      
      // Browser log: Tool result (success)
      this.browserLogger.logToolResult(taskId, 'WEB_AGENT', {
        toolName: name,
        success: true,
        output: result,
        duration: Date.now() - toolStartTime,
      });
      
      return feedback;
    } catch (error) {
      this.logger.error(`❌ [WebAgent] Tool execution failed: ${error.message}`);
      
      // Generate error feedback with recovery suggestions
      const errorFeedback = this.generateToolFeedback(name, input, null, error);
      this.logger.log(`📝 Error Feedback to LLM:\n${errorFeedback}`);
      
      // Browser log: Tool result (failure)
      this.browserLogger.logToolResult(taskId, 'WEB_AGENT', {
        toolName: name,
        success: false,
        error: error.message,
        duration: Date.now() - toolStartTime,
      });
      
      return errorFeedback;
    }
  }

  private calculateCost(tokens: number): number {
    // Groq GPT-OSS 120B pricing (approximate)
    // Input: $0.10 per 1M tokens, Output: $0.10 per 1M tokens
    const costPerToken = 0.10 / 1_000_000;
    return tokens * costPerToken;
  }

  /**
   * Capture a screenshot of the current browser tab
   * Returns base64 encoded PNG image
   */
  private async captureScreenshot(taskId: string): Promise<string | null> {
    try {
      const tabId = this.pinchTabService.getTaskTabId(taskId);
      if (!tabId) {
        this.logger.warn('No tab available for screenshot');
        return null;
      }

      // PinchTab screenshot endpoint - use environment variable for Docker compatibility
      const pinchtabBaseUrl = process.env.PINCHTAB_BASE_URL || 'http://localhost:9867';
      const response = await fetch(`${pinchtabBaseUrl}/tabs/${tabId}/screenshot`, {
        method: 'GET',
      });

      if (!response.ok) {
        this.logger.warn(`Screenshot failed: ${response.statusText}`);
        return null;
      }

      const data = await response.json() as { image?: string };
      if (!data.image) {
        this.logger.warn('No image data in screenshot response');
        return null;
      }

      return data.image; // Base64 encoded
    } catch (error) {
      this.logger.warn(`Screenshot capture failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get perception analysis of current page
   * Uses PerceptionAgent to analyze browser screenshot
   */
  private async getPagePerception(taskId: string): Promise<any> {
    try {
      // Capture screenshot
      const screenshot = await this.captureScreenshot(taskId);
      if (!screenshot) {
        this.logger.debug('Skipping perception - no screenshot available');
        return null;
      }

      // Run perception agent
      const perceptionResult = await this.perceptionAgent.run(screenshot, taskId);

      if (!perceptionResult.success) {
        this.logger.warn(`Perception analysis failed: ${perceptionResult.error}`);
        return null;
      }

      this.logger.log(`👁️ [WebAgent] Perception analysis:`);
      this.logger.log(`   Active window: ${perceptionResult.data?.active_window}`);
      this.logger.log(`   UI state: ${perceptionResult.data?.ui_state}`);
      this.logger.log(`   Clickable elements: ${perceptionResult.data?.clickable_elements?.length || 0}`);
      this.logger.log(`   Errors visible: ${perceptionResult.data?.errors_visible}`);

      return perceptionResult.data;
    } catch (error) {
      this.logger.warn(`Failed to get page perception: ${error.message}`);
      return null;
    }
  }
}
