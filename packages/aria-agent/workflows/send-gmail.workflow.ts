import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';

export const metadata: WorkflowMetadata = {
  name: 'send-gmail',
  description: 'Sends Gmail using AI overseer for login, then compose URL for the email. Supports optional file attachment.',
  version: '5.0.0',
  timeout_ms: 180000, // extra time for file upload
  variables: [
    { name: 'to', type: 'string', required: true, description: 'Recipient email(s), comma-separated' },
    { name: 'subject', type: 'string', required: true, description: 'Email subject line' },
    { name: 'body', type: 'string', required: true, description: 'Email body content' },
    { name: 'cc', type: 'string', required: false, description: 'CC recipient(s)', default: '' },
    { name: 'bcc', type: 'string', required: false, description: 'BCC recipient(s)', default: '' },
    { name: 'password', type: 'string', required: false, description: 'Gmail password if session expired', default: '' },
    {
      name: 'attachment',
      type: 'string',
      required: false,
      description: 'Absolute path to file to attach. E.g. "/home/user/Desktop/report.txt". Leave empty to skip.',
      default: '',
    },
  ],
};

const MASTER_PROFILE_ID = 'prof_fc613b4d';
const PINCHTAB_BASE = 'http://localhost:9867';
const MAX_ITERATIONS = 20;

// ── GROQ ─────────────────────────────────────────────────────────────────────
async function callGroq(system: string, user: string): Promise<string> {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  const bare = process.env.GROQ_API_KEY;
  if (bare && !keys.includes(bare)) keys.push(bare);
  if (keys.length === 0) throw new Error('No GROQ_API_KEY found.');

  let lastError = new Error('Unknown');
  for (const apiKey of keys) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          temperature: 0.1,
          max_tokens: 512,
        }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (res.status === 429 || res.status === 402) { lastError = new Error(`Rate limited ...${apiKey.slice(-6)}`); continue; }
      if (!res.ok) throw new Error(`Groq ${res.status}: ${data?.error?.message || raw}`);
      return data.choices[0].message.content as string;
    } catch (err: any) { lastError = err; }
  }
  throw new Error(`All Groq keys failed. Last: ${lastError.message}`);
}

// ── OVERSEER ──────────────────────────────────────────────────────────────────
interface OverseerAction {
  status: 'in_progress' | 'done' | 'error';
  observation: string;
  action: 'click' | 'type' | 'wait' | 'none';
  ref?: string;
  text?: string;
  reason: string;
}

async function askOverseer(goal: string, snapshot: any[], history: string[]): Promise<OverseerAction> {
  const system = `You are a browser automation overseer. Decide the SINGLE next action.
RULES: Only use refs from the snapshot. Never invent refs. Return ONLY valid JSON, no markdown.
FORMAT: {"status":"in_progress"|"done"|"error","observation":"...","action":"click"|"type"|"wait"|"none","ref":"e12","text":"...","reason":"..."}`;

  const elements = snapshot.slice(0, 80).map(el =>
    `${el.ref} | ${el.role} | ${(el.name || '').slice(0, 80)} | ${(el.text || '').slice(0, 60)}`
  );

  const user = `GOAL: ${goal}\nHISTORY:\n${history.length > 0 ? history.join('\n') : '(none)'}\nPAGE ELEMENTS (ref|role|name|text):\n${elements.join('\n')}\nNext action? JSON only.`;

  const raw = await callGroq(system, user);
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim()) as OverseerAction;
  } catch {
    console.log(`  [overseer] parse error: ${raw.slice(0, 80)}`);
    return { status: 'in_progress', observation: 'parse error', action: 'wait', reason: 'Retrying after bad AI response' };
  }
}

