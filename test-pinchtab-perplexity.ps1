# ============================================================================
# PinchTab Perplexity Manual Testing Script
# ============================================================================
# This script helps you manually test the Perplexity workflow operations
# from Step 7A of freelancer-research-email.workflow.ts
# ============================================================================

# Configuration
$PINCHTAB_BASE_URL = "http://localhost:9867"
$ARIA_DESKTOP_URL = "http://localhost:9990"
$PROFILE_NAME = "perplexity-profile"

# Colors for output
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Step { param($msg) Write-Host "`n🔹 $msg" -ForegroundColor Yellow }

# ============================================================================
# STEP 0: Get Authentication Token
# ============================================================================
function Get-PinchTabToken {
    Write-Step "Getting PinchTab authentication token..."
    
    try {
        # Try environment variable first
        $envToken = $env:PINCHTAB_AUTH_TOKEN
        if ($envToken) {
            Write-Success "Token found in environment variable"
            return $envToken
        }
        
        # Try fetching from Aria Desktop config endpoint
        Write-Info "Fetching token from Aria Desktop config..."
        $configUrl = "$ARIA_DESKTOP_URL/api/pinchtab-config"
        $response = Invoke-RestMethod -Uri $configUrl -Method Get -TimeoutSec 5
        
        if ($response.server.token) {
            Write-Success "Token fetched from config: $($response.server.token.Substring(0, 10))..."
            return $response.server.token
        }
        
        Write-Error "No token found in config"
        return $null
    }
    catch {
        Write-Error "Failed to get token: $_"
        return $null
    }
}

# ============================================================================
# STEP 1: Create or Get Perplexity Profile
# ============================================================================
function Get-OrCreateProfile {
    param($token)
    
    Write-Step "Getting or creating Perplexity profile..."
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    try {
        # List existing profiles
        Write-Info "Listing existing profiles..."
        $profiles = Invoke-RestMethod -Uri "$PINCHTAB_BASE_URL/profiles" -Method Get -Headers $headers
        
        $profile = $profiles | Where-Object { $_.name -eq $PROFILE_NAME } | Select-Object -First 1
        
        if ($profile) {
            Write-Success "Found existing profile: $($profile.id)"
            return $profile.id
        }
        
        # Create new profile
        Write-Info "Creating new profile: $PROFILE_NAME"
        $body = @{
            name = $PROFILE_NAME
            description = "Persistent Perplexity session for testing"
        } | ConvertTo-Json
        
        $newProfile = Invoke-RestMethod -Uri "$PINCHTAB_BASE_URL/profiles" -Method Post -Headers $headers -Body $body
        Write-Success "Created profile: $($newProfile.id)"
        return $newProfile.id
    }
    catch {
        Write-Error "Failed to get/create profile: $_"
        return $null
    }
}

# ============================================================================
# STEP 2: Start Browser Instance with Profile
# ============================================================================
function Start-BrowserInstance {
    param($token, $profileId)
    
    Write-Step "Starting browser instance with profile..."
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    try {
        # Check if instance already running
        Write-Info "Checking for existing instance..."
        $status = Invoke-RestMethod -Uri "$PINCHTAB_BASE_URL/profiles/$profileId/instance" -Method Get -Headers $headers
        
        if ($status.running) {
            Write-Info "Stopping existing instance..."
            Invoke-RestMethod -Uri "$PINCHTAB_BASE_URL/profiles/$profileId/stop" -Method Post -Headers $headers | Out-Null
            Start-Sleep -Seconds 2
        }
        
        # Start new instance
        Write-Info "Starting new instance..."
        $body = @{
            profileId = $profileId
            mode = "headed"
        } | ConvertTo-Json
        
        $instance = Invoke-RestMethod -Uri "$PINCHTAB_BASE_URL/instances/start" -Method Post -Headers $headers -Body $body
        Write-Success "Instance started: $($instance.id)"
        
        Write-Info "Waiting 10 seconds for browser to initialize..."
        Start-Sleep -Seconds 10
        
        return $instance.id
    }
    catch {
        Write-Error "Failed to start instance: $_"
        return $null
    }
}

