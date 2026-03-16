# Restart Instructions

## Issue
The frontend is showing an error because it's using a cached version of the shared package that doesn't include the new type guard functions.

## Solution
Restart the frontend development server to pick up the rebuilt shared package.

## Steps

1. **Stop the frontend dev server** (if running):
   - Press `Ctrl+C` in the terminal running `npm run dev`

2. **Restart the frontend dev server**:
   ```bash
   cd packages/aria-ui
   npm run dev
   ```

3. **Refresh your browser** to load the new code

## What Was Fixed

The shared package was rebuilt with the new type guard functions:
- `isAgentThinkingContentBlock()`
- `isAgentPlanContentBlock()`
- `isAgentVerifyContentBlock()`
- `isAgentQuestionContentBlock()`
- `isAgentRecoveryContentBlock()`
- `isAgentReportContentBlock()`

These are now properly exported and available to the frontend.

## Verification

After restarting, you should see:
- No more "is not a function" errors
- Agent actions appearing in the chat (if any agents have run)
- Clean console with no TypeScript errors

## If Issues Persist

If you still see errors after restarting:

1. **Clear Next.js cache**:
   ```bash
   cd packages/aria-ui
   rm -rf .next
   npm run dev
   ```

2. **Rebuild shared package again**:
   ```bash
   cd packages/shared
   npm run build
   cd ../aria-ui
   npm run dev
   ```

3. **Hard refresh browser**:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
