/**
 * Test script to verify workflow loading
 * Run with: node test-workflow-loading.js
 */

const path = require('path');
const fs = require('fs');
const { glob } = require('glob');

async function testWorkflowLoading() {
  console.log('Testing workflow loading...\n');
  
  // Simulate what WorkflowService does
  const workflowsDir = path.join(__dirname, 'dist/workflows');
  console.log(`Workflows directory: ${workflowsDir}`);
  console.log(`Directory exists: ${fs.existsSync(workflowsDir)}\n`);
  
  // Find .workflow.js files
  const jsPattern = path.join(workflowsDir, '**/*.workflow.js');
  console.log(`Searching pattern: ${jsPattern}`);
  
  const workflowFiles = await glob(jsPattern, { windowsPathsNoEscape: true });
  console.log(`\nFound ${workflowFiles.length} workflow files:`);
  workflowFiles.forEach(file => console.log(`  - ${file}`));
  
  // Try to load each workflow
  console.log('\nLoading workflows...\n');
  for (const filePath of workflowFiles) {
    try {
      console.log(`Loading: ${filePath}`);
      const module = require(filePath);
      console.log(`  Keys: ${Object.keys(module).join(', ')}`);
      
      if (module.metadata) {
        console.log(`  ✅ Name: ${module.metadata.name}`);
        console.log(`  ✅ Description: ${module.metadata.description}`);
        console.log(`  ✅ Variables: ${module.metadata.variables.map(v => v.name).join(', ')}`);
      } else {
        console.log(`  ❌ No metadata found`);
      }
      
      if (module.execute) {
        console.log(`  ✅ Execute function found`);
      } else {
        console.log(`  ❌ No execute function`);
      }
      
      console.log('');
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      console.error(error.stack);
    }
  }
}

testWorkflowLoading().catch(console.error);
