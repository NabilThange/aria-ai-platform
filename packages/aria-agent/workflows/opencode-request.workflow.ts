import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';
import { 
  waitForWebhookCompletion, 
  generateWebhookInstructions,
  WebhookCompletionResult 
} from './helpers/webhook-completion.helper';

/**
 * Helper to send conversational status messages to the frontend
 * Uses the WorkflowLogger.think() method for natural language updates
 */
async function logMessage(logger: WorkflowLogger, message: string): Promise<void> {
  await logger.think(message);
}

export const metadata: WorkflowMetadata = {
  name: 'opencode-request',
  description: 'Universal coding assistant - creates websites, web apps, PowerPoint presentations (.pptx), PDF documents, Word files (.docx), Excel spreadsheets (.xlsx), Python scripts, Node.js apps, and more. Just describe what you want in natural language and OpenCode builds it using the appropriate libraries (pptxgenjs, reportlab, openpyxl, python-docx, etc.)',
  summary: 'Turn a natural-language request into generated code, documents, or other build artifacts.',
  version: '3.0.0', // Upgraded to webhook-based completion
  timeout_ms: 600000, // 10 minutes (increased to allow OpenCode to work without pressure)
  variables: [
    {
      name: 'userRequest',
      type: 'string',
      required: true,
      description: 'What you want OpenCode to build - websites, presentations, documents, spreadsheets, scripts, or any coding task. Examples: "Create a sales presentation with 5 slides", "Build a PDF report with charts", "Make an Excel budget tracker", "Create a landing page with contact form"',
    },
    {
      name: 'documentType',
      type: 'string',
      required: false,
      description: 'Explicit document type: "ppt", "pdf", "docx", "txt", "html". Used to ensure correct file format is created.',
    },
    {
      name: 'researchFilePath',
      type: 'string',
      required: false,
      description: 'Optional path to research summary file (.txt) that should be attached to emails. Used when OpenCode is called from research workflows.',
    },
    {
      name: 'emailRecipients',
      type: 'string',
      required: false,
      description: 'Optional comma-separated list of email addresses to send results to. Example: "user1@example.com, user2@example.com". If not provided, OpenCode will use example addresses.',
    },
  ],
  user_steps: [
    {
      id: 'interpret-request',
      title: 'Interpret request',
      description: 'Analyze the request and determine the correct output format.',
    },
    {
      id: 'prepare-context',
      title: 'Prepare context',
      description: 'Gather any supporting files or delivery details needed for generation.',
    },
    {
      id: 'generate-output',
      title: 'Generate output',
      description: 'Use OpenCode to create the requested code, document, or asset.',
    },
    {
      id: 'deliver-output',
      title: 'Deliver output',
      description: 'Save the output and optionally send it to the requested recipients.',
    },
  ],
};

/**
 * Call Groq AI to analyze screenshots and improve prompts
 */
async function callGroqAI(
  systemPrompt: string,
  userContent: string,
  imageBase64?: string,
  logger?: WorkflowLogger,
  toolName?: string,
): Promise<string> {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  const bare = process.env.GROQ_API_KEY;
  if (bare && !keys.includes(bare)) keys.push(bare);
  if (keys.length === 0) throw new Error('No GROQ_API_KEY found in environment.');

  let lastError = new Error('Unknown Groq error');
  for (const apiKey of keys) {
    try {
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add user message with optional image
      if (imageBase64) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: userContent },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
          ],
        });
      } else {
        messages.push({ role: 'user', content: userContent });
      }

      const model = imageBase64 ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';

      // Log AI call if logger provided
      const aiCallPromise = async () => {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.3,
            max_tokens: 2048,
          }),
        });

        const raw = await res.text();
        const data = raw ? JSON.parse(raw) : {};

        if (res.status === 429 || res.status === 402) {
          console.log(`⚠️ Key ...${apiKey.slice(-6)} rate limited, trying next…`);
          lastError = new Error(`Rate limited: ${data?.error?.message || res.status}`);
          throw lastError;
        }

        if (!res.ok) {
          console.error(`❌ Groq API error: ${res.status} - ${raw}`);
          throw new Error(`Groq ${res.status}: ${data?.error?.message || raw}`);
        }

        return data.choices[0].message.content as string;
      };

      if (logger && toolName) {
        return await logger.logToolCall(
          toolName,
          {
            model,
            hasImage: !!imageBase64,
            promptLength: userContent.length,
          },
          aiCallPromise,
        );
      } else {
        return await aiCallPromise();
      }
    } catch (err: any) {
      lastError = err;
      console.log(`⚠️ Groq key error: ${err.message}`);
    }
  }

  throw new Error(`All Groq keys exhausted. Last: ${lastError.message}`);
}

