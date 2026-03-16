import { Logger } from '@nestjs/common';
import { PinchTabService, PinchTabSnapshot } from '../services/pinchtab.service';
import { MessageContentType, ToolResultContentBlock } from '@bytebot/shared';

/**
 * Handle PinchTab-specific tool use blocks
 */
export async function handlePinchTabToolUse(
  toolName: string,
  input: Record<string, any>,
  pinchTabService: PinchTabService,
  logger: Logger,
): Promise<ToolResultContentBlock | null> {
  try {
    switch (toolName) {
      case 'pinchtab_navigate':
        return await handleNavigate(input as { url: string }, pinchTabService, logger);
      case 'pinchtab_snapshot':
        return await handleSnapshot(input as { filter?: 'all' | 'interactive' }, pinchTabService, logger);
      case 'pinchtab_click':
        return await handleClick(input as { ref: string }, pinchTabService, logger);
      case 'pinchtab_fill':
        return await handleFill(input as { ref: string; value: string }, pinchTabService, logger);
      case 'pinchtab_submit':
        return await handleSubmit(input as { ref: string }, pinchTabService, logger);
      case 'pinchtab_scroll':
        return await handleScroll(input as { direction: 'up' | 'down'; amount?: number }, pinchTabService, logger);
      case 'pinchtab_wait':
        return await handleWait(input as { ms: number }, pinchTabService, logger);
      default:
        return null;
    }
  } catch (error) {
    logger.error(`PinchTab tool error: ${error.message}`, error.stack);
    return {
      type: MessageContentType.ToolResult,
      tool_use_id: '',
      content: [
        {
          type: MessageContentType.Text,
          text: `Error executing ${toolName}: ${error.message}`,
        },
      ],
      is_error: true,
    };
  }
}

async function handleNavigate(
  input: { url: string },
  pinchTabService: PinchTabService,
  logger: Logger,
): Promise<ToolResultContentBlock> {
  logger.debug(`PinchTab: Navigating to ${input.url}`);

  // Initialize instance if not already created
  if (!pinchTabService.getCurrentInstance()) {
    logger.debug('PinchTab: Initializing new browser instance');
    await pinchTabService.initInstance('default');
  }

  const tabId = await pinchTabService.navigate(input.url);

  // Wait for page to load
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Get snapshot after navigation
  const snapshot = await pinchTabService.snapshot('interactive', tabId);

  return {
    type: MessageContentType.ToolResult,
    tool_use_id: '',
    content: [
      {
        type: MessageContentType.Text,
        text: `Navigated to ${input.url}. Page loaded with ${snapshot.elements.length} interactive elements.`,
      },
    ],
  };
}

async function handleSnapshot(
  input: { filter?: 'all' | 'interactive' },
  pinchTabService: PinchTabService,
  logger: Logger,
): Promise<ToolResultContentBlock> {
  const filter = input.filter || 'interactive';
  logger.debug(`PinchTab: Getting snapshot with filter: ${filter}`);

  const snapshot = await pinchTabService.snapshot(filter);

  // Format snapshot for LLM consumption
  const formattedSnapshot = formatSnapshot(snapshot);

  return {
    type: MessageContentType.ToolResult,
    tool_use_id: '',
    content: [
      {
        type: MessageContentType.Text,
        text: formattedSnapshot,
      },
    ],
  };
}

async function handleClick(
  input: { ref: string },
  pinchTabService: PinchTabService,
  logger: Logger,
): Promise<ToolResultContentBlock> {
  logger.debug(`PinchTab: Clicking element ${input.ref}`);

  await pinchTabService.click(input.ref);

  // Wait for action to complete
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Get updated snapshot
  const snapshot = await pinchTabService.snapshot('interactive');

  return {
    type: MessageContentType.ToolResult,
    tool_use_id: '',
    content: [
      {
        type: MessageContentType.Text,
        text: `Clicked element ${input.ref}. Page updated with ${snapshot.elements.length} interactive elements.`,
      },
    ],
  };
}

async function handleFill(
  input: { ref: string; value: string },
  pinchTabService: PinchTabService,
  logger: Logger,
): Promise<ToolResultContentBlock> {
  logger.debug(`PinchTab: Filling element ${input.ref} with value`);

  await pinchTabService.fill(input.ref, input.value);

  // Wait for input to settle
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    type: MessageContentType.ToolResult,
    tool_use_id: '',
    content: [
      {
        type: MessageContentType.Text,
        text: `Filled element ${input.ref} with provided value.`,
      },
    ],
  };
}

async function handleSubmit(
  input: { ref: string },
  pinchTabService: PinchTabService,
  logger: Logger,
): Promise<ToolResultContentBlock> {
  logger.debug(`PinchTab: Submitting form ${input.ref}`);

  await pinchTabService.submit(input.ref);

  // Wait for form submission
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Get updated snapshot
  const snapshot = await pinchTabService.snapshot('interactive');

  return {
    type: MessageContentType.ToolResult,
    tool_use_id: '',
    content: [
      {
        type: MessageContentType.Text,
        text: `Submitted form ${input.ref}. Page updated.`,
      },
    ],
  };
}

async function handleScroll(
  input: { direction: 'up' | 'down'; amount?: number },
  pinchTabService: PinchTabService,
  logger: Logger,
): Promise<ToolResultContentBlock> {
  const amount = input.amount || 3;
  logger.debug(`PinchTab: Scrolling ${input.direction} by ${amount}`);

  await pinchTabService.scroll(input.direction, amount);

  // Wait for scroll to complete
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Get updated snapshot
  const snapshot = await pinchTabService.snapshot('interactive');

  return {
    type: MessageContentType.ToolResult,
    tool_use_id: '',
    content: [
      {
        type: MessageContentType.Text,
        text: `Scrolled ${input.direction} by ${amount}. Page now shows ${snapshot.elements.length} interactive elements.`,
      },
    ],
  };
}

async function handleWait(
  input: { ms: number },
  pinchTabService: PinchTabService,
  logger: Logger,
): Promise<ToolResultContentBlock> {
  logger.debug(`PinchTab: Waiting ${input.ms}ms`);

  await pinchTabService.wait(input.ms);

  return {
    type: MessageContentType.ToolResult,
    tool_use_id: '',
    content: [
      {
        type: MessageContentType.Text,
        text: `Waited ${input.ms}ms.`,
      },
    ],
  };
}

/**
 * Format PinchTab snapshot for LLM consumption
 */
function formatSnapshot(snapshot: PinchTabSnapshot): string {
  const elementsList = snapshot.elements
    .map(
      (el) =>
        `[${el.ref}] <${el.tag}> ${el.text ? `"${el.text}"` : ''} ${
          el.attributes ? JSON.stringify(el.attributes) : ''
        }`,
    )
    .join('\n');

  return `Page Snapshot (${snapshot.elements.length} interactive elements):

${elementsList}

Use element references (e.g., "e5") to interact with the page. Available actions:
- pinchtab_click: Click an element by ref
- pinchtab_fill: Fill a form field with text
- pinchtab_submit: Submit a form
- pinchtab_scroll: Scroll up or down
- pinchtab_snapshot: Get updated page snapshot`;
}
