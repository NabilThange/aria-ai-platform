@echo off
echo 🧹 Perplexity Instance Cleanup Script
echo =====================================
echo.

REM Configuration
set PINCHTAB_URL=http://localhost:9867
set PROFILE_NAME=perplexity-profile

echo 📋 Step 1: Getting Perplexity profile information...
echo.

REM Get all profiles and find perplexity-profile ID
curl -s %PINCHTAB_URL%/profiles > profiles.json

REM Note: Windows doesn't have jq by default, so we'll use a simpler approach
REM Users can manually check profiles.json for the profile ID

echo ✅ Profile list saved to profiles.json
echo 📝 Please check profiles.json to find your perplexity-profile ID
echo.

REM Prompt user for profile ID
set /p PROFILE_ID="Enter the perplexity-profile ID (e.g., prof_xxx): "

if "%PROFILE_ID%"=="" (
    echo ❌ No profile ID provided. Exiting...
    pause
    exit /b 1
)

echo.
echo 📋 Step 2: Checking if instance is running...
curl -s %PINCHTAB_URL%/profiles/%PROFILE_ID%/instance > instance.json
type instance.json
echo.

REM Get instance ID from the response
set /p INSTANCE_ID="Enter the instance ID if running (or press Enter to skip): "

if not "%INSTANCE_ID%"=="" (
    echo.
    echo 📋 Step 3: Listing all tabs in instance...
    curl -s %PINCHTAB_URL%/instances/%INSTANCE_ID%/tabs > tabs.json
    type tabs.json
    echo.
    
    echo 🗑️  Step 4: Closing all tabs...
    echo Note: You'll need to manually close each tab using the tab IDs from tabs.json
    echo.
    echo Example command for each tab:
    echo curl -X POST %PINCHTAB_URL%/tabs/{TAB_ID}/close
    echo.
    
    set /p CLOSE_TABS="Do you want to see the tab close commands? (y/n): "
    if /i "%CLOSE_TABS%"=="y" (
        echo.
        echo Copy and run these commands for each tab ID from tabs.json:
        echo curl -X POST %PINCHTAB_URL%/tabs/TAB_ID_HERE/close
        echo.
    )
)

echo.
echo 🛑 Step 5: Stopping Perplexity instance...
curl -X POST %PINCHTAB_URL%/profiles/%PROFILE_ID%/stop
echo.

echo ⏳ Waiting for instance to stop...
timeout /t 3 /nobreak >nul

echo.
echo 📋 Step 6: Verifying instance stopped...
curl -s %PINCHTAB_URL%/profiles/%PROFILE_ID%/instance
echo.

echo.
echo ✅ Cleanup complete!
echo.
echo 📝 Summary:
echo    - Profile: %PROFILE_NAME% (%PROFILE_ID%)
echo    - Instance stopped: Yes
echo    - Tabs closed: Manual (see tabs.json)
echo.
echo 🗑️  Temporary files created:
echo    - profiles.json
echo    - instance.json
echo    - tabs.json
echo.
set /p CLEANUP_FILES="Delete temporary files? (y/n): "
if /i "%CLEANUP_FILES%"=="y" (
    del profiles.json instance.json tabs.json 2>nul
    echo ✅ Temporary files deleted
)

echo.
echo 🎉 All done!
pause
