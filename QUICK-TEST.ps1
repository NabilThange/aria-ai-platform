# ============================================================================
# QUICK TEST - PinchTab Perplexity Export
# ============================================================================
# Minimal script to quickly test the JavaScript export functionality
# ============================================================================

Write-Host "`n🚀 Quick PinchTab Perplexity Test`n" -ForegroundColor Cyan

# Get token
Write-Host "📝 Getting auth token..." -ForegroundColor Yellow
try {
    $config = Invoke-RestMethod -Uri "http://localhost:9990/api/pinchtab-config" -TimeoutSec 5
    $TOKEN = $config.server.token
    Write-Host "✅ Token: $($TOKEN.Substring(0,10))...`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get token. Is Aria Desktop running on port 9990?`n" -ForegroundColor Red
    exit 1
}

$headers = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }

# Get or create profile
Write-Host "📁 Setting up profile..." -ForegroundColor Yellow
$profiles = Invoke-RestMethod -Uri "http://localhost:9867/profiles" -Headers $headers
$profile = $profiles | Where-Object { $_.name -eq "perplexity-profile" } | Select-Object -First 1

if (-not $profile) {
    $body = @{ name = "perplexity-profile"; description = "Test" } | ConvertTo-Json
    $profile = Invoke-RestMethod -Uri "http://localhost:9867/profiles" -Method Post -Headers $headers -Body $body
}
$PROFILE_ID = $profile.id
Write-Host "✅ Profile: $PROFILE_ID`n" -ForegroundColor Green

# Stop any existing instance
Write-Host "🛑 Stopping any existing instance..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:9867/profiles/$PROFILE_ID/stop" -Method Post -Headers $headers | Out-Null
    Start-Sleep -Seconds 2
} catch {}

# Start instance
Write-Host "🌐 Starting browser..." -ForegroundColor Yellow
$body = @{ profileId = $PROFILE_ID; mode = "headed" } | ConvertTo-Json
$instance = Invoke-RestMethod -Uri "http://localhost:9867/instances/start" -Method Post -Headers $headers -Body $body
$INSTANCE_ID = $instance.id
Write-Host "✅ Instance: $INSTANCE_ID" -ForegroundColor Green
Write-Host "⏳ Waiting 10 seconds for browser to initialize...`n" -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Navigate to Perplexity
Write-Host "🔍 Opening Perplexity..." -ForegroundColor Yellow
$body = @{ url = "https://www.perplexity.ai"; instanceId = $INSTANCE_ID } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:9867/navigate" -Method Post -Headers $headers -Body $body | Out-Null
Write-Host "✅ Navigated to Perplexity" -ForegroundColor Green
Write-Host "⏳ Waiting 8 seconds for page to load...`n" -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Pause for manual interaction
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  ⏸️  MANUAL STEP REQUIRED" -ForegroundColor Yellow -BackgroundColor DarkBlue
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "  1. Browser should now be open with Perplexity" -ForegroundColor Cyan
Write-Host "  2. Type a query (e.g., 'What is the capital of France?')" -ForegroundColor Cyan
Write-Host "  3. Wait for the response to complete" -ForegroundColor Cyan
Write-Host "  4. Press ENTER here to export the conversation" -ForegroundColor Cyan
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
Read-Host "Press ENTER when ready to export"

# Execute export JavaScript
Write-Host "`n📥 Executing export JavaScript..." -ForegroundColor Yellow

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

try {
    $body = @{ script = $exportScript; instanceId = $INSTANCE_ID } | ConvertTo-Json -Depth 10
    $result = Invoke-RestMethod -Uri "http://localhost:9867/eval" -Method Post -Headers $headers -Body $body
    
    Write-Host "✅ Export successful!`n" -ForegroundColor Green
    Write-Host "📊 Results:" -ForegroundColor Cyan
    Write-Host "   Filename: $($result.filename)" -ForegroundColor White
    Write-Host "   Turns: $($result.turns)" -ForegroundColor White
    Write-Host "   Citations: $($result.citations)" -ForegroundColor White
    Write-Host ""
    Write-Host "📁 Check your Downloads folder for the markdown file`n" -ForegroundColor Yellow
    
    Start-Sleep -Seconds 5
} catch {
    Write-Host "❌ Export failed: $_`n" -ForegroundColor Red
}

# Stop instance
Write-Host "🛑 Stopping browser..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:9867/profiles/$PROFILE_ID/stop" -Method Post -Headers $headers | Out-Null
Write-Host "✅ Browser stopped`n" -ForegroundColor Green

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  ✨ Test Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Magenta
