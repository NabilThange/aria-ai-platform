import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';

export const metadata: WorkflowMetadata = {
  name: 'email-doc-deep-research',
  description: 'Complete research workflow: web + YouTube + document generation + email delivery',
  version: '1.0.0',
  timeout_ms: 600000, // 10 minutes total (increased to handle variable OpenCode times: 60s+200s+240s+buffer)
  variables: [
    { name: 'topic', type: 'string', required: true, description: 'Research topic' },
    { name: 'email', type: 'string', required: true, description: 'Recipient email' },
    { name: 'documentType', type: 'string', required: false, default: 'ppt', description: 'ppt, pdf, or txt' },
    { name: 'includeYouTube', type: 'boolean', required: false, default: true, description: 'Include YouTube research' },
    { name: 'maxLinks', type: 'number', required: false, default: 3, description: 'Max web sources (1-3)' },
    { name: 'maxVideos', type: 'number', required: false, default: 2, description: 'Max YouTube videos (1-3)' }
  ]
};

export async function execute(variables: any, services: WorkflowServices): Promise<WorkflowResult> {
  const { topic, email, documentType = 'ppt', includeYouTube = true, maxLinks = 3, maxVideos = 2 } = variables;
  const { desktop, browserLogger, taskId } = services;
  const logger = new WorkflowLogger(browserLogger, taskId, 'email-doc-deep-research');
  
  const workflowStartTime = Date.now();
  let tempFilePath: string | null = null;
  
  try {
    
    // ========================================
    // PHASE 1: Deep Web Research
    // ========================================
    console.log('📚 Phase 1: Deep web research...');
    checkRemainingTime(workflowStartTime, metadata.timeout_ms, 'web research');
    
    // Import and execute deep-research workflow
    const deepResearchWorkflow = await import('./deep-research.workflow');
    const webResult = await logger.logToolCall('deep-research', { topic }, () =>
      deepResearchWorkflow.execute({
        topic,
        max_links: maxLinks,
        include_wikipedia: true
        // NO email params to prevent duplicate sends
      }, services)
    );
    
    if (!webResult.success) throw new Error(`Web research failed: ${webResult.error}`);
    console.log(`✅ Web research completed: ${webResult.data.filePath}`);
    
    // ========================================
    // PHASE 2: YouTube Research
    // ========================================
    let youtubeResult: WorkflowResult | null = null;
    if (includeYouTube) {
      console.log('🎥 Phase 2: YouTube research...');
      checkRemainingTime(workflowStartTime, metadata.timeout_ms, 'YouTube research');
      
      // Import and execute youtube-demo workflow
      const youtubeWorkflow = await import('./youtube-demo.workflow');
      youtubeResult = await logger.logToolCall('youtube-demo', { topic, max_videos: maxVideos }, () =>
        youtubeWorkflow.execute({ topic, max_videos: maxVideos }, services)
      );
      
      if (youtubeResult.success) {
        console.log(`✅ YouTube research completed: ${youtubeResult.data?.videoCount ?? 0} videos`);
      } else {
        console.warn(`⚠️ YouTube research failed, continuing without it: ${youtubeResult.error}`);
      }
      
      // Close all PinchTab browser instances to avoid focus conflicts
      console.log('🧹 Closing all PinchTab browser instances...');
      try {
        const { pinchTab } = services;
        const instances = await pinchTab.listInstances();
        console.log(`   Found ${instances.length} browser instances to close`);
        
        for (const instance of instances) {
          try {
            await pinchTab.stopInstance(instance.id);
            console.log(`   ✅ Closed instance: ${instance.id}`);
          } catch (err) {
            console.warn(`   ⚠️ Could not close instance ${instance.id}: ${err.message}`);
          }
        }
        
        await desktop.wait(2000); // Wait for browsers to fully close
        console.log('✅ All browser instances closed');
      } catch (err: any) {
        console.warn(`⚠️ Error closing browsers: ${err.message}`);
      }
    }
    
    // ========================================
    // PHASE 3: Combine & Summarize
    // ========================================
    console.log('📝 Phase 3: Combining and summarizing research...');
    checkRemainingTime(workflowStartTime, metadata.timeout_ms, 'summarization');
    
    // Read web research file
    const webContent = await desktop.readFile(webResult.data.filePath);
    const webText = Buffer.from(webContent.content || '', 'base64').toString('utf-8');
    
    // Combine with YouTube data (safe access)
    let combinedText = `RESEARCH REPORT: ${topic}\n\n=== WEB RESEARCH ===\n${webText}\n\n`;
    
    if (youtubeResult?.success && youtubeResult.data?.videos) {
      combinedText += `=== YOUTUBE RESEARCH ===\n`;
      youtubeResult.data.videos.forEach((video: any, i: number) => {
        combinedText += `\nVideo ${i+1}: ${video?.title ?? 'Untitled'}\n`;
        combinedText += `URL: ${video?.url ?? 'N/A'}\n`;
        combinedText += `Summary: ${video?.summary ?? 'No summary available'}\n`;
      });
    }
    
    // Save combined research to temp file
    const uuid = Date.now().toString(36);
    tempFilePath = `/tmp/combined-research-${uuid}.txt`;
    const combinedBase64 = Buffer.from(combinedText, 'utf-8').toString('base64');
    await desktop.writeFile(tempFilePath, combinedBase64);
    console.log(`✅ Combined research saved to temp: ${tempFilePath}`);
    
    // Summarize with Groq AI
    console.log('🤖 Summarizing research with AI...');
    const summarizedResearch = await summarizeResearch(combinedText);
    console.log(`✅ Research summarized: ${summarizedResearch.length} chars`);
    
    // ========================================
    // PHASE 4: Generate Document
    // ========================================
    console.log('📄 Phase 4: Generating document with OpenCode...');
    checkRemainingTime(workflowStartTime, metadata.timeout_ms, 'document generation');
    
    const documentPrompt = buildOpenCodePrompt(topic, documentType, summarizedResearch);
    
    // Import and execute opencode-request workflow
    const opencodeWorkflow = await import('./opencode-request.workflow');
    const docResult = await logger.logToolCall('opencode-request', { 
      userRequest: documentPrompt,
      researchFilePath: tempFilePath || undefined,
      emailRecipients: email
    }, () =>
      opencodeWorkflow.execute({ 
        userRequest: documentPrompt,
        researchFilePath: tempFilePath || undefined,
        emailRecipients: email
      }, services)
    );
    
    if (!docResult.success) throw new Error(`Document generation failed: ${docResult.error}`);
    console.log(`✅ OpenCode completed and sent emails`);
    
    // ========================================
    // SUCCESS - OpenCode handles everything (document creation + email sending)
    // ========================================
    const totalDuration = Date.now() - workflowStartTime;
    console.log(`\n🎉 Workflow completed successfully in ${Math.floor(totalDuration / 1000)}s`);
    console.log(`📧 OpenCode sent emails to: ${email}`);
    console.log(`📄 OpenCode created document(s) and attached to emails`);
    
    return {
      success: true,
      message: `Research completed. OpenCode generated document(s) and sent emails to ${email}`,
      data: {
        topic,
        webResearch: webResult.data,
        youtubeResearch: youtubeResult?.data,
        researchFilePath: tempFilePath,
        emailRecipients: email,
        duration: totalDuration
      }
    };
    
  } catch (error: any) {
    console.error(`❌ Workflow failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      message: `Workflow failed: ${error.message}`
    };
  } finally {
    // Cleanup temp file - open fresh terminal for cleanup only
    if (tempFilePath) {
      try {
        console.log(`🧹 Cleaning up temp file: ${tempFilePath}`);
        
        // Open a fresh terminal for cleanup
        await logger.logToolCall('launchApplication', { application: 'terminal' }, () =>
          desktop.launchApplication('terminal')
        );
        await logger.logToolCall('wait', { duration: 2000 }, () =>
          desktop.wait(2000)
        );
        
        // Click to focus
        await logger.logToolCall('clickMouse', { x: 640, y: 400, button: 'left' }, () =>
          desktop.clickMouse({ x: 640, y: 400 }, 'left')
        );
        await logger.logToolCall('wait', { duration: 500 }, () =>
          desktop.wait(500)
        );
        
        // Hit Enter for fresh prompt
        await logger.logToolCall('pressKeys', { keys: ['Return'] }, () =>
          desktop.pressKeys(['Return'])
        );
        await logger.logToolCall('wait', { duration: 500 }, () =>
          desktop.wait(500)
        );
        
        // Delete temp file (use typeText instead of pasteText)
        await logger.logToolCall('typeText', { text: `rm "${tempFilePath}"` }, () =>
          desktop.typeText(`rm "${tempFilePath}"`, 0)
        );
        await logger.logToolCall('wait', { duration: 300 }, () =>
          desktop.wait(300)
        );
        await logger.logToolCall('pressKeys', { keys: ['Return'] }, () =>
          desktop.pressKeys(['Return'])
        );
        await logger.logToolCall('wait', { duration: 500 }, () =>
          desktop.wait(500)
        );
        console.log(`✅ Temp file deleted`);
      } catch (err: any) {
        console.warn(`⚠️ Cleanup failed: ${err.message}`);
      }
    }
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Check remaining time in total workflow budget
 */
function checkRemainingTime(workflowStartTime: number, totalTimeoutMs: number, phaseName: string): void {
  const elapsed = Date.now() - workflowStartTime;
  const remaining = totalTimeoutMs - elapsed;
  
  if (remaining <= 0) {
    throw new Error(`Total workflow timeout exceeded before ${phaseName} phase`);
  }
  
  console.log(`⏱️  ${phaseName}: ${Math.floor(remaining / 1000)}s remaining of total budget`);
}

/**
 * Summarize research with Groq AI
 */
async function summarizeResearch(fullText: string): Promise<string> {
  const systemPrompt = `You are a research summarization assistant. Extract the 10 most important points from the research data. Be concise and factual. Maximum 1500 characters.`;
  
  const userPrompt = `Summarize this research in 10 bullet points (max 1500 chars):\n\n${fullText.slice(0, 10000)}`;
  
  const summary = await callGroq(systemPrompt, userPrompt);
  
  // Hard cap at 3000 chars as safety net
  return summary.slice(0, 3000);
}

/**
 * Build OpenCode prompt (email instructions will be added by opencode-request workflow)
 */
function buildOpenCodePrompt(topic: string, docType: string, summarizedResearch: string): string {
  const filename = `${topic.replace(/\s+/g, '_')}-report`;
  const ext = docType === 'ppt' ? 'pptx' : docType === 'pdf' ? 'pdf' : 'txt';
  
  return `Create a professional ${docType.toUpperCase()} document about "${topic}".

KEY FINDINGS (use this content):
${summarizedResearch}

REQUIREMENTS:
${docType === 'ppt' ? `
- 8-10 slides
- Title slide with topic
- Key findings slides (one per major point)
- Conclusion slide
- Modern design with blue/white colors
` : docType === 'pdf' ? `
- Professional report format
- Title page with topic
- Sections for each key finding
- Conclusion
- Clean layout
` : `
- Well-structured text document
- Clear sections and headings
- Include all key findings
- Professional formatting
`}

CRITICAL: Save ONLY to this exact path: /home/user/Desktop/${filename}.${ext}`;
}

/**
 * Scan for generated file using find with -newer and fallback
 */
async function scanForGeneratedFile(
  desktop: any,
  logger: WorkflowLogger,
  docType: string,
  tempFilePath: string
): Promise<string> {
  console.log('🔍 Scanning Desktop for generated file...');
  
  const ext = docType === 'ppt' ? 'pptx' : docType === 'pdf' ? 'pdf' : 'txt';
  
  // Open a fresh terminal for file scanning (opencode already closed its terminal)
  await desktop.launchApplication('terminal');
  await desktop.wait(2000);
  
  // Click to focus
  await desktop.clickMouse({ x: 640, y: 400 }, 'left');
  await desktop.wait(500);
  
  // Hit Enter to get fresh prompt
  await desktop.pressKeys(['Return']);
  await desktop.wait(500);
  
  // Try find with -newer first (use typeText instead of pasteText)
  const findOutputPath = '/tmp/find-out.txt';
  await desktop.typeText(`find /home/user/Desktop -name "*.${ext}" -newer "${tempFilePath}" -type f > ${findOutputPath}`, 0);
  await desktop.wait(300);
  await desktop.pressKeys(['Return']);
  await desktop.wait(1000);
  
  const findContent = await desktop.readFile(findOutputPath);
  let findText = Buffer.from(findContent.content || '', 'base64').toString('utf-8');
  let lines = findText.trim().split('\n').filter(l => l.length > 0);
  
  // Fallback: if -newer returns nothing, try -mmin -5 (last 5 minutes)
  if (lines.length === 0) {
    console.log('⚠️  No files found with -newer, trying -mmin -5 fallback...');
    
    // Hit Enter for fresh prompt
    await desktop.pressKeys(['Return']);
    await desktop.wait(500);
    
    await desktop.typeText(`find /home/user/Desktop -name "*.${ext}" -mmin -5 -type f > ${findOutputPath}`, 0);
    await desktop.wait(300);
    await desktop.pressKeys(['Return']);
    await desktop.wait(1000);
    
    const fallbackContent = await desktop.readFile(findOutputPath);
    findText = Buffer.from(fallbackContent.content || '', 'base64').toString('utf-8');
    lines = findText.trim().split('\n').filter(l => l.length > 0);
  }
  
  if (lines.length === 0) {
    throw new Error(`No .${ext} file found on Desktop (tried -newer and -mmin -5)`);
  }
  
  const filePath = lines[0].trim();
  console.log(`✅ Found file: ${filePath}`);
  
  return filePath;
}

/**
 * Build email body
 */
function buildEmailBody(topic: string, webData: any, youtubeData: any): string {
  let body = `Research Report: ${topic}\n\n`;
  body += `This comprehensive report includes:\n`;
  body += `- Web research from ${webData?.sources?.length ?? 0} sources\n`;
  
  if (youtubeData?.videoCount) {
    body += `- YouTube research from ${youtubeData.videoCount} videos\n`;
  }
  
  body += `\nThe attached document contains the full research findings and analysis.\n\n`;
  body += `Generated by ARIA Research Assistant`;
  
  return body;
}

/**
 * Call Groq AI (key rotation)
 */
async function callGroq(systemPrompt: string, userContent: string): Promise<string> {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  const bare = process.env.GROQ_API_KEY;
  if (bare && !keys.includes(bare)) keys.push(bare);
  if (keys.length === 0) throw new Error('No GROQ_API_KEY found');

  let lastError = new Error('Unknown');
  for (const apiKey of keys) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (res.status === 429 || res.status === 402) { 
        lastError = new Error(`Rate limited ...${apiKey.slice(-6)}`); 
        continue; 
      }
      if (!res.ok) throw new Error(`Groq ${res.status}: ${data?.error?.message || raw}`);
      return data.choices[0].message.content as string;
    } catch (err: any) { 
      lastError = err; 
    }
  }
  throw new Error(`All Groq keys failed. Last: ${lastError.message}`);
}
