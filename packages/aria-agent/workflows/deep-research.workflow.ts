import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';
import * as sendEmailN8nWorkflow from './send-email-n8n.workflow';
import * as openWhatsappWorkflow from './open-whatsapp.workflow';

/**
 * Helper to send conversational status messages to the frontend
 */
async function logMessage(logger: WorkflowLogger, message: string): Promise<void> {
  await logger.think(message);
}

// ─────────────────────────────────────────────────────────────────────────────
// METADATA
// ─────────────────────────────────────────────────────────────────────────────
export const metadata: WorkflowMetadata = {
  name: 'deep-research',
  description:
    'Uses AI to generate multiple targeted search queries, searches each independently (Bing → Google fallback), picks the single best content-rich URL per query, scrapes each, generates a research report, saves it as a file, and optionally sends it via Gmail and/or WhatsApp.',
  version: '2.0.0',
  timeout_ms: 240000,
  variables: [
    { name: 'topic', type: 'string', required: true, description: 'Research topic. NOT a URL. E.g. "quantum computing breakthroughs 2025"' },
    { name: 'max_links', type: 'number', required: false, description: 'How many distinct search queries to run (1–3). Default: 3.', default: 3 },
    { name: 'include_wikipedia', type: 'boolean', required: false, description: 'Include Wikipedia as first source (default: true)', default: true },
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
async function callGroq(systemPrompt: string, userContent: string, maxTokens = 8000): Promise<string> {
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.3,
          max_tokens: maxTokens,
        }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (res.status === 429 || res.status === 402) {
        console.log(`  ⚠️  Key ...${apiKey.slice(-6)} rate limited, trying next…`);
        lastError = new Error(`Rate limited: ${data?.error?.message || res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`Groq ${res.status}: ${data?.error?.message || raw}`);

      const content: string = data.choices[0].message.content ?? '';
      // Strip control characters — keep printable ASCII + common Unicode + newline/tab
      return content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    } catch (err: any) {
      lastError = err;
      console.log(`  ⚠️  Groq key error: ${err.message}`);
    }
  }
  throw new Error(`All Groq keys exhausted. Last: ${lastError.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strips non-ASCII and common UTF-8 garbage that causes Mousepad encoding issues.
 * Keeps: printable ASCII (0x20–0x7E), tab (0x09), newline (0x0A), carriage return (0x0D).
 * Everything else — box-drawing chars, smart quotes, em-dashes, etc. — is replaced
 * with plain ASCII equivalents or removed.
 */
function toSafeAscii(text: string): string {
  return text
    // Normalize line endings first
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Smart quotes → straight quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Em/en dash → hyphen
    .replace(/[\u2013\u2014]/g, '-')
    // Ellipsis → three dots
    .replace(/\u2026/g, '...')
    // Bullet variants → hyphen
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '-')
    // Non-breaking space → space
    .replace(/\u00A0/g, ' ')
    // Any remaining non-ASCII character → removed
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
    // Collapse more than 2 consecutive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Domains whose pages are mostly landing pages / paywalls / nav-heavy — avoid as content sources */
const JUNK_DOMAINS = [
  'youtube.com', 'youtu.be',
  'reddit.com', 'twitter.com', 'x.com', 'facebook.com',
  'instagram.com', 'tiktok.com', 'linkedin.com',
  'pinterest.com', 'tumblr.com',
  'amazon.com', 'ebay.com', 'etsy.com',
  'bing.com', 'microsoft.com', 'google.com', 'googleusercontent.com',
  'apple.com/app-store', 'play.google.com',
  // Landing-page heavy tech giants (their landing pages, not their docs/blogs)
  // We keep ibm.com/think, ibm.com/topics etc. — so we block only the root
];

/** Returns true if the URL is likely a content-rich article/doc page */
function isGoodContentUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname;

    // Hard-block junk domains
    if (JUNK_DOMAINS.some(d => host.includes(d))) return false;

    // Block root/near-root pages that are almost certainly landing pages
    // e.g. ibm.com/in-en, ibm.com/, company.com/products
    const pathDepth = path.split('/').filter(Boolean).length;
    if (pathDepth < 2 && !['wikipedia.org', 'arxiv.org', 'nature.com'].includes(host)) {
      // Allow shallow paths only for known always-good domains
      const alwaysGood = ['wikipedia.org', 'arxiv.org', 'nature.com', 'science.org', 'pubmed.ncbi.nlm.nih.gov'];
      if (!alwaysGood.some(d => host.includes(d))) return false;
    }

    // Prefer URLs that look like articles
    const goodSignals = [
      /\/(article|blog|post|news|research|paper|report|guide|tutorial|docs?|learn|insight|story|topic|explainer|analysis|review|feature)\//i,
      /\/\d{4}\//, // date-based paths like /2024/03/...
      /\.(html|htm)$/i,
    ];
    // URLs with good signals are always accepted (unless already blocked above)
    if (goodSignals.some(re => re.test(path))) return true;

    // For everything else with path depth >= 2, allow
    return pathDepth >= 2;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH ONE QUERY → return candidate links
// ─────────────────────────────────────────────────────────────────────────────
async function searchQuery(
  query: string,
  pinchTab: any,
): Promise<{ title: string; url: string }[]> {
  const engines = [
    {
      name: 'Bing',
      url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      excludeDomains: ['bing.com', 'microsoft.com'],
    },
    {
      name: 'Google',
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      excludeDomains: ['google.com', 'googleusercontent.com'],
    },
  ];

  for (const engine of engines) {
    console.log(`    🔎 Trying ${engine.name} for: "${query}"`);
    try {
      await pinchTab.navigate(engine.url);
      await pinchTab.wait(9000);

      let candidates: { title: string; url: string }[] = [];

      // --- Attempt 1: snapshot ---
      try {
        const snap = await pinchTab.snapshot('all');
        const elements: any[] = snap.nodes || snap.elements || snap.data?.nodes || snap.data?.elements || [];
        const seen = new Set<string>();
        for (const el of elements) {
          const href = el.url || el.href || el.attributes?.href || el.attributes?.url || (el.role === 'link' ? el.value : undefined);
          if (href && typeof href === 'string' && href.startsWith('http') && !seen.has(href)) {
            const excluded = engine.excludeDomains.some(d => href.includes(d));
            if (!excluded) {
              seen.add(href);
              candidates.push({ title: (el.text || el.name || '').trim(), url: href });
            }
          }
        }
        console.log(`      📋 Snapshot links: ${candidates.length}`);
      } catch (snapErr: any) {
        console.log(`      ⚠️  Snapshot failed: ${snapErr.message}`);
      }

      // --- Attempt 2: getPageText fallback ---
      if (candidates.length === 0) {
        console.log(`      ↩️  Falling back to getPageText()…`);
        const pageText = await pinchTab.getPageText();
        const excludePat = engine.excludeDomains.map(d => d.replace('.', '\\.')).join('|');
        const urlRe = new RegExp(`https?:\\/\\/(?!(?:${excludePat}))[^\\s"'<>)]+`, 'g');
        const found = [...new Set<string>((pageText || '').match(urlRe) || [])];
        for (const url of found) candidates.push({ title: '', url });
        console.log(`      📋 Text-extracted links: ${candidates.length}`);
      }

      if (candidates.length > 0) return candidates;
    } catch (err: any) {
      console.log(`    ⚠️  ${engine.name} failed: ${err.message}`);
    }
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE
// ─────────────────────────────────────────────────────────────────────────────
export async function execute(
  variables: {
    topic: string;
    max_links?: number;
    include_wikipedia?: boolean;
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
  const { pinchTab, desktop, browserLogger, taskId, messagesService } = services;
  const {
    topic,
    max_links = 3,
    include_wikipedia = true,
    email_to,
    email_cc,
    email_bcc,
    email_sender_name = 'Aria Research',
    email_button_text = '',
    email_button_url = '',
    whatsapp_to,
  } = variables;
  const queryCount = Math.min(Math.max(1, max_links), 3);

  // Create workflow logger for think() messages
  const logger = new WorkflowLogger(browserLogger, taskId, 'deep-research', messagesService);

  // Track browser instance for cleanup
  let browserInstanceId: string | null = null;

  try {
    // ── STEP 0: Scrape Wikipedia first (if enabled) ───────────────────────────
    const scrapedPages: { url: string; content: string }[] = [];
    
    if (include_wikipedia) {
      console.log(`\n📚 Step 0: Scraping Wikipedia for foundational context…`);
      await logMessage(logger, `📚 Starting with Wikipedia for solid background info...`);
      await logMessage(logger, `🔍 Searching for "${topic}" on Wikipedia...`);
      
      // Launch browser for Wikipedia
      console.log(`  🌐 Launching browser…`);
      await logMessage(logger, `🌐 Opening browser... getting ready to search`);
      const instance = await pinchTab.launchInstance(`deep-research-${Date.now()}`, 'headed');
      browserInstanceId = instance.id; // Track for cleanup
      pinchTab.setCurrentInstance(instance.id);
      await pinchTab.wait(3000);
      
      try {
        // Navigate to Wikipedia homepage
        console.log(`  🏠 Navigating to Wikipedia homepage…`);
        await logMessage(logger, `🏠 Heading to Wikipedia...`);
        await pinchTab.navigate('https://en.wikipedia.org');
        await pinchTab.wait(5000);
        
        // Type the search query in the search box
        console.log(`  🔍 Typing search query: "${topic}"…`);
        await logMessage(logger, `⌨️  Typing your topic into the search box...`);
        await pinchTab.type('#searchInput', topic);
        await pinchTab.wait(2000);
        
        // Press Enter using desktop tool (more reliable than pinchTab.press)
        console.log(`  ⏎ Submitting search (Enter key via desktop)…`);
        await logMessage(logger, `🚀 Searching... let's see what we find`);
        await desktop.pressKeys(['Return']);
        await pinchTab.wait(3000);
        
        // Wait for page to fully load (check for article content or search results)
        console.log(`  ⏳ Waiting for page to load…`);
        await pinchTab.wait(8000); // Extended wait for full article load
        
        // Take snapshot to extract all text and links
        console.log(`  📸 Taking snapshot to extract content…`);
        await logMessage(logger, `📸 Reading the Wikipedia article...`);
        await logMessage(logger, `📖 Extracting all the good stuff...`);
        const snapshot = await pinchTab.snapshot('all');
        
        // Extract text content from snapshot
        const elements: any[] = snapshot.elements || [];
        let wikiText = '';
        const wikiLinks: string[] = [];
        
        // Collect all text and links from snapshot
        for (const el of elements) {
          // Extract text content
          if (el.text && typeof el.text === 'string' && el.text.trim().length > 0) {
            wikiText += el.text.trim() + ' ';
          }
          
          // Extract links for reference
          const href = el.attributes?.href;
          if (href && typeof href === 'string' && href.startsWith('http') && href.includes('wikipedia.org')) {
            if (!wikiLinks.includes(href)) {
              wikiLinks.push(href);
            }
          }
        }
        
        // Get current URL by listing tabs and finding the active one
        const tabs = await pinchTab.listTabs(instance.id);
        const activeTab = tabs.find((t: any) => t.active || t.id === pinchTab.getCurrentTabId());
        const wikiUrl = activeTab?.url || 'https://en.wikipedia.org';
        
        console.log(`  📄 Extracted ${wikiText.length} chars of text from snapshot`);
        console.log(`  🔗 Found ${wikiLinks.length} Wikipedia links`);
        
        // Clean and limit the content
        const wikiContent = toSafeAscii(wikiText).slice(0, 6000);
        
        if (wikiContent.length > 100) {
          scrapedPages.push({ url: wikiUrl, content: wikiContent });
          console.log(`  ✅ Wikipedia scraped: ${wikiContent.length} chars from ${wikiUrl}`);
          await logMessage(logger, `✅ Got it! Wikipedia gave us great context`);
        } else {
          console.log(`  ⚠️  Wikipedia content too short, trying fallback with getPageText…`);
          await logMessage(logger, `🤔 Hmm, trying a different approach...`);
          
          // Fallback: use getPageText if snapshot didn't capture enough
          const fallbackText = await pinchTab.getPageText();
          const fallbackContent = toSafeAscii(fallbackText.slice(0, 6000));
          
          if (fallbackContent.length > 100) {
            scrapedPages.push({ url: wikiUrl, content: fallbackContent });
            console.log(`  ✅ Wikipedia scraped (fallback): ${fallbackContent.length} chars`);
            await logMessage(logger, `✅ There we go! Got the Wikipedia content`);
          } else {
            console.log(`  ⚠️  Wikipedia page too short or not found, skipping`);
            await logMessage(logger, `⚠️  Wikipedia didn't have much, moving on...`);
          }
        }
      } catch (error: any) {
        console.log(`  ⚠️  Failed to scrape Wikipedia: ${error.message}`);
        await logMessage(logger, `⚠️  Wikipedia didn't work out, no worries though`);
        // Continue anyway - Wikipedia is optional
      }
      
      console.log(`✅ Step 0 done. Wikipedia ${scrapedPages.length > 0 ? 'added' : 'skipped'}.`);
      await logMessage(logger, `✅ Wikipedia phase complete!`);
    }

    // ── STEP 1: AI generates diverse search queries ───────────────────────────
    console.log(`\n🧠 Step 1: Generating ${queryCount} targeted search queries for "${topic}"…`);
    await logMessage(logger, `🧠 Now let me think of the best search queries...`);
    await logMessage(logger, `💭 Crafting ${queryCount} smart searches to find great sources...`);

    const queryRaw = await callGroq(
      `You are someone who is really curious about a topic and knows how to search the web well.
Your job: given a topic, write ${queryCount} search queries that a smart, curious person would actually type into Google or Bing.

Think like this — if someone told you about a topic and you wanted to learn about it, what would YOU search?
- Mix it up: one query for a general explainer/overview, one for recent news or updates, one for a deep-dive or "how it works" angle
- Write them like a human — short, natural, conversational. E.g. "how does X work", "X explained simply", "X latest news 2025", "best blogs about X", "X real world examples"
- It is totally fine to add words like: "explained", "guide", "blog", "overview", "2024", "2025", "how it works", "what is", "examples", "breakdown"
- Do NOT use any search operators like site:, filetype:, intitle:, quotes, or anything technical
- Do NOT target academic papers or government sites specifically — just search naturally like anyone would
- Each query should feel different and explore a different angle

Return ONLY valid JSON, no markdown, no explanation.
Format: {"queries": ["query 1", "query 2", "query 3"]}`,
      `Topic: "${topic}"\n\nWrite exactly ${queryCount} natural search queries a curious person would type. Return JSON only.`,
      500,
    );

    let searchQueries: string[] = [];
    try {
      const parsed = JSON.parse(queryRaw.replace(/```json|```/g, '').trim());
      searchQueries = (parsed.queries || []).slice(0, queryCount);
    } catch {
      // Fallback: natural human-style queries
      searchQueries = [
        `what is ${topic} explained`,
        `${topic} latest news 2025`,
        `how does ${topic} work real world examples`,
      ].slice(0, queryCount);
    }
    console.log(`  ✅ Queries: ${searchQueries.map((q, i) => `\n    ${i + 1}. ${q}`).join('')}`);
    await logMessage(logger, `✅ Perfect! Got ${queryCount} great search queries`);
    await logMessage(logger, `🎯 These should find some really good sources...`);

    // ── STEP 2: Launch browser (if not already launched in Step 0) ────────────
    if (!include_wikipedia || scrapedPages.length === 0) {
      console.log(`\n🌐 Step 2: Launching browser…`);
      await logMessage(logger, `🌐 Opening browser for web searches...`);
      const instance = await pinchTab.launchInstance(`deep-research-${Date.now()}`, 'headed');
      browserInstanceId = instance.id; // Track for cleanup
      pinchTab.setCurrentInstance(instance.id);
      await pinchTab.wait(3000);
    } else {
      console.log(`\n🌐 Step 2: Browser already launched (reusing from Step 0)…`);
      await logMessage(logger, `🌐 Browser's already open, let's keep going...`);
    }

    // ── STEP 3: For each query → search → AI picks best 1 content URL ────────
    console.log(`\n🔍 Step 3: Running ${queryCount} searches and picking best content URL per query…`);
    await logMessage(logger, `🔍 Time to search the web! Running ${queryCount} searches...`);
    await logMessage(logger, `🎯 I'll pick only the best, most informative sources...`);
    const chosenUrls: string[] = [];
    const usedDomains = new Set<string>();

    for (let qi = 0; qi < searchQueries.length; qi++) {
      const query = searchQueries[qi];
      console.log(`\n  [Query ${qi + 1}/${searchQueries.length}]: "${query}"`);
      await logMessage(logger, `🔎 Search ${qi + 1}/${searchQueries.length}: "${query}"`);

      const candidates = await searchQuery(query, pinchTab);
      if (candidates.length === 0) {
        console.log(`  ⚠️  No candidates found for this query, skipping.`);
        await logMessage(logger, `⚠️  Hmm, didn't find much for that one...`);
        continue;
      }

      await logMessage(logger, `📊 Found ${candidates.length} potential sources, analyzing...`);

      // Pre-filter: remove obvious junk and already-used domains
      const filtered = candidates.filter(c => {
        if (!isGoodContentUrl(c.url)) return false;
        try {
          const host = new URL(c.url).hostname.replace(/^www\./, '');
          if (usedDomains.has(host)) return false;
        } catch { return false; }
        return true;
      });

      console.log(`  📊 Good-URL candidates after filter: ${filtered.length} / ${candidates.length}`);

      if (filtered.length === 0) {
        // Relax filter — just deduplicate domains
        const relaxed = candidates.filter(c => {
          try {
            const host = new URL(c.url).hostname.replace(/^www\./, '');
            return !usedDomains.has(host);
          } catch { return false; }
        });
        if (relaxed.length > 0) filtered.push(...relaxed.slice(0, 20));
      }

      if (filtered.length === 0) {
        console.log(`  ⚠️  Still no usable candidates, skipping query.`);
        continue;
      }

      // Ask AI to pick the single best URL for actual content
      const pickRaw = await callGroq(
        `You are a research librarian. Your job is to pick the SINGLE BEST URL from a list that will contain the most detailed, informative content about the search query.

CRITICAL RULES:
- Pick URLs that point to ARTICLES, BLOG POSTS, RESEARCH PAPERS, DOCUMENTATION PAGES, WIKIPEDIA ARTICLES, or NEWS STORIES
- REJECT: landing pages, product homepages, category pages, login pages, paywalled content
- REJECT: URLs with path depth < 2 (e.g. ibm.com/in-en is a landing page — BAD; ibm.com/think/topics/quantum-computing is an article — GOOD)
- PREFER: URLs containing words like /article/, /blog/, /research/, /paper/, /docs/, /wiki/, /news/, /guide/, /explainer/, or a date like /2024/
- If none are perfect, pick the one most likely to have real written content

Return ONLY valid JSON: {"url": "https://..."} or {"url": null} if nothing is usable.`,
        `Search query: "${query}"\n\nCandidate URLs (title | URL):\n${filtered.slice(0, 25).map(c => `${c.title || '(no title)'} | ${c.url}`).join('\n')}\n\nPick the single best content-rich URL. JSON only.`,
        300,
      );

      let picked: string | null = null;
      try {
        const p = JSON.parse(pickRaw.replace(/```json|```/g, '').trim());
        picked = p.url || null;
      } catch {
        // Try to extract URL from raw text as last resort
        const m = pickRaw.match(/https?:\/\/[^\s"']+/);
        picked = m ? m[0] : null;
      }

      if (picked && isGoodContentUrl(picked)) {
        // Check domain not already used
        try {
          const host = new URL(picked).hostname.replace(/^www\./, '');
          if (!usedDomains.has(host)) {
            usedDomains.add(host);
            chosenUrls.push(picked);
            console.log(`  ✅ Picked: ${picked}`);
            await logMessage(logger, `✅ Great! Found a solid source`);
          } else {
            console.log(`  ⚠️  Domain already used (${host}), skipping.`);
            await logMessage(logger, `⚠️  Already have that site, looking for variety...`);
          }
        } catch {
          chosenUrls.push(picked);
          console.log(`  ✅ Picked: ${picked}`);
          await logMessage(logger, `✅ Got a good one!`);
        }
      } else if (picked) {
        // AI picked something but isGoodContentUrl rejected it — trust AI anyway
        console.log(`  ⚠️  AI picked URL didn't pass filter, using it anyway: ${picked}`);
        await logMessage(logger, `🤔 This one's borderline, but let's include it...`);
        try {
          const host = new URL(picked).hostname.replace(/^www\./, '');
          if (!usedDomains.has(host)) {
            usedDomains.add(host);
            chosenUrls.push(picked);
          }
        } catch {
          chosenUrls.push(picked);
        }
      } else {
        console.log(`  ⚠️  AI returned null, falling back to first filtered candidate.`);
        await logMessage(logger, `🤷 Using backup option...`);
        const fallback = filtered[0];
        if (fallback) {
          try {
            const host = new URL(fallback.url).hostname.replace(/^www\./, '');
            if (!usedDomains.has(host)) {
              usedDomains.add(host);
              chosenUrls.push(fallback.url);
              console.log(`  ✅ Fallback: ${fallback.url}`);
            }
          } catch {
            chosenUrls.push(fallback.url);
          }
        }
      }
    }

    if (chosenUrls.length === 0) {
      await logMessage(logger, `❌ Uh oh, couldn't find any good sources...`);
      return {
        success: false,
        error: 'No usable URLs found after all searches.',
        message: 'All searches returned only landing pages or no results. Try rephrasing your topic.',
      };
    }

    console.log(`\n✅ Step 3 done. Selected ${chosenUrls.length} URLs:`);
    chosenUrls.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
    await logMessage(logger, `✅ Perfect! Found ${chosenUrls.length} excellent sources`);
    await logMessage(logger, `📚 Now let's read through all of them...`);

    // ── STEP 4: Scrape each chosen URL (append to existing scrapedPages from Step 0) ────
    console.log(`\n📄 Step 4: Scraping ${chosenUrls.length} pages…`);
    await logMessage(logger, `📄 Reading ${chosenUrls.length} articles in detail...`);
    await logMessage(logger, `⏳ This will take a minute, extracting all the content...`);
    // Note: scrapedPages already declared in Step 0, just append to it

    for (let i = 0; i < chosenUrls.length; i++) {
      const url = chosenUrls[i];
      console.log(`  (${i + 1}/${chosenUrls.length}): ${url}`);
      await logMessage(logger, `📖 Reading article ${i + 1}/${chosenUrls.length}...`);
      try {
        await pinchTab.navigate(url);
        await pinchTab.wait(8000);
        const raw = (await pinchTab.getPageText()) || '';
        // Trim to 6000 chars and strip to safe ASCII right here
        const content = toSafeAscii(raw).slice(0, 6000);
        scrapedPages.push({ url, content });
        console.log(`    ✅ Scraped ${content.length} chars`);
        await logMessage(logger, `✅ Got ${content.length} characters of content`);
      } catch (err: any) {
        console.log(`    ⚠️  Failed to scrape: ${err.message}`);
        await logMessage(logger, `⚠️  Couldn't read that one, moving on...`);
        scrapedPages.push({ url, content: '[Page could not be loaded]' });
      }
    }
    console.log(`✅ Step 4 done.`);
    await logMessage(logger, `✅ All articles read! Got tons of information`);

    // ── STEP 5: AI generates research report ──────────────────────────────────
    console.log(`\n📝 Step 5: Generating research report…`);
    await logMessage(logger, `📝 Now the fun part... writing your research report`);
    await logMessage(logger, `🧠 Analyzing all the sources and synthesizing insights...`);
    await logMessage(logger, `✍️  Crafting a comprehensive report...`);

    const today = new Date().toISOString().split('T')[0];

    const reportRaw = await callGroq(
      `You are an expert research analyst. Write a detailed, well-structured research report.

CRITICAL FORMATTING RULES - READ CAREFULLY:
1. Use ONLY standard ASCII characters (a-z, A-Z, 0-9, basic punctuation: . , : ; ! ? - _ ( ) [ ] / @ # % & * + = < > | ~ ^ )
2. NO special Unicode characters, NO smart quotes, NO em-dashes, NO bullet symbols, NO box-drawing characters
3. Use a plain hyphen (-) for bullet points, NOT a bullet symbol
4. Use straight quotes (" and ') NOT smart quotes
5. Use -- for em-dash, NOT Unicode em-dash
6. Keep it plain text, no markdown formatting beyond # headings

CRITICAL CITATION RULES:
- ALWAYS cite Wikipedia if it appears in the sources (it will be SOURCE 1 if included)
- Include Wikipedia citations in Key Findings and Detailed Analysis sections
- Use format: [Source: URL] after each finding or claim
- Make sure EVERY source provided is cited at least once in the report
- Wikipedia is a foundational source - cite it prominently

STRUCTURE (follow exactly):

# Research Report: TOPIC_HERE
Date: DATE_HERE

## TL;DR
2-3 sentences summarizing the key takeaway.

## Key Findings
- Finding 1 [Source: URL]
- Finding 2 [Source: URL]
- Finding 3 [Source: URL]
- Finding 4 [Source: URL]
- Finding 5 [Source: URL]

(Make sure to cite Wikipedia if it's in the sources - it provides foundational context)

## Detailed Analysis

Write 4-6 paragraphs. Each paragraph covers a distinct aspect. Include inline source citations like [Source: URL].

IMPORTANT: If Wikipedia is SOURCE 1, make sure to cite it in the first or second paragraph as it provides the foundational overview.

## Conclusion
2-3 sentence wrap-up.

## Sources
1. URL1
2. URL2
3. URL3

(List ALL sources provided, including Wikipedia if present)

---
Report generated by Aria Deep Research`,
      `Topic: "${topic}"\nDate: ${today}\n\n${scrapedPages.map((p, i) => `--- SOURCE ${i + 1}: ${p.url} ---\n${p.content}`).join('\n\n')}\n\nWrite the full research report now. Plain ASCII text only. No Unicode symbols.`,
      8000,
    );

    if (!reportRaw || reportRaw.length < 100) {
      throw new Error('Generated report is too short or empty.');
    }

    // Final safety pass: convert everything to safe ASCII
    const cleanReport = toSafeAscii(reportRaw);

    console.log(`✅ Step 5 done. Report: ${cleanReport.length} chars.`);
    await logMessage(logger, `✅ Report complete! ${cleanReport.length} characters of pure insight`);

    // ── STEP 6: Save report using UI (create empty file, open, paste, save) ──
    console.log(`\n💾 Step 6: Saving report via text editor…`);
    await logMessage(logger, `💾 Saving your report to Desktop...`);
    const safeTopicName = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30).replace(/-$/, '');
    const filename = `research-${safeTopicName}.txt`;
    const filePath = `/home/user/Desktop/${filename}`;

    // Write file directly with base64 encoding (ariad expects base64)
    console.log(`💾 Writing report to file: ${filename}`);
    await logMessage(logger, `📁 Creating file: ${filename}...`);
    const base64Content = Buffer.from(cleanReport, 'utf-8').toString('base64');
    const writeResult = await desktop.writeFile(filePath, base64Content);
    
    if (!writeResult.success) {
      throw new Error(`Failed to write file: ${writeResult.path || filePath}`);
    }
    
    console.log(`✅ Step 6 done. Saved: ${filePath} (${cleanReport.length} chars)`);
    await logMessage(logger, `✅ Perfect! Report saved to your Desktop`);
    await logMessage(logger, `📄 File: ${filename}`);

    // ── STEP 7 (optional): Email ──────────────────────────────────────────────
    if (email_to) {
      console.log(`\n📧 Step 7: Sending email to ${email_to}…`);
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
      console.log(emailResult.success ? `✅ Step 7 done.` : `⚠️  Step 7: ${emailResult.message}`);
    }

    // ── STEP 8 (optional): WhatsApp ───────────────────────────────────────────
    if (whatsapp_to) {
      console.log(`\n💬 Step 8: Sending WhatsApp to ${whatsapp_to}…`);
      const lines = cleanReport.split('\n');
      const tldrIdx = lines.findIndex(l => l.includes('TL;DR'));
      const tldrText = tldrIdx >= 0 ? lines.slice(tldrIdx + 1, tldrIdx + 4).join(' ').trim() : '';
      const keyFindings = lines.filter(l => l.startsWith('- ')).slice(0, 5).join('\n');
      const waMessage =
        `Research Report: ${topic}\n\n` +
        (tldrText ? `Summary: ${tldrText}\n\n` : '') +
        `Key Findings:\n${keyFindings}\n\n` +
        `Full report saved as: ${filename}`;
      const waResult = await openWhatsappWorkflow.execute({ phone: whatsapp_to, messages: waMessage }, services);
      console.log(waResult.success ? `✅ Step 8 done.` : `⚠️  Step 8: ${waResult.message}`);
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    const deliveries = [`File: ${filename}`];
    if (email_to) deliveries.push(`Email -> ${email_to}`);
    if (whatsapp_to) deliveries.push(`WhatsApp -> ${whatsapp_to}`);

    return {
      success: true,
      message: `Research complete! Delivered via: ${deliveries.join(' | ')}`,
      data: {
        topic,
        searchQueries,
        sources: chosenUrls,
        filePath,
        filename,
        reportLength: cleanReport.length,
        deliveries,
      },
    };
  } catch (error: any) {
    console.error(`\n❌ deep-research failed: ${error.message}`);
    return { success: false, error: error.message, message: `Deep research failed: ${error.message}` };
  } finally {
    // ── CLEANUP: Always stop browser instance ────────────────────────────────
    if (browserInstanceId) {
      try {
        console.log(`\n🧹 Cleanup: Stopping browser instance ${browserInstanceId}…`);
        await pinchTab.stopInstance(browserInstanceId);
        console.log(`✅ Browser instance stopped successfully`);
      } catch (cleanupError: any) {
        console.error(`⚠️  Failed to stop browser instance: ${cleanupError.message}`);
        // Don't throw - cleanup errors shouldn't fail the workflow
      }
    }
  }
}