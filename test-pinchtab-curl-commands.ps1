# ============================================================================
# PinchTab Manual Testing - Individual Commands
# ============================================================================
# Copy and paste these commands one by one to test each step manually
# ============================================================================

# Configuration
$PINCHTAB_BASE_URL = "http://localhost:9867"
$ARIA_DESKTOP_URL = "http://localhost:9990"

Write-Host @"

╔════════════════════════════════════════════════════════════════════════════╗
║                    PinchTab Manual Testing Commands                        ║
╔════════════════════════════════════════════════════════════════════════════╗

STEP 0: Get Authentication Token
════════════════════════════════════════════════════════════════════════════

"@

# ============================================================================
# STEP 0: Get Token
# ============================================================================
Write-Host "# Option A: From environment variable" -ForegroundColor Yellow
Write-Host '$TOKEN = $env:PINCHTAB_AUTH_TOKEN' -ForegroundColor Cyan
Write-Host 'Write-Host "Token: $TOKEN"' -ForegroundColor Cyan
Write-Host ""

Write-Host "# Option B: Fetch from Aria Desktop config" -ForegroundColor Yellow
Write-Host @'
$config = Invoke-RestMethod -Uri "http://localhost:9990/api/pinchtab-config" -Method Get
$TOKEN = $config.server.token
Write-Host "Token: $TOKEN"
'@ -ForegroundColor Cyan

Write-Host @"

════════════════════════════════════════════════════════════════════════════
STEP 1: List Profiles (or Create New One)
════════════════════════════════════════════════════════════════════════════

"@

Write-Host "# List existing profiles" -ForegroundColor Yellow
Write-Host @'
$headers = @{ "Authorization" = "Bearer $TOKEN" }
$profiles = Invoke-RestMethod -Uri "http://localhost:9867/profiles" -Method Get -Headers $headers
$profiles | Format-Table
'@ -ForegroundColor Cyan
Write-Host ""

Write-Host "# Find or create 'perplexity-profile'" -ForegroundColor Yellow
Write-Host @'
$profile = $profiles | Where-Object { $_.name -eq "perplexity-profile" } | Select-Object -First 1
if ($profile) {
    $PROFILE_ID = $profile.id
    Write-Host "Found profile: $PROFILE_ID"
} else {
    $body = @{ name = "perplexity-profile"; description = "Test profile" } | ConvertTo-Json
    $newProfile = Invoke-RestMethod -Uri "http://localhost:9867/profiles" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    $PROFILE_ID = $newProfile.id
    Write-Host "Created profile: $PROFILE_ID"
}
'@ -ForegroundColor Cyan

Write-Host @"

════════════════════════════════════════════════════════════════════════════
STEP 2: Start Browser Instance
════════════════════════════════════════════════════════════════════════════

"@

Write-Host "# Check if instance is already running" -ForegroundColor Yellow
Write-Host @'
$status = Invoke-RestMethod -Uri "http://localhost:9867/profiles/$PROFILE_ID/instance" -Method Get -Headers $headers
Write-Host "Running: $($status.running)"
'@ -ForegroundColor Cyan
Write-Host ""

Write-Host "# Stop existing instance (if running)" -ForegroundColor Yellow
Write-Host @'
if ($status.running) {
    Invoke-RestMethod -Uri "http://localhost:9867/profiles/$PROFILE_ID/stop" -Method Post -Headers $headers
    Write-Host "Stopped existing instance"
    Start-Sleep -Seconds 2
}
'@ -ForegroundColor Cyan
Write-Host ""

Write-Host "# Start new instance" -ForegroundColor Yellow
Write-Host @'
$body = @{ profileId = $PROFILE_ID; mode = "headed" } | ConvertTo-Json
$instance = Invoke-RestMethod -Uri "http://localhost:9867/instances/start" -Method Post -Headers $headers -Body $body -ContentType "application/json"
$INSTANCE_ID = $instance.id
Write-Host "Instance started: $INSTANCE_ID"
Start-Sleep -Seconds 10
'@ -ForegroundColor Cyan

Write-Host @"

════════════════════════════════════════════════════════════════════════════
STEP 3: Navigate to Perplexity
════════════════════════════════════════════════════════════════════════════

"@

Write-Host @'
$body = @{ url = "https://www.perplexity.ai"; instanceId = $INSTANCE_ID } | ConvertTo-Json
$navResult = Invoke-RestMethod -Uri "http://localhost:9867/navigate" -Method Post -Headers $headers -Body $body -ContentType "application/json"
Write-Host "Navigated to Perplexity"
Start-Sleep -Seconds 8
'@ -ForegroundColor Cyan

Write-Host @"

════════════════════════════════════════════════════════════════════════════
STEP 4: Execute JavaScript to Export Conversation
════════════════════════════════════════════════════════════════════════════

⚠️  IMPORTANT: Before running this step:
   1. Manually type a query in Perplexity
   2. Wait for the response to complete
   3. Then run the JavaScript below

"@

