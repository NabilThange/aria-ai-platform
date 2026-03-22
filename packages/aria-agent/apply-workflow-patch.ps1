# PowerShell script to apply workflow integration to OrchestrationService

$file = "src/orchestration/orchestration.service.ts"
$content = Get-Content $file -Raw

# Change 1: Update agentName (line 171)
$content = $content -replace "const agentName = step\.type === 'web' \? 'WEB' : 'DESKTOP';", "const agentName = step.type === 'workflow' ? 'WORKFLOW' : (step.type === 'web' ? 'WEB' : 'DESKTOP');"

# Change 2: Update step header (line 154)
$content = $content -replace "Agent: \`\$\{step\.type === 'web' \? 'WEB_AGENT' : 'DESKTOP_AGENT'\}", "Agent: `${step.type === 'workflow' ? 'WORKFLOW' : (step.type === 'web' ? 'WEB_AGENT' : 'DESKTOP_AGENT')}"

# Change 3: Update stepLog (line 162)
$content = $content -replace "const stepLog = new TaskLogger\(OrchestrationService\.name, taskId, step\.type === 'web' \? 'WEB' : 'DESKTOP'\);", "const stepLog = new TaskLogger(OrchestrationService.name, taskId, step.type === 'workflow' ? 'WORKFLOW' : (step.type === 'web' ? 'WEB' : 'DESKTOP'));"

# Change 4: Update plan summary (around line 125)
$oldPlanSummary = @"
      const webSteps = plan.steps.filter\(s => s\.type === 'web'\)\.length;
      const desktopSteps = plan.steps.filter\(s => s\.type === 'desktop'\)\.length;
      
      this\.logger\.log\(`Plan Summary:`\);
      this\.logger\.log\(`   Total Steps: \$\{plan\.steps\.length\}`\);
      this\.logger\.log\(`   Web Steps: \$\{webSteps\}`\);
      this\.logger\.log\(`   Desktop Steps: \$\{desktopSteps\}`\);
"@

$newPlanSummary = @"
      const webSteps = plan.steps.filter(s => s.type === 'web').length;
      const desktopSteps = plan.steps.filter(s => s.type === 'desktop').length;
      const workflowSteps = plan.steps.filter(s => s.type === 'workflow').length;
      
      this.logger.log(`Plan Summary:`);
      this.logger.log(`   Total Steps: `${plan.steps.length}`);
      this.logger.log(`   Web Steps: `${webSteps}`);
      this.logger.log(`   Desktop Steps: `${desktopSteps}`);
      this.logger.log(`   Workflow Steps: `${workflowSteps}`);
"@

$content = $content -replace $oldPlanSummary, $newPlanSummary

# Change 5: Main workflow execution (line 180)
$oldExecution = @"
          const result = step\.type === 'web'
            \? await this\.webAgent\.execute\(step, taskId\)
            : await this\.desktopAgent\.execute\(step, taskId\);
"@

$newExecution = @"
          let result: any;
          
          // Handle workflow steps
          if (step.type === 'workflow') {
            this.logger.log(`   Executing WORKFLOW: `${step.workflow_name}`);
            this.emitStatus(taskId, 'executing_workflow', step.workflow_name || 'unknown');
            
            const workflowResult = await this.workflowService.runWorkflow(
              step.workflow_name!,
              step.workflow_vars!,
              taskId
            );
            
            // Convert workflow result to agent result format
            result = {
              action: workflowResult.success ? 'workflow_completed' : 'workflow_failed',
              details: workflowResult.data || {},
              error: workflowResult.error,
              message: workflowResult.message,
            };
            
            this.logger.log(`   WORKFLOW Output:`);
            this.logger.log(`      Success: `${workflowResult.success}`);
            this.logger.log(`      Message: `${workflowResult.message}`);
            if (workflowResult.data) {
              this.logger.log(`      Data: `${JSON.stringify(workflowResult.data).substring(0, 200)}...`);
            }
          } else {
            // Handle regular web/desktop steps
            result = step.type === 'web'
              ? await this.webAgent.execute(step, taskId)
              : await this.desktopAgent.execute(step, taskId);
          }
"@

$content = $content -replace $oldExecution, $newExecution

# Save the modified content
Set-Content $file -Value $content

Write-Host "✅ Workflow integration applied successfully!" -ForegroundColor Green
Write-Host "📝 Modified: $file" -ForegroundColor Cyan
Write-Host "🔨 Run 'npm run build' to verify the changes" -ForegroundColor Yellow
