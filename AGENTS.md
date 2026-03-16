# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Aria is an open-source AI desktop agent system (forked from Bytebot). An AI controls a full Ubuntu virtual desktop to complete tasks autonomously. The system uses a multi-agent pipeline coordinated by a NestJS backend.

## Packages

| Package | Name in package.json | Port | Description |
|---|---|---|---|
| `packages/aria-ui` | `bytebot-ui` | 9992 | Next.js 15 frontend |
| `packages/aria-agent` | `bytebot-agent` | 9991 | NestJS AI orchestration service |
| `packages/ariad` | `bytebotd` | 9990 | NestJS daemon inside the virtual desktop container |
| `packages/shared` | `@bytebot/shared` | — | Shared TypeScript types/utils |
| `packages/aria-local-proxy` | `@aria/local-proxy` | — | Local HTTPS proxy for WebSocket connections |

## Commands

All commands must be run from within the specific package directory.

### aria-agent (`packages/aria-agent`)
```bash
npm run start:dev       # Dev mode with hot reload
npm run build           # Build (also builds shared first)
npm run test            # Run Jest unit tests
npm run test:watch      # Jest in watch mode
npm run test:cov        # Jest with coverage report
npm run test:e2e        # E2E tests (jest-e2e.json config)
npm run lint            # ESLint --fix
npm run format          # Prettier write
npm run prisma:dev      # Run DB migrations + generate Prisma client (dev)
npm run prisma:prod     # Deploy migrations + generate Prisma client (prod)
```

To run a single test file:
```bash
npx jest src/path/to/file.spec.ts
```

### aria-ui (`packages/aria-ui`)
```bash
npm run dev             # Dev server (builds shared, then tsx server.ts)
npm run build           # Production Next.js build
npm run lint            # next lint
```

### ariad (`packages/ariad`)
```bash
npm run start:dev       # Dev mode with hot reload
npm run build           # Build (also builds shared first)
npm run test            # Jest unit tests
npm run lint            # ESLint --fix
```

### shared (`packages/shared`)
```bash
npm run build           # tsc compile to dist/
npm run lint            # ESLint --fix
```

### Docker (from repo root)
```bash
docker-compose -f docker/docker-compose.yml up -d        # Start all services
docker-compose -f docker/docker-compose.yml build        # Build images
docker-compose -f docker/docker-compose.yml down         # Stop all services
```

## Architecture

### Multi-Agent Pipeline

`OrchestrationService` (`packages/aria-agent/src/orchestration/orchestration.service.ts`) runs a sequential pipeline for every task:

1. **Clarifier** — Understands user intent; may pause and request clarification via `NEEDS_HELP` status
2. **Orchestrator** — Creates/manages an `ExecutionPlan` (list of steps typed `web` or `desktop`); can replan on failure
3. **Web Agent** — Executes `web` steps using PinchTab for structured browser interaction
4. **Desktop Agent** — Executes `desktop` steps by calling ariad's computer-use API (mouse, keyboard, screenshot)
5. **Verifier** — Validates each step result; triggers escalation on failure
6. **Recovery** — Strategizes alternative approaches on step failure (escalation L2)
7. **Reporter** — Generates final task summary

Escalation levels per step: L1 retry → L2 Recovery → L3 Orchestrator replan → L4 task failure.

All agents extend `BaseAgent` (`packages/aria-agent/src/agents/base/base.agent.ts`) which provides `readState`/`writeState` helpers backed by Redis.

### Agent Model Assignments (`packages/aria-agent/src/config/agents.config.ts`)

| Agent | Provider | Model |
|---|---|---|
| Clarifier | Groq | `openai/gpt-oss-20b` |
| Orchestrator | Bytez | `anthropic/claude-opus-4-6` |
| Web | Google | `gemini-3-flash-preview` |
| Desktop | Bytez | `anthropic/claude-sonnet-4-6` (user-overridable via `AgentConfig` DB table) |
| Perception | Groq | `meta-llama/llama-4-scout-17b-16e-instruct` |
| Verifier | Groq | `openai/gpt-oss-20b` |
| Recovery | Bytez | `anthropic/claude-sonnet-4-6` |
| Reporter | Groq | `openai/gpt-oss-20b` |

