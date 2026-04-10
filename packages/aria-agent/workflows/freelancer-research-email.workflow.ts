import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';

export const metadata: WorkflowMetadata = {
  name: 'freelancer-research-email',
  description: 'Research local businesses on Perplexity, generate Excel file via OpenCode, and email it',
  version: '1.0.0',
  timeout_ms: 600000, // 10 minutes - OpenCode Excel generation can take time
  variables: [
    {
      name: 'businessType',
      type: 'string',
      required: true,
      description: 'Type of business to research (e.g., "coffee shops", "dental clinics")',
    },
    {
      name: 'city',
      type: 'string',
      required: true,
      description: 'City to search in (e.g., "Mumbai", "London")',
    },
    {
      name: 'recipientEmail',
      type: 'string',
      required: true,
      description: 'Email address to send the Excel file to',
    },
    {
      name: 'maxResults',
      type: 'number',
      required: false,
      description: 'Maximum number of businesses to find (default: 20)',
      default: 20,
    },
  ],
  user_steps: [
    {
      id: 'research-businesses',
      step_number: 1,
      title: 'Research businesses',
      description: 'Search Perplexity AI for local businesses matching the criteria.',
      titleTemplate: 'Research {businessType}',
      descriptionTemplate: 'Search Perplexity AI for {businessType} in {city}',
    },
    {
      id: 'export-data',
      step_number: 2,
      title: 'Export data',
      description: 'Extract business information from Perplexity research results.',
      titleTemplate: 'Export {maxResults} businesses',
      descriptionTemplate: 'Extract business information for up to {maxResults} results',
    },
    {
      id: 'generate-excel',
      step_number: 3,
      title: 'Generate Excel',
      description: 'Create a professional spreadsheet with OpenCode containing all business details.',
      titleTemplate: 'Generate Excel spreadsheet',
      descriptionTemplate: 'Create spreadsheet with {businessType} data for {city}',
    },
    {
      id: 'send-email',
      step_number: 4,
      title: 'Send email',
      description: 'Email the Excel file to the recipient with a summary.',
      titleTemplate: 'Send to {recipientEmail}',
      descriptionTemplate: 'Email the Excel file to {recipientEmail}',
    },
  ],
};

// ── GROQ VISION HELPER ────────────────────────────────────────────────────────
async function callGroqVision(
  systemPrompt: string,
  userPrompt: string,
  base64Image: string,
): Promise<string> {
  console.log('👁️ Calling Groq Vision API...');

  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  const bare = process.env.GROQ_API_KEY;
  if (bare && !keys.includes(bare)) keys.push(bare);
  
  if (keys.length === 0) {
    throw new Error('No Groq API key found');
  }

  let lastError = new Error('Unknown');
  for (const apiKey of keys) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 512,
        }),
      });

      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : {};
      
      if (response.status === 429 || response.status === 402) {
        lastError = new Error(`Rate limited ...${apiKey.slice(-6)}`);
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`Groq Vision error ${response.status}: ${data?.error?.message || raw}`);
      }

      const text: string = data.choices?.[0]?.message?.content || '';
      if (!text) throw new Error('No response from Groq Vision');

      console.log('✅ Vision response received');
      return text;
    } catch (err: any) {
      lastError = err;
    }
  }
  
  throw new Error(`All Groq keys failed. Last: ${lastError.message}`);
}