Write-Host "# The export JavaScript (from Step 7A)" -ForegroundColor Yellow
Write-Host @'
$exportScript = @'
(async function exportPerplexityComplete() {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  
  function safeFilename(text) {
    return text.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_').replace(/_{2,}/g, '_').replace(/^_+|_+$/g, '').substring(0, 120) || 'perplexity_thread';
  }
  
  function autoDownload(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  await delay(100);
  
  let threadTitle = 'perplexity_thread';
  const h1 = document.querySelector('h1.group\\/query');
  if (h1) {
    threadTitle = h1.textContent.trim().substring(0, 100);
  } else {
    threadTitle = document.title.replace(/[-|] Perplexity.*/i, '').trim();
  }
  
  await delay(100);
  
  const turns = [];
  const queryEls = Array.from(document.querySelectorAll('h1.group\\/query'));
  
  for (const queryEl of queryEls) {
    const turn = {
      query: '',
      answer: '',
      citations: [],
      sources: [],
      codeBlocks: []
    };
    
    turn.query = queryEl.textContent.trim();
    
    let answerContainer = queryEl;
    while (answerContainer && !answerContainer.querySelector('.prose')) {
      answerContainer = answerContainer.parentElement?.nextElementSibling;
      if (!answerContainer || answerContainer.querySelector('h1.group\\/query')) break;
    }
    
    if (answerContainer) {
      const proseEl = answerContainer.querySelector('.prose');
      if (proseEl) {
        const clone = proseEl.cloneNode(true);
        
        const citationEls = clone.querySelectorAll('.citation');
        const citationMap = new Map();
        citationEls.forEach((cite, idx) => {
          const link = cite.querySelector('a[href]');
          if (link) {
            const href = link.href;
            const text = cite.textContent.trim();
            const num = text.match(/\d+/) ? text.match(/\d+/)[0] : (idx + 1);
            if (!citationMap.has(num)) {
              citationMap.set(num, {
                number: num,
                url: href,
                title: link.textContent.trim()
              });
            }
            cite.replaceWith(document.createTextNode(`[${num}]`));
          } else {
            cite.remove();
          }
        });
        turn.citations = Array.from(citationMap.values());
        
        const codeEls = clone.querySelectorAll('pre code, code');
        codeEls.forEach(codeEl => {
          const pre = codeEl.closest('pre');
          if (pre) {
            const code = codeEl.textContent.trim();
            if (code.length > 15) {
              const classes = codeEl.className + ' ' + pre.className;
              const langMatch = classes.match(/language-(\w+)/);
              const lang = langMatch ? langMatch[1] : '';
              turn.codeBlocks.push({ lang, code });
              pre.replaceWith(document.createTextNode(`\n\n[CODE_BLOCK_${turn.codeBlocks.length - 1}]\n\n`));
            }
          }
        });
        
        turn.answer = clone.textContent.trim().replace(/\n{3,}/g, '\n\n').replace(/\[CODE_BLOCK_(\d+)\]/g, (match, idx) => {
          const block = turn.codeBlocks[parseInt(idx)];
          return block ? `\n\`\`\`${block.lang}\n${block.code}\n\`\`\`\n` : '';
        });
      }
    }
    
    if (turn.query || turn.answer) {
      turns.push(turn);
    }
  }
  
  await delay(100);
  
  let md = '';
  md += `# ${threadTitle}\n\n`;
  md += `> **Exported by Aria Research**  \n`;
  md += `> Date: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}  \n`;
  md += `> Source: ${location.href}\n\n`;
  md += '---\n\n';
  
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    
    if (turn.query) {
      md += `## 🧑 Query ${i + 1}\n\n`;
      md += `${turn.query}\n\n`;
    }
    
    if (turn.answer) {
      md += `## 🤖 Answer\n\n`;
      md += `${turn.answer}\n\n`;
    }
    
    if (turn.citations.length > 0) {
      md += `### 📚 Sources\n\n`;
      turn.citations.forEach(cite => {
        md += `[${cite.number}] ${cite.title}  \n`;
        md += `<${cite.url}>\n\n`;
      });
    }
    
    md += '\n---\n\n';
  }
  
  md += `\n\n*Exported with Aria Research Perplexity Exporter*\n`;
  
  await delay(200);
  
  const filename = `Aria_Research_${safeFilename(threadTitle)}.md`;
  autoDownload(md, filename);
  
  return { 
    success: true, 
    filename, 
    turns: turns.length,
    citations: turns.reduce((a, t) => a + t.citations.length, 0)
  };
})();
'@

$body = @{ script = $exportScript; instanceId = $INSTANCE_ID } | ConvertTo-Json -Depth 10
$result = Invoke-RestMethod -Uri "http://localhost:9867/eval" -Method Post -Headers $headers -Body $body -ContentType "application/json"
Write-Host "Export result: $($result | ConvertTo-Json -Depth 3)"
Start-Sleep -Seconds 5
'@ -ForegroundColor Cyan

Write-Host @"

════════════════════════════════════════════════════════════════════════════
STEP 5: Stop Browser Instance
════════════════════════════════════════════════════════════════════════════

"@

Write-Host @'
Invoke-RestMethod -Uri "http://localhost:9867/profiles/$PROFILE_ID/stop" -Method Post -Headers $headers
Write-Host "Browser stopped"
'@ -ForegroundColor Cyan

Write-Host @"

════════════════════════════════════════════════════════════════════════════
QUICK REFERENCE - All Variables
════════════════════════════════════════════════════════════════════════════

"@

Write-Host @'
# Check your variables at any time:
Write-Host "TOKEN: $TOKEN"
Write-Host "PROFILE_ID: $PROFILE_ID"
Write-Host "INSTANCE_ID: $INSTANCE_ID"
'@ -ForegroundColor Cyan

Write-Host @"

════════════════════════════════════════════════════════════════════════════
TROUBLESHOOTING
════════════════════════════════════════════════════════════════════════════

# Check if PinchTab is running:
Invoke-RestMethod -Uri "http://localhost:9867/health" -Method Get

# Check if Aria Desktop is running:
Invoke-RestMethod -Uri "http://localhost:9990" -Method Get

# List all instances:
Invoke-RestMethod -Uri "http://localhost:9867/instances" -Method Get -Headers `$headers

# Get current tab info:
Invoke-RestMethod -Uri "http://localhost:9867/instances/`$INSTANCE_ID/tabs" -Method Get -Headers `$headers

════════════════════════════════════════════════════════════════════════════

"@
