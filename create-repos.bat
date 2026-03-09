@echo off
REM 🚀 Create GitHub Repos for Aria (Windows Version)

echo.
echo ========================================
echo 🚀 Creating GitHub Repositories for Aria
echo ========================================
echo.

REM Check if gh is installed
where gh >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ GitHub CLI not installed!
    echo.
    echo Run: winget install GitHub.cli
    echo.
    pause
    exit /b 1
)

echo ✓ GitHub CLI found
echo.

REM Check authentication
gh auth status >nul 2>nul
if %errorlevel% neq 0 (
    echo Please login to GitHub:
    gh auth login
) else (
    echo ✓ Already logged in to GitHub
)

echo.
set /p PRIVATE="Make repositories private? (y/N): "
if /i "%PRIVATE%"=="y" (
    set VISIBILITY=--private
    echo ✓ Repositories will be PRIVATE
) else (
    set VISIBILITY=--public
    echo ✓ Repositories will be PUBLIC
)

echo.
echo Creating 3 repositories:
echo   1. aria-ui (Frontend)
echo   2. aria-agent (Backend)
echo   3. ariad (Desktop Service)
echo.

set /p CONTINUE="Continue? (Y/n): "
if /i "%CONTINUE%"=="n" (
    echo Cancelled.
    exit /b 0
)

REM Save current directory
set "PROJECT_ROOT=%cd%"

echo.
echo ========================================
echo 📦 1/3: Creating aria-ui repository
echo ========================================
echo.

cd /d "%PROJECT_ROOT%\packages\aria-ui" || (
    echo ❌ Cannot find packages\aria-ui folder!
    echo Make sure you're running this from the Aria project root
    pause
    exit /b 1
)

REM Initialize git if needed
if not exist ".git" (
    git init
    echo ✓ Git initialized in aria-ui
)

REM Create .gitignore
(
echo # Dependencies
echo node_modules/
echo /.pnp
echo .pnp.js
echo.
echo # Next.js
echo /.next/
echo /out/
echo.
echo # Production
echo /build
echo.
echo # Environment
echo .env*.local
echo .env
echo.
echo # Vercel
echo .vercel
echo.
echo # TypeScript
echo *.tsbuildinfo
echo next-env.d.ts
) > .gitignore

git add .
git commit -m "Initial commit - Aria UI (Frontend)"

echo.
echo Creating GitHub repository: aria-ui...
gh repo create aria-ui %VISIBILITY% --source=. --description="Aria UI - Next.js Frontend for AI Computer Use Agent"

REM Get GitHub username
for /f "tokens=*" %%a in ('gh api user -q .login') do set GITHUB_USER=%%a

REM Add remote and push
git remote remove origin 2>nul
git remote add origin "https://github.com/%GITHUB_USER%/aria-ui.git"
git branch -M main
git push -u origin main --force

echo ✅ aria-ui repository created!
echo    URL: https://github.com/%GITHUB_USER%/aria-ui
echo.

echo ========================================
echo 📦 2/3: Creating aria-agent repository
echo ========================================
echo.

cd /d "%PROJECT_ROOT%\packages\aria-agent" || (
    echo ❌ Cannot find packages\aria-agent folder!
    pause
    exit /b 1
)

if not exist ".git" (
    git init
    echo ✓ Git initialized in aria-agent
)

REM Create .gitignore
(
echo # Dependencies
echo node_modules/
echo.
echo # Production
echo /dist
echo /build
echo.
echo # Environment
echo .env
echo .env.local
echo service-account.json
echo.
echo # Logs
echo *.log
) > .gitignore

git add .
git commit -m "Initial commit - Aria Agent (Backend API)"

echo.
echo Creating GitHub repository: aria-agent...
gh repo create aria-agent %VISIBILITY% --source=. --description="Aria Agent - NestJS Backend API for AI Computer Use"

git remote remove origin 2>nul
git remote add origin "https://github.com/%GITHUB_USER%/aria-agent.git"
git branch -M main
git push -u origin main --force

echo ✅ aria-agent repository created!
echo    URL: https://github.com/%GITHUB_USER%/aria-agent
echo.

echo ========================================
echo 📦 3/3: Creating ariad repository
echo ========================================
echo.

cd /d "%PROJECT_ROOT%\packages\ariad" || (
    echo ❌ Cannot find packages\ariad folder!
    pause
    exit /b 1
)

if not exist ".git" (
    git init
    echo ✓ Git initialized in ariad
)

REM Create .gitignore
(
echo # Dependencies
echo node_modules/
echo.
echo # Production
echo /dist
echo /build
echo.
echo # Environment
echo .env
echo .env.local
echo.
echo # Logs
echo *.log
) > .gitignore

git add .
git commit -m "Initial commit - Ariad (Desktop Service)"

echo.
echo Creating GitHub repository: ariad...
gh repo create ariad %VISIBILITY% --source=. --description="Ariad - Desktop Environment Service for Computer Use"

git remote remove origin 2>nul
git remote add origin "https://github.com/%GITHUB_USER%/ariad.git"
git branch -M main
git push -u origin main --force

echo ✅ ariad repository created!
echo    URL: https://github.com/%GITHUB_USER%/ariad
echo.

cd /d "%PROJECT_ROOT%"

echo.
echo ========================================
echo 🎉 ALL REPOSITORIES CREATED!
echo ========================================
echo.
echo Your repositories:
echo   1. https://github.com/%GITHUB_USER%/aria-ui
echo   2. https://github.com/%GITHUB_USER%/aria-agent
echo   3. https://github.com/%GITHUB_USER%/ariad
echo.
echo Next: Deploy to Render and Vercel!
echo.
pause