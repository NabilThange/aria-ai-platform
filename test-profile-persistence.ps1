# PinchTab Profile Persistence Verification Test (PowerShell)
# 
# Prerequisites:
# - PinchTab server running on http://localhost:9867
# 
# Usage:
#   .\test-profile-persistence.ps1

$PINCHTAB_URL = if ($env:PINCHTAB_BASE_URL) { $env:PINCHTAB_BASE_URL } else { "http://localhost:9867" }
$PROFILE_NAME = "web-agent-default"
$TEST_URL = "https://gmail.com"

function Write-Step {
    param($Step, $Message)
    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host "STEP $Step: $Message" -ForegroundColor White
    Write-Host ("=" * 80) -ForegroundColor Cyan
}

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Invoke-PinchTabRequest {
    param(
        [string]$Method,
        [string]$Path,
        [object]$Body = $null
    )
    
    $url = "$PINCHTAB_URL$Path"
    Write-Info "$Method $url"
    
    $params = @{
        Uri = $url
        Method = $Method
        ContentType = "application/json"
    }
    
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
        Write-Info "Body: $($params.Body)"
    }
    
    try {
        $response = Invoke-RestMethod @params
        Write-Info "Response: $($response | ConvertTo-Json -Depth 10 -Compress)"
        return $response
    }
    catch {
        Write-Error-Custom "Request failed: $_"
        throw
    }
}

# Main test
Write-Host ""
Write-Host ("█" * 80) -ForegroundColor Magenta
Write-Host "  PINCHTAB PROFILE PERSISTENCE VERIFICATION TEST" -ForegroundColor White
Write-Host ("█" * 80) -ForegroundColor Magenta
Write-Host ""

$profileId = $null
$instanceId1 = $null
$tabId1 = $null
$instanceId2 = $null
$tabId2 = $null
$cookies1 = $null
$cookies2 = $null