# ============================================================================
# STEP 3: Navigate to Perplexity
# ============================================================================
function Open-Perplexity {
    param($token, $instanceId)
    
    Write-Step "Opening Perplexity.ai..."
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    try {
        # Navigate to Perplexity
        $body = @{
            url = "https://www.perplexity.ai"
            instanceId = $instanceId
        } | ConvertTo-Json
        
        $result = Invoke-RestMethod -Uri "$PINCHTAB_BASE_URL/navigate" -Method Post -Headers $headers -Body $body
        Write-Success "Navigated to Perplexity"
        
        Write-Info "Waiting 8 seconds for page to load..."
        Start-Sleep -Seconds 8
        
        return $result
    }
    catch {
        Write-Error "Failed to navigate: $_"
        return $null
    }
}

# ============================================================================
# STEP 4: Execute JavaScript to Export Conversation
# ============================================================================
function Export-PerplexityConversation {
    param($token, $instanceId)
    
    Write-Step "Executing JavaScript to export conversation..."
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # The exact JavaScript from Step 7A
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
        $body = @{
            script = $exportScript
            instanceId = $instanceId
        } | ConvertTo-Json -Depth 10
        
        Write-Info "Sending JavaScript eval request..."
        $result = Invoke-RestMethod -Uri "$PINCHTAB_BASE_URL/eval" -Method Post -Headers $headers -Body $body
        
        Write-Success "JavaScript executed successfully!"
        Write-Info "Result: $($result | ConvertTo-Json -Depth 3)"
        
        Write-Info "Waiting 5 seconds for download to complete..."
        Start-Sleep -Seconds 5
        
        return $result
    }
    catch {
        Write-Error "Failed to execute JavaScript: $_"
        Write-Error "Response: $($_.Exception.Response | ConvertTo-Json -Depth 3)"
        return $null
    }
}

# ============================================================================
# STEP 5: Stop Browser Instance
# ============================================================================
function Stop-BrowserInstance {
    param($token, $profileId)
    
    Write-Step "Stopping browser instance..."
    
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    try {
        Invoke-RestMethod -Uri "$PINCHTAB_BASE_URL/profiles/$profileId/stop" -Method Post -Headers $headers | Out-Null
        Write-Success "Browser instance stopped"
        Start-Sleep -Seconds 2
    }
    catch {
        Write-Error "Failed to stop instance: $_"
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================
function Main {
    Write-Host "`n============================================================================" -ForegroundColor Magenta
    Write-Host "  PinchTab Perplexity Manual Testing" -ForegroundColor Magenta
    Write-Host "============================================================================`n" -ForegroundColor Magenta
    
    # Step 0: Get token
    $token = Get-PinchTabToken
    if (-not $token) {
        Write-Error "Cannot proceed without authentication token"
        return
    }
    
    # Step 1: Get or create profile
    $profileId = Get-OrCreateProfile -token $token
    if (-not $profileId) {
        Write-Error "Cannot proceed without profile"
        return
    }
    
    # Step 2: Start browser
    $instanceId = Start-BrowserInstance -token $token -profileId $profileId
    if (-not $instanceId) {
        Write-Error "Cannot proceed without browser instance"
        return
    }
    
    # Step 3: Open Perplexity
    $navResult = Open-Perplexity -token $token -instanceId $instanceId
    if (-not $navResult) {
        Write-Error "Failed to open Perplexity"
        Stop-BrowserInstance -token $token -profileId $profileId
        return
    }
    
    Write-Host "`n" -NoNewline
    Write-Host "⏸️  MANUAL INTERACTION TIME" -ForegroundColor Yellow -BackgroundColor DarkBlue
    Write-Host "   1. The browser should now be open with Perplexity" -ForegroundColor Cyan
    Write-Host "   2. Manually type a query and wait for the response" -ForegroundColor Cyan
    Write-Host "   3. Press ENTER when ready to export the conversation" -ForegroundColor Cyan
    Write-Host "`n" -NoNewline
    Read-Host "Press ENTER to continue"
    
    # Step 4: Export conversation
    $exportResult = Export-PerplexityConversation -token $token -instanceId $instanceId
    
    # Step 5: Stop browser
    Stop-BrowserInstance -token $token -profileId $profileId
    
    Write-Host "`n============================================================================" -ForegroundColor Magenta
    Write-Host "  Testing Complete!" -ForegroundColor Magenta
    Write-Host "============================================================================`n" -ForegroundColor Magenta
    
    if ($exportResult) {
        Write-Success "Export successful!"
        Write-Info "Check your Downloads folder for the markdown file"
    } else {
        Write-Error "Export failed - check the errors above"
    }
}

# Run the script
Main
