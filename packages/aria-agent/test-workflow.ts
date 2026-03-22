#!/usr/bin/env ts-node
/**
 * Simple Workflow Test Script
 * Tests the workflow system without running the full orchestration
 */

import { WorkflowService } from './src/services/workflow.service';
import { PinchTabService } from './src/services/pinchtab.service';
import { DesktopService } from './src/services/desktop.service';
import { BrowserLoggerService } from './src/logger/browser-logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

async function testWorkflows() {
  console.log('🧪 Testing Workflow System\n');
  
  // Initialize services
  const pinchTabService = new PinchTabService();
  const desktopService = new DesktopService();
  
  // Create mock BrowserLoggerService for testing
  const eventEmitter = new EventEmitter2();
  const browserLogger = new BrowserLoggerService(eventEmitter);
  
  const workflowService = new WorkflowService(pinchTabService, desktopService, browserLogger);
  
  try {
    // Test 1: List workflows
    console.log('📋 Test 1: Listing workflows...');
    const workflows = await workflowService.listWorkflows();
    console.log(`✅ Found ${workflows.length} workflows:`);
    workflows.forEach(w => {
      console.log(`   - ${w.name}: ${w.description}`);
    });
    console.log('');
    
    // Test 2: Read workflow metadata
    if (workflows.length > 0) {
      const firstWorkflow = workflows[0];
      console.log(`📖 Test 2: Reading workflow "${firstWorkflow.name}"...`);
      const metadata = await workflowService.readWorkflow(firstWorkflow.name);
      console.log(`✅ Workflow metadata:`);
      console.log(`   Name: ${metadata.name}`);
      console.log(`   Description: ${metadata.description}`);
      console.log(`   Version: ${metadata.version}`);
      console.log(`   Timeout: ${metadata.timeout_ms}ms`);
      console.log(`   Variables: ${metadata.variables.length}`);
      metadata.variables.forEach(v => {
        console.log(`      - ${v.name} (${v.type}${v.required ? ', required' : ''}): ${v.description}`);
      });
      console.log('');
    }
    
    console.log('✅ All tests passed!');
    console.log('\n🎉 Workflow system is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testWorkflows();
