import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';

export const metadata: WorkflowMetadata = {
  name: 'opencode-request',
  description: 'Universal coding assistant - creates websites, web apps, PowerPoint presentations (.pptx), PDF documents, Word files (.docx), Excel spreadsheets (.xlsx), Python scripts, Node.js apps, and more. Just describe what you want in natural language and OpenCode builds it using the appropriate libraries (pptxgenjs, reportlab, openpyxl, python-docx, etc.)',
  version: '2.0.0',
  timeout_ms: 300000, // 5 minutes (increased from 3 min to handle variable OpenCode completion times)
  variables: [
    {
      name: 'userRequest',
      type: 'string',
      required: true,
      description: 'What you want OpenCode to build - websites, presentations, documents, spreadsheets, scripts, or any coding task. Examples: "Create a sales presentation with 5 slides", "Build a PDF report with charts", "Make an Excel budget tracker", "Create a landing page with contact form"',
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
};

/**
 * Call Groq AI to analyze screenshots and improve prompts
 */
async function callGroqAI(systemPrompt: string, userContent: string, imageBase64?: string): Promise<string> {
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

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: imageBase64 ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile',
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
        continue;
      }

      if (!res.ok) {
        console.error(`❌ Groq API error: ${res.status} - ${raw}`);
        throw new Error(`Groq ${res.status}: ${data?.error?.message || raw}`);
      }

      return data.choices[0].message.content as string;
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
      return true;
    }

    console.log(`⏳ OpenCode not ready yet (still loading or not launched), waiting...`);
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
      return { completed: true, finalScreenshot: screenshot };
    }

    if (status === 'ERROR') {
      console.log(`❌ Task failed with error!`);
      return { completed: false, finalScreenshot: screenshot };
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
  variables: { userRequest: string; researchFilePath?: string; emailRecipients?: string },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { desktop, browserLogger, taskId } = services;
  const { userRequest, researchFilePath, emailRecipients } = variables;

  // Create workflow logger
  const logger = new WorkflowLogger(browserLogger, taskId, 'opencode-request');

  try {
    console.log(`🚀 Starting OpenCode workflow...`);
    console.log(`📝 User request: ${userRequest}`);

    // ── STEP 1: Extract and improve the prompt using AI ─────────────────────
    console.log(`🤖 Step 1: Analyzing and improving user request...`);

const improvedPrompt = await callGroqAI(
  `You are a prompt engineering expert for OpenCode, an AI coding assistant that can create:
- Websites & web apps (HTML/CSS/JS, React, Vue, etc.)
- PowerPoint presentations (.pptx) using pptxgenjs
- PDF documents using reportlab (Python)
- Word documents (.docx) using python-docx (Python)
- Excel spreadsheets (.xlsx) using openpyxl (Python)
- Python scripts, Node.js apps, and more

Your job is to analyze the user's request and create an enhanced prompt that:

1. DETECT THE OUTPUT TYPE:
   - Website/app → HTML/CSS/JS with design system
   - Presentation → pptxgenjs with slide structure
   - PDF → reportlab with layout details
   - Word doc → python-docx with formatting
   - Excel → openpyxl with data structure
   - Script/app → appropriate language and libraries

2. ADD SPECIFIC REQUIREMENTS:
   For websites:
   - Design system: spacing (4px base), typography, colors (CSS variables)
   - Layout: Flexbox/Grid, responsive design
   - Polish: border-radius, shadows, hover states, transitions
   - Accessibility: semantic HTML, ARIA labels, contrast
   
   For documents (PPT/PDF/Word/Excel):
   - Content structure: sections, headings, data organization
   - Visual style: colors, fonts, spacing
   - File path: ALWAYS /home/user/Desktop/[descriptive-filename].[extension]
   - Exact library to use (see examples below)
   - CRITICAL: Tell OpenCode to assume all libraries are already installed - do NOT check or install
   
   For scripts/apps:
   - Functionality requirements
   - Error handling
   - Output format

3. EXACT TOOL SPECIFICATIONS:
   - PowerPoint (.pptx): Use pptxgenjs library (Node.js) - already installed globally
   - PDF (.pdf): Use reportlab library (Python) - already installed via pip3
   - Word (.docx): Use python-docx library (Python) - already installed via pip3
   - Excel (.xlsx): Use openpyxl library (Python) - already installed via pip3

4. FILENAME REQUIREMENTS:
   - ALWAYS specify exact filename with extension
   - Use descriptive names: sales-report.pdf, q4-presentation.pptx, budget-2024.xlsx
   - ALWAYS save to: /home/user/Desktop/[filename].[ext]

5. EXAMPLE PROMPTS (use as templates):

   PowerPoint Example:
   "Create a PowerPoint presentation about AI trends using pptxgenjs. The library is already installed. Create 5 slides: title slide, 3 content slides with bullet points, and conclusion. Use blue and white colors. Save to /home/user/Desktop/ai-trends.pptx"

   PDF Example:
   "Create a PDF report about sales data using reportlab. The library is already installed. Include title, 3 sections with paragraphs, and a table. Use professional formatting. Save to /home/user/Desktop/sales-report.pdf"

   Word Example:
   "Create a Word document about project requirements using python-docx. The library is already installed. Include title, 5 sections with headings and paragraphs, and bullet points. Save to /home/user/Desktop/project-requirements.docx"

   Excel Example:
   "Create an Excel spreadsheet for budget tracking using openpyxl. The library is already installed. Create headers, 10 rows of sample data, and formulas for totals. Save to /home/user/Desktop/budget-2024.xlsx"

6. BE SPECIFIC:
   - Exact file paths (/home/user/Desktop/filename.ext)
   - Library names (pptxgenjs, reportlab, python-docx, openpyxl)
   - Expected output structure
   - Any data or content to include
   - ALWAYS mention: "The library is already installed, do not check or install it"

Return ONLY the improved prompt text, ready to paste into OpenCode. Be concise but specific.
Do NOT add explanations or meta-commentary. Just the improved prompt.

CRITICAL FORMATTING RULES:
- Write in PLAIN TEXT ONLY - no markdown formatting whatsoever
- NO bold (**text**), NO italic (*text*), NO headers (##), NO backticks
- NO bullet points (- or •), NO numbered lists
- Use simple newlines to separate sections
- NO special characters like em-dashes, curly quotes, or non-ASCII symbols
- Output must be terminal-safe plain text`,
  `Original user request: "${userRequest}"

Improve this into a clear, actionable prompt for OpenCode. Detect what type of output is needed (website, document, script) and add appropriate technical requirements and library specifications. ALWAYS include exact filename and Desktop save path.`,
);

    // Sanitize the prompt to remove any markdown formatting that slipped through
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

    // ── ADD EMAIL INSTRUCTIONS ──────────────────────────────────────────────
    // Append email sending instructions to the prompt
    const emailInstructions = `

After completing the task, send an email summary using the aria-mail command.

CRITICAL EMAIL INSTRUCTIONS:
- Do NOT ask the user any questions about email (recipient, subject, etc.)
- Use aria-mail command which is already installed in the terminal
- Email the task summary and attach ALL files you created${researchFilePath ? ` AND the research summary file at ${researchFilePath}` : ''}

aria-mail command syntax:
aria-mail --to "recipient@example.com" --subject "Subject" --body "Body text" --attachment "/home/user/Desktop/filename.ext"

Available parameters:
--to "email@example.com"           (REQUIRED: recipient email)
--subject "Subject text"            (REQUIRED: email subject)
--body "Body text"                  (REQUIRED: email body - can be multi-line)
--cc "cc@example.com"               (OPTIONAL: CC recipient)
--bcc "bcc@example.com"             (OPTIONAL: BCC recipient)
--sender-name "Aria Assistant"      (OPTIONAL: sender name, default: "Aria")
--button-text "View Report"         (OPTIONAL: CTA button text)
--button-url "https://example.com"  (OPTIONAL: CTA button URL)
--attachment "/path/to/file.ext"    (OPTIONAL: file to attach)

Supported attachment types: .txt, .pdf, .png, .jpg, .jpeg, .csv, .zip, .pptx, .docx, .xlsx, .html, .css, .js

${emailRecipients ? `
RECIPIENT EMAILS (send to these addresses):
${emailRecipients}

IMPORTANT: Send separate emails to EACH recipient listed above. Use one aria-mail command per recipient.
` : `
EXAMPLE RECIPIENT (replace with actual email if provided):
user@example.com
`}

${researchFilePath ? `
RESEARCH SUMMARY FILE (attach this to ALL emails):
${researchFilePath}

This file contains the research data used to create the document. Always attach it along with any files you create.
` : ''}

SENDING MULTIPLE FILES:
- You can only attach ONE file per aria-mail command
- To send multiple files to one person, run multiple aria-mail commands with the same --to address
- To send to multiple people, run one aria-mail command per recipient

Example for PowerPoint with research file:
aria-mail --to "user@example.com" --subject "AI Trends Presentation Complete" --body "I have created the AI trends presentation with 5 slides as requested. The file is attached." --attachment "/home/user/Desktop/ai-trends.pptx" --sender-name "Aria Assistant"
aria-mail --to "user@example.com" --subject "AI Trends Research Summary" --body "Here is the research summary used to create the presentation." --attachment "${researchFilePath || '/home/user/Desktop/research-summary.txt'}" --sender-name "Aria Assistant"

Example for PDF:
aria-mail --to "manager@company.com" --subject "Sales Report Generated" --body "The Q4 sales report has been generated with charts and analysis. Please find the PDF attached." --attachment "/home/user/Desktop/sales-report.pdf"

Example for Excel:
aria-mail --to "finance@company.com" --subject "Budget Tracker Ready" --body "The 2024 budget tracker spreadsheet is complete with formulas and sample data." --attachment "/home/user/Desktop/budget-2024.xlsx"

IMPORTANT:
1. Always attach the file you created
2. Write a brief summary of what you did in the body
3. Use a descriptive subject line
4. Do NOT ask user for email details - use the recipients provided above
5. The aria-mail command will handle everything automatically
6. Run multiple commands if sending multiple files or to multiple recipients`;

    const finalPrompt = cleanPrompt + emailInstructions;

    console.log(`✅ Step 1 done. Final prompt with email instructions (${finalPrompt.length} chars):`);
    console.log(`   "${finalPrompt.slice(0, 100)}..."`);
    console.log(`   📧 Email instructions added (${emailInstructions.length} chars)`);
    // ── STEP 2: Open terminal and maximize ──────────────────────────────────
    console.log(`🖥️  Step 2: Opening terminal...`);

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

    // ── STEP 3: Kill any existing OpenCode processes (prevent duplicates) ────
    console.log(`🧹 Step 3: Cleaning up any existing OpenCode processes...`);

    // Kill any running opencode processes to prevent duplicates from retry logic
    await logger.logToolCall('typeText', { text: 'pkill -f opencode || true', delay: 0 }, () =>
      desktop.typeText('pkill -f opencode || true', 0),
    );

    await logger.logToolCall('wait', { duration: 300 }, () => desktop.wait(300));

    await logger.logToolCall('pressKeys', { keys: ['Return'] }, () => desktop.pressKeys(['Return']));

    await logger.logToolCall('wait', { duration: 1000 }, () => desktop.wait(1000));

    console.log(`✅ Step 3 done. Cleanup complete.`);

    // ── STEP 4: Hit Enter to ensure clean prompt ────────────────────────────
    console.log(`⌨️  Step 4: Hitting Enter to ensure clean prompt...`);

    await logger.logToolCall('pressKeys', { keys: ['Return'] }, () => desktop.pressKeys(['Return']));

    await logger.logToolCall('wait', { duration: 500 }, () => desktop.wait(500));

    console.log(`✅ Step 4 done. Clean prompt ready.`);

    // ── STEP 5: Change to Desktop directory ─────────────────────────────────
    console.log(`📁 Step 5: Changing to Desktop directory...`);

    await logger.logToolCall('typeText', { text: 'cd /home/user/Desktop/', delay: 0 }, () =>
      desktop.typeText('cd /home/user/Desktop/', 0),
    );

    await logger.logToolCall('wait', { duration: 300 }, () => desktop.wait(300));

    await logger.logToolCall('pressKeys', { keys: ['Return'] }, () => desktop.pressKeys(['Return']));

    await logger.logToolCall('wait', { duration: 500 }, () => desktop.wait(500));

    console.log(`✅ Step 5 done. Now in Desktop directory.`);

    // ── STEP 6: Type "opencode" command ──────────────────────────────────────
    console.log(`⚡ Step 6: Typing "opencode" command...`);

    await logger.logToolCall('typeText', { text: 'opencode', delay: 0 }, () =>
      desktop.typeText('opencode', 0),
    );

    await logger.logToolCall('wait', { duration: 500 }, () => desktop.wait(500));

    await logger.logToolCall('pressKeys', { keys: ['Return'] }, () => desktop.pressKeys(['Return']));

    console.log(`✅ Step 6 done. OpenCode command executed.`);

    // ── STEP 7: Wait 5 seconds before starting vision detection ────────────
    console.log(`⏳ Step 7: Waiting 5 seconds for OpenCode to initialize...`);

    await logger.logToolCall('wait', { duration: 5000 }, () => desktop.wait(5000));

    console.log(`✅ Step 7 done. Initial wait complete.`);

    // ── STEP 8: Wait for OpenCode to launch (AI vision loop) ───────────────
    console.log(`⏳ Step 8: Starting AI vision detection for OpenCode launch...`);

    const launched = await waitForOpenCodeLaunch(desktop, logger, 10, 5000); // Now uses 5s delay

    if (!launched) {
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

    // ── STEP 9: Extra safety wait after detection ───────────────────────────
    console.log(`⏳ Step 9: Waiting 3 seconds to ensure OpenCode is fully stable...`);

    await logger.logToolCall('wait', { duration: 3000 }, () => desktop.wait(3000));

    console.log(`✅ Step 9 done. Ready to submit prompt.`);

    // ── STEP 10: Paste the long prompt using Ctrl+Shift+V (clipboard method) ─
    console.log(`📋 Step 10: Submitting improved prompt to OpenCode...`);
    console.log(`📝 Prompt length: ${finalPrompt.length} chars (using clipboard for long text)`);

    // For long prompts (>500 chars), use clipboard method to avoid timeout
    // Copy to clipboard first (pasteText sets clipboard)
    await logger.logToolCall('pasteText', { text: finalPrompt }, () => 
      desktop.pasteText(finalPrompt)
    );

    await logger.logToolCall('wait', { duration: 500 }, () => desktop.wait(500));

    // Paste using Ctrl+Shift+V (terminal paste shortcut)
    console.log(`⌨️  Pressing Ctrl+Shift+V to paste from clipboard...`);
    await logger.logToolCall('pressKeys', { keys: ['Control', 'Shift', 'v'] }, () => 
      desktop.pressKeys(['Control', 'Shift', 'v'])
    );

    await logger.logToolCall('wait', { duration: 1000 }, () => desktop.wait(1000));

    // Press Enter to submit
    console.log(`⌨️  Pressing Enter to submit...`);
    await logger.logToolCall('pressKeys', { keys: ['Return'] }, () => desktop.pressKeys(['Return']));

    await logger.logToolCall('wait', { duration: 2000 }, () => desktop.wait(2000));

    // Press Enter again (OpenCode may need confirmation)
    console.log(`⌨️  Pressing Enter again...`);
    await logger.logToolCall('pressKeys', { keys: ['Return'] }, () => desktop.pressKeys(['Return']));

    console.log(`✅ Step 10 done. Prompt submitted!`);

    // ── STEP 11: Intelligent task completion detection (AI-controlled, max 3 min) ─
    console.log(`🤖 Step 11: Starting intelligent task completion detection...`);

    const completionResult = await waitForTaskCompletion(desktop, logger, userRequest);

    if (!completionResult.completed) {
      console.log(`⚠️ Task did not complete within 3 minutes or encountered an error.`);
      return {
        success: false,
        error: 'Task completion timeout or error detected',
        message: 'OpenCode did not complete the task within 3 minutes. Check the final screenshot for status.',
        data: {
          userRequest,
          improvedPrompt,
          finalPrompt,
          promptLength: finalPrompt.length,
          finalScreenshot: completionResult.finalScreenshot.image,
        },
      };
    }

    console.log(`✅ Step 11 done. Task completed successfully!`);

    // ── Done ────────────────────────────────────────────────────────────────
    return {
      success: true,
      message: `OpenCode request completed successfully! Generated files should be on Desktop (/home/user/Desktop/).`,
      data: {
        userRequest,
        improvedPrompt,
        finalPrompt,
        promptLength: finalPrompt.length,
        finalScreenshot: completionResult.finalScreenshot.image,
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
