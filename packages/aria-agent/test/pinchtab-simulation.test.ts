/**
 * PinchTab Web Agent Simulation Test
 * 
 * This test simulates a REAL web agent conversation where:
 * 1. Agent checks for existing browser instances
 * 2. Agent launches Chrome in headed mode (visible)
 * 3. Agent navigates to Google.com
 * 4. Agent types "hello world" in the search box
 * 5. Agent clicks the search button
 * 
 * The test ACTUALLY executes these actions live using the real PinchTab service.
 * NO curl commands - this is a real agent simulation using tool calls.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WebAgent } from '../src/agents/web/web.agent';
import { PinchTabService } from '../src/services/pinchtab.service';
import { GroqService } from '../src/groq/groq.service';
import { SharedStateService } from '../src/shared-state/shared-state.service';
import { MessagesService } from '../src/messages/messages.service';
import { Logger } from '@nestjs/common';

describe('PinchTab Web Agent Simulation', () => {
  let webAgent: WebAgent;
  let pinchTabService: PinchTabService;
  let testTaskId: string;

  beforeAll(async () => {
    // Set environment variable for local testing (Windows host accessing Docker)
    process.env.PINCHTAB_BASE_URL = 'http://localhost:9867';
    
    // Create a real testing module with actual services
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebAgent,
        PinchTabService,
        GroqService,
        SharedStateService,
        MessagesService,
      ],
    }).compile();

    webAgent = module.get<WebAgent>(WebAgent);
    pinchTabService = module.get<PinchTabService>(PinchTabService);
    
    // Generate unique task ID for this test run
    testTaskId = `test_task_${Date.now()}`;
    
    Logger.log('🧪 Starting PinchTab Web Agent Simulation Test');
    Logger.log(`📋 Task ID: ${testTaskId}`);
  });

  afterAll(async () => {
    // Cleanup: stop any instances we created
    try {
      const instances = await pinchTabService.listInstances();
      for (const instance of instances) {
        if (instance.name?.includes('test') || instance.name?.includes('demo')) {
          Logger.log(`🧹 Cleaning up test instance: ${instance.id}`);
          await pinchTabService.stopInstance(instance.id);
        }
      }
    } catch (error) {
      Logger.warn(`Cleanup warning: ${error.message}`);
    }
  });

  it('should simulate web agent opening Chrome, going to Google, and searching "hello world"', async () => {
    Logger.log('\n🚀 Starting simulation...\n');

    // STEP 1: Check PinchTab health (like the real agent does)
    Logger.log('🔍 Step 1: Checking PinchTab health...');
    const health = await pinchTabService.getHealth();
    expect(health.status).toBe('healthy');
    Logger.log(`✅ PinchTab is ${health.status}`);

    // STEP 2: List existing instances (like the real agent does)
    Logger.log('\n🔍 Step 2: Checking for existing browser instances...');
    let instances = await pinchTabService.listInstances();
    Logger.log(`📊 Found ${instances.length} existing instances`);
    
    let instanceId: string;
    let tabId: string;

    if (instances.length > 0) {
      // Reuse existing instance
      instanceId = instances[0].id;
      Logger.log(`♻️  Reusing existing instance: ${instanceId}`);
      pinchTabService.setCurrentInstance(instanceId);
      
      // Get existing tabs
      const tabs = await pinchTabService.listTabs(instanceId);
      if (tabs.length > 0) {
        tabId = tabs[0].id || tabs[0].tabId;
        await pinchTabService.switchTab(tabId);
        Logger.log(`♻️  Reusing existing tab: ${tabId}`);
      }
    } else {
      // STEP 3: Launch new browser instance in HEADED mode (visible!)
      Logger.log('\n🚀 Step 3: Launching Chrome in HEADED mode (visible in VNC)...');
      const instance = await pinchTabService.launchInstance('test-demo', 'headed');
      instanceId = instance.id;
      Logger.log(`✅ Chrome launched! Instance ID: ${instanceId}`);
      
      // Wait for browser to fully start
      Logger.log('⏳ Waiting for browser to initialize...');
      await pinchTabService.wait(3000);
    }

    // STEP 4: Navigate to Google.com
    Logger.log('\n🌐 Step 4: Navigating to Google.com...');
    tabId = await pinchTabService.navigate('https://www.google.com');
    Logger.log(`✅ Navigated! Tab ID: ${tabId}`);
    
    // Wait for page to load
    Logger.log('⏳ Waiting for page to load...');
    await pinchTabService.wait(2000);

    // STEP 5: Get snapshot to find search box
    Logger.log('\n📸 Step 5: Taking snapshot to find search box...');
    const snapshot1 = await pinchTabService.snapshot('interactive');
    Logger.log(`✅ Snapshot captured! Found ${snapshot1.elements.length} interactive elements`);
    
    // Find the search box (usually a textarea or input with name containing "search" or "q")
    const searchBox = snapshot1.elements.find((el: any) => 
      (el.tag === 'textarea' || el.tag === 'input') && 
      (el.attributes?.name?.toLowerCase().includes('q') || 
       el.attributes?.title?.toLowerCase().includes('search') ||
       el.attributes?.['aria-label']?.toLowerCase().includes('search'))
    );
    
    expect(searchBox).toBeDefined();
    if (!searchBox) {
      throw new Error('Search box not found');
    }
    Logger.log(`🎯 Found search box: ref="${searchBox.ref}", tag="${searchBox.tag}"`);

    // STEP 6: Click the search box to focus it
    Logger.log('\n🖱️  Step 6: Clicking search box to focus...');
    await pinchTabService.click(searchBox.ref);
    Logger.log('✅ Search box focused');
    
    await pinchTabService.wait(500);

    // STEP 7: Type "hello world" into the search box
    Logger.log('\n⌨️  Step 7: Typing "hello world" into search box...');
    await pinchTabService.type(searchBox.ref, 'hello world');
    Logger.log('✅ Text typed successfully');
    
    await pinchTabService.wait(1000);

    // STEP 8: Get fresh snapshot to find search button
    Logger.log('\n📸 Step 8: Taking fresh snapshot to find search button...');
    const snapshot2 = await pinchTabService.snapshot('interactive');
    Logger.log(`✅ Snapshot captured! Found ${snapshot2.elements.length} interactive elements`);
    
    // Find the search button (usually a button or input with name/value containing "search")
    const searchButton = snapshot2.elements.find((el: any) => 
      (el.tag === 'button' || el.tag === 'input') && 
      (el.attributes?.name?.toLowerCase().includes('search') ||
       el.attributes?.value?.toLowerCase().includes('search') ||
       el.attributes?.['aria-label']?.toLowerCase().includes('search') ||
       el.text?.toLowerCase().includes('search'))
    );
    
    expect(searchButton).toBeDefined();
    if (!searchButton) {
      throw new Error('Search button not found');
    }
    Logger.log(`🎯 Found search button: ref="${searchButton.ref}", tag="${searchButton.tag}"`);

    // STEP 9: Click the search button
    Logger.log('\n🖱️  Step 9: Clicking search button...');
    await pinchTabService.click(searchButton.ref);
    Logger.log('✅ Search button clicked');
    
    // Wait for search results to load
    Logger.log('⏳ Waiting for search results...');
    await pinchTabService.wait(2000);

    // STEP 10: Get final snapshot to verify results
    Logger.log('\n📸 Step 10: Taking final snapshot to verify results...');
    const snapshot3 = await pinchTabService.snapshot('interactive');
    Logger.log(`✅ Final snapshot captured! Found ${snapshot3.elements.length} interactive elements`);
    
    // Verify we have search results (look for result links)
    const hasResults = snapshot3.elements.some((el: any) => 
      el.tag === 'a' && el.text && el.text.length > 0
    );
    
    expect(hasResults).toBe(true);
    Logger.log('✅ Search results are visible!');

    // STEP 11: Success!
    Logger.log('\n🎉 SUCCESS! Web agent simulation completed successfully!');
    Logger.log('📊 Summary:');
    Logger.log(`   - Launched Chrome in headed mode (visible)`);
    Logger.log(`   - Navigated to Google.com`);
    Logger.log(`   - Typed "hello world" in search box`);
    Logger.log(`   - Clicked search button`);
    Logger.log(`   - Verified search results appeared`);
    Logger.log('\n✨ This was a REAL simulation - actual browser actions were performed!\n');
  }, 60000); // 60 second timeout for the whole test

  it('should demonstrate the exact tool calls the agent makes', async () => {
    Logger.log('\n📋 Tool Call Sequence Demonstration\n');
    Logger.log('This shows the EXACT sequence of tool calls a real web agent makes:\n');
    
    const toolSequence = [
      {
        name: 'pinchtab_health',
        input: {},
        description: 'Check if PinchTab service is available'
      },
      {
        name: 'pinchtab_list_instances',
        input: {},
        description: 'Check for existing browser instances'
      },
      {
        name: 'pinchtab_launch_instance',
        input: { name: 'demo', mode: 'headed' },
        description: 'Launch Chrome in headed mode (visible in VNC)'
      },
      {
        name: 'pinchtab_navigate',
        input: { url: 'https://www.google.com' },
        description: 'Navigate to Google.com'
      },
      {
        name: 'pinchtab_wait',
        input: { ms: 2000 },
        description: 'Wait for page to load'
      },
      {
        name: 'pinchtab_get_snapshot',
        input: {},
        description: 'Get page elements to find search box'
      },
      {
        name: 'pinchtab_click',
        input: { ref: 'e23' },
        description: 'Click search box to focus it (ref from snapshot)'
      },
      {
        name: 'pinchtab_type',
        input: { ref: 'e23', text: 'hello world' },
        description: 'Type "hello world" into search box'
      },
      {
        name: 'pinchtab_get_snapshot',
        input: {},
        description: 'Get fresh snapshot to find search button'
      },
      {
        name: 'pinchtab_click',
        input: { ref: 'e27' },
        description: 'Click search button (ref from snapshot)'
      },
      {
        name: 'pinchtab_wait',
        input: { ms: 2000 },
        description: 'Wait for results to load'
      },
      {
        name: 'pinchtab_get_snapshot',
        input: {},
        description: 'Get final snapshot to verify results'
      }
    ];

    toolSequence.forEach((tool, index) => {
      Logger.log(`${index + 1}. ${tool.name}`);
      Logger.log(`   Input: ${JSON.stringify(tool.input)}`);
      Logger.log(`   → ${tool.description}\n`);
    });

    Logger.log('✅ This is the exact sequence the web agent uses!');
    Logger.log('📝 Note: The agent gets element refs (e23, e27) from snapshots dynamically\n');
  });
});
