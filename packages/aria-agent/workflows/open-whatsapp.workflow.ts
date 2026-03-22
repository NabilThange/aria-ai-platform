import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';

export const metadata: WorkflowMetadata = {
  name: 'open-whatsapp',
  description: 'Opens a WhatsApp Web chat with a specific phone number and optionally sends one or more messages.',
  version: '3.0.0',
  timeout_ms: 60000,
  variables: [
    {
      name: 'phone',
      type: 'string',
      required: true,
      description: 'Phone number with country code, no spaces or symbols. e.g. "911234567890"',
    },
    {
      name: 'messages',
      type: 'string',
      required: false,
      description: 'Messages to send, separated by " | ". e.g. "Hello! | How are you? | Talk later"',
      default: '',
    },
  ],
};

const MASTER_PROFILE_ID = 'prof_fc613b4d';
const PINCHTAB_BASE = 'http://localhost:9867';

async function startMasterInstance(mode: 'headed' | 'headless' = 'headed'): Promise<string> {
  const res = await fetch(`${PINCHTAB_BASE}/instances/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId: MASTER_PROFILE_ID, mode }),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`Failed to start instance: ${text}`);
  return data.id;
}

async function stopMasterInstance(): Promise<void> {
  await fetch(`${PINCHTAB_BASE}/profiles/${MASTER_PROFILE_ID}/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function execute(
  variables: { phone: string; messages?: string },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { pinchTab, desktop } = services;
  const { phone, messages = '' } = variables;

  // Strip any accidental spaces, +, dashes
  const cleanPhone = phone.replace(/[\s\+\-\(\)]/g, '');
  const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}`;

  // Parse messages — split by "|" or "^|" (CMD escaped pipe), trim each
  const msgList = messages
    ? messages.split(/\^?\|/).map(m => m.trim()).filter(m => m.length > 0)
    : [];

  try {
    // ── Step 1: Stop any existing instance ──
    console.log('🔐 Step 1: Checking for existing instance...');
    const existing = await pinchTab.getProfileInstance(MASTER_PROFILE_ID);
    if (existing?.running) {
      console.log('⚠️  Already running — stopping first...');
      await stopMasterInstance();
      await pinchTab.wait(2000);
    }

    // ── Step 2: Start browser with master profile ──
    console.log('🚀 Step 2: Starting browser with master profile...');
    const instanceId = await startMasterInstance('headed');
    pinchTab.setCurrentInstance(instanceId);
    await pinchTab.wait(2000);

    // ── Step 3: Fullscreen ──
    console.log('🖥️  Step 3: Fullscreening browser...');
    await desktop.pressKeys(['F11']);
    await desktop.wait(1000);

    // ── Step 4: Navigate directly to WhatsApp chat URL ──
    console.log(`📱 Step 4: Opening WhatsApp chat for +${cleanPhone}...`);
    await pinchTab.navigate(whatsappUrl);

    // ── Wait for the CHAT textbox to appear (not search box) ──
    console.log('⏳ Waiting for WhatsApp chat textbox to be ready...');
    let textBox: any = null;
    for (let attempt = 1; attempt <= 20; attempt++) {
      await pinchTab.wait(2000);
      const snap = await pinchTab.snapshot('interactive');
      const nodes = (snap as any).nodes || (snap as any).elements || [];

      // Log ALL textboxes so we can see exactly what WhatsApp calls them
      const allTextboxes = nodes.filter((el: any) => el.role === 'textbox');
      console.log(`   Attempt ${attempt}/20 — textboxes: ${allTextboxes.length}`);

      // Wait specifically for the CHAT input — NOT the search box
      // WhatsApp names it "Type a message to +XX XXXXX XXXXX"
      textBox = allTextboxes.find((el: any) =>
        (el.name || '').toLowerCase().includes('type a message') ||
        (el.name || '').toLowerCase().includes('message') ||
        (el.name || '').toLowerCase().includes('send a message')
      );

      if (textBox) {
        console.log(`✅ Chat textbox ready: ref=${textBox.ref} name="${textBox.name}"`);
        break;
      }
    }

    if (!textBox) {
      return {
        success: false,
        error: 'Textbox not found',
        message: `WhatsApp chat opened but textbox never appeared for +${cleanPhone} — browser left open`,
        data: { phone: cleanPhone, url: whatsappUrl, sent: [] },
      };
    }

    console.log(`✅ WhatsApp chat opened for +${cleanPhone}`);

    // ── Step 5: Send messages if provided ──
    if (msgList.length === 0) {
      console.log('💬 No messages to send — chat open, textbox focused');
      return {
        success: true,
        message: `WhatsApp chat opened for +${cleanPhone}`,
        data: { phone: cleanPhone, url: whatsappUrl, sent: [] },
      };
    }

    console.log(`💬 Step 5: Sending ${msgList.length} message(s)...`);
    const sent: string[] = [];

    for (let i = 0; i < msgList.length; i++) {
      const msg = msgList[i];
      console.log(`   Sending msg ${i + 1}/${msgList.length}: "${msg}"`);

      await pinchTab.click(textBox.ref);
      await pinchTab.wait(300);
      await pinchTab.type(textBox.ref, msg);
      await pinchTab.wait(400);
      await pinchTab.press('Enter');
      await pinchTab.wait(800); // Wait between messages

      sent.push(msg);
      console.log(`   ✅ Msg ${i + 1} sent`);
    }

    console.log(`🟢 All ${sent.length} message(s) sent — browser left open`);

    return {
      success: true,
      message: `Sent ${sent.length} message(s) to +${cleanPhone}`,
      data: { phone: cleanPhone, url: whatsappUrl, sent },
    };

  } catch (error) {
    console.error(`❌ Workflow failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      message: `Failed: ${error.message}`,
    };
  }
}