// ── WAIT FOR PERPLEXITY RESPONSE ──────────────────────────────────────────────
async function waitForPerplexityResponse(
  desktop: any,
  maxAttempts: number = 20,
): Promise<boolean> {
  console.log('⏳ Waiting for Perplexity to finish generating response...');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await desktop.wait(5000);

    console.log(`  [${attempt}/${maxAttempts}] Checking send button state...`);

    try {
      const screenshotRaw = await desktop.screenshot();

      // Desktop returns { image: "base64...", width: number, height: number }
      const screenshot = screenshotRaw as { image: string; width: number; height: number };

      if (!screenshot || !screenshot.image) {
        console.warn(`  Screenshot capture failed`);
        continue;
      }

      const base64Image = screenshot.image;
      console.log(`  Screenshot captured: ${base64Image.length} bytes (${screenshot.width}x${screenshot.height})`);

      if (base64Image.length < 100) {
        console.warn(`  Screenshot data too short: ${base64Image.length} bytes`);
        continue;
      }

      const systemPrompt = `You are analyzing a Perplexity AI interface. Focus ONLY on the send button at the bottom of the screen.

LOADING (Perplexity is still working):
- Send button shows a SQUARE/STOP icon (■) inside a circle
- Button is enabled/active
- This means "Stop generating"

DONE (Perplexity finished):
- Send button shows an ARROW/PAPER PLANE icon (➤) inside a circle
- Button may look slightly dull/disabled
- This means ready to send new message

Reply with ONLY one word: DONE or LOADING`;

      const userPrompt = 'Look at the send button icon at the bottom. Is it a square/stop icon (LOADING) or an arrow/plane icon (DONE)?';

      const verdict = await callGroqVision(systemPrompt, userPrompt, base64Image);
      const status = verdict.trim().toUpperCase();

      console.log(`  Button state: ${status}`);

      if (status.includes('DONE')) {
        console.log('✅ Perplexity response complete (arrow icon detected)');
        console.log('⏳ Waiting 5 more seconds to ensure response is fully loaded...');
        await desktop.wait(5000);
        return true;
      }
    } catch (error) {
      console.warn(`  Vision check failed: ${error.message}`);
    }
  }

  console.log('⚠️ Max attempts reached, proceeding anyway');
  return false;
}


// ── CHECK IF LOGGED IN ────────────────────────────────────────────────────────
async function checkPerplexityLogin(desktop: any): Promise<boolean> {
  console.log('🔍 Checking if Perplexity is logged in...');
  
  try {
    const screenshotRaw = await desktop.screenshot();
    
    // Desktop returns { image: "base64...", width: number, height: number }
    const screenshot = screenshotRaw as { image: string; width: number; height: number };
    
    if (!screenshot || !screenshot.image) {
      console.warn(`  Screenshot capture failed, assuming logged in`);
      return true;
    }
    
    const base64Image = screenshot.image;
    console.log(`  Screenshot captured: ${base64Image.length} bytes (${screenshot.width}x${screenshot.height})`);
    
    if (base64Image.length < 100) {
      console.warn(`  Screenshot data too short (${base64Image.length} bytes), assuming logged in`);
      return true;
    }
    
    const systemPrompt = `You are analyzing a desktop screenshot showing a browser with Perplexity AI. Determine if the user is logged in or if there's a login/signup wall.
Look for: search box (logged in) vs. login/signup buttons (not logged in).
Reply with ONLY one word: LOGGED_IN or LOGIN_REQUIRED`;

    const userPrompt = 'Is the user logged into Perplexity, or is there a login wall?';
    
    const verdict = await callGroqVision(systemPrompt, userPrompt, base64Image);
    const status = verdict.trim().toUpperCase();
    
    console.log(`  Login status: ${status}`);
    
    return status.includes('LOGGED_IN');
  } catch (error) {
    console.warn(`  Login check failed: ${error.message}, assuming logged in`);
    return true;
  }
}

