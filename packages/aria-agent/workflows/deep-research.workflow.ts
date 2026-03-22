import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';
import * as sendEmailN8nWorkflow from './send-email-n8n.workflow';
import * as openWhatsappWorkflow from './open-whatsapp.workflow';

// ─────────────────────────────────────────────────────────────────────────────
// METADATA
// ─────────────────────────────────────────────────────────────────────────────
export const metadata: WorkflowMetadata = {
  name: 'deep-research',
  description:
    'Searches a topic on DuckDuckGo, uses AI to pick the best links (max 3), scrapes each page, generates a research report, saves it as a file, and optionally sends it via Gmail and/or WhatsApp.',
  version: '1.4.0',
  timeout_ms: 180000,
  variables: [
    { name: 'topic', type: 'string', required: true, description: 'Research topic. NOT a URL. E.g. "quantum computing breakthroughs 2025"' },
    { name: 'max_links', type: 'number', required: false, description: 'How many links to scrape (1–3). Default: 3.', default: 3 },
    { name: 'email_to', type: 'string', required: false, description: 'Send report to this email. Leave empty to skip.' },
    { name: 'email_cc', type: 'string', required: false, description: 'CC this email (optional).' },
    { name: 'email_bcc', type: 'string', required: false, description: 'BCC this email (optional).' },
    { name: 'email_sender_name', type: 'string', required: false, description: 'Sender name for email (default: Aria Research)', default: 'Aria Research' },
    { name: 'email_button_text', type: 'string', required: false, description: 'Text for CTA button in email (optional)', default: '' },
    { name: 'email_button_url', type: 'string', required: false, description: 'URL for CTA button in email (optional)', default: '' },
    { name: 'whatsapp_to', type: 'string', required: false, description: 'Send summary to this WhatsApp number e.g. "919876543210". Leave empty to skip.' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// GROQ — with key rotation across GROQ_API_KEY_1 … _10 → GROQ_API_KEY
// ─────────────────────────────────────────────────────────────────────────────
async function callGroq(systemPrompt: string, userContent: string): Promise<string> {
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
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (res.status === 429 || res.status === 402) {
        console.log(`⚠️ Key ...${apiKey.slice(-6)} rate limited, trying next…`);
        lastError = new Error(`Rate limited: ${data?.error?.message || res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`Groq ${res.status}: ${data?.error?.message || raw}`);
      return data.choices[0].message.content as string;
    } catch (err: any) {
      lastError = err;
      console.log(`⚠️ Groq key error: ${err.message}`);
    }
  }
  throw new Error(`All Groq keys exhausted. Last: ${lastError.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE
// ─────────────────────────────────────────────────────────────────────────────
export async function execute(
  variables: {
    topic: string;
    max_links?: number;
    email_to?: string;
    email_cc?: string;
    email_bcc?: string;
    email_sender_name?: string;
    email_button_text?: string;
    email_button_url?: string;
    whatsapp_to?: string;
  },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { pinchTab, desktop } = services;
  const { 
    topic, 
    max_links = 3, 
    email_to, 
    email_cc, 
    email_bcc, 
    email_sender_name = 'Aria Research',
    email_button_text = '',
    email_button_url = '',
    whatsapp_to 
  } = variables;
  const linkCount = Math.min(Math.max(1, max_links), 3);

  try {
    // ── STEP 1: Search with retry logic (DuckDuckGo → DuckDuckGo retry → Bing) ─
    console.log(`🔍 Step 1: Searching for "${topic}"…`);

    const instance = await pinchTab.launchInstance(`deep-research-${Date.now()}`, 'headed');
    pinchTab.setCurrentInstance(instance.id);
    await pinchTab.wait(3000); // Let browser fully init before opening tab

    let candidateLinks: { title: string; url: string }[] = [];
    const searchEngines = [
      { name: 'DuckDuckGo', url: `https://duckduckgo.com/?q=${encodeURIComponent(topic)}&ia=web`, excludeDomains: ['duckduckgo.com', 'duck.co'] },
      { name: 'DuckDuckGo (retry)', url: `https://duckduckgo.com/?q=${encodeURIComponent(topic)}&ia=web`, excludeDomains: ['duckduckgo.com', 'duck.co'] },
      { name: 'Bing', url: `https://www.bing.com/search?q=${encodeURIComponent(topic)}`, excludeDomains: ['bing.com', 'microsoft.com'] },
    ];

    for (const engine of searchEngines) {
      console.log(`🔍 Trying ${engine.name}...`);
      
      try {
        await pinchTab.navigate(engine.url);
        await pinchTab.wait(6000);

        const snap = await pinchTab.snapshot('all') as any;
        const elements: any[] = snap.nodes || snap.elements || snap.data?.nodes || snap.data?.elements || [];
        console.log(`📋 ${engine.name} - Snapshot keys: ${Object.keys(snap).join(', ')} | Elements: ${elements.length}`);
        if (elements.length > 0) console.log(`📋 Sample: ${JSON.stringify(elements[0]).slice(0, 150)}`);

        // Try all possible href locations PinchTab might use
        const seenUrls = new Set<string>();
        for (const el of elements) {
          const href = el.url || el.href || el.attributes?.href || el.attributes?.url || (el.role === 'link' ? el.value : undefined);
          if (href && typeof href === 'string' && href.startsWith('http') && !seenUrls.has(href)) {
            // Check if URL should be excluded
            const shouldExclude = engine.excludeDomains.some(domain => href.includes(domain));
            if (!shouldExclude) {
              seenUrls.add(href);
              candidateLinks.push({ title: (el.text || el.name || '').trim(), url: href });
            }
          }
        }
        console.log(`📋 ${engine.name} - Links via snapshot: ${candidateLinks.length}`);

        // Fallback: extract URLs from page text
        if (candidateLinks.length === 0) {
          console.log(`⚠️ ${engine.name} - No links in snapshot, trying getPageText() fallback…`);
          const pageText = await pinchTab.getPageText();
          console.log(`📋 Page text length: ${(pageText || '').length}`);
          
          // Build regex pattern to exclude domains
          const excludePattern = engine.excludeDomains.map(d => d.replace('.', '\\.')).join('|');
          const urlRegex = new RegExp(`https?:\\/\\/(?!${excludePattern})[^\\s"'<>)]+`, 'g');
          const found = [...new Set((pageText || '').match(urlRegex) || [])];
          console.log(`📋 ${engine.name} - URLs from page text: ${found.length}`);
          for (const url of found) candidateLinks.push({ title: '', url });
        }

        // If we found links, break out of retry loop
        if (candidateLinks.length > 0) {
          console.log(`✅ Step 1 done using ${engine.name}. ${candidateLinks.length} candidate links.`);
          break;
        } else {
          console.log(`⚠️ ${engine.name} returned no links, trying next search engine...`);
        }
      } catch (err: any) {
        console.log(`⚠️ ${engine.name} failed: ${err.message}, trying next search engine...`);
      }
    }

    // If still no links after all retries, fail
    if (candidateLinks.length === 0) {
      return { success: false, error: 'No links found after trying DuckDuckGo (2x) and Bing.', message: 'All search engines returned no results. Try a different topic.' };
    }

    // ── STEP 2: AI picks best links ───────────────────────────────────────────
    console.log(`🤖 Step 2: AI picking best ${linkCount} links…`);

    const pickRaw = await callGroq(
      `You are a research assistant. Pick the best URLs from search results for a topic.
Prefer: news articles, official docs, research papers, reputable blogs, Wikipedia.
Avoid: YouTube, Reddit, Twitter, LinkedIn, paywalled or login-required pages.
Return ONLY valid JSON. No markdown. Format: {"links": ["https://...", "https://..."]}`,
      `Topic: "${topic}"\n\nLinks (title | URL):\n${candidateLinks.slice(0, 30).map(l => `${l.title} | ${l.url}`).join('\n')}\n\nPick best ${linkCount}. JSON only.`
    );

    let chosenUrls: string[] = [];
    try {
      chosenUrls = (JSON.parse(pickRaw.replace(/```json|```/g, '').trim()).links || []).slice(0, linkCount);
    } catch {
      console.log('⚠️ AI JSON parse failed, using first candidates.');
      chosenUrls = [...new Set(candidateLinks.map(l => l.url))].slice(0, linkCount);
    }
    console.log(`✅ Step 2 done. Chose: ${chosenUrls.join(', ')}`);

    // ── STEP 3: Scrape each link ──────────────────────────────────────────────
    console.log(`🌐 Step 3: Scraping ${chosenUrls.length} pages…`);
    const scrapedPages: { url: string; content: string }[] = [];

    for (let i = 0; i < chosenUrls.length; i++) {
      const url = chosenUrls[i];
      console.log(`  📄 (${i + 1}/${chosenUrls.length}): ${url}`);
      try {
        await pinchTab.navigate(url);
        await pinchTab.wait(4000);
        const text = (await pinchTab.getPageText() || '').slice(0, 6000);
        scrapedPages.push({ url, content: text });
        console.log(`  ✅ ${text.length} chars`);
      } catch (err: any) {
        console.log(`  ⚠️ Failed: ${err.message}`);
        scrapedPages.push({ url, content: '[Failed to load]' });
      }
    }
    console.log(`✅ Step 3 done.`);

    // ── STEP 4: AI generates report ───────────────────────────────────────────
    console.log(`📝 Step 4: Generating report…`);

    const report = await callGroq(
      `You are an expert research analyst. Synthesise scraped web content into a structured report.

Format EXACTLY like this:

# Research Report: <Topic>
Date: <today's date>

## TL;DR
2-3 sentence summary.

## Key Findings
- Finding 1 [Source: <url>]
- Finding 2 [Source: <url>]
(minimum 5 findings)

## Detailed Analysis
3-5 paragraphs with inline source references.

## Sources
1. <url1>
2. <url2>

---
Report generated by Aria Deep Research`,
      `Topic: "${topic}"\n\n${scrapedPages.map((p, i) => `--- SOURCE ${i + 1}: ${p.url} ---\n${p.content}`).join('\n\n')}\n\nGenerate the full research report now.`
    );

    console.log(`✅ Step 4 done. Report: ${report.length} chars.`);

    // ── STEP 5: Save to Desktop using Mousepad ────────────────────────────────
    console.log(`💾 Step 5: Saving report via Mousepad…`);
    
    // Generate simple filename (e.g., "research-ai-agents.txt")
    const safeTopicName = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    const filename = `research-${safeTopicName}.txt`;
    const filePath = `/home/user/Desktop/${filename}`;

    // Open Mousepad
    console.log(`📝 Opening Mousepad...`);
    await desktop.launchApplication('mousepad');
    await desktop.wait(2000);

    // Paste the report content
    console.log(`📋 Pasting report content...`);
    await desktop.pasteText(report);
    await desktop.wait(1000);

    // Save file: Ctrl+S
    console.log(`💾 Saving file...`);
    await desktop.pressKeys(['ctrl', 's']);
    await desktop.wait(1500);

    // Type filename in save dialog
    console.log(`📝 Typing filename: ${filename}`);
    await desktop.typeText(filename, 10);
    await desktop.wait(500);

    // Press Enter to save
    await desktop.pressKeys(['Return']);
    await desktop.wait(1000);

    console.log(`✅ Step 5 done. Saved: ${filePath}`);

    // ── STEP 6 (optional): Email via N8N — calls send-email-n8n workflow ─────
    if (email_to) {
      console.log(`📧 Step 6: Calling send-email-n8n workflow → ${email_to}…`);
      const emailResult = await sendEmailN8nWorkflow.execute(
        {
          to: email_to,
          subject: `Research Report: ${topic}`,
          body: `Please find the full research report attached.\n\nTopic: ${topic}\nGenerated: ${new Date().toLocaleString()}\n\nFile: ${filename}`,
          cc: email_cc || '',
          bcc: email_bcc || '',
          senderName: email_sender_name,
          buttonText: email_button_text,
          buttonUrl: email_button_url,
          attachment: filePath,
        },
        services,
      );
      console.log(emailResult.success
        ? `✅ Step 6 done. Email sent to ${email_to}`
        : `⚠️ Step 6: ${emailResult.message}`
      );
    }

    // ── STEP 7 (optional): WhatsApp — calls open-whatsapp workflow directly ───
    if (whatsapp_to) {
      console.log(`💬 Step 7: Calling open-whatsapp workflow → ${whatsapp_to}…`);

      const reportLines = report.split('\n');
      const tldrIdx = reportLines.findIndex(l => l.includes('TL;DR'));
      const tldrText = tldrIdx >= 0 ? reportLines.slice(tldrIdx + 1, tldrIdx + 4).join(' ').trim() : '';
      const keyFindings = reportLines.filter(l => l.startsWith('- ')).slice(0, 5).join('\n');

      const waMessage =
        `📊 *Research Report: ${topic}*\n\n` +
        (tldrText ? `*Summary:* ${tldrText}\n\n` : '') +
        `*Key Findings:*\n${keyFindings}\n\n` +
        `_Full report: ${filename}_`;

      const waResult = await openWhatsappWorkflow.execute(
        { phone: whatsapp_to, messages: waMessage },
        services,
      );
      console.log(waResult.success
        ? `✅ Step 7 done. WhatsApp sent to ${whatsapp_to}`
        : `⚠️ Step 7: ${waResult.message}`
      );
    }

    // ── Done ─────────────────────────────────────────────────────────────────
    const deliveries = [`File: ${filename}`];
    if (email_to) deliveries.push(`Email → ${email_to}`);
    if (whatsapp_to) deliveries.push(`WhatsApp → ${whatsapp_to}`);

    return {
      success: true,
      message: `Research complete! Delivered via: ${deliveries.join(' | ')}`,
      data: { topic, sources: chosenUrls, filePath, filename, reportLength: report.length, deliveries },
    };

  } catch (error: any) {
    console.error(`❌ deep-research failed: ${error.message}`);
    return { success: false, error: error.message, message: `Deep research failed: ${error.message}` };
  }
}