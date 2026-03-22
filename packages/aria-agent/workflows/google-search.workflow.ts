import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';

export const metadata: WorkflowMetadata = {
  name: 'google-search',
  description: 'Search DuckDuckGo for a query and return results',
  version: '1.0.2',
  timeout_ms: 30000,
  variables: [
    {
      name: 'query',
      type: 'string',
      required: true,
      description: 'Search query to execute',
    },
  ],
};

export async function execute(
  variables: { query: string },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { pinchTab } = services;
  const { query } = variables;

  let instanceId: string | undefined;

  try {
    console.log(`🔍 Starting DuckDuckGo search for: "${query}"`);

    // Step 1: Launch browser
    console.log('🚀 Step 1: Launching headed browser instance...');
    const instanceName = `ddg-search-${Date.now()}`;
    const instance = await pinchTab.launchInstance(instanceName, 'headed');
    instanceId = instance.id;
    pinchTab.setCurrentInstance(instanceId);
    console.log(`✅ Browser launched: ${instanceId}`);
    await pinchTab.wait(3000);

    // Step 2: Navigate directly to DuckDuckGo search URL
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;
    console.log(`📍 Step 2: Navigating to: ${searchUrl}`);
    await pinchTab.navigate(searchUrl);
    await pinchTab.wait(4000); // DDG needs a bit more time

    // Step 3: Snapshot
    console.log('📸 Step 3: Taking snapshot...');
    const snapshot = await pinchTab.snapshot('all');
    const elements = (snapshot as any).nodes || (snapshot as any).elements || [];
    console.log(`📋 Total elements found: ${elements.length}`);

    // DEBUG: log first 30 elements to understand structure
    console.log('🧪 Sample elements:');
    elements.slice(0, 30).forEach((el: any, i: number) => {
      console.log(`  [${i}] tag=${el.tag} role=${el.role} text="${(el.text || '').slice(0, 60)}"`);
    });

    // Step 4: Extract results - DuckDuckGo result titles are in <h2> tags
    let results: { title: string; url?: string }[] = [];

    // Try h2 headings (DDG result titles)
    const headings = elements.filter((el: any) =>
      (el.tag === 'h2' || el.tag === 'h3') &&
      el.text &&
      el.text.trim().length > 5
    );

    if (headings.length > 0) {
      console.log(`✅ Found ${headings.length} heading results`);
      results = headings.slice(0, 10).map((el: any) => ({ title: el.text.trim() }));
    }

    // Fallback: links with meaningful text
    if (results.length === 0) {
      console.log('⚠️ No headings, trying links...');
      const links = elements.filter((el: any) =>
        el.tag === 'a' &&
        el.text &&
        el.text.trim().length > 20 &&
        el.attributes?.href &&
        !el.attributes.href.includes('duckduckgo.com') &&
        !el.attributes.href.startsWith('#')
      );
      results = links.slice(0, 10).map((el: any) => ({
        title: el.text.trim(),
        url: el.attributes.href,
      }));
    }

    // Fallback: role=heading
    if (results.length === 0) {
      console.log('⚠️ No links, trying role=heading...');
      results = elements
        .filter((el: any) => el.role === 'heading' && el.text && el.text.trim().length > 5)
        .slice(0, 10)
        .map((el: any) => ({ title: el.text.trim() }));
    }

    console.log(`✅ Extracted ${results.length} results`);

    // Step 5: Cleanup
    console.log('🧹 Cleaning up...');
    if (instanceId) {
      try {
        await pinchTab.stopInstance(instanceId);
        console.log('✅ Browser stopped');
      } catch (cleanupError) {
        console.warn(`⚠️ Cleanup warning: ${cleanupError.message}`);
      }
    }

    return {
      success: true,
      message: `Search completed for "${query}" via DuckDuckGo`,
      data: {
        query,
        engine: 'DuckDuckGo',
        results,
        resultCount: results.length,
      },
    };

  } catch (error) {
    console.error(`❌ Search failed: ${error.message}`);

    if (instanceId) {
      try {
        await pinchTab.stopInstance(instanceId);
      } catch (_) {}
    }

    return {
      success: false,
      error: error.message,
      message: `Search failed: ${error.message}`,
    };
  }
}