// ── MAIN EXECUTE ──────────────────────────────────────────────────────────────
export async function execute(
  variables: { businessType: string; city: string; recipientEmail: string; maxResults?: number },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { pinchTab, desktop, browserLogger, taskId, messagesService } = services;
  const { businessType, city, recipientEmail, maxResults = 20 } = variables;

  const logger = new WorkflowLogger(browserLogger, taskId, 'freelancer-research-email', messagesService);
  let profileId: string | undefined;

  try {
    console.log(`📊 Starting freelancer research workflow...`);
    console.log(`   Business type: ${businessType}`);
    console.log(`   City: ${city}`);
    console.log(`   Max results: ${maxResults}`);
    console.log(`   Recipient: ${recipientEmail}`);

    await logger.think(`📊 Alright! Let me research ${businessType} in ${city} for you`);
    await logger.think(`🔍 I'll find up to ${maxResults} businesses and create an Excel spreadsheet`);

    // ── STEP 1: Get or Create Perplexity Profile ─────────────────────────────
    console.log('Step 1: Setting up persistent Perplexity profile...');
    await logger.think(`🔧 Setting up my research tools...`);
    
    const profiles = await logger.logToolCall('listProfiles', {}, () =>
      pinchTab.listProfiles()
    );
    
    let profile = profiles.find((p: any) => p.name === 'perplexity-profile');
    
    if (!profile) {
      console.log('  Creating new profile: perplexity-profile');
      profile = await logger.logToolCall(
        'createProfile',
        { name: 'perplexity-profile', description: 'Persistent Perplexity session' },
        () => pinchTab.createProfile('perplexity-profile', 'Persistent Perplexity session')
      );
    } else {
      console.log(`  Using existing profile: ${profile.id}`);
    }
    
    profileId = profile.id;

    // ── STEP 2: Check if Profile Already Running ─────────────────────────────
    console.log('Step 2: Checking for existing instance...');
    if (!profileId) throw new Error('Profile ID is undefined');
    
    const status = await logger.logToolCall('getProfileInstance', { profileId }, () =>
      pinchTab.getProfileInstance(profileId!)
    );
    
    if (status.running) {
      console.log('  Stopping existing instance...');
      await logger.logToolCall('stopInstanceByProfile', { profileId }, () =>
        pinchTab.stopInstanceByProfile(profileId!)
      );
      await logger.logToolCall('wait', { duration: 2000 }, () =>
        pinchTab.wait(2000)
      );
    }

    // ── STEP 3: Start Instance with Profile ──────────────────────────────────
    console.log('Step 3: Starting browser with profile...');
    await logger.think(`🌐 Opening Perplexity AI...`);
    
    const instance = await logger.logToolCall(
      'startInstanceWithProfile',
      { profileId, mode: 'headed' },
      () => pinchTab.startInstanceWithProfile(profileId!, 'headed')
    );
    
    pinchTab.setCurrentInstance(instance.id);
    console.log(`✅ Instance started: ${instance.id}`);
    
    // Wait longer for browser to fully initialize and auto-create first tab
    console.log('⏳ Waiting for browser to fully initialize (10 seconds)...');
    await logger.logToolCall('wait', { duration: 10000 }, () =>
      pinchTab.wait(10000)
    );

    // ── STEP 4: Get or Create Tab ────────────────────────────────────────────
    console.log('Step 4: Getting browser tab...');
    let tabId: string | null = null;
    
    // First, check if a tab was auto-created when browser started
    try {
      const tabs = await pinchTab.listTabs(instance.id);
      console.log(`  Found ${tabs.length} existing tabs`);
      
      if (tabs.length > 0) {
        tabId = tabs[0].id || tabs[0].tabId;
        console.log(`  Using existing tab: ${tabId}`);
        if (tabId) {
          await pinchTab.switchTab(tabId);
        }
      }
    } catch (tabError) {
      console.warn(`  Failed to list tabs: ${tabError.message}`);
    }
    
    // If no tab exists, try to navigate (which creates a new tab)
    if (!tabId) {
      console.log('  No existing tab found, creating new tab...');
      try {
        tabId = await logger.logToolCall('navigate', { url: 'https://www.perplexity.ai' }, () =>
          pinchTab.navigate('https://www.perplexity.ai', instance.id)
        );
        console.log(`  ✅ New tab created: ${tabId}`);
      } catch (navError) {
        console.error(`  ❌ Failed to create tab: ${navError.message}`);
        throw new Error(`Could not create or find a browser tab. PinchTab may not be responding. Error: ${navError.message}`);
      }
    } else {
      // We have a tab, now navigate it to Perplexity
      console.log('  Navigating existing tab to Perplexity...');
      try {
        await logger.logToolCall('navigate', { url: 'https://www.perplexity.ai' }, () =>
          pinchTab.navigate('https://www.perplexity.ai', instance.id)
        );
        console.log(`  ✅ Navigation successful`);
      } catch (navError) {
        console.warn(`  ⚠️ Navigation failed: ${navError.message}, continuing anyway...`);
      }
    }
    
    // Wait for page to load
    console.log('⏳ Waiting for page to load (8 seconds)...');
    await logger.logToolCall('wait', { duration: 8000 }, () =>
      pinchTab.wait(8000)
    );
    
    // Store the tab ID for subsequent operations
    if (!tabId) {
      throw new Error('Tab ID is not available after navigation');
    }

    // ── STEP 5: Check Login Status ───────────────────────────────────────────
    console.log('Step 5: Checking login status...');
    const isLoggedIn = await checkPerplexityLogin(desktop);
    
    if (!isLoggedIn) {
      console.log('❌ Perplexity login required');
      if (profileId) {
        await logger.logToolCall('stopInstanceByProfile', { profileId }, () =>
          pinchTab.stopInstanceByProfile(profileId!)
        );
      }
      
      return {
        success: false,
        error: 'Perplexity login required',
        message: 'Please open Perplexity in your browser and log in first, then re-run this workflow.',
        data: { businessType, city, loginRequired: true },
      };
    }

    console.log('✅ Perplexity is logged in');
    await logger.think(`✅ Ready to go! Perplexity is all set up`);

    // ── STEP 6: Type Research Prompt ─────────────────────────────────────────
    console.log('Step 6: Finding search box and typing research prompt...');
    await logger.think(`📝 Asking Perplexity to find ${maxResults} ${businessType} in ${city}...`);
    
    const snapshot1 = await logger.logToolCall('snapshot', { filter: 'interactive' }, () =>
      pinchTab.snapshot('interactive')
    );
    
    const elements1 = (snapshot1 as any).nodes || (snapshot1 as any).elements || [];
    console.log(`  Found ${elements1.length} interactive elements`);

    const searchBox = elements1.find((el: any) =>
      (el.role === 'textbox' || el.tag === 'textarea' || el.tag === 'input') &&
      !el.attributes?.disabled
    );

    if (!searchBox) {
      throw new Error('Could not find Perplexity search box');
    }

    console.log(`  Found search box: ref=${searchBox.ref}`);

    const researchPrompt = `You are a professional business research assistant. Find exactly ${maxResults} ${businessType} businesses located in ${city}.

For each business, provide complete details in this EXACT format:

**[Number]. [Business Name]**
- 📍 **Address**: [Full street address with city, state, ZIP code]
- 📞 **Phone**: [Phone number with country code, or "Not available"]
- 🌐 **Website**: [Full URL starting with https://, or "Not available"]
- ⭐ **Rating**: [Google/Yelp rating out of 5 stars, or "Not rated"]
- 📝 **Description**: [2-3 sentences about their services, specialties, unique features, and what makes them stand out]
- 🕒 **Hours**: [Business hours (e.g., "Mon-Fri 9AM-6PM, Sat 10AM-4PM") or "Check website"]
- 💼 **Services**: [Key services or products they offer]

STRICT REQUIREMENTS:
✓ ONLY businesses physically located in ${city} (exact city match required)
✓ Currently active and operational businesses only (no closed/temporary locations)
✓ Verified contact information (phone, website, address must be accurate)
✓ For chains with multiple locations, list ONLY the ${city} branch
✓ Include a mix of well-established and newer businesses
✓ Prioritize businesses with complete information (all fields filled)

RESEARCH QUALITY:
- Cross-reference multiple sources (Google Maps, Yelp, official websites)
- Verify phone numbers and websites are current
- Include specific details that help identify each business
- Note any special features, awards, or certifications

After the complete list, add:

**📊 Research Summary:**
- Total businesses found: ${maxResults}
- Average rating: [Calculate average]
- Most common services: [List top 3]

**💡 Pro Tip for Contacting ${businessType}:**
[2-3 sentences with specific advice on what to ask, best times to contact, and what information to have ready]

**🔍 Sources:**
[List your research sources]`;
    
    await logger.logToolCall('pasteText', { text: researchPrompt }, () =>
      desktop.pasteText(researchPrompt)
    );
    await logger.logToolCall('wait', { duration: 1000 }, () =>
      pinchTab.wait(1000)
    );

    // Press Enter to submit the prompt
    console.log('  Pressing Enter to submit...');
    await logger.logToolCall('pressEnter', {}, () =>
      desktop.pressKeys(['Return'])
    );

    // ── STEP 7: Wait for Research Response ───────────────────────────────────
    console.log('Step 7: Waiting for Perplexity research response...');
    await logger.think(`⏳ Perplexity is searching... this might take a moment`);
    
    await logger.logToolCall('wait', { duration: 15000 }, () =>
      pinchTab.wait(15000)
    );
    
    await waitForPerplexityResponse(desktop, 10);
    await logger.think(`✅ Got the research results!`);

    // ── STEP 7A: Export Conversation via PinchTab JavaScript Eval ────────────
    console.log('Step 7A: Exporting Perplexity conversation via JavaScript eval...');
    await logger.think(`📥 Extracting conversation data from Perplexity...`);
    
    const exportScript = `(async function exportPerplexityV3() {
  const status = document.createElement('div');
  status.style.cssText = \`position: fixed;top: 50%;left: 50%;transform: translate(-50%, -50%);z-index: 999999;background: rgba(251, 249, 249, 0.98);backdrop-filter: blur(12px);border: 1px solid rgba(224, 218, 217, 1);color: rgba(45, 42, 42, 1);padding: 24px 32px;border-radius: 10px;font-family: Inter, system-ui, sans-serif;font-size: 13px;line-height: 1.6;box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08),0 4px 6px -2px rgba(0, 0, 0, 0.05);max-width: 360px;white-space: pre-line;text-align: center;transition: all 0.2s ease;\`;
  document.body.appendChild(status);
  
  const say = (msg, isDone = false) => {
    status.textContent = msg;
    if (isDone) {
      status.style.background = 'rgba(245, 251, 244, 0.98)';
      status.style.borderColor = 'rgba(77, 175, 41, 0.3)';
      status.style.color = 'rgba(43, 128, 0, 1)';
    }
  };
  
  const delay = ms => new Promise(r => setTimeout(r, ms));
  
  function safeFilename(text) {
    return text.replace(/[<>:"/\\\\|?*\\x00-\\x1f]/g, '_').replace(/\\s+/g, '_').replace(/_{2,}/g, '_').replace(/^_+|_+$/g, '').substring(0, 120) || 'perplexity_thread';
  }
  
  function autoDownload(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  say('Extracting title...');
  await delay(100);
  
  let threadTitle = 'perplexity_thread';
  const h1 = document.querySelector('h1.group\\\\/query');
  if (h1) {
    threadTitle = h1.textContent.trim().substring(0, 100);
  } else {
    threadTitle = document.title.replace(/[-|] Perplexity.*/i, '').trim();
  }
  console.log('[DEBUG] Thread title:', threadTitle);
  
  say('Scanning conversation...');
  await delay(100);
  
  const threadContainers = Array.from(document.querySelectorAll('.max-w-threadContentWidth'));
  console.log('[DEBUG] Found', threadContainers.length, 'thread containers');
  
  const turns = [];
  for (const container of threadContainers) {
    const turn = {
      query: '',
      answer: '',
      citations: [],
      codeBlocks: []
    };
    
    const queryEl = container.querySelector('h1.group\\\\/query');
    if (queryEl) {
      turn.query = queryEl.textContent.trim();
      console.log('[DEBUG] Found query:', turn.query.substring(0, 50) + '...');
    }
    
    const proseEls = container.querySelectorAll('.prose');
    console.log('[DEBUG] Found', proseEls.length, 'prose elements in container');
    
    if (proseEls.length > 0) {
      let answerParts = [];
      let allCitations = new Map();
      let allCodeBlocks = [];
      
      proseEls.forEach((proseEl, idx) => {
        console.log('[DEBUG] Processing prose element', idx, '- length:', proseEl.textContent.length);
        const clone = proseEl.cloneNode(true);
        
        const citationEls = clone.querySelectorAll('.citation');
        citationEls.forEach((cite) => {
          const link = cite.querySelector('a[href]');
          if (link) {
            const href = link.href;
            const text = cite.textContent.trim();
            const num = text.match(/\\d+/)?.[0] || allCitations.size + 1;
            if (!allCitations.has(num)) {
              allCitations.set(num, {
                number: num,
                url: href,
                title: link.textContent.trim() || link.getAttribute('aria-label') || \`Source \${num}\`
              });
            }
            cite.replaceWith(document.createTextNode(\` [\${num}] \`));
          } else {
            cite.remove();
          }
        });
        
        const codeEls = clone.querySelectorAll('pre code');
        codeEls.forEach(codeEl => {
          const code = codeEl.textContent.trim();
          if (code.length > 15) {
            const classes = codeEl.className + ' ' + (codeEl.closest('pre')?.className || '');
            const langMatch = classes.match(/language-(\\w+)/);
            const lang = langMatch ? langMatch[1] : '';
            const blockIdx = allCodeBlocks.length;
            allCodeBlocks.push({ lang, code });
            codeEl.closest('pre')?.replaceWith(document.createTextNode(\`\\n\\n[CODE_BLOCK_\${blockIdx}]\\n\\n\`));
          }
        });
        
        let text = clone.textContent.trim().replace(/\\n{3,}/g, '\\n\\n');
        if (text.length > 20) {
          answerParts.push(text);
        }
      });
      
      turn.answer = answerParts.join('\\n\\n');
      turn.answer = turn.answer.replace(/\\[CODE_BLOCK_(\\d+)\\]/g, (match, idx) => {
        const block = allCodeBlocks[parseInt(idx)];
        return block ? \`\\n\\\`\\\`\\\`\${block.lang}\\n\${block.code}\\n\\\`\\\`\\\`\\n\` : '';
      });
      
      turn.citations = Array.from(allCitations.values());
      turn.codeBlocks = allCodeBlocks;
      
      console.log('[DEBUG] Answer length:', turn.answer.length);
      console.log('[DEBUG] Citations:', turn.citations.length);
      console.log('[DEBUG] Code blocks:', turn.codeBlocks.length);
    }
    
    if (turn.query || turn.answer) {
      turns.push(turn);
    }
  }
  
  console.log('[DEBUG] Total turns extracted:', turns.length);
  
  say('Building markdown...');
  await delay(100);
  
  let md = '';
  md += \`# \${threadTitle}\\n\\n\`;
  md += \`> **Exported by Aria Research**  \\n\`;
  md += \`> Date: \${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}  \\n\`;
  md += \`> Source: \${location.href}\\n\\n\`;
  md += '---\\n\\n';
  
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    
    if (turn.query) {
      md += \`## Query \${i + 1}\\n\\n\`;
      md += \`\${turn.query}\\n\\n\`;
    }
    
    if (turn.answer) {
      md += \`## Answer\\n\\n\`;
      md += \`\${turn.answer}\\n\\n\`;
    }
    
    if (turn.citations.length > 0) {
      md += \`### Sources\\n\\n\`;
      turn.citations.forEach(cite => {
        md += \`**[\${cite.number}]** \${cite.title}  \\n\`;
        md += \`\${cite.url}\\n\\n\`;
      });
    }
    
    md += '\\n---\\n\\n';
  }
  
  md += \`\\n*Exported with Aria Research Perplexity Exporter*\\n\`;
  
  const totalChars = turns.reduce((sum, t) => sum + t.answer.length + t.query.length, 0);
  console.log('[DEBUG] Total content characters:', totalChars);
  
  if (totalChars < 100) {
    say('Very little content found\\n\\nMake sure you scrolled to\\nthe bottom and waited for\\ncontent to load.\\n\\nDownloading anyway...');
    await delay(3000);
  }
  
  say('Downloading...');
  await delay(200);
  
  const filename = \`Aria_Research_\${safeFilename(threadTitle)}.md\`;
  autoDownload(md, filename);
  
  const totalSources = turns.reduce((a, t) => a + t.citations.length, 0);
  const totalCode = turns.reduce((a, t) => a + t.codeBlocks.length, 0);
  
  say(\`Export complete\\n\\n\` +
    \`\${turns.length} conversation\${turns.length !== 1 ? 's' : ''}\\n\` +
    \`\${totalSources} source\${totalSources !== 1 ? 's' : ''}\\n\` +
    \`\${totalCode} code block\${totalCode !== 1 ? 's' : ''}\\n\\n\` +
    \`\${filename}\`,
    true
  );
  
  setTimeout(() => status.remove(), 6000);
  
  return { 
    success: true, 
    filename, 
    turns: turns.length,
    citations: totalSources,
    codeBlocks: totalCode
  };
})();`;
    
    try {
      const evalResult = await logger.logToolCall('evalJavaScript', { script: exportScript }, () =>
        pinchTab.evalJavaScript(exportScript)
      );
      
      console.log(`✅ JavaScript executed successfully: ${JSON.stringify(evalResult)}`);
      await logger.think(`✅ Conversation exported with citations and sources!`);
      
      // Wait for download to complete
      await logger.logToolCall('wait', { duration: 5000 }, () =>
        pinchTab.wait(5000)
      );
    } catch (evalError) {
      console.error(`❌ JavaScript eval failed: ${evalError.message}`);
      await logger.think(`⚠️ Export failed, but continuing with workflow...`);
      
      // Don't fail the entire workflow, just log the error
      console.warn(`  Continuing despite eval failure: ${evalError.message}`);
    }

    // ── STEP 8: Stop Browser Instance ────────────────────────────────────────
    console.log('Step 8: Stopping browser instance (profile preserved)...');
    await logger.think(`🛑 Stopping browser...`);
    
    if (profileId) {
      await logger.logToolCall('stopInstanceByProfile', { profileId }, () =>
        pinchTab.stopInstanceByProfile(profileId!)
      );
      
      // Wait for instance to fully stop
      await logger.logToolCall('wait', { duration: 2000 }, () =>
        pinchTab.wait(2000)
      );
      
      console.log('  ✅ Browser instance stopped (login session preserved, all tabs closed automatically)');
    }

    // ── STEP 9: Generate Excel via OpenCode ─────────────────────────────────
    console.log('Step 10: Generating Excel file with OpenCode...');
    await logger.think(`📊 Now creating a professional Excel spreadsheet...`);
    await logger.think(`✨ OpenCode will read the markdown file and create the Excel`);

    const filename = `${businessType.replace(/\s+/g, '-')}-${city}-research.xlsx`;
    
    const opencodePrompt = `I need you to create an Excel spreadsheet from Perplexity research data about ${businessType} in ${city}.

STEP 1: FIND THE MARKDOWN FILE
- Search for a .md file (markdown file) that was just downloaded from Perplexity
- Check these locations in order:
  1. /home/user/Desktop/
  2. /home/user/Downloads/
  3. /home/user/Documents/
  4. Current directory (pwd)
- Use commands like:
  - ls -lt /home/user/Desktop/*.md | head -5
  - ls -lt /home/user/Downloads/*.md | head -5
  - find /home/user -name "*.md" -type f -mmin -30
- The file was created in the last few minutes
- File name will be something like "Aria_Research_*.md" or "perplexity_*.md"
- Look for the MOST RECENT .md file

STEP 2: READ THE MARKDOWN FILE
- Read the entire markdown file you found
- The file contains:
  - User's research query about ${businessType} in ${city}
  - Perplexity's response with business data
  - Each business has: Name, Address, Phone, Website, Rating, Description, Hours, Services

STEP 3: EXTRACT BUSINESS DATA
- Parse Perplexity's response section (after "## 🤖 Answer" or "## 🔵 Perplexity:")
- Extract all business entries
- Each business should have these fields:
  - Business Name
  - Address (full street address with city, state, ZIP)
  - Phone (with country code if available)
  - Website (full URL)
  - Rating (out of 5 stars)
  - Description (what they offer, specialties)
  - Hours (business hours)
  - Services (key services/products)

STEP 4: CREATE EXCEL FILE
- Filename: ${filename}
- Save to: /home/user/Desktop/${filename}
- Column headers: Business Name | Address | Phone | Website | Rating | Description | Hours | Services
- One row per business
- Auto-fit column widths
- Header row with bold formatting and light blue background
- Alternate row colors (white/light gray) for readability
- Professional styling with borders

STEP 5: SEND EMAIL
- Read SKILLS.MD for aria-mail instructions
- Send the Excel file (${filename}) as an attachment
- Email will be sent to the recipient automatically (already configured)
- Email subject: "${businessType} in ${city} - Research Results"
- Email body: "Hi! Here's the research you requested for ${businessType} in ${city}. I found detailed information on ${maxResults} businesses including contact details, ratings, and services. The data is organized in an Excel spreadsheet for easy reference. Best regards, Aria"

IMPORTANT NOTES:
- Do NOT search the web for new data
- Use ONLY the data from the markdown file you find
- Search ALL common locations (Desktop, Downloads, Documents)
- Use 'find' command if you can't locate the file
- Make sure all businesses from the markdown are included in the Excel file`;

    // Import and execute opencode-request workflow
    const opencodeWorkflow = await import('./opencode-request.workflow');
    const excelResult = await logger.logToolCall(
      'opencode-request',
      { userRequest: opencodePrompt, emailRecipients: recipientEmail },
      () => opencodeWorkflow.execute({
        userRequest: opencodePrompt,
        emailRecipients: recipientEmail, // Pass email to opencode workflow
      }, services)
    );

    if (!excelResult.success) {
      console.log(`⚠️ OpenCode failed: ${excelResult.error}`);
      await logger.think(`⚠️ Hmm, something went wrong with OpenCode...`);
      
      return {
        success: false,
        message: `Research completed but Excel generation and email failed: ${excelResult.error}`,
        data: {
          businessType,
          city,
          maxResults,
          emailSent: false,
          excelGenerated: false,
        },
      };
    }

    console.log(`✅ OpenCode completed successfully`);
    await logger.think(`✅ Perfect! Excel file created and emailed!`);
    await logger.think(`📧 Check your inbox at ${recipientEmail}`);
    await logger.think(`🎉 All done! You should have a nice spreadsheet with the research results`);

    // ── RETURN SUCCESS ───────────────────────────────────────────────────────
    return {
      success: true,
      message: `Research completed. Found ${maxResults} ${businessType} in ${city}. Excel file sent to ${recipientEmail}`,
      data: {
        businessType,
        city,
        maxResults,
        filename,
        recipientEmail,
        excelGenerated: true,
        emailSent: true,
      },
    };

  } catch (error) {
    console.error(`❌ Workflow failed: ${error.message}`);
    await logger.think(`❌ Oops, something went wrong: ${error.message}`);
    
    // Clean up profile if still running
    if (profileId) {
      try {
        await pinchTab.stopInstanceByProfile(profileId!);
      } catch (_) {}
    }
    
    return {
      success: false,
      error: error.message,
      message: `Failed to complete research: ${error.message}`,
    };
  }
}
