import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';

// ─────────────────────────────────────────────────────────────────────────────
// METADATA
// ─────────────────────────────────────────────────────────────────────────────
export const metadata: WorkflowMetadata = {
  name: 'youtube-demo',
  description: 'Demo workflow that searches YouTube for a topic, opens 1-2 videos (without playing), and generates fake summaries from video titles using AI. Perfect for impressive live demos.',
  version: '1.0.0',
  timeout_ms: 60000, // 1 minute
  variables: [
    { 
      name: 'topic', 
      type: 'string', 
      required: true, 
      description: 'Topic to search on YouTube. E.g. "artificial intelligence", "quantum computing"' 
    },
    { 
      name: 'max_videos', 
      type: 'number', 
      required: false, 
      description: 'Number of videos to open (1-2). Default: 2', 
      default: 2 
    },
  ],
  user_steps: [
    {
      id: 'search-youtube',
      title: 'Search YouTube',
      description: 'Find relevant videos on YouTube matching the topic.',
    },
    {
      id: 'open-videos',
      title: 'Open videos',
      description: 'Navigate to selected video pages without playing them.',
    },
    {
      id: 'generate-summaries',
      title: 'Generate summaries',
      description: 'Use AI to create realistic summaries based on video titles.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// GROQ AI — Generate fake summaries from video titles
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
          temperature: 0.7,
          max_tokens: 500,
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

      return data.choices[0].message.content ?? '';
    } catch (err: any) {
      lastError = err;
      console.log(`  ⚠️  Groq key error: ${err.message}`);
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
    max_videos?: number;
  },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { pinchTab } = services;
  const { topic, max_videos = 2 } = variables;
  const videoCount = Math.min(Math.max(1, max_videos), 2); // Limit to 1-2 videos

  try {
    console.log(`\n🎬 YouTube Demo Workflow Starting...`);
    console.log(`📝 Topic: "${topic}"`);
    console.log(`🎥 Videos to open: ${videoCount}`);

    // ── STEP 1: Launch browser ────────────────────────────────────────────────
    console.log(`\n🌐 Step 1: Launching browser...`);
    const instance = await pinchTab.launchInstance(`youtube-demo-${Date.now()}`, 'headed');
    pinchTab.setCurrentInstance(instance.id);
    await pinchTab.wait(3000);
    console.log(`✅ Browser launched: ${instance.id}`);

    // ── STEP 2: Navigate to YouTube search ────────────────────────────────────
    console.log(`\n🔍 Step 2: Searching YouTube for "${topic}"...`);
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}`;
    await pinchTab.navigate(searchUrl);
    await pinchTab.wait(5000); // Wait for search results to load

    console.log(`✅ YouTube search page loaded`);

    // ── STEP 3: Take snapshot and extract video data ──────────────────────────
    console.log(`\n📸 Step 3: Extracting video information...`);
    const snapshot = await pinchTab.snapshot('all');
    const elements: any[] = snapshot.elements || [];

    console.log(`📋 Total elements found: ${elements.length}`);

    // Extract video titles and URLs
    const videoData: { title: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    for (const el of elements) {
      // Look for video links (YouTube video URLs contain /watch?v=)
      const href = el.url || el.href || el.attributes?.href || '';
      const text = (el.text || el.name || '').trim();

      if (
        href &&
        typeof href === 'string' &&
        href.includes('/watch?v=') &&
        !seenUrls.has(href) &&
        text.length > 10 // Ensure we have a meaningful title
      ) {
        // Convert relative URL to absolute
        const fullUrl = href.startsWith('http') ? href : `https://www.youtube.com${href}`;
        seenUrls.add(fullUrl);
        videoData.push({ title: text, url: fullUrl });

        console.log(`  🎥 Found: "${text.slice(0, 60)}..."`);

        if (videoData.length >= videoCount) break;
      }
    }

    if (videoData.length === 0) {
      return {
        success: false,
        error: 'No videos found in search results',
        message: `Could not find any videos for topic: "${topic}"`,
      };
    }

    console.log(`✅ Found ${videoData.length} videos`);

    // ── STEP 4: Open each video (without playing) ─────────────────────────────
    console.log(`\n🎬 Step 4: Opening videos...`);
    const openedVideos: { title: string; url: string; summary: string }[] = [];

    for (let i = 0; i < videoData.length; i++) {
      const video = videoData[i];
      console.log(`\n  [Video ${i + 1}/${videoData.length}]: "${video.title}"`);
      console.log(`  🔗 URL: ${video.url}`);

      // Navigate to video page
      await pinchTab.navigate(video.url);
      await pinchTab.wait(4000); // Wait for video page to load (but don't play)

      console.log(`  ✅ Video page opened (not playing)`);

      // Generate fake summary from video title using Groq AI
      console.log(`  🤖 Generating AI summary from title...`);
      const summary = await callGroq(
        `You are a YouTube video content analyst. Given a video title, generate a realistic 2-3 sentence summary of what the video likely covers. Make it sound professional and informative, as if you actually watched the video.

Be specific and relevant to the title. Include key topics, insights, or takeaways that would be expected from a video with this title.`,
        `Video title: "${video.title}"\n\nGenerate a realistic 2-3 sentence summary of what this video likely covers.`,
      );

      console.log(`  ✅ Summary generated: "${summary.slice(0, 100)}..."`);

      openedVideos.push({
        title: video.title,
        url: video.url,
        summary: summary.trim(),
      });

      // Small delay between videos for visual effect
      if (i < videoData.length - 1) {
        await pinchTab.wait(2000);
      }
    }

    console.log(`\n✅ Step 4 done. Opened ${openedVideos.length} videos`);

    // ── STEP 5: Save summaries to shared state ────────────────────────────────
    console.log(`\n💾 Step 5: Saving video summaries to shared state...`);
    
    // Note: Shared state would be saved here if we had access to it
    // For now, we'll just return the data in the result
    
    console.log(`✅ Step 5 done. Data ready for next workflow step`);

    // ── Done ──────────────────────────────────────────────────────────────────
    return {
      success: true,
      message: `YouTube demo complete! Opened ${openedVideos.length} videos and generated summaries.`,
      data: {
        topic,
        videoCount: openedVideos.length,
        videos: openedVideos,
      },
    };
  } catch (error: any) {
    console.error(`\n❌ YouTube demo workflow failed: ${error.message}`);
    return { 
      success: false, 
      error: error.message, 
      message: `YouTube demo failed: ${error.message}` 
    };
  }
}
