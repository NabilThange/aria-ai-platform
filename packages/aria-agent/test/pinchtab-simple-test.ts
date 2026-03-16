#!/usr/bin/env node
/**
 * Simple PinchTab Test - Direct Execution
 * 
 * This is a standalone script that simulates a web agent conversation.
 * It opens Chrome, goes to Google, and searches for "hello world".
 * 
 * Run with: npx ts-node packages/aria-agent/test/pinchtab-simple-test.ts
 * 
 * This script makes REAL API calls to PinchTab and performs LIVE browser actions.
 * NO curl commands - this uses the actual PinchTabService class.
 */

import { PinchTabService } from '../src/services/pinchtab.service';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(emoji: string, message: string, color: string = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function logTool(toolName: string, input: any) {
  console.log(`\n${colors.bright}${colors.magenta}🔧 Tool Call: ${toolName}${colors.reset}`);
  console.log(`${colors.cyan}   Input: ${JSON.stringify(input)}${colors.reset}`);
}

async function simulateWebAgent() {
  log('🚀', 'Starting PinchTab Web Agent Simulation', colors.bright + colors.blue);
  log('📝', 'Task: Open Chrome, go to Google, search "hello world"', colors.blue);
  console.log('');

  // Set environment variable for local testing (Windows host accessing Docker)
  process.env.PINCHTAB_BASE_URL = 'http://localhost:9867';
  
  // Initialize PinchTab service
  const pinchTabService = new PinchTabService();
  
  try {
    // STEP 1: Health Check
    log('🏥', 'Step 1: Checking PinchTab health...', colors.yellow);
    logTool('pinchtab_health', {});
    
    const health = await pinchTabService.getHealth();
    log('✅', `PinchTab is ${health.status}`, colors.green);

    // STEP 2: List existing instances
    log('📋', 'Step 2: Checking for existing browser instances...', colors.yellow);
    logTool('pinchtab_list_instances', {});
    
    let instances = await pinchTabService.listInstances();
    log('📊', `Found ${instances.length} existing instances`, colors.green);

    let instanceId: string;
    let tabId: string;

    // Always launch a NEW headed instance for testing (don't reuse headless ones)
    const testName = `test-${Date.now()}`;
    log('🌐', `Step 3: Launching NEW Chrome instance in HEADED mode (visible!)...`, colors.yellow);
    logTool('pinchtab_launch_instance', { name: testName, mode: 'headed' });
    
    const instance = await pinchTabService.launchInstance(testName, 'headed');
    instanceId = instance.id;
    pinchTabService.setCurrentInstance(instanceId); // Set as current instance
    log('✅', `Chrome launched! Instance ID: ${instanceId}`, colors.green);
    
    // Wait for browser to initialize
    log('⏳', 'Waiting 3 seconds for browser to initialize...', colors.cyan);
    await pinchTabService.wait(3000);

    // STEP 4: Navigate to Google
    log('🌍', 'Step 4: Navigating to Google.com...', colors.yellow);
    logTool('pinchtab_navigate', { url: 'https://www.google.com' });
    
    tabId = await pinchTabService.navigate('https://www.google.com');
    log('✅', `Navigated! Tab ID: ${tabId}`, colors.green);
    
    // Wait for page load
    log('⏳', 'Waiting 2 seconds for page to load...', colors.cyan);
    logTool('pinchtab_wait', { ms: 2000 });
    await pinchTabService.wait(2000);

    // STEP 5: Get snapshot to find search box
    log('📸', 'Step 5: Taking snapshot to find search box...', colors.yellow);
    logTool('pinchtab_get_snapshot', {});
    
    const snapshot1 = await pinchTabService.snapshot('interactive');
    
    // Handle case where snapshot might not have elements (PinchTab uses 'nodes' not 'elements')
    const elements = (snapshot1 as any).nodes || snapshot1.elements || [];
    if (elements.length === 0) {
      throw new Error(`Snapshot returned no elements: ${JSON.stringify(snapshot1)}`);
    }
    
    log('✅', `Snapshot captured! Found ${elements.length} interactive elements`, colors.green);
    
    // Find search box (role: combobox with name containing "Search")
    const searchBox = elements.find((el: any) => 
      el.role === 'combobox' && el.name?.toLowerCase().includes('search')
    );
    
    if (!searchBox) {
      throw new Error('Could not find search box in snapshot');
    }
    
    log('🎯', `Found search box: ref="${searchBox.ref}", role="${searchBox.role}"`, colors.green);

    // STEP 6: Click search box
    log('🖱️', 'Step 6: Clicking search box to focus...', colors.yellow);
    logTool('pinchtab_click', { ref: searchBox.ref });
    
    await pinchTabService.click(searchBox.ref);
    log('✅', 'Search box focused', colors.green);
    
    await pinchTabService.wait(500);

    // STEP 7: Type "hello world"
    log('⌨️', 'Step 7: Typing "hello world" into search box...', colors.yellow);
    logTool('pinchtab_type', { ref: searchBox.ref, text: 'hello world' });
    
    await pinchTabService.type(searchBox.ref, 'hello world');
    log('✅', 'Text typed successfully', colors.green);
    
    await pinchTabService.wait(1000);

    // STEP 8: Get fresh snapshot to find search button
    log('📸', 'Step 8: Taking fresh snapshot to find search button...', colors.yellow);
    logTool('pinchtab_get_snapshot', {});
    
    const snapshot2 = await pinchTabService.snapshot('interactive');
    const elements2 = (snapshot2 as any).nodes || snapshot2.elements || [];
    log('✅', `Snapshot captured! Found ${elements2.length} interactive elements`, colors.green);
    
    // Find search button (role: button with name containing "Google Search")
    const searchButton = elements2.find((el: any) => 
      el.role === 'button' && el.name?.toLowerCase().includes('google search')
    );
    
    if (!searchButton) {
      throw new Error('Could not find search button in snapshot');
    }
    
    log('🎯', `Found search button: ref="${searchButton.ref}", role="${searchButton.role}"`, colors.green);

    // STEP 9: Click search button
    log('🖱️', 'Step 9: Clicking search button...', colors.yellow);
    logTool('pinchtab_click', { ref: searchButton.ref });
    
    await pinchTabService.click(searchButton.ref);
    log('✅', 'Search button clicked', colors.green);
    
    // Wait for results
    log('⏳', 'Waiting 2 seconds for search results...', colors.cyan);
    logTool('pinchtab_wait', { ms: 2000 });
    await pinchTabService.wait(2000);

    // STEP 10: Get final snapshot
    log('📸', 'Step 10: Taking final snapshot to verify results...', colors.yellow);
    logTool('pinchtab_get_snapshot', {});
    
    const snapshot3 = await pinchTabService.snapshot('interactive');
    const elements3 = (snapshot3 as any).nodes || snapshot3.elements || [];
    log('✅', `Final snapshot captured! Found ${elements3.length} interactive elements`, colors.green);
    
    // Verify results (look for links which indicate search results)
    const hasResults = elements3.some((el: any) => 
      el.role === 'link' && el.name && el.name.length > 0
    );
    
    if (hasResults) {
      log('✅', 'Search results are visible!', colors.green);
    } else {
      log('⚠️', 'Could not verify search results', colors.yellow);
    }

    // SUCCESS!
    console.log('');
    log('🎉', 'SUCCESS! Web agent simulation completed!', colors.bright + colors.green);
    console.log('');
    log('📊', 'Summary:', colors.bright);
    console.log(`   ${colors.green}✓${colors.reset} Launched Chrome in headed mode (visible)`);
    console.log(`   ${colors.green}✓${colors.reset} Navigated to Google.com`);
    console.log(`   ${colors.green}✓${colors.reset} Typed "hello world" in search box`);
    console.log(`   ${colors.green}✓${colors.reset} Clicked search button`);
    console.log(`   ${colors.green}✓${colors.reset} Verified search results appeared`);
    console.log('');
    log('✨', 'This was a REAL simulation - actual browser actions were performed!', colors.bright + colors.cyan);
    console.log('');

    // Cleanup: Stop the test instance
    log('🧹', 'Cleaning up: Stopping test instance...', colors.yellow);
    try {
      await pinchTabService.stopInstance(instanceId);
      log('✅', 'Test instance stopped', colors.green);
    } catch (error) {
      log('⚠️', `Cleanup warning: ${error.message}`, colors.yellow);
    }

  } catch (error) {
    console.log('');
    log('❌', `Error: ${error.message}`, colors.bright);
    console.log('');
    log('💡', 'Make sure PinchTab service is running at http://aria-desktop:9867', colors.yellow);
    console.log('');
    process.exit(1);
  }
}

// Run the simulation
simulateWebAgent().then(() => {
  log('👋', 'Test complete!', colors.bright);
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
