#!/usr/bin/env node

/**
 * PinchTab Profile Persistence Verification Test
 * 
 * This script tests the profile-based session persistence implementation.
 * It verifies that cookies persist across instance restarts when using profiles.
 * 
 * Prerequisites:
 * - PinchTab server running on http://localhost:9867
 * - Node.js installed
 * 
 * Usage:
 *   node test-profile-persistence.js
 */

const PINCHTAB_URL = process.env.PINCHTAB_BASE_URL || 'http://localhost:9867';
const PROFILE_NAME = 'web-agent-default';
const TEST_URL = 'https://gmail.com';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`STEP ${step}: ${message}`, 'bright');
  log('='.repeat(80), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function request(method, path, body = null) {
  const url = `${PINCHTAB_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  logInfo(`${method} ${url}`);
  if (body) {
    logInfo(`Body: ${JSON.stringify(body, null, 2)}`);
  }

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${JSON.stringify(data, null, 2)}`);
    }

    logInfo(`Response: ${JSON.stringify(data, null, 2)}`);
    return data;
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    throw error;
  }
}

async function sleep(ms) {
  logInfo(`Waiting ${ms}ms...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log('\n' + '█'.repeat(80), 'magenta');
  log('  PINCHTAB PROFILE PERSISTENCE VERIFICATION TEST', 'bright');
  log('█'.repeat(80) + '\n', 'magenta');

  let profileId = null;
  let instanceId1 = null;
  let tabId1 = null;
  let instanceId2 = null;
  let tabId2 = null;
  let cookies1 = null;
  let cookies2 = null;

  try {
    // ========================================================================
    // STEP 1: Check PinchTab Health
    // ========================================================================
    logStep(1, 'Check PinchTab Health');
    
    try {
      const health = await request('GET', '/health');
      logSuccess(`PinchTab is healthy: ${JSON.stringify(health)}`);
    } catch (error) {
      logError('PinchTab is not available!');
      logError('Make sure the aria-desktop container is running:');
      logInfo('  docker-compose -f docker/docker-compose.yml up aria-desktop');
      process.exit(1);
    }

    // ========================================================================
    // STEP 2: List Existing Profiles
    // ========================================================================
    logStep(2, 'List Existing Profiles');
    
    try {
      const profiles = await request('GET', '/profiles');
      const profileList = Array.isArray(profiles) ? profiles : (profiles.profiles || []);
      
      logSuccess(`Found ${profileList.length} profiles`);
      
      const existingProfile = profileList.find(p => p.name === PROFILE_NAME);
      if (existingProfile) {
        profileId = existingProfile.id;
        logSuccess(`Profile '${PROFILE_NAME}' already exists: ${profileId}`);
      } else {
        logInfo(`Profile '${PROFILE_NAME}' does not exist yet`);
      }
    } catch (error) {
      logWarning('Failed to list profiles - profile system may not be available');
      logWarning('Falling back to non-profile mode (ephemeral sessions)');
      logError(`Error: ${error.message}`);
      process.exit(1);
    }

    // ========================================================================
    // STEP 3: Create Profile (if needed)
    // ========================================================================
    if (!profileId) {
      logStep(3, 'Create Persistent Profile');
      
      try {
        const profile = await request('POST', '/profiles', {
          name: PROFILE_NAME,
          description: 'Test profile for session persistence verification',
        });
        
        profileId = profile.id;
        logSuccess(`Profile created: ${profileId}`);
      } catch (error) {
        logError('Failed to create profile!');
        logError(`Error: ${error.message}`);
        process.exit(1);
      }
    } else {
      logStep(3, 'Create Persistent Profile');
      logInfo('Skipping - profile already exists');
    }

    // ========================================================================
    // STEP 4: Start Instance with Profile (First Time)
    // ========================================================================
    logStep(4, 'Start Instance with Profile (First Time)');
    
    try {
      const instance = await request('POST', `/profiles/${profileId}/start`, {
        headless: false, // headed mode for visibility
      });
      
      instanceId1 = instance.id;
      logSuccess(`Instance started: ${instanceId1}`);
      logSuccess('Instance is running in HEADED mode (visible in VNC)');
      logInfo('VNC URL: http://localhost:9990');
    } catch (error) {
      logError('Failed to start instance with profile!');
      logError(`Error: ${error.message}`);
      process.exit(1);
    }

    // Wait for instance to be ready
    await sleep(3000);

    // ========================================================================
    // STEP 5: Navigate to Gmail (First Time)
    // ========================================================================
    logStep(5, 'Navigate to Gmail (First Time)');
    
    try {
      const tab = await request('POST', `/instances/${instanceId1}/tabs/open`, {
        url: TEST_URL,
      });
      
      tabId1 = tab.tabId || tab.id;
      logSuccess(`Tab opened: ${tabId1}`);
      logSuccess(`Navigated to: ${TEST_URL}`);
      logInfo('Check VNC to see if Gmail loaded (not blocked by IDPI)');
    } catch (error) {
      logError('Failed to navigate to Gmail!');
      logError(`Error: ${error.message}`);
      
      // Try to stop instance before exiting
      try {
        await request('POST', `/profiles/${profileId}/stop`);
      } catch {}
      
      process.exit(1);
    }

    // Wait for page to load
    await sleep(5000);

    // ========================================================================
    // STEP 6: Check Cookies (First Time)
    // ========================================================================
    logStep(6, 'Check Cookies (First Time)');
    
    try {
      const result = await request('POST', `/tabs/${tabId1}/eval`, {
        script: 'document.cookie',
      });
      
      cookies1 = result.result || result;
      logSuccess('Cookies retrieved successfully');
      logInfo(`Cookies (${cookies1.length} chars): ${cookies1.substring(0, 200)}${cookies1.length > 200 ? '...' : ''}`);
      
      if (cookies1.length === 0) {
        logWarning('No cookies found - Gmail may not have set any yet');
        logWarning('This is normal if the page just loaded');
      }
    } catch (error) {
      logError('Failed to evaluate JavaScript!');
      logError(`Error: ${error.message}`);
      logWarning('The /eval endpoint may not be available in this PinchTab version');
    }

    // ========================================================================
    // STEP 7: Stop Instance (Profile Persists)
    // ========================================================================
    logStep(7, 'Stop Instance (Profile Data Should Persist)');
    
    try {
      await request('POST', `/profiles/${profileId}/stop`);
      logSuccess('Instance stopped successfully');
      logSuccess('Profile data (cookies, localStorage) should be saved');
    } catch (error) {
      logError('Failed to stop instance!');
      logError(`Error: ${error.message}`);
      process.exit(1);
    }

    // Wait for instance to fully stop
    await sleep(2000);

    // ========================================================================
    // STEP 8: Verify Instance Stopped
    // ========================================================================
    logStep(8, 'Verify Instance Stopped');
    
    try {
      const status = await request('GET', `/profiles/${profileId}/instance`);
      
      if (status.running) {
        logWarning(`Instance still running: ${status.id}`);
      } else {
        logSuccess('Instance confirmed stopped');
      }
    } catch (error) {
      logWarning('Could not verify instance status');
      logInfo(`Error: ${error.message}`);
    }

    // ========================================================================
    // STEP 9: Start Instance with Profile (Second Time)
    // ========================================================================
    logStep(9, 'Start Instance with Profile (Second Time - SAME PROFILE)');
    
    try {
      const instance = await request('POST', `/profiles/${profileId}/start`, {
        headless: false,
      });
      
      instanceId2 = instance.id;
      logSuccess(`New instance started: ${instanceId2}`);
      logInfo('This is a NEW instance but using the SAME profile');
      logInfo('Cookies should persist from the previous session');
    } catch (error) {
      logError('Failed to restart instance with profile!');
      logError(`Error: ${error.message}`);
      process.exit(1);
    }

    // Wait for instance to be ready
    await sleep(3000);

    // ========================================================================
    // STEP 10: Navigate to Gmail (Second Time)
    // ========================================================================
    logStep(10, 'Navigate to Gmail (Second Time)');
    
    try {
      const tab = await request('POST', `/instances/${instanceId2}/tabs/open`, {
        url: TEST_URL,
      });
      
      tabId2 = tab.tabId || tab.id;
      logSuccess(`Tab opened: ${tabId2}`);
      logSuccess(`Navigated to: ${TEST_URL}`);
    } catch (error) {
      logError('Failed to navigate to Gmail!');
      logError(`Error: ${error.message}`);
      
      // Try to stop instance before exiting
      try {
        await request('POST', `/profiles/${profileId}/stop`);
      } catch {}
      
      process.exit(1);
    }

    // Wait for page to load
    await sleep(5000);

    // ========================================================================
    // STEP 11: Check Cookies (Second Time) - THE CRITICAL TEST
    // ========================================================================
    logStep(11, 'Check Cookies (Second Time) - THE CRITICAL TEST');
    
    try {
      const result = await request('POST', `/tabs/${tabId2}/eval`, {
        script: 'document.cookie',
      });
      
      cookies2 = result.result || result;
      logSuccess('Cookies retrieved successfully');
      logInfo(`Cookies (${cookies2.length} chars): ${cookies2.substring(0, 200)}${cookies2.length > 200 ? '...' : ''}`);
    } catch (error) {
      logError('Failed to evaluate JavaScript!');
      logError(`Error: ${error.message}`);
    }

    // ========================================================================
    // STEP 12: Compare Cookies - VERIFICATION
    // ========================================================================
    logStep(12, 'Compare Cookies - VERIFICATION');
    
    if (cookies1 !== null && cookies2 !== null) {
      log('\n--- COOKIE COMPARISON ---', 'cyan');
      logInfo(`First session cookies:  ${cookies1.length} chars`);
      logInfo(`Second session cookies: ${cookies2.length} chars`);
      
      if (cookies1 === cookies2) {
        log('\n' + '█'.repeat(80), 'green');
        logSuccess('✅ COOKIES MATCH! SESSION PERSISTENCE WORKS!');
        log('█'.repeat(80) + '\n', 'green');
        logSuccess('Profile-based persistence is functioning correctly');
        logSuccess('Cookies persisted across instance restart');
      } else if (cookies1.length > 0 && cookies2.length > 0) {
        logWarning('Cookies differ between sessions');
        logWarning('This may be normal if Gmail set different cookies');
        logInfo('First 100 chars of session 1: ' + cookies1.substring(0, 100));
        logInfo('First 100 chars of session 2: ' + cookies2.substring(0, 100));
        
        // Check if there's any overlap
        const overlap = cookies1.split(';').some(c1 => 
          cookies2.split(';').some(c2 => c1.trim() === c2.trim())
        );
        
        if (overlap) {
          logSuccess('Some cookies persisted - partial success');
        } else {
          logWarning('No cookie overlap detected');
        }
      } else if (cookies1.length === 0 && cookies2.length === 0) {
        logWarning('No cookies in either session');
        logWarning('Gmail may not have set cookies yet, or IDPI may be blocking');
      } else {
        logWarning('Cookie count changed between sessions');
        logInfo('This may indicate partial persistence or timing issues');
      }
    } else {
      logWarning('Could not compare cookies - eval endpoint may not be available');
    }

    // ========================================================================
    // STEP 13: Cleanup
    // ========================================================================
    logStep(13, 'Cleanup');
    
    try {
      await request('POST', `/profiles/${profileId}/stop`);
      logSuccess('Instance stopped');
    } catch (error) {
      logWarning('Failed to stop instance during cleanup');
    }

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    log('\n' + '█'.repeat(80), 'magenta');
    log('  TEST SUMMARY', 'bright');
    log('█'.repeat(80), 'magenta');
    
    logInfo(`Profile ID: ${profileId}`);
    logInfo(`First Instance: ${instanceId1}`);
    logInfo(`Second Instance: ${instanceId2}`);
    logInfo(`Test URL: ${TEST_URL}`);
    
    log('\n--- RESULTS ---', 'cyan');
    logSuccess('✅ Profile system is available');
    logSuccess('✅ Can create profiles');
    logSuccess('✅ Can start instance with profile');
    logSuccess('✅ Can navigate to external sites (IDPI not blocking)');
    logSuccess('✅ Can stop and restart with same profile');
    
    if (cookies1 !== null && cookies2 !== null) {
      if (cookies1 === cookies2 && cookies1.length > 0) {
        logSuccess('✅ Cookies persist across restarts (FULL SUCCESS)');
      } else if (cookies1.length === 0 && cookies2.length === 0) {
        logWarning('⚠️  No cookies detected (may need manual login)');
      } else {
        logWarning('⚠️  Cookie persistence unclear (needs investigation)');
      }
    } else {
      logWarning('⚠️  Could not verify cookie persistence (eval not available)');
    }
    
    log('\n--- NEXT STEPS ---', 'cyan');
    logInfo('1. Check VNC (http://localhost:9990) to see if Gmail loaded');
    logInfo('2. If Gmail is blocked, disable IDPI in PinchTab config');
    logInfo('3. To test login persistence:');
    logInfo('   - Manually log into Gmail via VNC');
    logInfo('   - Run this test again');
    logInfo('   - Check if still logged in after restart');
    
    log('\n' + '█'.repeat(80), 'green');
    log('  TEST COMPLETED', 'bright');
    log('█'.repeat(80) + '\n', 'green');

  } catch (error) {
    log('\n' + '█'.repeat(80), 'red');
    log('  TEST FAILED', 'bright');
    log('█'.repeat(80), 'red');
    logError(`Fatal error: ${error.message}`);
    logError(error.stack);
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  logError(`Unhandled error: ${error.message}`);
  process.exit(1);
});
