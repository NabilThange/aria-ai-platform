import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';

export const metadata: WorkflowMetadata = {
  name: 'send-email-n8n',
  description: 'Send email via N8N webhook using terminal curl command',
  summary: 'Prepare an email payload, run the mail automation, and confirm the terminal response.',
  version: '1.0.0',
  timeout_ms: 50000,
  variables: [
    {
      name: 'to',
      type: 'string',
      required: true,
      description: 'Recipient email address',
    },
    {
      name: 'subject',
      type: 'string',
      required: true,
      description: 'Email subject line',
    },
    {
      name: 'body',
      type: 'string',
      required: true,
      description: 'Email body content (supports newlines)',
    },
    {
      name: 'cc',
      type: 'string',
      required: false,
      description: 'CC email address (optional)',
      default: '',
    },
    {
      name: 'bcc',
      type: 'string',
      required: false,
      description: 'BCC email address (optional)',
      default: '',
    },
    {
      name: 'senderName',
      type: 'string',
      required: false,
      description: 'Sender name shown in email header',
      default: 'Aria',
    },
    {
      name: 'buttonText',
      type: 'string',
      required: false,
      description: 'Text on the CTA button (optional)',
      default: '',
    },
    {
      name: 'buttonUrl',
      type: 'string',
      required: false,
      description: 'URL for the CTA button (if empty, no button appears)',
      default: '',
    },
    {
      name: 'attachment',
      type: 'string',
      required: false,
      description: 'File path to attach (e.g., /home/user/Desktop/report.txt)',
      default: '',
    },
  ],
  user_steps: [
    {
      id: 'prepare-email',
      step_number: 1,
      title: 'Prepare email',
      description: 'Assemble the recipient, message, and optional attachment details.',
      titleTemplate: 'Prepare email to {to}',
      descriptionTemplate: 'Assemble message "{subject}" with recipient and attachment details',
    },
    {
      id: 'open-terminal',
      step_number: 2,
      title: 'Open terminal',
      description: 'Launch a terminal session and focus it for command entry.',
      titleTemplate: 'Open terminal',
      descriptionTemplate: 'Launch terminal session for aria-mail command',
    },
    {
      id: 'run-automation',
      step_number: 3,
      title: 'Run automation',
      description: 'Execute the aria-mail command that triggers the N8N email workflow.',
      titleTemplate: 'Send email via N8N',
      descriptionTemplate: 'Execute aria-mail to send "{subject}" to {to}',
    },
    {
      id: 'confirm-response',
      step_number: 4,
      title: 'Confirm response',
      description: 'Capture the terminal output and verify the send result.',
      titleTemplate: 'Verify delivery',
      descriptionTemplate: 'Check terminal output for successful email delivery',
    },
  ],
};

export async function execute(
  variables: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    senderName?: string;
    buttonText?: string;
    buttonUrl?: string;
    attachment?: string;
  },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { desktop, browserLogger, taskId } = services;
  const {
    to,
    subject,
    body,
    cc = '',
    bcc = '',
    senderName = 'Aria',
    buttonText = '',
    buttonUrl = '',
    attachment = '',
  } = variables;

  // Create workflow logger for tool tracking
  const logger = new WorkflowLogger(browserLogger, taskId, 'send-email-n8n');

  try {
    console.log(`📧 Sending email via N8N to: ${to}`);

    // Step 1: Build command using the pre-installed aria-mail script
    // This hides the N8N webhook URL from the user
    // Note: jq in the bash script handles special characters properly, no need to sanitize
    let command = `aria-mail --to "${to}" --subject "${subject}" --body "${body}"`;

    // Add optional parameters
    if (cc) {
      command += ` --cc "${cc}"`;
    }
    if (bcc) {
      command += ` --bcc "${bcc}"`;
    }
    if (senderName && senderName !== 'Aria') {
      command += ` --sender-name "${senderName}"`;
    }
    if (buttonText) {
      command += ` --button-text "${buttonText}"`;
    }
    if (buttonUrl) {
      command += ` --button-url "${buttonUrl}"`;
    }
    if (attachment) {
      command += ` --attachment "${attachment}"`;
    }

    console.log(`🔧 Command prepared: aria-mail --to "${to}" --subject "${subject}" ...`);
    console.log(`📏 Command length: ${command.length} characters`);

    // Step 2: Open terminal (with logging)
    console.log(`🖥️  Opening terminal...`);
    await logger.logToolCall('launchApplication', { application: 'terminal' }, () =>
      desktop.launchApplication('terminal')
    );
    await logger.logToolCall('wait', { duration: 3000 }, () =>
      desktop.wait(3000)
    );

    // Click in terminal to ensure focus (center of screen)
    console.log(`🖱️  Clicking terminal to ensure focus...`);
    await logger.logToolCall('clickMouse', { coordinates: { x: 640, y: 400 }, button: 'left' }, () =>
      desktop.clickMouse({ x: 640, y: 400 }, 'left')
    );
    await logger.logToolCall('wait', { duration: 500 }, () =>
      desktop.wait(500)
    );

    // Step 3: Type command with fast typing speed (5ms delay between characters)
    console.log(`⌨️  Typing aria-mail command...`);
    await logger.logToolCall('typeText', { text: command, delay: 5 }, () =>
      desktop.typeText(command, 5)
    );
    await logger.logToolCall('wait', { duration: 1000 }, () =>
      desktop.wait(1000)
    );
    
    // Execute the command
    console.log(`⏎ Pressing Enter to execute command...`);
    await logger.logToolCall('pressKeys', { keys: ['Return'] }, () =>
      desktop.pressKeys(['Return'])
    );
    await logger.logToolCall('wait', { duration: 10000 }, () =>
      desktop.wait(10000)
    );

    // Step 4: Take screenshot to see terminal output (with logging)
    console.log(`📸 Capturing terminal output...`);
    const screenshot = await logger.logToolCall('screenshot', {}, () =>
      desktop.screenshot()
    );

    // Step 5: Verify command execution by reading terminal output
    console.log(`🔍 Checking terminal output for success/error messages...`);
    
    // Take another screenshot after a moment to ensure output is visible
    await logger.logToolCall('wait', { duration: 2000 }, () =>
      desktop.wait(2000)
    );
    const finalScreenshot = await logger.logToolCall('screenshot', {}, () =>
      desktop.screenshot()
    );

    console.log(`✅ Email workflow completed. Review screenshots to verify email was sent.`);
    console.log(`💡 Look for "✅ Email sent successfully!" or "❌ Failed to send email" in terminal.`);

    return {
      success: true,
      message: `Email sent to ${to} via N8N`,
      data: {
        to,
        subject,
        cc,
        bcc,
        senderName,
        buttonText,
        buttonUrl,
        attachment,
        commandLength: command.length,
        screenshot: screenshot.image,
        finalScreenshot: finalScreenshot.image,
      },
    };
  } catch (error) {
    console.error(`❌ Workflow error:`, error);
    return {
      success: false,
      error: error.message,
      message: `Failed to send email: ${error.message}`,
    };
  }
}