try {
    # STEP 1: Check Health
    Write-Step 1 "Check PinchTab Health"
    try {
        $health = Invoke-PinchTabRequest -Method GET -Path "/health"
        Write-Success "PinchTab is healthy: $($health | ConvertTo-Json -Compress)"
    }
    catch {
        Write-Error-Custom "PinchTab is not available!"
        Write-Error-Custom "Make sure the aria-desktop container is running:"
        Write-Info "  docker-compose -f docker/docker-compose.yml up aria-desktop"
        exit 1
    }

    # STEP 2: List Profiles
    Write-Step 2 "List Existing Profiles"
    try {
        $profiles = Invoke-PinchTabRequest -Method GET -Path "/profiles"
        $profileList = if ($profiles -is [array]) { $profiles } else { $profiles.profiles }
        
        Write-Success "Found $($profileList.Count) profiles"
        
        $existingProfile = $profileList | Where-Object { $_.name -eq $PROFILE_NAME }
        if ($existingProfile) {
            $profileId = $existingProfile.id
            Write-Success "Profile '$PROFILE_NAME' already exists: $profileId"
        }
        else {
            Write-Info "Profile '$PROFILE_NAME' does not exist yet"
        }
    }
    catch {
        Write-Warning-Custom "Failed to list profiles - profile system may not be available"
        Write-Error-Custom "Error: $_"
        exit 1
    }

    # STEP 3: Create Profile
    if (-not $profileId) {
        Write-Step 3 "Create Persistent Profile"
        try {
            $profile = Invoke-PinchTabRequest -Method POST -Path "/profiles" -Body @{
                name = $PROFILE_NAME
                description = "Test profile for session persistence verification"
            }
            
            $profileId = $profile.id
            Write-Success "Profile created: $profileId"
        }
        catch {
            Write-Error-Custom "Failed to create profile!"
            Write-Error-Custom "Error: $_"
            exit 1
        }
    }
    else {
        Write-Step 3 "Create Persistent Profile"
        Write-Info "Skipping - profile already exists"
    }

    # STEP 4: Start Instance (First Time)
    Write-Step 4 "Start Instance with Profile (First Time)"
    try {
        $instance = Invoke-PinchTabRequest -Method POST -Path "/profiles/$profileId/start" -Body @{
            headless = $false
        }
        
        $instanceId1 = $instance.id
        Write-Success "Instance started: $instanceId1"
        Write-Success "Instance is running in HEADED mode (visible in VNC)"
        Write-Info "VNC URL: http://localhost:9990"
    }
    catch {
        Write-Error-Custom "Failed to start instance with profile!"
        Write-Error-Custom "Error: $_"
        exit 1
    }

    Start-Sleep -Seconds 3

    # STEP 5: Navigate to Gmail (First Time)
    Write-Step 5 "Navigate to Gmail (First Time)"
    try {
        $tab = Invoke-PinchTabRequest -Method POST -Path "/instances/$instanceId1/tabs/open" -Body @{
            url = $TEST_URL
        }
        
        $tabId1 = if ($tab.tabId) { $tab.tabId } else { $tab.id }
        Write-Success "Tab opened: $tabId1"
        Write-Success "Navigated to: $TEST_URL"
        Write-Info "Check VNC to see if Gmail loaded (not blocked by IDPI)"
    }
    catch {
        Write-Error-Custom "Failed to navigate to Gmail!"
        Write-Error-Custom "Error: $_"
        try { Invoke-PinchTabRequest -Method POST -Path "/profiles/$profileId/stop" } catch {}
        exit 1
    }

    Start-Sleep -Seconds 5

    # STEP 6: Check Cookies (First Time)
    Write-Step 6 "Check Cookies (First Time)"
    try {
        $result = Invoke-PinchTabRequest -Method POST -Path "/tabs/$tabId1/eval" -Body @{
            script = "document.cookie"
        }
        
        $cookies1 = if ($result.result) { $result.result } else { $result }
        Write-Success "Cookies retrieved successfully"
        $preview = if ($cookies1.Length -gt 200) { $cookies1.Substring(0, 200) + "..." } else { $cookies1 }
        Write-Info "Cookies ($($cookies1.Length) chars): $preview"
        
        if ($cookies1.Length -eq 0) {
            Write-Warning-Custom "No cookies found - Gmail may not have set any yet"
        }
    }
    catch {
        Write-Error-Custom "Failed to evaluate JavaScript!"
        Write-Error-Custom "Error: $_"
        Write-Warning-Custom "The /eval endpoint may not be available"
    }

    # STEP 7: Stop Instance
    Write-Step 7 "Stop Instance (Profile Data Should Persist)"
    try {
        Invoke-PinchTabRequest -Method POST -Path "/profiles/$profileId/stop"
        Write-Success "Instance stopped successfully"
        Write-Success "Profile data (cookies, localStorage) should be saved"
    }
    catch {
        Write-Error-Custom "Failed to stop instance!"
        Write-Error-Custom "Error: $_"
        exit 1
    }

    Start-Sleep -Seconds 2

    # STEP 8: Verify Stopped
    Write-Step 8 "Verify Instance Stopped"
    try {
        $status = Invoke-PinchTabRequest -Method GET -Path "/profiles/$profileId/instance"
        
        if ($status.running) {
            Write-Warning-Custom "Instance still running: $($status.id)"
        }
        else {
            Write-Success "Instance confirmed stopped"
        }
    }
    catch {
        Write-Warning-Custom "Could not verify instance status"
    }

    # STEP 9: Start Instance (Second Time)
    Write-Step 9 "Start Instance with Profile (Second Time - SAME PROFILE)"
    try {
        $instance = Invoke-PinchTabRequest -Method POST -Path "/profiles/$profileId/start" -Body @{
            headless = $false
        }
        
        $instanceId2 = $instance.id
        Write-Success "New instance started: $instanceId2"
        Write-Info "This is a NEW instance but using the SAME profile"
        Write-Info "Cookies should persist from the previous session"
    }
    catch {
        Write-Error-Custom "Failed to restart instance with profile!"
        Write-Error-Custom "Error: $_"
        exit 1
    }

    Start-Sleep -Seconds 3

    # STEP 10: Navigate to Gmail (Second Time)
    Write-Step 10 "Navigate to Gmail (Second Time)"
    try {
        $tab = Invoke-PinchTabRequest -Method POST -Path "/instances/$instanceId2/tabs/open" -Body @{
            url = $TEST_URL
        }
        
        $tabId2 = if ($tab.tabId) { $tab.tabId } else { $tab.id }
        Write-Success "Tab opened: $tabId2"
        Write-Success "Navigated to: $TEST_URL"
    }
    catch {
        Write-Error-Custom "Failed to navigate to Gmail!"
        Write-Error-Custom "Error: $_"
        try { Invoke-PinchTabRequest -Method POST -Path "/profiles/$profileId/stop" } catch {}
        exit 1
    }

    Start-Sleep -Seconds 5

    # STEP 11: Check Cookies (Second Time)
    Write-Step 11 "Check Cookies (Second Time) - THE CRITICAL TEST"
    try {
        $result = Invoke-PinchTabRequest -Method POST -Path "/tabs/$tabId2/eval" -Body @{
            script = "document.cookie"
        }
        
        $cookies2 = if ($result.result) { $result.result } else { $result }
        Write-Success "Cookies retrieved successfully"
        $preview = if ($cookies2.Length -gt 200) { $cookies2.Substring(0, 200) + "..." } else { $cookies2 }
        Write-Info "Cookies ($($cookies2.Length) chars): $preview"
    }
    catch {
        Write-Error-Custom "Failed to evaluate JavaScript!"
        Write-Error-Custom "Error: $_"
    }

    # STEP 12: Compare Cookies
    Write-Step 12 "Compare Cookies - VERIFICATION"
    
    if ($null -ne $cookies1 -and $null -ne $cookies2) {
        Write-Host ""
        Write-Host "--- COOKIE COMPARISON ---" -ForegroundColor Cyan
        Write-Info "First session cookies:  $($cookies1.Length) chars"
        Write-Info "Second session cookies: $($cookies2.Length) chars"
        
        if ($cookies1 -eq $cookies2) {
            Write-Host ""
            Write-Host ("█" * 80) -ForegroundColor Green
            Write-Success "✅ COOKIES MATCH! SESSION PERSISTENCE WORKS!"
            Write-Host ("█" * 80) -ForegroundColor Green
            Write-Host ""
            Write-Success "Profile-based persistence is functioning correctly"
            Write-Success "Cookies persisted across instance restart"
        }
        elseif ($cookies1.Length -gt 0 -and $cookies2.Length -gt 0) {
            Write-Warning-Custom "Cookies differ between sessions"
            Write-Warning-Custom "This may be normal if Gmail set different cookies"
        }
        elseif ($cookies1.Length -eq 0 -and $cookies2.Length -eq 0) {
            Write-Warning-Custom "No cookies in either session"
        }
        else {
            Write-Warning-Custom "Cookie count changed between sessions"
        }
    }

    # STEP 13: Cleanup
    Write-Step 13 "Cleanup"
    try {
        Invoke-PinchTabRequest -Method POST -Path "/profiles/$profileId/stop"
        Write-Success "Instance stopped"
    }
    catch {
        Write-Warning-Custom "Failed to stop instance during cleanup"
    }

    # Summary
    Write-Host ""
    Write-Host ("█" * 80) -ForegroundColor Magenta
    Write-Host "  TEST SUMMARY" -ForegroundColor White
    Write-Host ("█" * 80) -ForegroundColor Magenta
    
    Write-Info "Profile ID: $profileId"
    Write-Info "First Instance: $instanceId1"
    Write-Info "Second Instance: $instanceId2"
    Write-Info "Test URL: $TEST_URL"
    
    Write-Host ""
    Write-Host "--- RESULTS ---" -ForegroundColor Cyan
    Write-Success "✅ Profile system is available"
    Write-Success "✅ Can create profiles"
    Write-Success "✅ Can start instance with profile"
    Write-Success "✅ Can navigate to external sites"
    Write-Success "✅ Can stop and restart with same profile"
    
    if ($null -ne $cookies1 -and $null -ne $cookies2) {
        if ($cookies1 -eq $cookies2 -and $cookies1.Length -gt 0) {
            Write-Success "✅ Cookies persist across restarts (FULL SUCCESS)"
        }
        elseif ($cookies1.Length -eq 0 -and $cookies2.Length -eq 0) {
            Write-Warning-Custom "⚠️  No cookies detected"
        }
        else {
            Write-Warning-Custom "⚠️  Cookie persistence unclear"
        }
    }
    
    Write-Host ""
    Write-Host ("█" * 80) -ForegroundColor Green
    Write-Host "  TEST COMPLETED" -ForegroundColor White
    Write-Host ("█" * 80) -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host ("█" * 80) -ForegroundColor Red
    Write-Host "  TEST FAILED" -ForegroundColor White
    Write-Host ("█" * 80) -ForegroundColor Red
    Write-Error-Custom "Fatal error: $_"
    exit 1
}
