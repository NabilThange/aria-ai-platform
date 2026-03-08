# Bytez Models Not Showing - Troubleshooting

## Issue
Bytez models are not appearing in the frontend model selector dropdown.

## Root Cause
The backend server needs to be restarted to pick up the `BYTEZ_API_KEY` environment variable.

## Solution
Restart the backend server:

```bash
# Stop the current backend process (Ctrl+C if running in terminal)
# Then restart:
cd packages/aria-agent
npm run start:dev
```

Or if using Docker:
```bash
docker-compose restart aria-agent
```

## Verification
After restarting, the Bytez models should appear in the model selector under the "BYTEZ" section:
- Claude Haiku 4.5
- Claude Sonnet 4.5
- Gemini 2.0 Flash
- GPT-4o

## Code Status
All code is correctly configured:

✅ Backend: `packages/aria-agent/src/bytez/bytez.constants.ts` - Models defined
✅ Backend: `packages/aria-agent/src/tasks/tasks.controller.ts` - Models endpoint includes Bytez
✅ Backend: `packages/aria-agent/.env` - BYTEZ_API_KEY is set
✅ Frontend: `packages/aria-ui/src/types/index.ts` - GroupedModels includes bytez
✅ Frontend: `packages/aria-ui/src/components/models/ModelSelector.tsx` - Renders Bytez section

## Important Note
**Bytez models cannot perform computer use tasks** (screenshots, opening apps, etc.) because the Bytez API doesn't support function calling/tool use. They only output text descriptions of function calls instead of executing them.

For computer use tasks, use Google Gemini models which have full vision + tool calling support.