// ── PROFILE HELPERS ───────────────────────────────────────────────────────────
async function startMasterInstance(): Promise<string> {
  const res = await fetch(`${PINCHTAB_BASE}/instances/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId: MASTER_PROFILE_ID, mode: 'headed' }),
  });
  const data = JSON.parse(await res.text());
  if (!res.ok) throw new Error(`Failed to start: ${JSON.stringify(data)}`);
  return data.id;
}

async function stopMasterInstance(): Promise<void> {
  await fetch(`${PINCHTAB_BASE}/profiles/${MASTER_PROFILE_ID}/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── LOGIN OVERSEER ────────────────────────────────────────────────────────────
async function runLoginOverseer(pinchTab: any, password: string): Promise<void> {
  const goal = `Log into Gmail. Account is "labconet@gmail.com" (shown as "Conet Lab").
1. If account chooser shows this account as "Signed out", click it.
2. If password field is visible, type "${password}" into it, then click Next.
3. If Gmail inbox is loaded with Compose button visible, return status "done".
DO NOT click "Use another account". DO NOT create a new account.`;

  const history: string[] = [];

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    const snap = await pinchTab.snapshot('interactive') as any;
    const nodes: any[] = snap.nodes || snap.elements || [];
    console.log(`  [login] iteration ${i}/${MAX_ITERATIONS} — ${nodes.length} elements`);

    if (nodes.length < 3) {
      console.log(`  [login] page loading, waiting 3s...`);
      await pinchTab.wait(3000);
      continue;
    }

    const decision = await askOverseer(goal, nodes, history);
    console.log(`  [login] ${decision.observation} | ${decision.action} ref=${decision.ref || '-'} | ${decision.reason}`);
    history.push(`[${i}] ${decision.action} ref=${decision.ref || '-'} — ${decision.reason}`);

    if (decision.status === 'done') { console.log(`  [login] DONE`); return; }
    if (decision.status === 'error') { await pinchTab.wait(4000); continue; }

    if (decision.action === 'click' && decision.ref) {
      await pinchTab.click(decision.ref);
      await pinchTab.wait(3000);
    } else if (decision.action === 'type' && decision.ref && decision.text) {
      await pinchTab.click(decision.ref);
      await pinchTab.wait(400);
      await pinchTab.type(decision.ref, decision.text);
      await pinchTab.wait(500);
      if (decision.text === password) {
        console.log(`  [login] password typed — waiting 3s for Next button...`);
        await pinchTab.wait(3000);
      }
    } else {
      await pinchTab.wait(3000);
    }
  }
  console.log(`  [login] hit MAX_ITERATIONS — proceeding anyway`);
}

// ── ATTACH FILE ───────────────────────────────────────────────────────────────
async function attachFile(pinchTab: any, desktop: any, filePath: string): Promise<boolean> {
  console.log(`  [attach] attaching file: ${filePath}`);

  // ── 1. Find the attach button in Gmail compose ──
  // Gmail's attach button has aria-label "Attach files" or similar
  let attachBtn: any = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const snap = await pinchTab.snapshot('interactive') as any;
    const nodes: any[] = snap.nodes || snap.elements || [];

    attachBtn = nodes.find((el: any) => {
      const name = (el.name || '').toLowerCase();
      return (
        el.role === 'button' &&
        (name.includes('attach') || name.includes('attach files') || name.includes('attach file'))
      );
    });

    if (attachBtn) {
      console.log(`  [attach] attach button found: ref=${attachBtn.ref} name="${attachBtn.name}"`);
      break;
    }
    console.log(`  [attach] attach button not found (attempt ${attempt}/5), waiting...`);
    await pinchTab.wait(2000);
  }

  if (!attachBtn) {
    console.log(`  [attach] WARNING: attach button not found — skipping attachment`);
    return false;
  }

  // ── 2. Click the attach button — this opens the OS file picker ──
  await pinchTab.click(attachBtn.ref);
  await desktop.wait(2000); // Wait for OS file picker to open

  // ── 3. Type the file path into the file picker using desktop ──
  // The file picker is an OS-level dialog, not inside the browser.
  // We use desktop.pasteText to fill the path field, then press Enter.
  console.log(`  [attach] typing file path into OS file picker...`);
  await desktop.pasteText(filePath);
  await desktop.wait(500);
  await desktop.pressKeys(['Return']);
  await desktop.wait(1000);

  // ── 4. Wait for upload to complete ──
  // Poll the snapshot for the attachment chip (filename appears in compose)
  const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
  console.log(`  [attach] waiting for upload of "${fileName}" to complete...`);

  for (let attempt = 1; attempt <= 20; attempt++) {
    await pinchTab.wait(2000);
    const snap = await pinchTab.snapshot('all') as any;
    const nodes: any[] = snap.nodes || snap.elements || [];

    // Look for the filename appearing anywhere in the snapshot (attachment chip)
    const attachmentVisible = nodes.some((el: any) => {
      const name = (el.name || el.text || '').toLowerCase();
      return name.includes(fileName.toLowerCase()) || name.includes('uploading') === false && name.includes('attached');
    });

    // Also check page text for the filename
    const pageText = await pinchTab.getPageText().catch(() => '');
    const inPageText = (pageText || '').toLowerCase().includes(fileName.toLowerCase());

    console.log(`  [attach] upload check attempt ${attempt}/20 — filename in snapshot: ${attachmentVisible}, in page text: ${inPageText}`);

    if (attachmentVisible || inPageText) {
      console.log(`  [attach] upload complete! "${fileName}" is attached.`);
      return true;
    }

    // If we see "Uploading..." in the snapshot keep waiting
    const stillUploading = nodes.some((el: any) =>
      (el.name || el.text || '').toLowerCase().includes('uploading')
    );
    if (stillUploading) {
      console.log(`  [attach] still uploading...`);
    }
  }

  console.log(`  [attach] WARNING: could not confirm upload after 20 attempts — proceeding anyway`);
  return false;
}