/**
 * Wait for OpenCode to launch by checking screenshots with AI vision
 * Returns true if OpenCode is detected, false if timeout
 */
async function waitForOpenCodeLaunch(
  desktop: any,
  logger: WorkflowLogger,
  maxAttempts: number = 10,
  delayMs: number = 5000, // Increased from 3000ms to 5000ms
): Promise<boolean> {
  console.log(`⏳ Waiting for OpenCode to launch (max ${maxAttempts} attempts, ${delayMs}ms between checks)...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔍 Attempt ${attempt}/${maxAttempts}: Checking if OpenCode has launched...`);

    // Wait before taking screenshot
    await logger.logToolCall('wait', { duration: delayMs }, () => desktop.wait(delayMs));

    // Take screenshot
    const screenshotRaw = await logger.logToolCall('screenshot', {}, () => desktop.screenshot());
    
    // Debug: log what we got
    console.log(`🔍 Screenshot response type: ${typeof screenshotRaw}`);
    console.log(`🔍 Screenshot response keys: ${screenshotRaw ? Object.keys(screenshotRaw).join(', ') : 'null'}`);
    
    // The VNC API returns {image: "base64...", width: number, height: number}
    const screenshot = screenshotRaw as { image: string; width: number; height: number };

    // Verify screenshot was captured
    if (!screenshot || !screenshot.image) {
      console.log(`❌ Screenshot capture failed - no image data`);
      console.log(`   Raw response: ${JSON.stringify(screenshotRaw).slice(0, 200)}`);
      continue;
    }

    const imageSize = screenshot.image.length;
    console.log(`📸 Screenshot captured: ${imageSize} bytes (${screenshot.width}x${screenshot.height})`);

    // Ask AI to analyze the screenshot - describe first, then verdict
    const analysis = await callGroqAI(
      `You are a visual recognition assistant analyzing a terminal screenshot to detect if OpenCode CLI has launched.

INSTRUCTIONS:
1. First, describe what you see in 1-2 sentences
2. Then, check if OpenCode is ready by looking for these signs:
   - An input box or text field (often with placeholder text)
   - Mode selector options or UI elements
   - Keyboard shortcut hints at the bottom
   - The word "OpenCode" or "opencode" visible in the UI
   - NO plain bash prompt ($ or user@hostname)

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
OBSERVATION: [What you see in the screenshot]
VERDICT: [YES/NO/ERROR]

VERDICT meanings:
- YES = OpenCode UI is fully visible with input field ready
- NO = Still loading, or only bash prompt visible, or screen mostly empty
- ERROR = "command not found" or error messages visible

Be descriptive in OBSERVATION but decisive in VERDICT.`,
      `Describe what you see in this terminal screenshot, then determine if OpenCode has fully launched.`,
      screenshot.image,
      logger,
      'analyzeOpenCodeLaunch',
    );

    console.log(`🤖 AI analysis (attempt ${attempt}):`);
    console.log(`   ${analysis.trim()}`);

    // Extract verdict from response
    const verdictMatch = analysis.match(/VERDICT:\s*(YES|NO|ERROR)/i);
    const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : 'NO';

    console.log(`📊 Final verdict: ${verdict}`);

    // Check for errors
    if (verdict === 'ERROR') {
      console.log(`❌ OpenCode command failed or not found!`);
      return false;
    }

    // Check if AI detected OpenCode is FULLY ready
    if (verdict === 'YES') {
      console.log(`✅ OpenCode detected and ready on attempt ${attempt}!`);
      await logger.think(`✅ I can see OpenCode is ready now!`);
      return true;
    }

    console.log(`⏳ OpenCode not ready yet (still loading or not launched), waiting...`);
    if (attempt === 1) {
      await logger.think(`⏳ Still loading... give it a moment`);
    } else if (attempt === 5) {
      await logger.think(`⏳ Taking a bit longer than usual... still waiting`);
    }
  }

  console.log(`❌ Timeout: OpenCode did not launch after ${maxAttempts} attempts`);
  return false;
}

/**
 * Intelligent completion detection - AI decides how long to wait based on task progress
 * Maximum 3 minutes total, with AI-controlled wait intervals
 */
