import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';

export const metadata: WorkflowMetadata = {
  name: 'kilocode-request',
  description: 'Code whatever you want - launches Kilocode CLI and submits your request with AI-enhanced prompting',
  version: '1.0.0',
  timeout_ms: 120000,
  variables: [
    {
      name: 'userRequest',
      type: 'string',
      required: true,
      description: 'What you want Kilocode to build (any language, framework, or task)',
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
 * Wait for Kilocode to launch by checking screenshots with AI vision
 * Returns true if Kilocode is detected, false if timeout
 */
async function waitForKilocodeLaunch(
  desktop: any,
  logger: WorkflowLogger,
  maxAttempts: number = 10,
  delayMs: number = 3000,
): Promise<boolean> {
  console.log(`⏳ Waiting for Kilocode to launch (max ${maxAttempts} attempts, ${delayMs}ms between checks)...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔍 Attempt ${attempt}/${maxAttempts}: Checking if Kilocode has launched...`);

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
      `You are a visual recognition assistant analyzing a terminal screenshot to detect if Kilocode CLI has launched.

INSTRUCTIONS:
1. First, describe what you see in 1-2 sentences
2. Then, check if Kilocode is ready by looking for these signs:
   - An input box or text field (often with placeholder text)
   - Mode selector options (like "Code", "Kilo Auto", etc.)
   - Keyboard shortcut hints at the bottom
   - The word "Kilocode" or "kilocode" visible in the UI
   - NO plain bash prompt ($ or user@hostname)

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
OBSERVATION: [What you see in the screenshot]
VERDICT: [YES/NO/ERROR]

VERDICT meanings:
- YES = Kilocode UI is fully visible with input field ready
- NO = Still loading, or only bash prompt visible, or screen mostly empty
- ERROR = "command not found" or error messages visible

Be descriptive in OBSERVATION but decisive in VERDICT.`,
      `Describe what you see in this terminal screenshot, then determine if Kilocode has fully launched.`,
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
      console.log(`❌ Kilocode command failed or not found!`);
      return false;
    }

    // Check if AI detected Kilocode is FULLY ready
    if (verdict === 'YES') {
      console.log(`✅ Kilocode detected and ready on attempt ${attempt}!`);
      return true;
    }

    console.log(`⏳ Kilocode not ready yet (still loading or not launched), waiting...`);
  }

  console.log(`❌ Timeout: Kilocode did not launch after ${maxAttempts} attempts`);
  return false;
}

export async function execute(
  variables: { userRequest: string },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { desktop, browserLogger, taskId } = services;
  const { userRequest } = variables;

  // Create workflow logger
  const logger = new WorkflowLogger(browserLogger, taskId, 'kilocode-request');

  try {
    console.log(`🚀 Starting Kilocode workflow...`);
    console.log(`📝 User request: ${userRequest}`);

    // ── STEP 1: Extract and improve the prompt using AI ─────────────────────
    console.log(`🤖 Step 1: Analyzing and improving user request...`);

const improvedPrompt = await callGroqAI(
  `You are a prompt engineering expert for coding assistants specializing in frontend development. Your job is to:
1. Extract the core coding task from the user's request
2. Identify the programming language (default to HTML/CSS/JS if unspecified)
3. Identify the framework or technology (if mentioned)
4. Enhance the prompt with:
   - Clear UI/UX requirements and layout structure
   - Consistent design system: spacing scale (4px base), typography hierarchy, color palette with CSS variables
   - CSS best practices: Flexbox/Grid layouts, mobile-first responsive design, smooth transitions (0.2s ease)
   - Visual polish: border-radius, box-shadows, hover states, focus states
   - Accessibility: semantic HTML, ARIA labels, sufficient color contrast
   - Expected output: single-file or component-based structure
   - Any constraints or preferences

Return ONLY the improved prompt text, ready to paste into Kilocode. Be concise but specific.
Do NOT add explanations or meta-commentary. Just the improved prompt.

CRITICAL FORMATTING RULES:
- Write in PLAIN TEXT ONLY - no markdown formatting whatsoever
- NO bold (**text**), NO italic (*text*), NO headers (##), NO backticks
- NO bullet points (- or •), NO numbered lists
- Use simple newlines to separate sections
- NO special characters like em-dashes, curly quotes, or non-ASCII symbols
- Output must be terminal-safe plain text`,
  `Original user request: "${userRequest}"

Improve this into a clear, actionable frontend coding prompt for Kilocode CLI agent. Emphasize visual consistency, clean CSS architecture, and a polished design system throughout.`,
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

    console.log(`✅ Step 1 done. Clean prompt (${cleanPrompt.length} chars):`);
    console.log(`   "${cleanPrompt.slice(0, 100)}..."`);

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

    // ── STEP 3: Type "kilocode" (not paste) ─────────────────────────────────
    console.log(`⚡ Step 3: Typing "kilocode" command...`);

    // Type each character with delay (more human-like)
    await logger.logToolCall('typeText', { text: 'kilocode', delay: 100 }, () =>
      desktop.typeText('kilocode', 100),
    );

    await logger.logToolCall('wait', { duration: 500 }, () => desktop.wait(500));

    await logger.logToolCall('pressKeys', { keys: ['Return'] }, () => desktop.pressKeys(['Return']));

    console.log(`✅ Step 3 done. Kilocode command typed and executed.`);

    // ── STEP 4: Wait 5 seconds before starting vision detection ────────────
    console.log(`⏳ Step 4: Waiting 5 seconds for Kilocode to initialize...`);

    await logger.logToolCall('wait', { duration: 5000 }, () => desktop.wait(5000));

    console.log(`✅ Step 4 done. Initial wait complete.`);

    // ── STEP 5: Wait for Kilocode to launch (AI vision loop) ───────────────
    console.log(`⏳ Step 5: Starting AI vision detection for Kilocode launch...`);

    const launched = await waitForKilocodeLaunch(desktop, logger, 10, 3000);

    if (!launched) {
      // Take final screenshot for debugging
      const finalScreenshot = await logger.logToolCall('screenshot', {}, () => desktop.screenshot()) as { image: string; width: number; height: number };

      return {
        success: false,
        error: 'Kilocode did not launch within timeout period',
        message: 'Kilocode failed to launch. Check terminal for errors.',
        data: {
          userRequest,
          finalScreenshot: finalScreenshot.image,
        },
      };
    }

    console.log(`✅ Step 5 done. Kilocode is ready!`);

    // ── STEP 6: Extra safety wait after detection ───────────────────────────
    console.log(`⏳ Step 6: Waiting 3 seconds to ensure Kilocode is fully stable...`);

    await logger.logToolCall('wait', { duration: 3000 }, () => desktop.wait(3000));

    console.log(`✅ Step 6 done. Ready to submit prompt.`);

    // ── STEP 7: Paste the improved prompt using keyboard shortcuts ──────────
    console.log(`📋 Step 7: Submitting improved prompt to Kilocode...`);
    console.log(`📝 Prompt to paste (${cleanPrompt.length} chars): ${cleanPrompt.slice(0, 200)}...`);

    // First, copy the text to clipboard using pasteText (which sets clipboard)
    await logger.logToolCall('pasteText', { text: cleanPrompt }, () => desktop.pasteText(cleanPrompt));

    await logger.logToolCall('wait', { duration: 500 }, () => desktop.wait(500));

    // Now use Ctrl+Shift+V to paste from clipboard
    console.log(`⌨️  Pressing Ctrl+Shift+V to paste...`);
    await logger.logToolCall('pressKeys', { keys: ['Control', 'Shift', 'v'] }, () => 
      desktop.pressKeys(['Control', 'Shift', 'v'])
    );

    await logger.logToolCall('wait', { duration: 1000 }, () => desktop.wait(1000));

    // Press Enter
    console.log(`⌨️  Pressing Enter...`);
    await logger.logToolCall('pressKeys', { keys: ['Return'] }, () => desktop.pressKeys(['Return']));

    await logger.logToolCall('wait', { duration: 2000 }, () => desktop.wait(2000));

    // Press Enter again
    console.log(`⌨️  Pressing Enter again...`);
    await logger.logToolCall('pressKeys', { keys: ['Return'] }, () => desktop.pressKeys(['Return']));

    console.log(`✅ Step 7 done. Prompt submitted!`);

    // ── STEP 8: Take final screenshot ───────────────────────────────────────
    console.log(`📸 Step 8: Capturing final state...`);

    await logger.logToolCall('wait', { duration: 2000 }, () => desktop.wait(2000));

    const finalScreenshot = await logger.logToolCall('screenshot', {}, () => desktop.screenshot()) as { image: string; width: number; height: number };

    console.log(`✅ Step 8 done. Workflow complete!`);

    // ── Done ────────────────────────────────────────────────────────────────
    return {
      success: true,
      message: `Kilocode request submitted successfully!`,
      data: {
        userRequest,
        improvedPrompt,
        cleanPrompt,
        promptLength: cleanPrompt.length,
        finalScreenshot: finalScreenshot.image,
      },
    };
  } catch (error: any) {
    console.error(`❌ Kilocode workflow error:`, error);
    return {
      success: false,
      error: error.message,
      message: `Failed to submit Kilocode request: ${error.message}`,
    };
  }
}
