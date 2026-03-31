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
  const { desktop, browserLogger, taskId, messagesService } = services;
  const logger = new WorkflowLogger(browserLogger, taskId, 'email-doc-deep-research', messagesService);
  
  const workflowStartTime = Date.now();
  
  try {
    
    await logger.think(`Alright, let's tackle this research project about "${topic}"! I'll gather information from multiple sources and create a comprehensive ${documentType.toUpperCase()} document for you.`);
    await logger.think(`🎯 This is going to be thorough - web research, ${includeYouTube ? 'YouTube videos, ' : ''}and a professional document at the end!`);
    
    // ========================================
    // PHASE 1: Deep Web Research
    // ========================================
    console.log('📚 Phase 1: Deep web research...');
    checkRemainingTime(workflowStartTime, metadata.timeout_ms, 'web research');
    
    await logger.think(`📚 Phase 1: Deep Web Research`);
    await logger.think(`First, I'll dive into web research. Let me search for the most relevant and up-to-date information about ${topic}...`);
    await logger.think(`🔍 Searching ${maxLinks} quality sources across the web...`);
    
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
    
    await logger.think(`✅ Phase 1 complete! Web research is done`);
    await logger.think(`Great! I've gathered some solid web research. Found ${maxLinks} quality sources with detailed information.`);
    await logger.think(`📊 Got ${webResult.data.reportLength || 'tons of'} characters of research data!`);
    
    // ========================================
    // PHASE 2: YouTube Research
    // ========================================
    let youtubeResult: WorkflowResult | null = null;
    if (includeYouTube) {
      console.log('🎥 Phase 2: YouTube research...');
      checkRemainingTime(workflowStartTime, metadata.timeout_ms, 'YouTube research');
      
      await logger.think(`🎥 Phase 2: YouTube Research`);
      await logger.think(`Now let me check YouTube for video content. Visual explanations can add great depth to the research...`);
      await logger.think(`🎬 Searching for the top ${maxVideos} most relevant videos...`);
      
      // Import and execute youtube-demo workflow
      const youtubeWorkflow = await import('./youtube-demo.workflow');
      youtubeResult = await logger.logToolCall('youtube-demo', { topic, max_videos: maxVideos }, () =>
        youtubeWorkflow.execute({ topic, max_videos: maxVideos }, services)
      );
      
      if (youtubeResult.success) {
        console.log(`✅ YouTube research completed: ${youtubeResult.data?.videoCount ?? 0} videos`);
        await logger.think(`✅ Phase 2 complete! YouTube research is done`);
        await logger.think(`Perfect! Found ${youtubeResult.data?.videoCount ?? 0} relevant videos. This will add some great multimedia perspective.`);
        await logger.think(`🎯 Got video summaries, transcripts, and key insights!`);
      } else {
        console.warn(`⚠️ YouTube research failed, continuing without it: ${youtubeResult.error}`);
        await logger.think(`⚠️ Hmm, couldn't get YouTube data this time...`);
        await logger.think(`No worries though - the web research is solid enough to proceed!`);
      }
      
      // Close all PinchTab browser instances to avoid focus conflicts
      console.log('🧹 Closing all PinchTab browser instances...');
      await logger.think(`🧹 Cleaning up browser instances...`);
      await logger.think(`🔄 Getting ready for document generation phase...`);
      
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
        await logger.think(`✅ All clean! Browsers closed successfully`);
      } catch (err: any) {
        console.warn(`⚠️ Error closing browsers: ${err.message}`);
        await logger.think(`⚠️ Had a small hiccup closing browsers, but moving on...`);
      }
    }
    
    // ========================================
    // PHASE 3: Combine & Summarize
    // ========================================
    console.log('📝 Phase 3: Combining and summarizing research...');
    checkRemainingTime(workflowStartTime, metadata.timeout_ms, 'summarization');
    
    await logger.think(`📝 Phase 3: Combining & Analyzing`);
    await logger.think(`Now I'll combine all the research and distill it into the key insights. This is where the magic happens...`);
    await logger.think(`🧠 Reading through all the data I collected...`);
    
    // Read web research file
    const webContent = await desktop.readFile(webResult.data.filePath);
    const webText = Buffer.from(webContent.content || '', 'base64').toString('utf-8');
    
    // Validate that we have research content
    if (!webText || webText.length < 100) {
      throw new Error('Web research file is empty or too short. Cannot proceed with document generation.');
    }
    
    console.log(`✅ Web research file validated: ${webText.length} chars from ${webResult.data.filePath}`);
    
    // Combine with YouTube data for summarization
    let combinedText = `RESEARCH REPORT: ${topic}\n\n=== WEB RESEARCH ===\n${webText}\n\n`;
    
    if (youtubeResult?.success && youtubeResult.data?.videos) {
      combinedText += `=== YOUTUBE RESEARCH ===\n`;
      youtubeResult.data.videos.forEach((video: any, i: number) => {
        combinedText += `\nVideo ${i+1}: ${video?.title ?? 'Untitled'}\n`;
        combinedText += `URL: ${video?.url ?? 'N/A'}\n`;
        combinedText += `Summary: ${video?.summary ?? 'No summary available'}\n`;
      });
    }
    
    console.log(`✅ Combined research text: ${combinedText.length} chars (web + YouTube)`);
    
    await logger.think(`💾 Research data ready for document generation...`);
    
    // Summarize with Groq AI
    console.log('🤖 Summarizing research with AI...');
    await logger.think(`🤖 Firing up the AI to analyze everything...`);
    await logger.think(`Let me extract the most important points from all this data...`);
    
    const summarizedResearch = await summarizeResearch(combinedText);
    console.log(`✅ Research summarized: ${summarizedResearch.length} chars`);
    
    await logger.think(`✅ Phase 3 complete! Research analyzed and summarized`);
    await logger.think(`Excellent! I've identified the key findings. Got ${summarizedResearch.length} characters of distilled insights.`);
    await logger.think(`🎯 Now let's create a professional document with this information!`);
    
    // ========================================
    // PHASE 4: Generate Document
    // ========================================
    console.log('📄 Phase 4: Generating document with OpenCode...');
    checkRemainingTime(workflowStartTime, metadata.timeout_ms, 'document generation');
    
    await logger.think(`📄 Phase 4: Document Generation`);
    await logger.think(`Time to create the ${documentType.toUpperCase()} document. I'll use OpenCode to generate a professional, well-structured document with all the research findings...`);
    await logger.think(`✨ This is the exciting part - bringing it all together!`);
    
    const documentPrompt = buildOpenCodePrompt(topic, documentType, summarizedResearch);
    
    await logger.think(`📋 Crafting detailed instructions for OpenCode...`);
    await logger.think(`🎨 Requesting a ${documentType === 'ppt' ? '8-10 slide presentation' : documentType === 'pdf' ? 'professional PDF report' : 'well-structured text document'}...`);
    
    // Import and execute opencode-request workflow
    const opencodeWorkflow = await import('./opencode-request.workflow');
    const docResult = await logger.logToolCall('opencode-request', { 
      userRequest: documentPrompt,
      documentType: documentType, // Pass explicit document type
      researchFilePath: webResult.data.filePath, // Use Desktop file directly, not temp file
      emailRecipients: email
    }, () =>
      opencodeWorkflow.execute({ 
        userRequest: documentPrompt,
        documentType: documentType, // Pass explicit document type
        researchFilePath: webResult.data.filePath, // Use Desktop file directly, not temp file
        emailRecipients: email
      }, services)
    );
    
    if (!docResult.success) throw new Error(`Document generation failed: ${docResult.error}`);
    console.log(`✅ OpenCode completed and sent emails`);
    
    await logger.think(`✅ Phase 4 complete! Document generated successfully`);
    await logger.think(`Perfect! The document is ready and I've sent it to ${email}.`);
    await logger.think(`📧 Email sent with the ${documentType.toUpperCase()} document attached!`);
    await logger.think(`🎉 All done! Check your inbox!`);
    
    // ========================================
    // SUCCESS - OpenCode handles everything (document creation + email sending)
    // ========================================
    const totalDuration = Date.now() - workflowStartTime;
    console.log(`\n🎉 Workflow completed successfully in ${Math.floor(totalDuration / 1000)}s`);
    console.log(`📧 OpenCode sent emails to: ${email}`);
    console.log(`📄 OpenCode created document(s) and attached to emails`);
    
    await logger.think(`⏱️  Total time: ${Math.floor(totalDuration / 1000)} seconds`);
    await logger.think(`✨ That was a comprehensive research workflow!`);
    
    return {
      success: true,
      message: `Research completed. OpenCode generated document(s) and sent emails to ${email}`,
      data: {
        topic,
        webResearch: webResult.data,
        youtubeResearch: youtubeResult?.data,
        researchFilePath: webResult.data.filePath,
        emailRecipients: email,
        duration: totalDuration
      }
    };
    
  } catch (error: any) {
    console.error(`❌ Workflow failed: ${error.message}`);
    await logger.think(`❌ Oops, ran into an issue...`);
    await logger.think(`Error: ${error.message}`);
    await logger.think(`😔 Sorry about that, let me see if I can recover...`);
    return {
      success: false,
      error: error.message,
      message: `Workflow failed: ${error.message}`
    };
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