// ── SEND VIA COMPOSE URL ──────────────────────────────────────────────────────
async function sendViaComposeUrl(
  pinchTab: any,
  desktop: any,
  to: string,
  subject: string,
  body: string,
  cc: string,
  bcc: string,
  attachment: string,
): Promise<boolean> {
  // Build Gmail compose URL — pre-fills all fields automatically
  let url = `https://mail.google.com/mail/?view=cm&fs=1`
    + `&to=${encodeURIComponent(to)}`
    + `&su=${encodeURIComponent(subject)}`
    + `&body=${encodeURIComponent(body)}`;
  if (cc)  url += `&cc=${encodeURIComponent(cc)}`;
  if (bcc) url += `&bcc=${encodeURIComponent(bcc)}`;

  console.log(`  [compose] navigating to Gmail compose URL...`);
  await pinchTab.navigate(url);
  await pinchTab.wait(5000); // Let compose window fully render

  // ── Attach file if requested ──
  if (attachment) {
    await attachFile(pinchTab, desktop, attachment);
    await pinchTab.wait(1000); // Brief settle after attachment
  }

  // ── Find and click Send button ──
  console.log(`  [compose] looking for Send button...`);

  for (let attempt = 1; attempt <= 10; attempt++) {
    const snap = await pinchTab.snapshot('interactive') as any;
    const nodes: any[] = snap.nodes || snap.elements || [];
    console.log(`  [compose] send attempt ${attempt}/10 — ${nodes.length} elements`);

    const sendBtn = nodes.find((el: any) =>
      el.role === 'button' &&
      (el.name || '').toLowerCase().includes('send') &&
      !(el.name || '').toLowerCase().includes('later')
    );

    if (sendBtn) {
      console.log(`  [compose] Send button found: ref=${sendBtn.ref} name="${sendBtn.name}"`);
      await pinchTab.click(sendBtn.ref);
      await pinchTab.wait(3000);
      console.log(`  [compose] Send clicked`);
      return true;
    }

    await pinchTab.wait(2000);
  }

  console.log(`  [compose] Send button not found after 10 attempts`);
  return false;
}

// ── MAIN EXECUTE ──────────────────────────────────────────────────────────────
export async function execute(
  variables: { to: string; subject: string; body: string; cc?: string; bcc?: string; password?: string; attachment?: string },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { pinchTab, desktop } = services;
  const { to, subject, body, cc = '', bcc = '', password = 'Comet.1234', attachment = '' } = variables;

  try {
    // ── Step 1: Start browser ─────────────────────────────────────────────────
    console.log('Step 1: Checking for existing instance...');
    const existing = await pinchTab.getProfileInstance(MASTER_PROFILE_ID);
    if (existing?.running) {
      console.log('Already running — stopping first...');
      await stopMasterInstance();
      await pinchTab.wait(2000);
    }

    console.log('Step 2: Starting browser with master profile...');
    const instanceId = await startMasterInstance();
    pinchTab.setCurrentInstance(instanceId);
    await pinchTab.wait(3000);

    await desktop.pressKeys(['F11']);
    await desktop.wait(1000);

    // ── Step 2: Navigate to Gmail inbox ──────────────────────────────────────
    console.log('Step 3: Navigating to Gmail...');
    await pinchTab.navigate('https://mail.google.com/mail/u/0/');
    await pinchTab.wait(5000);

    // ── Step 3: AI Overseer handles login ────────────────────────────────────
    console.log('Step 4: Running LOGIN overseer...');
    await runLoginOverseer(pinchTab, password);

    // ── Step 4: Compose URL + optional attachment + Send ─────────────────────
    console.log(`Step 5: Composing and sending${attachment ? ' with attachment' : ''}...`);
    const sent = await sendViaComposeUrl(pinchTab, desktop, to, subject, body, cc, bcc, attachment);

    const attachInfo = attachment ? ` | attachment: ${attachment.split('/').pop()}` : '';
    return {
      success: sent,
      message: sent
        ? `Email "${subject}" sent to ${to}${attachInfo}`
        : `Compose opened but Send not confirmed — check browser`,
      data: { to, subject, cc, bcc, attachment: attachment || null, emailSent: sent },
    };

  } catch (error: any) {
    console.error(`send-gmail failed: ${error.message}`);
    return { success: false, error: error.message, message: `Failed: ${error.message}` };
  }
}