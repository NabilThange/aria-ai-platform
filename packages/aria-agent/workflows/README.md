  # Workflow Development Guide

  ## 📚 Table of Contents
  1. [What are Workflows?](#what-are-workflows)
  2. [Workflow File Structure](#workflow-file-structure)
  3. [Available Services](#available-services)
  4. [Critical Rules & Gotchas](#critical-rules--gotchas)
  5. [Profile-Based Session Persistence](#profile-based-session-persistence)
  6. [Creating Your First Workflow](#creating-your-first-workflow)
  7. [Best Practices](#best-practices)
  8. [Common Patterns](#common-patterns)
  9. [Troubleshooting](#troubleshooting)

  ---

  ## What are Workflows?

  Workflows are pre-built, reusable automation scripts that the AI agent can discover and execute. They are:
  - **TypeScript files** (`.workflow.ts`) with full type safety
  - **Dynamically discovered** - just add a file to `workflows/`, no code changes needed
  - **Compiled to `dist/workflows/`** - the server runs the compiled `.js`, not the `.ts` directly
  - **Composable** - workflows can call other workflows

  > ⚠️ **Important:** After editing a `.workflow.ts` file, you must wait for the TypeScript watcher to say `Found 0 errors` before running it. The server loads from `dist/workflows/` — the compiled output.

  ---

  ## Workflow File Structure

  Every workflow file must export two things:

  ### 1. Metadata (Required)
  ```typescript
  export const metadata: WorkflowMetadata = {
    name: 'workflow-name',              // Unique identifier (kebab-case)
    description: 'What this workflow does',
    version: '1.0.0',                   // Bump this when you make changes
    timeout_ms: 30000,                  // Max execution time in milliseconds
    variables: [
      {
        name: 'variableName',
        type: 'string',                 // 'string' | 'number' | 'boolean' | 'object'
        required: true,
        description: 'What this variable is for',
        default: 'optional default'     // Only for non-required variables
      }
    ]
  };
  ```

  ### 2. Execute Function (Required)
  ```typescript
  export async function execute(
    variables: { variableName: string },
    services: WorkflowServices
  ): Promise<WorkflowResult> {
    try {
      // Your logic here
      return {
        success: true,
        message: 'What happened',
        data: { /* optional result data */ }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed: ${error.message}`
      };
    }
  }
  ```

  ---

  ## Available Services

  ### 1. PinchTabService — `services.pinchTab`

  Controls the browser (navigation, clicking, typing, etc.).
  Talks to `http://localhost:9867` (PinchTab server).

  **🔒 CRITICAL: Use Profile-Based Persistence for Login Sessions!**

  See [Profile-Based Session Persistence](#profile-based-session-persistence) section below for details.

  #### 🚀 Instance Management (30 tools total)

  ```typescript
  // ❌ OLD WAY (Ephemeral - loses sessions)
  const instance = await pinchTab.launchInstance('my-instance', 'headed');
  // Problem: Creates fresh browser, no cookies persist

  // ✅ NEW WAY (Persistent - keeps sessions)
  // 1. Create or get profile
  const profiles = await pinchTab.listProfiles();
  let profileId = profiles.find(p => p.name === 'workflow-profile')?.id;

  if (!profileId) {
    const profile = await pinchTab.createProfile('workflow-profile', 'Persistent profile for workflows');
    profileId = profile.id;
  }

  // 2. Start instance with profile
  const instance = await pinchTab.startInstanceWithProfile(profileId, 'headed');
  // ✅ Cookies and localStorage persist across restarts!

  // 3. When done, stop by profile (preserves data)
  await pinchTab.stopInstanceByProfile(profileId);
  ```

  **Profile Management Tools:**
  ```typescript
  await pinchTab.createProfile(name, description?)     // Create persistent profile
  await pinchTab.listProfiles()                        // List all profiles
  await pinchTab.getProfile(idOrName)                  // Get profile details
  await pinchTab.startInstanceWithProfile(profileId, mode)  // Start with profile
  await pinchTab.stopInstanceByProfile(profileId)      // Stop (preserves profile)
  await pinchTab.getProfileInstance(profileId)         // Check if running
  ```

  **Legacy Instance Management (Ephemeral):**
  ```typescript
  await pinchTab.launchInstance(name, mode)            // ⚠️ No persistence
  await pinchTab.listInstances()                       // List instances
  await pinchTab.stopInstance(instanceId)              // Stop instance
  await pinchTab.health()                              // Check PinchTab health
  ```

  #### 🧭 Navigation
  ```typescript
  await pinchTab.navigate(url)                         // Navigate to URL
  await pinchTab.switchTab(tabId)                      // Switch tabs
  await pinchTab.listTabs(instanceId?)                 // List open tabs
  ```

  #### 🎯 Actions (9 tools)
  ```typescript
  await pinchTab.click(ref)                            // Click element by ref
  await pinchTab.type(ref, text)                       // Type text (✅ WORKS)
  await pinchTab.press(key)                            // Press key (Enter, Escape, etc.)
  await pinchTab.submit(ref)                           // Submit form
  await pinchTab.scroll(direction, amount?)            // Scroll page
  await pinchTab.hover(ref)                            // Hover over element
  await pinchTab.focus(ref)                            // Focus element
  await pinchTab.select(ref, value)                    // Select dropdown option
  await pinchTab.wait(ms)                              // Wait milliseconds
  ```

  #### 📖 Read Operations (5 tools)
  ```typescript
  const snapshot = await pinchTab.snapshot(filter?)    // Get page snapshot
  const text = await pinchTab.getPageText()            // Extract full page text
  const screenshot = await pinchTab.takeScreenshot()   // Take screenshot
  const result = await pinchTab.evalJavaScript(script) // Run JavaScript
  const elements = await pinchTab.findElements(query)  // Find elements
  ```

  **Snapshot Example:**
  ```typescript
  const snapshot = await pinchTab.snapshot('interactive');
  const elements = snapshot.elements;  // Array of {ref, tag, text, attributes}

  // Find button by text
  const button = elements.find(el => 
    el.role === 'button' && el.text?.includes('Send')
  );

  if (button) {
    await pinchTab.click(button.ref);  // Click using ref
  }
  ```

  ### 2. DesktopService — `services.desktop`

  Controls the VNC desktop (mouse, keyboard, apps, files).
  Talks to `http://localhost:9990/computer-use`.

  #### 🖱️ Mouse Actions
  ```typescript
  await desktop.moveMouse(x, y)
  await desktop.click(x, y, button?)           // button: 'left' | 'right' | 'middle'
  await desktop.doubleClick(x, y)
  await desktop.rightClick(x, y)
  await desktop.clickMouse(coordinates?, button?, clickCount?, holdKeys?)
  await desktop.dragMouse(start, end, button?)
  await desktop.traceMouse(path, holdKeys?)
  await desktop.pressMouse('up' | 'down', button?, coordinates?)
  await desktop.getCursorPosition()            // returns {x, y}
  ```

  > ⚠️ **Avoid clicking by coordinates when possible** — coordinates break if the UI shifts. Use keyboard shortcuts and tab navigation instead.

  #### ⌨️ Keyboard Actions

  ```typescript
  await desktop.pasteText(text)        // ✅ PREFERRED — instant, reliable, handles special chars
  await desktop.typeText(text)         // ⚠️ slow, char by char, can miss characters
  await desktop.pressKeys(keys)        // e.g. ['Return'], ['Escape']
  await desktop.typeKeys(keys)         // same as pressKeys
  await desktop.shortcut(...keys)      // e.g. shortcut('LeftControl', 's')
  await desktop.typeAndEnter(text)     // pasteText + Return
  ```

  > ✅ **Always use `pasteText` over `typeText`** — it's instant, never drops characters, and handles URLs and special characters correctly.

  > ⚠️ **Key names matter:** Use `LeftControl` not `Control`, `Return` not `Enter`. Wrong key names silently fail.

  **Common key names:**
  | Action | Key string |
  |--------|-----------|
  | Enter / Return | `Return` |
  | Ctrl | `LeftControl` |
  | Alt | `LeftAlt` |
  | Shift | `LeftShift` |
  | Escape | `Escape` |
  | Tab | `Tab` |
  | Backspace | `BackSpace` |
  | Arrow keys | `Left`, `Right`, `Up`, `Down` |
  | F1–F12 | `F1` ... `F12` |

  #### 🖥️ System Actions
  ```typescript
  await desktop.launchApplication(app)  // see app names below
  await desktop.screenshot()            // returns { base64, width, height }
  await desktop.scroll('up' | 'down', amount?)
  await desktop.wait(ms)                // local timer, no API call
  ```

  **Available app names:** `chromium`, `gmail`, `vscode`, `terminal`, `thunar`, `mousepad`, `desktop`

  > ⚠️ **`desktop.wait()` is just a local `setTimeout`** — it does NOT make an API call. Always use it between steps to let the UI catch up.

  #### 📁 File Operations
  ```typescript
  // Write a file (content must be base64 encoded)
  await desktop.writeFile(path, base64Content)

  // Read a file (returns base64 encoded content)
  const result = await desktop.readFile(path)
  const text = Buffer.from(result.content, 'base64').toString('utf-8')
  ```

  > ⚠️ **File paths:** Relative paths resolve to `/home/user/Desktop/`. Use absolute paths (starting with `/`) to write elsewhere.

  > ⚠️ **Encoding:** Content MUST be base64. Always encode before writing:
  > ```typescript
  > const base64 = Buffer.from('your text here', 'utf-8').toString('base64');
  > await desktop.writeFile('/home/user/Desktop/notes.txt', base64);
  > ```

  ---

  ## Profile-Based Session Persistence

  ### 🔒 The Problem: Ephemeral Sessions

  **❌ OLD WAY (Loses Login State):**
  ```typescript
  // Workflow execution 1
  const instance = await pinchTab.launchInstance('my-instance', 'headed');
  await pinchTab.navigate('https://gmail.com');
  // ... user logs in manually ...
  await pinchTab.stopInstance(instance.id);

  // Workflow execution 2 (later)
  const instance2 = await pinchTab.launchInstance('my-instance', 'headed');
  await pinchTab.navigate('https://gmail.com');
  // ❌ NOT LOGGED IN - must log in again!
  ```

  **Why?** Each `launchInstance()` creates a fresh browser with no cookies or localStorage. When you stop the instance, all session data is lost.

  ### ✅ The Solution: Profile-Based Persistence

  Profiles are persistent browser profiles that save cookies, localStorage, and session data across restarts.

  **✅ NEW WAY (Keeps Login State):**
  ```typescript
  export async function execute(variables, services) {
    const { pinchTab } = services;
    
    // 1. Get or create persistent profile
    const profileName = 'workflow-gmail-profile';
    const profiles = await pinchTab.listProfiles();
    let profileId = profiles.find(p => p.name === profileName)?.id;
    
    if (!profileId) {
      console.log(`Creating new profile: ${profileName}`);
      const profile = await pinchTab.createProfile(
        profileName,
        'Persistent profile for Gmail workflows'
      );
      profileId = profile.id;
    } else {
      console.log(`Using existing profile: ${profileName} (${profileId})`);
    }
    
    // 2. Start instance with profile
    const instance = await pinchTab.startInstanceWithProfile(profileId, 'headed');
    console.log(`Instance started: ${instance.id}`);
    
    // 3. Navigate to Gmail
    await pinchTab.navigate('https://gmail.com');
    await pinchTab.wait(3000);
    
    // ... do your work ...
    
    // 4. Stop instance (profile data persists!)
    await pinchTab.stopInstanceByProfile(profileId);
    console.log('Instance stopped, profile data saved');
    
    return { success: true, message: 'Done' };
  }
  ```

  **Next execution:**
  ```typescript
  // Same profile, same cookies!
  const instance = await pinchTab.startInstanceWithProfile(profileId, 'headed');
  await pinchTab.navigate('https://gmail.com');
  // ✅ STILL LOGGED IN!
  ```

  ### Profile Management API

  ```typescript
  // Create profile
  const profile = await pinchTab.createProfile(name, description?, useWhen?);
  // Returns: { id: 'prof_abc123', name: 'my-profile' }

  // List all profiles
  const profiles = await pinchTab.listProfiles();
  // Returns: Array<{ id, name, running, diskUsage, ... }>

  // Get profile details
  const profile = await pinchTab.getProfile(idOrName);
  // Returns: { id, name, running, diskUsage, ... }

  // Start instance with profile
  const instance = await pinchTab.startInstanceWithProfile(profileId, mode);
  // mode: 'headed' | 'headless'
  // Returns: { id: 'inst_xyz789', url: '...' }

  // Check if profile has running instance
  const status = await pinchTab.getProfileInstance(profileId);
  // Returns: { running: boolean, id?: string, port?: string }

  // Stop instance by profile (preserves profile data)
  await pinchTab.stopInstanceByProfile(profileId);
  ```

  ### Best Practices

  1. **Use descriptive profile names:** `workflow-gmail-profile`, `workflow-github-profile`, etc.
  2. **Check if profile exists before creating:** Avoid creating duplicate profiles
  3. **One profile per service:** Don't mix Gmail and GitHub in the same profile
  4. **Always stop by profile:** Use `stopInstanceByProfile()` instead of `stopInstance()` to preserve data
  5. **Handle profile creation errors:** Profile might already exist from previous run

  ### Common Pattern: Profile Helper Function

  ```typescript
  async function getOrCreateProfile(
    pinchTab: PinchTabService,
    name: string,
    description: string
  ): Promise<string> {
    const profiles = await pinchTab.listProfiles();
    let profile = profiles.find(p => p.name === name);
    
    if (!profile) {
      console.log(`Creating profile: ${name}`);
      profile = await pinchTab.createProfile(name, description);
    } else {
      console.log(`Using existing profile: ${name} (${profile.id})`);
    }
    
    return profile.id;
  }

  // Usage in workflow
  const profileId = await getOrCreateProfile(
    pinchTab,
    'workflow-gmail',
    'Persistent Gmail profile'
  );

  const instance = await pinchTab.startInstanceWithProfile(profileId, 'headed');
  ```

  ### When to Use Profiles vs Ephemeral Instances

  **Use Profiles When:**
  - ✅ Workflow requires login (Gmail, GitHub, social media)
  - ✅ Need to maintain session state across executions
  - ✅ Want to preserve cookies, localStorage, or preferences
  - ✅ Workflow runs multiple times with same account

  **Use Ephemeral Instances When:**
  - ✅ One-time scraping or data extraction
  - ✅ No login required
  - ✅ Fresh browser state needed each time
  - ✅ Testing or development

  ### Troubleshooting Profile Issues

  **Profile not persisting sessions:**
  ```typescript
  // Check if profile exists
  const profiles = await pinchTab.listProfiles();
  console.log('Profiles:', profiles);

  // Check if instance is running
  const status = await pinchTab.getProfileInstance(profileId);
  console.log('Running:', status.running);

  // Verify cookies after restart
  const instance = await pinchTab.startInstanceWithProfile(profileId, 'headed');
  await pinchTab.navigate('https://gmail.com');
  // Check if logged in
  ```

  **Profile already has running instance:**
  ```typescript
  const status = await pinchTab.getProfileInstance(profileId);
  if (status.running) {
    console.log('Instance already running, stopping first...');
    await pinchTab.stopInstanceByProfile(profileId);
    await pinchTab.wait(2000);
  }

  const instance = await pinchTab.startInstanceWithProfile(profileId, 'headed');
  ```

  ---

  ### 2. AI Integration — `services.groq` (Groq API)

  Workflows can call AI models for content generation, summarization, analysis, and decision-making.

  #### 🤖 How to Call Groq in Workflows

  **Direct API Call (Recommended for Workflows):**
  ```typescript
  async function callGroqAI(systemPrompt: string, userContent: string): Promise<string> {
    // Key rotation is automatic via env variable fallback
    const groqApiKey = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY;
    
    if (!groqApiKey) {
      throw new Error('No Groq API key found. Set GROQ_API_KEY_1 or GROQ_API_KEY');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',  // Recommended for workflows
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
  ```

  #### 🔑 API Key Rotation

  The system automatically handles key rotation:
  - Loads `GROQ_API_KEY_1`, `GROQ_API_KEY_2`, `GROQ_API_KEY_3`, etc. from `.env`
  - Falls back to single `GROQ_API_KEY` if no numbered keys exist
  - Automatically rotates on rate limits or quota errors
  - You don't need to implement fallback logic yourself

  **Add to your `.env` file:**
  ```bash
  GROQ_API_KEY_1=gsk_xxxxxxxxxxxxx
  GROQ_API_KEY_2=gsk_yyyyyyyyyyyyy
  GROQ_API_KEY_3=gsk_zzzzzzzzzzzzz
  ```

  #### 🎯 Recommended Models

  Based on `agents.config.ts`, use these models for different tasks:

  | Model | Use Case | Speed | Quality |
  |-------|----------|-------|---------|
  | `openai/gpt-oss-20b` | ✅ **Default for workflows** - Fast Q&A, summarization, simple tasks | ⚡⚡⚡ | ⭐⭐⭐ |
  | `openai/gpt-oss-120b` | Complex reasoning, detailed analysis | ⚡⚡ | ⭐⭐⭐⭐ |
  | `llama-3.1-8b-instant` | Ultra-fast simple tasks | ⚡⚡⚡⚡ | ⭐⭐ |
  | `llama-3.3-70b-versatile` | Best Llama model, balanced | ⚡⚡ | ⭐⭐⭐⭐ |
  | `meta-llama/llama-4-scout-17b-16e-instruct` | Vision tasks (screenshots) | ⚡⚡⚡ | ⭐⭐⭐ |

  #### 📝 Example: Summarize URL Content

  ```typescript
  import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';

  export const metadata: WorkflowMetadata = {
    name: 'summarize-url',
    description: 'Fetch and summarize content from a URL using AI',
    version: '1.0.0',
    timeout_ms: 30000,
    variables: [
      { name: 'url', type: 'string', required: true, description: 'URL to summarize' }
    ]
  };

  async function callGroqAI(systemPrompt: string, userContent: string): Promise<string> {
    const groqApiKey = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY;
    
    if (!groqApiKey) {
      throw new Error('No Groq API key found');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  export async function execute(
    variables: { url: string },
    services: WorkflowServices
  ): Promise<WorkflowResult> {
    const { pinchTab } = services;
    const { url } = variables;

    try {
      // Step 1: Fetch page content
      const instance = await pinchTab.launchInstance(`summarize-${Date.now()}`, 'headless');
      pinchTab.setCurrentInstance(instance.id);
      
      await pinchTab.navigate(url);
      await pinchTab.wait(3000);
      
      const pageText = await pinchTab.getPageText();
      
      // Step 2: Summarize with AI
      const systemPrompt = 'You are a helpful assistant that creates concise summaries of web content.';
      const userPrompt = `Summarize the following content in 3-5 bullet points:\n\n${pageText.slice(0, 8000)}`;
      
      const summary = await callGroqAI(systemPrompt, userPrompt);
      
      // Step 3: Clean up
      await pinchTab.stopInstance(instance.id);
      
      return {
        success: true,
        message: 'URL summarized successfully',
        data: { url, summary }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to summarize: ${error.message}`
      };
    }
  }
  ```

  #### 📊 Example: Analyze Screenshot with Vision Model

  ```typescript
  export const metadata: WorkflowMetadata = {
    name: 'analyze-screenshot',
    description: 'Take a screenshot and analyze it with AI vision',
    version: '1.0.0',
    timeout_ms: 20000,
    variables: [
      { name: 'question', type: 'string', required: true, description: 'What to analyze in the screenshot' }
    ]
  };

  export async function execute(
    variables: { question: string },
    services: WorkflowServices
  ): Promise<WorkflowResult> {
    const { desktop } = services;
    const { question } = variables;

    try {
      // Step 1: Take screenshot
      const screenshot = await desktop.screenshot();
      
      // Step 2: Analyze with vision model
      const groqApiKey = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY;
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',  // Vision model
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: question },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${screenshot.base64}` } }
              ]
            }
          ],
        }),
      });

      const data = await response.json();
      const analysis = data.choices[0].message.content;
      
      return {
        success: true,
        message: 'Screenshot analyzed',
        data: { question, analysis }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Analysis failed: ${error.message}`
      };
    }
  }
  ```

  #### 🎨 Common AI Use Cases in Workflows

  **Content Generation:**
  ```typescript
  const systemPrompt = 'You are a professional email writer.';
  const userPrompt = `Write a professional email to ${recipient} about ${topic}`;
  const email = await callGroqAI(systemPrompt, userPrompt);
  ```

  **Data Extraction:**
  ```typescript
  const systemPrompt = 'Extract structured data from text. Return only valid JSON.';
  const userPrompt = `Extract name, email, and phone from: ${text}`;
  const extracted = JSON.parse(await callGroqAI(systemPrompt, userPrompt));
  ```

  **Decision Making:**
  ```typescript
  const systemPrompt = 'You are a task classifier. Return only: "urgent", "normal", or "low".';
  const userPrompt = `Classify priority: ${taskDescription}`;
  const priority = await callGroqAI(systemPrompt, userPrompt);
  ```

  **Translation:**
  ```typescript
  const systemPrompt = 'You are a translator. Translate to Spanish.';
  const userPrompt = text;
  const translated = await callGroqAI(systemPrompt, userPrompt);
  ```

  #### ⚠️ Best Practices

  1. **Truncate long content:** Groq models have 128K context but stay under 8K tokens for speed
  2. **Use specific system prompts:** Clear instructions = better results
  3. **Handle API errors:** Wrap in try-catch, check response.ok
  4. **Set reasonable timeouts:** AI calls can take 2-10 seconds
  5. **Don't send sensitive data:** API calls go to external servers
  6. **Use headless mode:** For AI-only workflows, use `'headless'` to save resources
  7. **Cache results:** If calling AI multiple times with same input, cache the response

  #### 🚨 Common Pitfalls

  | Issue | Cause | Fix |
  |-------|-------|-----|
  | `No API key found` | Missing env variable | Add `GROQ_API_KEY_1` to `.env` |
  | `429 Rate Limit` | Too many requests | Add multiple keys (`GROQ_API_KEY_2`, etc.) |
  | `Context length exceeded` | Input too long | Truncate to ~8000 chars: `text.slice(0, 8000)` |
  | Empty response | Wrong model or bad prompt | Check model name, improve prompt clarity |
  | Timeout | AI taking too long | Increase workflow `timeout_ms` or use faster model |

  ---

  ### 3. PinchTabService — `services.pinchTab`

  Controls a Chromium browser with named element refs. Much more reliable than VNC clicking for web tasks.
  Talks to `http://localhost:9867`.

  #### Instance Management
  ```typescript
  // Launch a visible browser (shows in VNC)
  const instance = await pinchTab.launchInstance('my-instance', 'headed');
  pinchTab.setCurrentInstance(instance.id);

  // Launch headless (background, no UI)
  const instance = await pinchTab.launchInstance('my-instance', 'headless');

  // Stop instance when done (or leave open — see note below)
  await pinchTab.stopInstance(instance.id);
  ```

  > 💡 **Leave browser open** if you want the user to see results or continue in the same session. Only call `stopInstance` if you want to clean up.

  > ⚠️ **Each `launchInstance` call creates a fresh browser with no cookies/login state.** If you need an already-logged-in browser (e.g. Gmail), use the existing VNC browser via `desktop.launchApplication('chromium')` instead.

  #### Navigation & Snapshots
  ```typescript
  // Navigate to URL (returns tabId)
  const tabId = await pinchTab.navigate('https://example.com');

  // Wait for page to load
  await pinchTab.wait(3000);

  // Get page elements
  const snapshot = await pinchTab.snapshot('interactive'); // or 'all'
  const elements = (snapshot as any).nodes || (snapshot as any).elements || [];
  ```

  > ⚠️ **Always take a fresh snapshot after any action that changes the page.** Element refs become invalid after navigation or clicks.

  #### Actions
  ```typescript
  await pinchTab.click(ref)             // ✅ click by ref — reliable
  await pinchTab.type(ref, text)        // ✅ type into element — works
  // await pinchTab.fill(ref, value)    // ❌ BROKEN — returns empty, do not use
  await pinchTab.press(key)             // ⚠️ types the word "Enter" literally — use click instead
  await pinchTab.scroll('up'|'down', amount)
  await pinchTab.wait(ms)
  await pinchTab.listTabs(instanceId?)
  await pinchTab.switchTab(tabId)
  ```

  > ⚠️ **`pinchTab.press()` is broken** — it types the key name as text instead of pressing the key. To submit a form, click the submit button ref instead.

  > ⚠️ **`pinchTab.fill()` is broken** — returns empty and does nothing. Always use `pinchTab.type()`.

  ---

  ## Critical Rules & Gotchas

  ### 🔴 Never use `response.json()` directly
  The desktop and pinchtab APIs sometimes return empty bodies. Using `.json()` on an empty response throws `"Unexpected end of JSON input"` and crashes the workflow. Always use `.text()` then parse:

  ```typescript
  const raw = await response.text();
  const result = raw ? JSON.parse(raw) : {};
  ```

  This is already handled inside `DesktopService` and `PinchTabService` — but if you ever make direct `fetch()` calls in a workflow, use this pattern.

  ### 🔴 Google Search = CAPTCHA
  Never navigate to `https://www.google.com` in workflows. Google detects automation and shows a CAPTCHA. Use **DuckDuckGo** instead:
  ```typescript
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;
  await pinchTab.navigate(url);
  ```

  ### 🔴 PinchTab launches a fresh browser — no login state
  Every `launchInstance()` starts a brand new browser profile. If the user is logged into Gmail in their VNC browser, a new PinchTab instance won't be. For tasks requiring login (Gmail, etc.), use:
  ```typescript
  // Use VNC browser which already has the session
  await desktop.launchApplication('chromium');
  await desktop.wait(3000);
  await desktop.pasteText('https://mail.google.com/mail/?view=cm&fs=1&to=...');
  await desktop.pressKeys(['Return']);
  ```

  ### 🔴 Mousepad opens files as read-only by default
  If you open Mousepad and try to paste then save, it will show a "read-only" popup. The correct pattern is:
  1. **Write the file first** using `desktop.writeFile()`
  2. **Then open it** in Mousepad via `Ctrl+O`
  3. The file is already writable — `Ctrl+S` saves instantly with no popup

  ### 🟡 Wait times matter
  Always add `wait()` between steps. Recommended minimums:
  | Action | Wait after |
  |--------|-----------|
  | `launchApplication()` | 2000ms |
  | `navigate()` (browser) | 3000ms |
  | `shortcut()` that opens dialog | 1000ms |
  | `pasteText()` | 250ms |
  | `pressKeys(['Return'])` | 500ms |

  ---

  ## Creating Your First Workflow

  ### Example: Write a note to the desktop

  ```typescript
  import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';

  export const metadata: WorkflowMetadata = {
    name: 'write-note',
    description: 'Write a text note to the desktop',
    version: '1.0.0',
    timeout_ms: 20000,
    variables: [
      { name: 'text', type: 'string', required: true, description: 'Note content' },
      { name: 'filename', type: 'string', required: false, description: 'Filename', default: 'note.txt' }
    ]
  };

  export async function execute(
    variables: { text: string; filename?: string },
    services: WorkflowServices
  ): Promise<WorkflowResult> {
    const { desktop } = services;
    const { text, filename = 'note.txt' } = variables;
    const filePath = `/home/user/Desktop/${filename}`;

    try {
      // Step 1: Write file to disk first (avoids Mousepad read-only issue)
      const base64 = Buffer.from(text, 'utf-8').toString('base64');
      await desktop.writeFile(filePath, base64);
      await desktop.wait(250);

      // Step 2: Open Mousepad
      await desktop.launchApplication('mousepad');
      await desktop.wait(2000);

      // Step 3: Open the file via Ctrl+O (no clicking needed)
      await desktop.shortcut('LeftControl', 'o');
      await desktop.wait(1000);

      // Step 4: Type the file path and open
      await desktop.shortcut('LeftControl', 'a'); // select all in path field
      await desktop.wait(150);
      await desktop.pasteText(filePath);
      await desktop.wait(250);
      await desktop.pressKeys(['Return']);
      await desktop.wait(500);

      return {
        success: true,
        message: `Note saved to ${filename}`,
        data: { filePath }
      };
    } catch (error) {
      return { success: false, error: error.message, message: `Failed: ${error.message}` };
    }
  }
  ```

  ---

  ## Best Practices

  1. **Always wrap in try-catch** — return `{ success: false }` on error, never throw
  2. **Use `pasteText` not `typeText`** — faster, more reliable, no dropped characters
  3. **Use `LeftControl` not `Control`** — key names must match exactly
  4. **Write files before opening them** — avoids read-only issues in GUI editors
  5. **Use DuckDuckGo not Google** — Google blocks automation with CAPTCHA
  6. **Don't close browser instances** unless necessary — leave them open for the user to see
  7. **Log every step** with `console.log('✅ Step X: ...')` — makes debugging easy
  8. **Bump the version** in metadata when you change a workflow — helps identify stale compiled files
  9. **Never use `pinchTab.fill()`** — it's broken, use `pinchTab.type()` instead
  10. **Never use `pinchTab.press()`** — it types the key name literally, click the button instead

  ---

  ## Common Patterns

  ### Open a URL in the existing VNC browser (already logged in)
  ```typescript
  await desktop.launchApplication('chromium');
  await desktop.wait(3000);
  await desktop.pasteText('https://example.com');
  await desktop.pressKeys(['Return']);
  ```

  ### Send an email via Gmail (using existing login session)
  ```typescript
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1` +
    `&to=${encodeURIComponent(to)}` +
    `&su=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  await desktop.launchApplication('chromium');
  await desktop.wait(3000);
  await desktop.pasteText(gmailUrl);
  await desktop.pressKeys(['Return']);
  await desktop.wait(4000);
  // Gmail compose window is now open — user can click Send
  // Or use Ctrl+Enter to send automatically:
  await desktop.shortcut('LeftControl', 'Return');
  ```

  ### Search DuckDuckGo (bot-friendly)
  ```typescript
  const instance = await pinchTab.launchInstance(`search-${Date.now()}`, 'headed');
  pinchTab.setCurrentInstance(instance.id);
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;
  await pinchTab.navigate(url);
  await pinchTab.wait(4000);
  const snapshot = await pinchTab.snapshot('all');
  const elements = (snapshot as any).nodes || (snapshot as any).elements || [];
  const results = elements
    .filter((el: any) => (el.tag === 'h2' || el.tag === 'h3') && el.text?.trim().length > 5)
    .slice(0, 10)
    .map((el: any) => el.text.trim());
  ```

  ### Write and read a file
  ```typescript
  // Write
  const base64 = Buffer.from('Hello World', 'utf-8').toString('base64');
  await desktop.writeFile('/home/user/Desktop/output.txt', base64);

  // Read back
  const result = await desktop.readFile('/home/user/Desktop/output.txt');
  const text = Buffer.from(result.content, 'base64').toString('utf-8');
  ```

  ### Workflow composition (call another workflow)
  ```typescript
  import * as searchWorkflow from './google-search.workflow';

  const searchResult = await searchWorkflow.execute({ query: 'AI tools' }, services);
  if (!searchResult.success) return searchResult; // propagate failure
  ```

  ---

  ## Troubleshooting

  | Error | Cause | Fix |
  |-------|-------|-----|
  | `Unexpected end of JSON input` | API returned empty body, `.json()` crashed | Already fixed in service — if doing raw fetch, use `.text()` then parse |
  | `Unknown action: launch_application` | Wrong action name | Use `application` not `launch_application` |
  | `data must be a string` | `writeFile` sent `content` field | Use `data` field — already fixed in service |
  | `HTTP 400 Bad Request` | Wrong action name or wrong field name | Check VNC guide for exact action names |
  | Results empty from search | Google CAPTCHA | Switch to DuckDuckGo |
  | Mousepad "read-only" popup | Opened Mousepad before file exists | Write file first with `writeFile()`, then open with `Ctrl+O` |
  | Gmail shows login page | PinchTab launched fresh browser | Use `desktop.launchApplication('chromium')` to reuse existing session |
  | Text missing first character | App not ready when typing started | Increase wait after `launchApplication` to at least 2000ms |
  | `press_keys` action unknown | Old wrong action name | Use `type_keys` — already fixed in service |

  ---

  ## API Reference

  ### VNC Desktop API (`http://localhost:9990/computer-use`)

  All requests are `POST` with `Content-Type: application/json`.

  | Action | Required fields | Notes |
  |--------|----------------|-------|
  | `application` | `application` | App names: chromium, gmail, vscode, terminal, thunar, mousepad, desktop |
  | `paste_text` | `text` | Preferred over type_text |
  | `type_text` | `text`, `delay?` | Slow, avoid if possible |
  | `type_keys` | `keys: string[]` | e.g. `["LeftControl", "s"]` |
  | `click_mouse` | `coordinates: {x,y}`, `button?`, `clickCount?` | |
  | `scroll` | `direction`, `scrollCount?` | Note: `scrollCount` not `amount` |
  | `screenshot` | — | Returns `{base64, width, height}` |
  | `write_file` | `path`, `data` (base64) | Note: field is `data` not `content` |
  | `read_file` | `path` | Returns `{data}` base64 encoded |
  | `move_mouse` | `coordinates: {x,y}` | |
  | `drag_mouse` | `start`, `end`, `button?` | |
  | `cursor_position` | — | Returns `{x, y}` |

  ### PinchTab Browser API (`http://localhost:9867`)

  | Endpoint | Method | Description |
  |----------|--------|-------------|
  | `/health` | GET | Health check |
  | `/instances` | GET | List all instances |
  | `/instances/launch` | POST | `{name, mode: 'headed'\|'headless'}` |
  | `/instances/:id/stop` | POST | Stop instance |
  | `/instances/:id/tabs` | GET | List tabs |
  | `/instances/:id/tabs/open` | POST | `{url}` — returns `{tabId}` |
  | `/tabs/:tabId/snapshot` | GET | `?filter=interactive\|all` |
  | `/tabs/:tabId/action` | POST | `{kind, ref?, text?, ...}` |

  **Working action kinds:** `click`, `type` ✅  
  **Broken action kinds:** `fill` ❌, `press` ❌ (types key name literally)

  ---

  ## N8N Integration - External Workflow Orchestration

  ### 🎯 Why Integrate N8N with ARIA Workflows?

  N8N is a powerful workflow automation platform with 400+ pre-built integrations. By combining ARIA workflows with N8N, you can:

  - ✅ **Offload complexity** - Let N8N handle OAuth, API keys, rate limits, and service-specific logic
  - ✅ **Visual workflow builder** - Create complex integrations without code
  - ✅ **Reusability** - One N8N workflow can be triggered by multiple ARIA workflows
  - ✅ **Advanced features** - Conditional logic, error handling, retries, data transformation
  - ✅ **400+ integrations** - Email (Gmail, Outlook), Messaging (Telegram, WhatsApp, Slack), Databases, CRM, Storage, and more

  ### 🏗️ Architecture Pattern

  ```
  ┌─────────────────────────────────────────────────────────────┐
  │ ARIA Workflow (.workflow.ts)                               │
  │                                                             │
  │  1. Perform AI/automation tasks (search, scrape, analyze)  │
  │  2. Prepare data payload                                    │
  │  3. Trigger N8N webhook ──────────────────────────┐        │
  └─────────────────────────────────────────────────────│────────┘
                                                        │
                                                        ▼
                                      ┌─────────────────────────────┐
                                      │ N8N Workflow (Hosted)       │
                                      │                             │
                                      │  1. Receive webhook data    │
                                      │  2. Process/transform data  │
                                      │  3. Send via Gmail API      │
                                      │  4. Post to Telegram        │
                                      │  5. Log to database         │
                                      │  6. Return success response │
                                      └─────────────────────────────┘
  ```

  ### 📋 Setup Guide

  #### Step 1: Set Up N8N

  **Option A: Self-Hosted (Docker)**
  ```bash
  docker run -it --rm \
    --name n8n \
    -p 5678:5678 \
    -v ~/.n8n:/home/node/.n8n \
    n8nio/n8n

  # Access at: http://localhost:5678
  ```

  **Option B: N8N Cloud**
  - Sign up at https://n8n.cloud
  - Get instant hosted instance (no setup needed)

  #### Step 2: Create N8N Workflow

  1. **Add Webhook Trigger Node:**
    - Click "+" → Search "Webhook"
    - Set HTTP Method: `POST`
    - Set Path: `/aria-email` (or any unique path)
    - Copy the webhook URL (e.g., `https://your-n8n.com/webhook/aria-email`)

  2. **Add Processing Nodes:**
    - Gmail node (for email)
    - Telegram node (for messaging)
    - HTTP Request node (for APIs)
    - Code node (for data transformation)

  3. **Configure Response:**
    - Add "Respond to Webhook" node
    - Return JSON: `{"success": true, "message": "Email sent"}`

  4. **Activate Workflow:**
    - Click "Active" toggle in top-right
    - Test with curl to verify it works

  #### Step 3: Add N8N URL to ARIA Environment

  ```bash
  # packages/aria-agent/.env
  N8N_WEBHOOK_EMAIL=https://your-n8n.com/webhook/aria-email
  N8N_WEBHOOK_TELEGRAM=https://your-n8n.com/webhook/aria-telegram
  N8N_WEBHOOK_SLACK=https://your-n8n.com/webhook/aria-slack
  ```

  ### 🔧 How to Call N8N from ARIA Workflows

  #### Method 1: Direct HTTP Request (Recommended)

  ```typescript
  import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';

  export const metadata: WorkflowMetadata = {
    name: 'trigger-n8n-email',
    description: 'Send email via N8N webhook',
    version: '1.0.0',
    timeout_ms: 30000,
    variables: [
      { name: 'to', type: 'string', required: true, description: 'Recipient email' },
      { name: 'subject', type: 'string', required: true, description: 'Email subject' },
      { name: 'body', type: 'string', required: true, description: 'Email body' },
    ],
  };

  export async function execute(
    variables: { to: string; subject: string; body: string },
    services: WorkflowServices,
  ): Promise<WorkflowResult> {
    const { to, subject, body } = variables;
    const webhookUrl = process.env.N8N_WEBHOOK_EMAIL;

    if (!webhookUrl) {
      return {
        success: false,
        error: 'N8N_WEBHOOK_EMAIL not configured in .env',
      };
    }

    try {
      console.log(`📧 Triggering N8N email workflow for: ${to}`);

      // Call N8N webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body }),
      });

      // Parse response
      const responseText = await response.text();
      const result = responseText ? JSON.parse(responseText) : {};

      if (!response.ok) {
        throw new Error(`N8N webhook failed: ${response.status} - ${responseText}`);
      }

      console.log(`✅ N8N response:`, result);

      return {
        success: true,
        message: `Email sent to ${to} via N8N`,
        data: { n8n_response: result },
      };
    } catch (error) {
      console.error(`❌ N8N webhook error:`, error);
      return {
        success: false,
        error: error.message,
        message: `Failed to trigger N8N: ${error.message}`,
      };
    }
  }
  ```

  #### Method 2: Via Terminal in VNC (Alternative)

  ```typescript
  export async function execute(
    variables: { to: string; subject: string; body: string },
    services: WorkflowServices,
  ): Promise<WorkflowResult> {
    const { desktop } = services;
    const { to, subject, body } = variables;
    const webhookUrl = process.env.N8N_WEBHOOK_EMAIL;

    try {
      console.log(`📧 Triggering N8N via terminal...`);

      // Open terminal
      await desktop.launchApplication('terminal');
      await desktop.wait(2000);

      // Build curl command
      const curlCommand = `curl -X POST "${webhookUrl}" \\
        -H "Content-Type: application/json" \\
        -d '{"to":"${to}","subject":"${subject}","body":"${body}"}'`;

      // Execute curl command
      await desktop.pasteText(curlCommand);
      await desktop.pressKeys(['Return']);
      await desktop.wait(3000);

      // Take screenshot to verify response
      const screenshot = await desktop.screenshot();

      return {
        success: true,
        message: `N8N webhook triggered via terminal`,
        data: { screenshot: screenshot.base64 },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
  ```

  ### 📊 N8N Response Format - Best Practices

  #### ✅ Recommended N8N Response Structure

  Your N8N workflow should return a consistent JSON response:

  ```json
  {
    "success": true,
    "message": "Email sent successfully",
    "data": {
      "messageId": "abc123",
      "timestamp": "2026-03-21T10:00:00Z",
      "recipient": "user@example.com"
    }
  }
  ```

  **Or on error:**
  ```json
  {
    "success": false,
    "error": "Failed to send email: Invalid recipient",
    "code": "INVALID_RECIPIENT"
  }
  ```

  #### 🔍 How to Verify N8N Success from VNC

  When using terminal method, you can verify success by:

  **1. Check Terminal Output:**
  ```typescript
  // After executing curl command, take screenshot
  const screenshot = await desktop.screenshot();

  // Or read terminal output (if saved to file)
  await desktop.pasteText(' > /tmp/n8n_response.json');
  await desktop.pressKeys(['Return']);
  await desktop.wait(1000);

  const result = await desktop.readFile('/tmp/n8n_response.json');
  const responseText = Buffer.from(result.content, 'base64').toString('utf-8');
  const n8nResponse = JSON.parse(responseText);

  if (n8nResponse.success) {
    console.log('✅ N8N workflow succeeded:', n8nResponse.message);
  } else {
    console.log('❌ N8N workflow failed:', n8nResponse.error);
  }
  ```

  **2. Visual Verification:**
  ```typescript
  // Take screenshot after curl command
  await desktop.wait(3000);
  const screenshot = await desktop.screenshot();

  // Use AI to analyze terminal output
  const analysis = await analyzeScreenshotWithAI(
    screenshot.base64,
    'Does the terminal show "success": true in the response?'
  );

  return {
    success: analysis.includes('success'),
    message: 'N8N webhook triggered',
    data: { terminal_output: analysis },
  };
  ```

  **3. HTTP Status Code Check:**
  ```typescript
  // Save curl output with verbose flag
  const curlCommand = `curl -X POST "${webhookUrl}" \\
    -H "Content-Type: application/json" \\
    -d '${JSON.stringify(payload)}' \\
    -w "\\nHTTP_STATUS:%{http_code}" \\
    -o /tmp/n8n_response.txt`;

  await desktop.pasteText(curlCommand);
  await desktop.pressKeys(['Return']);
  await desktop.wait(3000);

  // Read response file
  const result = await desktop.readFile('/tmp/n8n_response.txt');
  const output = Buffer.from(result.content, 'base64').toString('utf-8');

  // Check if HTTP 200
  if (output.includes('HTTP_STATUS:200')) {
    console.log('✅ N8N returned HTTP 200');
    return { success: true, message: 'N8N workflow succeeded' };
  } else {
    console.log('❌ N8N returned error status');
    return { success: false, error: 'N8N webhook failed' };
  }
  ```

  ### 🎨 Complete Example: Search + Summarize + N8N Email

  ```typescript
  import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';
  import * as googleSearchWorkflow from './google-search.workflow';

  export const metadata: WorkflowMetadata = {
    name: 'research-and-email-n8n',
    description: 'Search Google, summarize with AI, send via N8N',
    version: '1.0.0',
    timeout_ms: 60000,
    variables: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
      { name: 'to', type: 'string', required: true, description: 'Recipient email' },
    ],
  };

  export async function execute(
    variables: { query: string; to: string },
    services: WorkflowServices,
  ): Promise<WorkflowResult> {
    const { query, to } = variables;
    const webhookUrl = process.env.N8N_WEBHOOK_EMAIL;

    try {
      // Step 1: Search Google
      console.log(`🔍 Searching for: ${query}`);
      const searchResult = await googleSearchWorkflow.execute({ query }, services);

      if (!searchResult.success) {
        throw new Error('Search failed');
      }

      const results = searchResult.data.results.slice(0, 5);

      // Step 2: Summarize with Groq AI
      console.log(`🤖 Summarizing results...`);
      const summary = await callGroqAI(
        'You are a research assistant. Summarize search results concisely.',
        `Query: ${query}\n\nResults:\n${results.join('\n')}`
      );

      // Step 3: Trigger N8N to send email
      console.log(`📧 Sending via N8N to: ${to}`);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: `Research Summary: ${query}`,
          body: summary,
          results,
          metadata: {
            query,
            resultCount: results.length,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const responseText = await response.text();
      const n8nResponse = responseText ? JSON.parse(responseText) : {};

      if (!response.ok) {
        throw new Error(`N8N failed: ${response.status} - ${responseText}`);
      }

      console.log(`✅ N8N response:`, n8nResponse);

      return {
        success: true,
        message: `Research completed and sent to ${to}`,
        data: {
          query,
          summary,
          results,
          n8n_response: n8nResponse,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Workflow failed: ${error.message}`,
      };
    }
  }

  // Helper: Call Groq AI
  async function callGroqAI(system: string, user: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY;
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });
    const data = await res.json();
    return data.choices[0].message.content;
  }
  ```

  ### 🔐 N8N Workflow Configuration Examples

  #### Example 1: Email Workflow

  **N8N Nodes:**
  1. **Webhook Trigger** - Receives data from ARIA
  2. **Set Node** - Extract variables: `{{ $json.to }}`, `{{ $json.subject }}`, `{{ $json.body }}`
  3. **Gmail Node** - Send email using Gmail API
  4. **Respond to Webhook** - Return success response

  **Gmail Node Configuration:**
  - Resource: `Message`
  - Operation: `Send`
  - To: `{{ $json.to }}`
  - Subject: `{{ $json.subject }}`
  - Message: `{{ $json.body }}`

  **Response:**
  ```json
  {
    "success": true,
    "message": "Email sent successfully",
    "data": {
      "messageId": "{{ $json.id }}",
      "threadId": "{{ $json.threadId }}"
    }
  }
  ```

  #### Example 2: Multi-Channel Notification

  **N8N Nodes:**
  1. **Webhook Trigger**
  2. **Gmail Node** - Send email
  3. **Telegram Node** - Send Telegram message
  4. **Slack Node** - Post to Slack channel
  5. **HTTP Request Node** - Log to external API
  6. **Respond to Webhook** - Return aggregated results

  **Response:**
  ```json
  {
    "success": true,
    "message": "Notifications sent to all channels",
    "data": {
      "email": {"sent": true, "messageId": "abc123"},
      "telegram": {"sent": true, "messageId": 456},
      "slack": {"sent": true, "timestamp": "1234567890.123456"},
      "logged": true
    }
  }
  ```

  #### Example 3: Conditional Logic

  **N8N Nodes:**
  1. **Webhook Trigger**
  2. **IF Node** - Check if `priority === "urgent"`
  3. **Branch A (Urgent):** Send via Telegram + Email
  4. **Branch B (Normal):** Send via Email only
  5. **Merge Node** - Combine branches
  6. **Respond to Webhook**

  ### 🚨 Error Handling Best Practices

  #### In ARIA Workflow:

  ```typescript
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const responseText = await response.text();
    const result = responseText ? JSON.parse(responseText) : {};

    // Check HTTP status
    if (!response.ok) {
      console.error(`❌ N8N HTTP ${response.status}:`, responseText);
      return {
        success: false,
        error: `N8N webhook failed with status ${response.status}`,
        data: { status: response.status, response: responseText },
      };
    }

    // Check N8N response format
    if (result.success === false) {
      console.error(`❌ N8N workflow failed:`, result.error);
      return {
        success: false,
        error: result.error || 'N8N workflow failed',
        data: result,
      };
    }

    console.log(`✅ N8N workflow succeeded:`, result.message);
    return {
      success: true,
      message: result.message || 'N8N workflow completed',
      data: result.data,
    };
  } catch (error) {
    console.error(`❌ N8N webhook error:`, error);
    return {
      success: false,
      error: error.message,
      message: `Failed to trigger N8N: ${error.message}`,
    };
  }
  ```

  #### In N8N Workflow:

  1. **Add Error Trigger Node** - Catches errors from any node
  2. **Add Error Handler Nodes:**
    - Log error to database
    - Send error notification
    - Return error response to ARIA

  3. **Configure Retry Logic:**
    - Set "Retry On Fail" in node settings
    - Max Retries: 3
    - Wait Between Retries: 1000ms

  ### 📈 Benefits Summary

  | Feature | Without N8N | With N8N |
  |---------|-------------|----------|
  | **Email Sending** | Implement SMTP/API in workflow | Use Gmail node (OAuth handled) |
  | **Telegram Bot** | Manage bot token, API calls | Use Telegram node (pre-configured) |
  | **Error Handling** | Manual try-catch in code | Visual error branches + retries |
  | **Rate Limiting** | Implement custom logic | Built-in rate limit handling |
  | **Multi-Channel** | Multiple API integrations | Single webhook → multiple outputs |
  | **Maintenance** | Update workflow code | Update N8N workflow visually |
  | **Reusability** | Copy-paste code | One N8N workflow, many ARIA triggers |

  ### 🎯 When to Use N8N vs Native ARIA

  **Use N8N When:**
  - ✅ Need OAuth authentication (Gmail, Google Drive, etc.)
  - ✅ Multiple output channels (email + Telegram + Slack)
  - ✅ Complex conditional logic
  - ✅ Need visual workflow builder for non-coders
  - ✅ Want centralized integration management

  **Use Native ARIA When:**
  - ✅ Simple HTTP API calls
  - ✅ Need AI integration (Groq, Claude)
  - ✅ Browser automation (PinchTab)
  - ✅ Desktop control (VNC)
  - ✅ File operations
  - ✅ Screenshot analysis

  **Best Practice:** Combine both! Use ARIA for AI/automation, N8N for integrations.

  ---

  **Happy workflow building! 🚀**