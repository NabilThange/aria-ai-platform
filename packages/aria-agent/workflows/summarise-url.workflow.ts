import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';

export const metadata: WorkflowMetadata = {
  name: 'summarise-url',
  description: 'Visit a URL, scrape the content, summarise it with AI, and save to desktop',
  version: '1.0.2',
  timeout_ms: 60000,
  variables: [
    {
      name: 'url',
      type: 'string',
      required: true,
      description: 'The URL to visit and summarise',
    },
    {
      name: 'filename',
      type: 'string',
      required: false,
      description: 'Filename to save the summary as (default: summary.txt)',
      default: 'summary.txt',
    },
    {
      name: 'prompt',
      type: 'string',
      required: false,
      description: 'Custom instruction for the AI',
      default: 'Summarise the key points from this content in a clear, concise way.',
    },
  ],
};

async function callGroqAI(systemPrompt: string, userContent: string): Promise<string> {
  console.log('🤖 Calling Groq API...');

  // Try numbered keys first (GROQ_API_KEY_1, GROQ_API_KEY_2, etc.)
  let groqApiKey = process.env.GROQ_API_KEY_1;
  
  // Fallback to single GROQ_API_KEY if no numbered keys
  if (!groqApiKey) {
    groqApiKey = process.env.GROQ_API_KEY;
  }
  
  if (!groqApiKey) {
    throw new Error('No Groq API key found. Set GROQ_API_KEY_1 or GROQ_API_KEY environment variable');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  // ✅ FIX 1: cast to any to avoid TS18046 unknown type error
  const data = await response.json() as any;
  const text: string = data.choices?.[0]?.message?.content || '';

  if (!text) throw new Error('No response from Groq API');

  console.log('✅ AI response received');
  return text;
}

export async function execute(
  variables: { url: string; filename?: string; prompt?: string },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { pinchTab, desktop } = services;
  const {
    url,
    filename = 'summary.txt',
    prompt = 'Summarise the key points from this content in a clear, concise way.',
  } = variables;

  const filePath = `/home/user/Desktop/${filename}`;
  let instanceId: string | undefined;

  try {
    // ── PART 1: Web — visit URL and grab content ──────────────────────
    console.log(`🌐 Step 1: Launching browser and visiting: ${url}`);
    const instance = await pinchTab.launchInstance(`summarise-${Date.now()}`, 'headed');
    instanceId = instance.id;
    pinchTab.setCurrentInstance(instanceId);

    await pinchTab.navigate(url);
    await pinchTab.wait(5000); // ✅ FIX 2: longer wait — 503s mean browser needs more time
    console.log('✅ Page loaded');

    console.log('📸 Step 2: Extracting page content...');
    const snapshot = await pinchTab.snapshot('all');

    // ✅ FIX 3: log what we actually got back so we can debug
    const raw = snapshot as any;
    console.log(`📋 Snapshot keys: ${Object.keys(raw).join(', ')}`);

    // ✅ FIX 4: try all possible locations PinchTab might put elements
    const elements: any[] = raw.nodes || raw.elements || raw.data?.nodes || raw.data?.elements || [];
    console.log(`📋 Elements found: ${elements.length}`);

    // ✅ FIX 5: lower threshold to 5 chars — catch short but meaningful text
    const seen = new Set<string>();
    const pageText = elements
      .filter((el: any) => {
        const t = (el.text || el.name || '').trim();
        if (t.length < 5) return false;
        if (seen.has(t)) return false;
        seen.add(t);
        return true;
      })
      .map((el: any) => (el.text || el.name || '').trim())
      .join('\n');

    console.log(`✅ Extracted ${pageText.length} characters`);

    // ✅ FIX 6: if snapshot gives nothing, try getting the HTML directly
    let contentToSummarise = pageText;
    if (pageText.length < 50) {
      console.log('⚠️ Snapshot text empty, trying html field...');
      const htmlText = (raw.html || '')
        .replace(/<[^>]+>/g, ' ')   // strip HTML tags
        .replace(/\s+/g, ' ')        // collapse whitespace
        .trim();
      console.log(`📋 HTML text length: ${htmlText.length}`);
      contentToSummarise = htmlText;
    }

    if (contentToSummarise.length < 50) {
      throw new Error(`Could not extract content. Snapshot had ${elements.length} elements, HTML had ${(raw.html || '').length} chars.`);
    }

    const truncated =
      contentToSummarise.length > 8000
        ? contentToSummarise.slice(0, 8000) + '\n\n[Content truncated...]'
        : contentToSummarise;

    console.log('🟢 Browser left open');

    // ── PART 2: AI — summarise ────────────────────────────────────────
    console.log('🤖 Step 3: Summarising with Groq AI...');

    const systemPrompt = `You are a helpful assistant that summarises web page content.
Be concise and well-structured. Use bullet points where appropriate.
Always start with a one-line overview, then the key points.`;

    const userMessage = `${prompt}\n\n---\nURL: ${url}\n\nPAGE CONTENT:\n${truncated}`;
    const summary = await callGroqAI(systemPrompt, userMessage);
    console.log('✅ Summary generated');

    // ── PART 3: Desktop — save and open ──────────────────────────────
    console.log(`💾 Step 4: Saving to ${filePath}...`);

    const fileContent = [
      `SUMMARY OF: ${url}`,
      `Generated: ${new Date().toLocaleString()}`,
      '='.repeat(60),
      '',
      summary,
      '',
      '='.repeat(60),
      'Generated by aria-agent summarise-url workflow',
    ].join('\n');

    const base64 = Buffer.from(fileContent, 'utf-8').toString('base64');
    await desktop.writeFile(filePath, base64);
    await desktop.wait(250);
    console.log('✅ File written');

    console.log('📝 Step 5: Opening in Mousepad...');
    await desktop.launchApplication('mousepad');
    await desktop.wait(2000);

    await desktop.shortcut('LeftControl', 'o');
    await desktop.wait(1000);

    await desktop.shortcut('LeftControl', 'a');
    await desktop.wait(150);
    await desktop.pasteText(filePath);
    await desktop.wait(250);
    await desktop.pressKeys(['Return']);
    await desktop.wait(500);

    console.log('🎉 Done!');

    return {
      success: true,
      message: `Page summarised and saved to "${filename}"`,
      data: {
        url,
        filename,
        filePath,
        summaryLength: summary.length,
        contentExtracted: contentToSummarise.length,
        summary,
      },
    };

  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    if (instanceId) {
      try { await pinchTab.stopInstance(instanceId); } catch (_) {}
    }
    return {
      success: false,
      error: error.message,
      message: `Failed: ${error.message}`,
    };
  }
}