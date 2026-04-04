async function exportPerplexityConversation() {
const status = document.createElement('div');
status.style.cssText = `position:fixed;top:12px;right:12px;z-index:2147483647;background:#20b2aa;color:#fff;padding:13px 19px;border-radius:11px;font:13px/1.65 monospace;box-shadow:0 5px 20px rgba(0,0,0,.4);max-width:400px;white-space:pre-line;transition:background .3s;`;
document.body.appendChild(status);
const say = (msg, col = '#20b2aa') => {
status.textContent = msg;
status.style.background = col;
console.log('[Perplexity Exporter]', msg);
};
const delay = ms => new Promise(r => setTimeout(r, ms));
function safeFilename(raw, fallback = 'perplexity_export') {
return (raw || fallback).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_').replace(/_{2,}/g, '_').replace(/^_+|_+$/g, '').toLowerCase().substring(0, 80) || fallback;
}
function downloadText(content, filename, mime = 'text/plain') {
const a = document.createElement('a');
a.href = URL.createObjectURL(new Blob([content], { type: mime }));
a.download = filename;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(a.href);
}
function langToExt(lang = '') {
const m = {javascript:'js', typescript:'ts', python:'py', py:'py',java:'java', cpp:'cpp', 'c++':'cpp', c:'c', csharp:'cs', cs:'cs',ruby:'rb', go:'go', rust:'rs', php:'php', swift:'swift',kotlin:'kt', shell:'sh', bash:'sh', sh:'sh', zsh:'sh',sql:'sql', css:'css', scss:'scss', html:'html', xml:'xml',json:'json', yaml:'yaml', yml:'yml', r:'r', matlab:'m',markdown:'md', md:'md', tsx:'tsx', jsx:'jsx', vue:'vue',};
return m[lang.toLowerCase()] ?? 'txt';
}
say('🔍 Checking page…');
if (!location.hostname.includes('perplexity.ai')) {
say('❌  Must be run on perplexity.ai', '#c0392b');
setTimeout(() => status.remove(), 7000);
return;
}
await delay(300);
let threadTitle = 'perplexity_thread';
try {
const fromTitle = document.title?.replace(/[-|] Perplexity.*/i, '').replace(/Perplexity/i, '').trim();
const h1 = document.querySelector('h1, h2');
threadTitle = h1?.textContent?.trim() || fromTitle || 'perplexity_thread';
} catch (_) {}
say('🔍 Scanning for queries and answers…');
await delay(100);
const QUERY_SELECTORS = ['[data-testid="query-text"]','[data-testid*="user-query"]','h1[class*="break-words"]','h2[class*="break-words"]','[class*="original-query"]','[class*="QueryText"]','[class*="userQuery"]','div[class*="query"] p','.query-display',];
const ANSWER_SELECTORS = ['[data-testid="answer-text"]','[data-testid*="answer"]','.prose','div[class*="prose"]','[class*="AnswerBody"]','[class*="answer-body"]','[class*="markdown"]','[class*="MessageContent"]','div[class*="whitespace-pre-wrap"]','.formatted-response',];
let queryEls = [];
for (const sel of QUERY_SELECTORS) {
const found = Array.from(document.querySelectorAll(sel));
if (found.length) { queryEls = found; break; }
}
let answerEls = [];
for (const sel of ANSWER_SELECTORS) {
const found = Array.from(document.querySelectorAll(sel));
const substantial = found.filter(el => (el.textContent || '').trim().length > 50);
if (substantial.length) { answerEls = substantial; break; }
}
console.log(`[Perplexity Exporter] ${queryEls.length} queries, ${answerEls.length} answers`);
if (queryEls.length === 0 && answerEls.length === 0) {
say('⚠️  Selectors found nothing. Trying broad scan…', '#e67e22');
await delay(300);
const allDivs = Array.from(document.querySelectorAll('main div, main section'));
const textDivs = allDivs.filter(el => {
const t = el.textContent?.trim() || '';
return t.length > 100 && t.length < 8000 && el.children.length < 30 && !el.querySelector('nav, header, footer, aside');
}).sort((a, b) => {
const pos = a.compareDocumentPosition(b);
return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
});
if (textDivs.length === 0) {
say('❌  No content found.\nScroll the full page first, then retry.', '#c0392b');
setTimeout(() => status.remove(), 10000);
return;
}
textDivs.forEach((el, i) => {
if (i % 2 === 0) queryEls.push(el);
else answerEls.push(el);
});
}
say('📝 Extracting content…');
await delay(50);
let codeCounter = 0;
const codeFiles = [];
const base = safeFilename(threadTitle);
function extractCodeBlocks(el) {
const codes = [];
const clone = el.cloneNode(true);
const preCodeEls = clone.querySelectorAll('pre code, pre > code');
const fallbackEls = preCodeEls.length === 0 ? clone.querySelectorAll('code[class*="language"], .code-block code') : [];
const allCodeEls = preCodeEls.length ? preCodeEls : fallbackEls;
for (const codeEl of allCodeEls) {
const allClasses = [codeEl.className, codeEl.closest('pre')?.className || '', codeEl.closest('[class*="code"]')?.className || '',].join(' ');
const langMatch = allClasses.match(/language-(\w+)|hljs-(\w+)/);
const lang = langMatch ? (langMatch[1] || langMatch[2] || '') : '';
const code = (codeEl.innerText ?? codeEl.textContent ?? '').trim();
if (code.length < 10) continue;
codeCounter++;
const ext = langToExt(lang);
const filename = `${base}__code_${codeCounter}${lang ? '__' + lang : ''}.${ext}`;
codes.push({ lang, code, filename });
codeFiles.push({ filename, content: code });
}
clone.querySelectorAll('pre, code, .code-block, [class*="CodeBlock"],' + 'a[href^="http"], sup, [class*="citation"], [class*="source"],' + 'button, svg, [class*="action"], [class*="toolbar"], [class*="feedback"],' + '[class*="tooltip"], [aria-label*="copy"], [aria-label*="share"],' + '[aria-label*="thumb"], [class*="related"], [class*="Related"]').forEach(n => n.remove());
const text = (clone.innerText ?? clone.textContent ?? '').trim().replace(/\n{4,}/g, '\n\n\n').trim();
return { codes, text };
}
function getQueryText(el) {
const clone = el.cloneNode(true);
clone.querySelectorAll('button, svg, [class*="edit"], [class*="action"]').forEach(n => n.remove());
return (clone.innerText ?? clone.textContent ?? '').trim();
}
const turns = [];
const maxTurns = Math.max(queryEls.length, answerEls.length);
for (let i = 0; i < maxTurns; i++) {
const turn = { query: '', answer: '', codes: [] };
if (queryEls[i]) turn.query = getQueryText(queryEls[i]);
if (answerEls[i]) {
const { codes, text } = extractCodeBlocks(answerEls[i]);
turn.codes = codes;
turn.answer = text;
}
if (turn.query || turn.answer) turns.push(turn);
}
say('📄 Building transcript…');
await delay(50);
let md = `# ${threadTitle}\n`;
md += `*Exported from Perplexity on ${new Date().toLocaleString()}*\n`;
md += `*URL: ${location.href}*\n\n`;
md += '---\n\n';
for (let i = 0; i < turns.length; i++) {
const t = turns[i];
if (t.query) {
md += `## 🧑 You:\n\n${t.query}\n\n`;
}
if (t.answer) {
md += `## 🔵 Perplexity:\n\n${t.answer}\n\n`;
}
if (t.codes.length) {
t.codes.forEach(c => {
md += `\`\`\`${c.lang}\n${c.code}\n\`\`\`\n\n`;
md += `> 💻 Saved as: \`${c.filename}\`\n\n`;
});
}
md += '---\n\n';
}
const total = turns.reduce((a, t) => a + t.query.length + t.answer.length, 0);
if (total < 50) {
say('⚠️  Very little content found.\nScroll the full page first, then retry.', '#e67e22');
await delay(2000);
}
say('⬇️  Downloading…');
let dlCount = 0;
downloadText(md, `${base}.md`, 'text/markdown');
dlCount++;
await delay(300);
for (const cf of codeFiles) {
downloadText(cf.content, cf.filename, 'text/plain');
dlCount++;
await delay(200);
}
const qCount = turns.filter(t => t.query).length;
const aCount = turns.filter(t => t.answer).length;
say([`✅  Done!`, `💬  ${qCount} prompt(s)  +  ${aCount} answer(s)`, `💻  ${codeFiles.length} code file(s)`, `📁  ${dlCount} total file(s) downloaded`,].join('\n'), '#1a8a60');
setTimeout(() => status.remove(), 8000);
}
exportPerplexityConversation();