### LLM Providers

- **Bytez** (`api.bytez.com/models/v2`) — unified API for Claude/Gemini/OSS models. Anthropic models use the native endpoint; others use the OpenAI-compatible endpoint. Supports multiple key rotation via `BytezKeyManagerService`.
- **Groq** — fast inference for high-frequency agents (Verifier runs 20-30x per task).
- **Google Gemini** — direct Gemini API for the Web Agent.

### Shared State (Redis)

`SharedStateService` stores task-scoped state in Redis under keys `task:{taskId}:{key}` with 24-hour TTL. All agents read/write through this service to pass data between pipeline stages (e.g., `task_goal`, `execution_plan`, `action_history`, `failure_log`).

### PinchTab (Browser Automation)

PinchTab runs inside the desktop container on port 9867. It provides a structured DOM API (snapshot, click, type, navigate) used by the Web Agent instead of raw VNC pixel manipulation. The `PinchTabService` manages task-scoped browser instances and handles 409-conflict instance reuse.

### ariad (Desktop Daemon)

Runs inside the Ubuntu 22.04/XFCE container. Exposes:
- `POST /computer-use` — mouse/keyboard/screenshot actions via `nut-js`
- `/websockify` — proxied VNC WebSocket (noVNC on port 6080)
- MCP server (`packages/ariad/src/mcp/`)

### aria-ui Server

`packages/aria-ui/server.ts` is a custom Express + Next.js server (not `next dev`). It proxies:
- `/api/proxy/tasks` → aria-agent Socket.IO (real-time task updates)
- `/api/proxy/websockify` → ariad VNC WebSocket (live desktop view)

The UI connects to aria-agent via Socket.IO for real-time status and to ariad via VNC for the live desktop view.

### Database (Prisma + PostgreSQL)

Schema at `packages/aria-agent/prisma/schema.prisma`. Core models:
- `Task` — describes a user task, its status, active agent, cost tracking, and the selected LLM model (`model` JSON field)
- `Message` — conversation messages using Anthropic content blocks format (JSON)
- `Summary` — hierarchical summaries of task messages
- `File` — base64-encoded file attachments on tasks
- `AgentConfig` — per-agent model overrides stored in DB

## Environment Variables

### aria-agent (`.env` or `.env.example`)
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ariadb
REDIS_URL=redis://localhost:6379
BYTEZ_API_KEY=...            # Primary LLM provider (Claude models)
GOOGLE_API_KEY=...           # Google Gemini
GROQ_API_KEY=...             # Groq fast inference
ARIA_DESKTOP_BASE_URL=http://localhost:9990   # ariad service
PINCHTAB_BASE_URL=http://localhost:9867       # PinchTab browser automation
PORT=9991
ENABLE_MULTI_AGENT=true
TELEGRAM_BOT_TOKEN=          # Optional: task completion notifications
TELEGRAM_CHAT_ID=            # Optional
```

### aria-ui (`.env.local`)
```
ARIA_AGENT_BASE_URL=http://localhost:9991
ARIA_DESKTOP_VNC_URL=ws://localhost:9990/websockify
NEXT_PUBLIC_API_URL=http://localhost:9991
```

## Key Conventions

- The shared package **must be built** before aria-agent or aria-ui will compile. The `start:dev` and `build` scripts in each package do this automatically via `cd ../shared && npm run build`.
- Model strings follow `provider/model-name` format (e.g., `anthropic/claude-opus-4-6`). Groq models are detected by `gpt-oss` or `llama-` substrings in `BytezService`.
- `fill()` in `PinchTabService` is deprecated — use `type()` instead.
- Task state keys stored in Redis: `task_goal`, `execution_plan`, `action_history`, `failure_log`, `current_step`, `clarification_question`, `status`.