async function waitForTaskCompletion(
  desktop: any,
  logger: WorkflowLogger,
  userRequest: string,
): Promise<{ completed: boolean; finalScreenshot: { image: string; width: number; height: number } }> {
  console.log(`🤖 Starting intelligent task completion detection...`);
  console.log(`📝 Task: ${userRequest}`);
  
  const maxTotalWaitMs = 240000; // 4 minutes maximum (increased to handle variable completion times)
  const startTime = Date.now();
  let attempt = 0;

  while (true) {
    attempt++;
    const elapsedMs = Date.now() - startTime;
    const remainingMs = maxTotalWaitMs - elapsedMs;

    if (remainingMs <= 0) {
      console.log(`⏰ Maximum wait time (3 minutes) reached. Ending detection loop.`);
      const finalScreenshot = await logger.logToolCall('screenshot', {}, () => desktop.screenshot()) as { image: string; width: number; height: number };
      return { completed: false, finalScreenshot };
    }

    console.log(`\n🔍 Attempt ${attempt}: Analyzing task progress (${Math.floor(elapsedMs / 1000)}s elapsed, ${Math.floor(remainingMs / 1000)}s remaining)...`);

    // Take screenshot
    const screenshotRaw = await logger.logToolCall('screenshot', {}, () => desktop.screenshot());
    const screenshot = screenshotRaw as { image: string; width: number; height: number };

    if (!screenshot || !screenshot.image) {
      console.log(`❌ Screenshot capture failed, waiting 5s and retrying...`);
      await logger.logToolCall('wait', { duration: 5000 }, () => desktop.wait(5000));
      continue;
    }

    console.log(`📸 Screenshot captured: ${screenshot.image.length} bytes (${screenshot.width}x${screenshot.height})`);

    // Ask AI to analyze progress and decide next wait time
    const analysis = await callGroqAI(
      `You are a task completion detection assistant analyzing OpenCode's progress on a coding task.

TASK DESCRIPTION: ${userRequest}

INSTRUCTIONS:
1. Analyze the screenshot to determine task progress
2. Look for signs of completion:
   - Task finished message or success indicator
   - Files created/saved confirmation
   - OpenCode returned to input prompt (ready for next task)
   - No active processing indicators (loading spinners, "working..." text)
3. Look for signs of ongoing work:
   - Loading indicators, progress bars
   - "Generating...", "Creating...", "Processing..." messages
   - Code being written in real-time
   - File operations in progress
4. Estimate completion percentage (0-100%)
5. Decide how long to wait before next check (10-300 seconds, based on task complexity)

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
OBSERVATION: [What you see - be specific about progress indicators]
PROGRESS: [0-100]%
STATUS: [COMPLETED/IN_PROGRESS/JUST_STARTED/ERROR]
WAIT_SECONDS: [10-300]
REASONING: [Why you chose this wait time]

STATUS meanings:
- COMPLETED = Task is done, OpenCode is idle or showing success
- IN_PROGRESS = Actively working, visible progress
- JUST_STARTED = Task just began, needs more time
- ERROR = Error messages visible, task failed

WAIT_SECONDS guidelines:
- JUST_STARTED: 120-180 seconds (give it time to get going)
- IN_PROGRESS (0-30%): 90-120 seconds (early stage, slow progress)
- IN_PROGRESS (30-70%): 60-90 seconds (mid-stage, steady progress)
- IN_PROGRESS (70-95%): 30-60 seconds (almost done, check frequently)
- COMPLETED: 0 seconds (stop checking)
- ERROR: 0 seconds (stop checking)

Maximum wait time per check: 300 seconds (5 minutes)

Be decisive and realistic about progress.`,
      `Analyze this screenshot and determine if the OpenCode task is complete, in progress, or failed. Decide how long to wait before checking again.`,
      screenshot.image,
      logger,
      'analyzeTaskProgress',
    );

    console.log(`🤖 AI analysis (attempt ${attempt}):`);
    console.log(`   ${analysis.trim()}`);

    // Extract status and wait time from response
    const statusMatch = analysis.match(/STATUS:\s*(COMPLETED|IN_PROGRESS|JUST_STARTED|ERROR)/i);
    const waitMatch = analysis.match(/WAIT_SECONDS:\s*(\d+)/i);
    const progressMatch = analysis.match(/PROGRESS:\s*(\d+)%/i);

    const status = statusMatch ? statusMatch[1].toUpperCase() : 'IN_PROGRESS';
    const waitSeconds = waitMatch ? parseInt(waitMatch[1], 10) : 30;
    const progress = progressMatch ? parseInt(progressMatch[1], 10) : 0;

    console.log(`📊 Status: ${status} | Progress: ${progress}% | Next check in: ${waitSeconds}s`);

    // Check if task is complete or failed
    if (status === 'COMPLETED') {
      console.log(`✅ Task completed successfully!`);
      await logger.think(`✅ Perfect! I can see the task is complete`);
      return { completed: true, finalScreenshot: screenshot };
    }

    if (status === 'ERROR') {
      console.log(`❌ Task failed with error!`);
      await logger.think(`❌ Uh oh, I see an error on the screen`);
      return { completed: false, finalScreenshot: screenshot };
    }
    
    // Add conversational progress updates
    if (attempt === 1 && status === 'JUST_STARTED') {
      await logger.think(`🚀 OpenCode just started working on this...`);
    } else if (progress >= 30 && progress < 70 && attempt % 2 === 0) {
      await logger.think(`⚙️ Making progress... about ${progress}% done`);
    } else if (progress >= 70 && attempt % 2 === 0) {
      await logger.think(`🏁 Almost there! ${progress}% complete`);
    }

    // Calculate actual wait time (don't exceed remaining time)
    const waitMs = Math.min(waitSeconds * 1000, remainingMs);
    
    if (waitMs <= 0) {
      console.log(`⏰ No time remaining. Ending detection loop.`);
      return { completed: false, finalScreenshot: screenshot };
    }

    console.log(`⏳ Waiting ${Math.floor(waitMs / 1000)}s before next check...`);
    await logger.logToolCall('wait', { duration: waitMs }, () => desktop.wait(waitMs));
  }
}

