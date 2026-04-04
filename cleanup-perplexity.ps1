# Perplexity Instance Cleanup Script (PowerShell)
# Usage: .\cleanup-perplexity.ps1

Write-Host "Perplexity Instance Cleanup Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PINCHTAB_URL = "http://localhost:9867"
$DESKTOP_URL = "http://localhost:9990"
$PROFILE_NAME = "perplexity-profile"
$AUTH_TOKEN = $null

# Step 0: Get authentication token
Write-Host "Step 0: Fetching PinchTab authentication token..." -ForegroundColor Yellow

try {
    # Try environment variable first
    $AUTH_TOKEN = $env:PINCHTAB_AUTH_TOKEN
    
    if (-not $AUTH_TOKEN) {
        # Fetch from config endpoint
        $configUrl = "$DESKTOP_URL/api/pinchtab-config"
        Write-Host "  Fetching from: $configUrl" -ForegroundColor Gray
        
        $config = Invoke-RestMethod -Uri $configUrl -Method Get -TimeoutSec 5
        
        if ($config.server.token) {
            $AUTH_TOKEN = $config.server.token
            Write-Host "[OK] Authentication token retrieved from config" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] No token found in config" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "[OK] Using token from environment variable" -ForegroundColor Green
    }
    
    Write-Host ""
    
} catch {
    Write-Host "[ERROR] Failed to get authentication token: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Aria Desktop is running (http://localhost:9990)" -ForegroundColor Yellow
    Write-Host "  2. PinchTab is running (http://localhost:9867)" -ForegroundColor Yellow
    Write-Host "  3. Or set PINCHTAB_AUTH_TOKEN environment variable" -ForegroundColor Yellow
    exit 1
}

# Create headers with auth token
$headers = @{
    "Authorization" = "Bearer $AUTH_TOKEN"
    "Content-Type" = "application/json"
}

# Step 1: Get all profiles
Write-Host "Step 1: Getting Perplexity profile information..." -ForegroundColor Yellow
Write-Host ""

try {
    $profiles = Invoke-RestMethod -Uri "$PINCHTAB_URL/profiles" -Method Get -Headers $headers
    Write-Host "[OK] Found $($profiles.Count) profile(s)" -ForegroundColor Green
    
    # Find perplexity-profile
    $profile = $profiles | Where-Object { $_.name -eq $PROFILE_NAME }
    
    if (-not $profile) {
        Write-Host "[ERROR] Profile '$PROFILE_NAME' not found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Available profiles:" -ForegroundColor Yellow
        $profiles | ForEach-Object { Write-Host "  - $($_.name) (ID: $($_.id))" }
        exit 1
    }
    
    $PROFILE_ID = $profile.id
    Write-Host "[OK] Found profile: $PROFILE_NAME (ID: $PROFILE_ID)" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "[ERROR] Failed to get profiles: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Check if instance is running
Write-Host "Step 2: Checking if instance is running..." -ForegroundColor Yellow

try {
    $instanceStatus = Invoke-RestMethod -Uri "$PINCHTAB_URL/profiles/$PROFILE_ID/instance" -Method Get -Headers $headers
    
    if ($instanceStatus.running -eq $true) {
        $INSTANCE_ID = $instanceStatus.id
        Write-Host "[OK] Instance is running (ID: $INSTANCE_ID)" -ForegroundColor Green
        Write-Host ""
        
        # Step 3: List all tabs
        Write-Host "Step 3: Listing all tabs in instance..." -ForegroundColor Yellow
        
        try {
            $tabs = Invoke-RestMethod -Uri "$PINCHTAB_URL/instances/$INSTANCE_ID/tabs" -Method Get -Headers $headers
            Write-Host "[OK] Found $($tabs.Count) tab(s)" -ForegroundColor Green
            
            if ($tabs.Count -gt 0) {
                Write-Host ""
                Write-Host "Tabs:" -ForegroundColor Cyan
                $tabs | ForEach-Object { 
                    $tabId = if ($_.id) { $_.id } else { $_.tabId }
                    Write-Host "  - Tab ID: $tabId" 
                }
                Write-Host ""
                
                # Step 4: Close all tabs
                Write-Host "Step 4: Closing all tabs..." -ForegroundColor Yellow
                
                $closedCount = 0
                $failedCount = 0
                
                foreach ($tab in $tabs) {
                    $tabId = if ($tab.id) { $tab.id } else { $tab.tabId }
                    
                    try {
                        Write-Host "  Closing tab: $tabId..." -NoNewline
                        Invoke-RestMethod -Uri "$PINCHTAB_URL/tabs/$tabId/close" -Method Post -Headers $headers | Out-Null
                        Write-Host " [OK]" -ForegroundColor Green
                        $closedCount++
                        Start-Sleep -Milliseconds 500
                    } catch {
                        Write-Host " [FAILED]: $($_.Exception.Message)" -ForegroundColor Red
                        $failedCount++
                    }
                }
                
                Write-Host ""
                Write-Host "[OK] Closed $closedCount tab(s)" -ForegroundColor Green
                if ($failedCount -gt 0) {
                    Write-Host "[WARNING] Failed to close $failedCount tab(s)" -ForegroundColor Yellow
                }
                Write-Host ""
            } else {
                Write-Host "[OK] No tabs to close" -ForegroundColor Green
                Write-Host ""
            }
            
        } catch {
            Write-Host "[WARNING] Failed to list tabs: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host ""
        }
        
    } else {
        Write-Host "[OK] Instance is not running" -ForegroundColor Green
        Write-Host ""
    }
    
} catch {
    Write-Host "[WARNING] Could not check instance status: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 5: Stop instance
Write-Host "Step 5: Stopping Perplexity instance..." -ForegroundColor Yellow

try {
    Invoke-RestMethod -Uri "$PINCHTAB_URL/profiles/$PROFILE_ID/stop" -Method Post -Headers $headers | Out-Null
    Write-Host "[OK] Stop command sent" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Waiting for instance to stop..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
} catch {
    Write-Host "[WARNING] Stop command failed (instance may already be stopped): $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 6: Verify instance stopped
Write-Host "Step 6: Verifying instance stopped..." -ForegroundColor Yellow

try {
    $finalStatus = Invoke-RestMethod -Uri "$PINCHTAB_URL/profiles/$PROFILE_ID/instance" -Method Get -Headers $headers
    
    if ($finalStatus.running -eq $false) {
        Write-Host "[OK] Instance successfully stopped" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Instance may still be running" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "[OK] Instance stopped (no active instance found)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Cleanup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   Profile: $PROFILE_NAME ($PROFILE_ID)" -ForegroundColor White
Write-Host "   Status: Instance stopped, tabs closed" -ForegroundColor White
Write-Host ""
Write-Host "All done!" -ForegroundColor Green
Write-Host ""