export async function execute(
  variables: { userRequest: string; documentType?: string; researchFilePath?: string; emailRecipients?: string },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { desktop, browserLogger, taskId, messagesService, eventEmitter } = services;
  const { userRequest, documentType, researchFilePath, emailRecipients } = variables;

  // Create workflow logger with messagesService for think() support
  const logger = new WorkflowLogger(browserLogger, taskId, 'opencode-request', messagesService);

  try {
    console.log(`🚀 Starting OpenCode workflow...`);
    console.log(`📝 User request: ${userRequest}`);

    // ── STEP 1: Extract and improve the prompt using AI ─────────────────────
    console.log(`🤖 Step 1: Analyzing and improving user request...`);
    await logMessage(logger, `🤔 Hmm, let me think about what you want... reading your request carefully`);
    await logMessage(logger, `🧠 Analyzing the best way to build this...`);

    const improvedPrompt = await callGroqAI(
  `You are a prompt engineering expert for OpenCode, an AI coding assistant.

OpenCode has SKILLS.MD files that contain detailed instructions for:
- PowerPoint presentations (pptxgenjs)
- Word documents (python-docx)
- PDF documents (reportlab)
- Excel spreadsheets (openpyxl)
- Email sending (aria-mail)
- Web development (HTML/CSS/JS)

Your job: Analyze the user's request and create a SHORT, clear prompt that:

1. TELLS OPENCODE TO READ RELEVANT SKILLS:
   - If creating PPT: "Read SKILLS.MD for PowerPoint instructions"
   - If creating Word doc: "Read SKILLS.MD for Word document instructions"
   - If sending email: "Read SKILLS.MD for aria-mail instructions"
   - If creating PDF: "Read SKILLS.MD for PDF instructions"
   - If creating Excel: "Read SKILLS.MD for Excel instructions"

2. SPECIFIES THE OUTPUT:
   - What to create (presentation, document, website, etc.)
   - Key content requirements (topics, sections, data)
   - Filename and save location: /home/user/Desktop/[descriptive-name].[ext]

3. KEEPS IT CONCISE:
   - NO detailed library instructions (that's in SKILLS.MD)
   - NO step-by-step guides (that's in SKILLS.MD)
   - NO code examples (that's in SKILLS.MD)
   - Just: what to build, what content, where to save

${documentType ? `
4. CRITICAL FILE TYPE REQUIREMENT:
   The user explicitly wants a ${documentType.toUpperCase()} file.
   - If documentType is "ppt": Create PowerPoint (.pptx) file
   - If documentType is "pdf": Create PDF (.pdf) file
   - If documentType is "docx": Create Word (.docx) file
   - If documentType is "txt": Create text (.txt) file
   - If documentType is "html": Create HTML website
   
   ENSURE the file extension matches: ${documentType === 'ppt' ? '.pptx' : documentType === 'pdf' ? '.pdf' : documentType === 'docx' ? '.docx' : documentType === 'txt' ? '.txt' : '.html'}
` : ''}

EXAMPLE GOOD PROMPTS:

"Read SKILLS.MD for PowerPoint instructions. Create a 5-slide presentation about AI trends: title, 3 content slides with bullet points, conclusion. Use blue theme. Save to /home/user/Desktop/ai-trends.pptx"

"Read SKILLS.MD for Word document instructions. Create a project requirements document with 5 sections: overview, goals, timeline, budget, risks. Save to /home/user/Desktop/project-requirements.docx"

"Read SKILLS.MD for PDF instructions. Create a sales report with title, 3 sections, and a data table. Professional formatting. Save to /home/user/Desktop/sales-report.pdf"

Return ONLY the improved prompt in PLAIN TEXT (no markdown, no formatting).`,
  `Original request: "${userRequest}"${documentType ? `\n\nREQUIRED FILE TYPE: ${documentType.toUpperCase()}` : ''}

Create a SHORT prompt that tells OpenCode to read the relevant SKILLS.MD file and specifies what to build.`,
      undefined,
      logger,
      'improvePrompt',
    );

    // Sanitize the prompt to remove any markdown formatting that slipped through
    await logger.logToolCall(
      'sanitizePrompt',
      { originalLength: improvedPrompt.length },
      async () => {
        const cleanPrompt = improvedPrompt
          .replace(/\*\*(.*?)\*\*/g, '$1')        // Remove bold **text**
          .replace(/\*(.*?)\*/g, '$1')            // Remove italic *text*
          .replace(/#{1,6}\s/g, '')               // Remove headers # ## ###
          .replace(/`{1,3}[^`]*`{1,3}/g, '')     // Remove code blocks/inline code
          .replace(/^\s*[-•]\s/gm, '')           // Remove bullet points
          .replace(/^\s*\d+\.\s/gm, '')          // Remove numbered lists
          .replace(/\n{3,}/g, '\n\n')            // Collapse excessive newlines
          .replace(/[^\x00-\x7F]/g, '')          // Remove non-ASCII characters
          .trim();
        return { cleanedLength: cleanPrompt.length, success: true };
      },
    );

    const cleanPrompt = improvedPrompt
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/^\s*[-•]\s/gm, '')
      .replace(/^\s*\d+\.\s/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[^\x00-\x7F]/g, '')
      .trim();

    // ── ADD EMAIL INSTRUCTIONS (webhook removed - using vision detection) ──────
    // Webhook completion instructions commented out - OpenCode uses vision-based detection
    // const webhookInstructions = generateWebhookInstructions(taskId, 'opencode-request');
    
    // Append email sending instructions to the prompt
    // Parse email recipients into array
    const recipientEmails = emailRecipients ? emailRecipients.split(',').map(e => e.trim()).filter(e => e.length > 0) : [];
    
    // Build research file instructions
    const researchFileInstructions = researchFilePath ? `
RESEARCH FILE LOCATION:
The research summary file is located at: ${researchFilePath}
You MUST attach this file to ALL emails you send.
` : `
FINDING RESEARCH FILES:
If the user mentioned a research topic, there may be a research file on the Desktop.
Look for files matching the pattern: /home/user/Desktop/research-*.txt
Use 'ls /home/user/Desktop/research-*.txt' to find it.
If found, attach it to your emails.
`;

    // Add web search capability hint (middle section)
    const webSearchHint = `

IMPORTANT: WEB SEARCH CAPABILITY
If you need additional information or context that wasn't provided in the research files or prompt:
- You CAN search the web using terminal commands like 'curl' or 'wget'
- You CAN look up documentation, examples, or current information
- You CAN verify facts or get latest data if needed
- Use web search to enhance the quality and accuracy of your work

`;

    const emailInstructions = `

After completing the task, send an email summary.

EMAIL INSTRUCTIONS:
- Read SKILLS.MD for complete aria-mail documentation and examples
- Use aria-mail command (already installed in terminal)
- Attach ALL files you created${researchFilePath ? ` AND the research file at ${researchFilePath}` : ' AND any research files you find'}

${recipientEmails.length > 0 ? `
RECIPIENT EMAIL ADDRESSES (USE THESE EXACT EMAILS):
${recipientEmails.map((email, i) => `${i + 1}. ${email}`).join('\n')}

CRITICAL: Send separate emails to EACH recipient. Use one aria-mail command per recipient.
DO NOT use any other email addresses.
` : `
ERROR: No recipient email was provided!
You MUST ask the user for the recipient email address before sending.
DO NOT use placeholder emails like user@example.com or recipient@example.com.
`}

${researchFileInstructions}

QUICK EXAMPLE:
aria-mail --to "${recipientEmails.length > 0 ? recipientEmails[0] : 'EMAIL_HERE'}" --subject "Task Complete" --body "Your file is attached." --attachment "/home/user/Desktop/yourfile.ext" --sender-name "Aria Assistant"

${recipientEmails.length > 1 ? `
Send to ALL ${recipientEmails.length} recipients:
${recipientEmails.map((email) => `aria-mail --to "${email}" --subject "..." --body "..." --attachment "/home/user/Desktop/yourfile.ext"`).join('\n')}
` : ''}

For complete aria-mail documentation, parameters, and examples: Read SKILLS.MD`;

    const finalPrompt = cleanPrompt + webSearchHint + emailInstructions;

    // Log email instructions addition
    await logger.logToolCall(
      'addEmailInstructions',
      {
        hasRecipients: !!emailRecipients,
        hasResearchFile: !!researchFilePath,
        instructionsLength: emailInstructions.length,
      },
      async () => ({ success: true, finalLength: finalPrompt.length }),
    );

    console.log(`✅ Step 1 done. Final prompt with email instructions (${finalPrompt.length} chars):`);
    console.log(`   "${finalPrompt.slice(0, 100)}..."`);
    console.log(`   📧 Email instructions added (${emailInstructions.length} chars)`);
    
    await logMessage(logger, `✅ Perfect! I know exactly what to build now`);
    await logMessage(logger, `📋 Added all the technical details OpenCode needs...`);
    
    // ── STEP 2: Open terminal and maximize ──────────────────────────────────
    console.log(`🖥️  Step 2: Opening terminal...`);
    await logMessage(logger, `🖥️  Alright, firing up the terminal...`);
    await logMessage(logger, `⚡ Getting ready to launch OpenCode...`);

    await logger.logToolCall('launchApplication', { application: 'terminal' }, () =>
      desktop.launchApplication('terminal'),
    );

    await logger.logToolCall('wait', { duration: 3000 }, () => desktop.wait(3000));

    // Click terminal to ensure focus
    await logger.logToolCall('clickMouse', { coordinates: { x: 640, y: 400 }, button: 'left' }, () =>
      desktop.clickMouse({ x: 640, y: 400 }, 'left'),
    );

    await logger.logToolCall('wait', { duration: 500 }, () => desktop.wait(500));

    // Maximize terminal window (F11 for fullscreen)
    console.log(`🖥️  Maximizing terminal to fullscreen...`);
    await logger.logToolCall('pressKeys', { keys: ['F11'] }, () => desktop.pressKeys(['F11']));

    await logger.logToolCall('wait', { duration: 1000 }, () => desktop.wait(1000));

    console.log(`✅ Step 2 done. Terminal opened and maximized.`);
    await logMessage(logger, `✅ Terminal is open and looking good`);
    await logMessage(logger, `🎯 Now let's get OpenCode running...`);

    // ── STEP 3: Kill any existing OpenCode processes (prevent duplicates) ────
    console.log(`🧹 Step 3: Cleaning up any existing OpenCode processes...`);
    await logMessage(logger, `🧹 Just checking for any old sessions running...`);
    await logMessage(logger, `🔍 Making sure we start fresh...`);

    // Kill any running opencode processes to prevent duplicates from retry logic
    await logger.logToolCall('killExistingProcesses', { command: 'pkill -f opencode' }, () =>
      desktop.typeText('pkill -f opencode || true', 0),
    );

    await logger.logToolCall('wait', { duration: 300, reason: 'Allow process kill to complete' }, () => desktop.wait(300));

    await logger.logToolCall('pressKeys', { keys: ['Return'], action: 'Execute cleanup command' }, () => desktop.pressKeys(['Return']));

    await logger.logToolCall('wait', { duration: 1000, reason: 'Wait for cleanup confirmation' }, () => desktop.wait(1000));

    console.log(`✅ Step 3 done. Cleanup complete.`);
    await logMessage(logger, `✅ All clear! Everything's clean`);
    await logMessage(logger, `👍 Ready for a fresh start...`);

    // ── STEP 4: Hit Enter to ensure clean prompt ────────────────────────────
    console.log(`⌨️  Step 4: Hitting Enter to ensure clean prompt...`);

    await logger.logToolCall('pressKeys', { keys: ['Return'], action: 'Get clean prompt' }, () => desktop.pressKeys(['Return']));

    await logger.logToolCall('wait', { duration: 500, reason: 'Wait for new prompt line' }, () => desktop.wait(500));

    console.log(`✅ Step 4 done. Clean prompt ready.`);

    // ── STEP 5: Change to Desktop directory ─────────────────────────────────
    console.log(`📁 Step 5: Changing to Desktop directory...`);

    await logger.logToolCall('changeDirectory', { path: '/home/user/Desktop/' }, () =>
      desktop.typeText('cd /home/user/Desktop/', 0),
    );

    await logger.logToolCall('wait', { duration: 300, reason: 'Allow command to be typed' }, () => desktop.wait(300));

    await logger.logToolCall('pressKeys', { keys: ['Return'], action: 'Execute cd command' }, () => desktop.pressKeys(['Return']));

    await logger.logToolCall('wait', { duration: 500, reason: 'Wait for directory change' }, () => desktop.wait(500));

    console.log(`✅ Step 5 done. Now in Desktop directory.`);
    await logMessage(logger, `📁 Switched to Desktop folder...`);
    await logMessage(logger, `💾 This is where all your files will be saved`);

    // ── STEP 6: Type "opencode" command ──────────────────────────────────────
    console.log(`⚡ Step 6: Typing "opencode" command...`);
    await logMessage(logger, `⚡ Okay, typing the magic command...`);
    await logMessage(logger, `🚀 Launching OpenCode AI assistant...`);

    await logger.logToolCall('launchOpenCode', { command: 'opencode' }, () =>
      desktop.typeText('opencode', 0),
    );

    await logger.logToolCall('wait', { duration: 500, reason: 'Allow command to be typed' }, () => desktop.wait(500));

    await logger.logToolCall('pressKeys', { keys: ['Return'], action: 'Execute opencode command' }, () => desktop.pressKeys(['Return']));

    console.log(`✅ Step 6 done. OpenCode command executed.`);
    await logMessage(logger, `✅ Command sent! Now waiting for it to boot up...`);
    await logMessage(logger, `⏳ This usually takes a few seconds...`);

    // ── STEP 7: Wait 5 seconds before starting vision detection ────────────
    console.log(`⏳ Step 7: Waiting 5 seconds for OpenCode to initialize...`);

    await logger.logToolCall('wait', { duration: 5000, reason: 'Initial OpenCode startup time' }, () => desktop.wait(5000));

    console.log(`✅ Step 7 done. Initial wait complete.`);

    // ── STEP 8: Wait for OpenCode to launch (AI vision loop) ───────────────
    console.log(`⏳ Step 8: Starting AI vision detection for OpenCode launch...`);
    await logMessage(logger, `👀 Watching the screen closely...`);
    await logMessage(logger, `🔍 Looking for signs that OpenCode is ready...`);

    const launched = await waitForOpenCodeLaunch(desktop, logger, 10, 5000); // Now uses 5s delay

    if (!launched) {
      await logMessage(logger, `❌ Hmm, OpenCode didn't launch properly. Something went wrong...`);
      
      // Take final screenshot for debugging
      const finalScreenshot = await logger.logToolCall('screenshot', {}, () => desktop.screenshot()) as { image: string; width: number; height: number };

      return {
        success: false,
        error: 'OpenCode did not launch within timeout period',
        message: 'OpenCode failed to launch. Check terminal for errors.',
        data: {
          userRequest,
          finalScreenshot: finalScreenshot.image,
        },
      };
    }

    console.log(`✅ Step 8 done. OpenCode is ready!`);
    await logMessage(logger, `🎉 Yes! OpenCode is up and running`);
    await logMessage(logger, `✨ Interface looks perfect, ready to go...`);

    // ── STEP 9: Extra safety wait after detection ───────────────────────────
    console.log(`⏳ Step 9: Waiting 3 seconds to ensure OpenCode is fully stable...`);

    await logger.logToolCall('wait', { duration: 3000, reason: 'Ensure OpenCode UI is fully stable' }, () => desktop.wait(3000));

    console.log(`✅ Step 9 done. Ready to submit prompt.`);

    // ── STEP 10: Paste the long prompt using Ctrl+Shift+V (clipboard method) ─
    console.log(`📋 Step 10: Submitting improved prompt to OpenCode...`);
    console.log(`📝 Prompt length: ${finalPrompt.length} chars (using clipboard for long text)`);
    await logMessage(logger, `📝 Alright, copying your request to clipboard...`);
    await logMessage(logger, `⌨️  Pasting everything into OpenCode...`);

    // For long prompts (>500 chars), use clipboard method to avoid timeout
    // Copy to clipboard first (pasteText sets clipboard)
    await logger.logToolCall('copyToClipboard', { promptLength: finalPrompt.length }, () => 
      desktop.pasteText(finalPrompt)
    );

    await logger.logToolCall('wait', { duration: 500, reason: 'Allow clipboard to be set' }, () => desktop.wait(500));

    // Paste using Ctrl+Shift+V (terminal paste shortcut)
    console.log(`⌨️  Pressing Ctrl+Shift+V to paste from clipboard...`);
    await logger.logToolCall('pasteFromClipboard', { keys: ['Control', 'Shift', 'v'] }, () => 
      desktop.pressKeys(['Control', 'Shift', 'v'])
    );

    await logger.logToolCall('wait', { duration: 1000, reason: 'Allow paste to complete' }, () => desktop.wait(1000));

    // Press Enter to submit
    console.log(`⌨️  Pressing Enter to submit...`);
    await logger.logToolCall('pressKeys', { keys: ['Return'], action: 'Submit prompt (first Enter)' }, () => desktop.pressKeys(['Return']));

    await logger.logToolCall('wait', { duration: 2000, reason: 'Wait for OpenCode to process' }, () => desktop.wait(2000));

    // Press Enter again (OpenCode may need confirmation)
    console.log(`⌨️  Pressing Enter again...`);
    await logger.logToolCall('pressKeys', { keys: ['Return'], action: 'Confirm submission (second Enter)' }, () => desktop.pressKeys(['Return']));

    console.log(`✅ Step 10 done. Prompt submitted!`);
    await logMessage(logger, `✅ Perfect! Request submitted successfully`);
    await logMessage(logger, `🎨 OpenCode is starting to work on your project...`);
    await logMessage(logger, `⏳ This might take a few minutes depending on complexity...`);

    // ── STEP 11: Wait for webhook completion (with vision fallback) ─────────
    console.log(`🔔 Step 11: Waiting for OpenCode to complete and send webhook...`);
    await logMessage(logger, `⏳ Now we wait... OpenCode will ping me when it's done`);
    await logMessage(logger, `☕ Grab a coffee, this could take a bit...`);

    let completionResult: WebhookCompletionResult;
    
    try {
      // Primary method: Wait for webhook with 8-minute timeout
      completionResult = await Promise.race([
        // Webhook completion (preferred)
        waitForWebhookCompletion(taskId, 'opencode-request', services.eventEmitter, logger, 480000), // 8 min
        
        // Fallback: Vision detection after 6 minutes of no webhook
        (async (): Promise<WebhookCompletionResult> => {
          await desktop.wait(360000); // 6 min
          console.log('⚠️ No webhook received after 6 minutes, falling back to vision detection...');
          await logMessage(logger, `⚠️ Haven't heard back yet, let me check the screen...`);
          
          const visionResult = await waitForTaskCompletion(desktop, logger, userRequest);
          
          return {
            success: visionResult.completed,
            finalScreenshot: visionResult.finalScreenshot.image,
            completionMethod: 'vision-fallback',
            message: visionResult.completed ? 'Detected completion via vision' : 'Vision detection inconclusive',
          };
        })(),
      ]);
    } catch (error: any) {
      // Timeout - take final screenshot
      console.log(`⏰ Timeout reached, taking final screenshot...`);
      await logMessage(logger, `⏰ Time's up, let me see what's on the screen...`);
      
      const finalScreenshot = await logger.logToolCall('screenshot', {}, () => desktop.screenshot()) as { image: string; width: number; height: number };
      
      completionResult = {
        success: false,
        error: error.message,
        finalScreenshot: finalScreenshot.image,
        completionMethod: 'timeout',
        message: 'Workflow timed out',
      };
    }

    // Log completion method
    console.log(`📊 Completion method: ${completionResult.completionMethod}`);
    
    if (completionResult.completionMethod === 'webhook') {
      await logMessage(logger, `✅ Got the completion notification from OpenCode!`);
    } else if (completionResult.completionMethod === 'vision-fallback') {
      await logMessage(logger, `👀 Used vision detection as fallback`);
    }

    // Take final screenshot if not already present
    if (!completionResult.finalScreenshot) {
      const finalScreenshot = await logger.logToolCall('screenshot', {}, () => desktop.screenshot()) as { image: string; width: number; height: number };
      completionResult.finalScreenshot = finalScreenshot.image;
    }

    if (!completionResult.success) {
      console.log(`⚠️ Task did not complete successfully.`);
      await logMessage(logger, `⚠️ Hmm, looks like something didn't go as planned...`);
      
      return {
        success: false,
        error: completionResult.error || 'Task did not complete',
        message: completionResult.message || 'OpenCode did not complete the task successfully.',
        data: {
          userRequest,
          improvedPrompt,
          finalPrompt,
          promptLength: finalPrompt.length,
          finalScreenshot: completionResult.finalScreenshot,
          completionMethod: completionResult.completionMethod,
          files: completionResult.files,
        },
      };
    }

    console.log(`✅ Step 11 done. Task completed successfully!`);
    await logMessage(logger, `🎉 Woohoo! OpenCode finished successfully`);
    await logMessage(logger, `✨ Everything looks great!`);
    
    if (completionResult.files && completionResult.files.length > 0) {
      await logMessage(logger, `📁 Created these files: ${completionResult.files.join(', ')}`);
      await logMessage(logger, `💾 All saved to your Desktop!`);
    }

    // ── Done ────────────────────────────────────────────────────────────────
    return {
      success: true,
      message: completionResult.message || `OpenCode request completed successfully! Generated files should be on Desktop (/home/user/Desktop/).`,
      data: {
        userRequest,
        improvedPrompt,
        finalPrompt,
        promptLength: finalPrompt.length,
        finalScreenshot: completionResult.finalScreenshot,
        completionMethod: completionResult.completionMethod,
        files: completionResult.files,
        metadata: completionResult.metadata,
      },
    };
  } catch (error: any) {
    console.error(`❌ OpenCode workflow error:`, error);
    return {
      success: false,
      error: error.message,
      message: `Failed to submit OpenCode request: ${error.message}`,
    };
  }
}
