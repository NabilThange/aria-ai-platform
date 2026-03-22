---
inclusion: always
---

# Project Structure

## Monorepo Layout

```
packages/
├── aria-agent/          Backend NestJS service
├── aria-ui/             Frontend Next.js application
├── ariad/               Desktop service (VNC + PinchTab)
├── aria-local-proxy/    Local development proxy
└── shared/              Shared types and utilities
```

## Backend Structure (packages/aria-agent/src/)

```
src/
├── agents/              9 specialized agents (Clarifier, Orchestrator, Web, Desktop, Workflow, etc.)
├── agent/               Core agent processor, tool definitions, scheduling
├── services/            PinchTab, Desktop, Workflow services
├── orchestration/       Multi-agent orchestration engine
├── tasks/               Task management, WebSocket gateway
├── config/              System prompts, agent configurations
├── groq/                Groq AI provider integration
├── google/              Google Gemini integration
├── bytez/               Anthropic Claude integration (via Bytez)
├── redis/               Redis service for shared state
├── prisma/              Database schema and migrations
├── firebase/            Firebase integration (optional)
├── workflows/           Pre-built workflow definitions
├── logger/              Pino logging configuration
├── messages/            Message management
└── notifications/       Telegram notifications (optional)
```

## Frontend Structure (packages/aria-ui/src/)

```
src/
├── app/                 Next.js app router
│   ├── dashboard/       Task dashboard pages
│   ├── tasks/           Task detail pages
│   ├── desktop/         Desktop viewer page
│   └── (landing)/       Landing pages
├── components/          Reusable React components
│   ├── tasks/           Task-related components
│   ├── messages/        Message display components
│   ├── vnc/             VNC viewer components
│   └── settings/        Settings UI
├── hooks/               Custom React hooks
│   ├── useAgentStatus   Agent status tracking
│   ├── useWebSocket     WebSocket connection
│   └── useSpeechToText  Speech-to-text integration
├── lib/                 Utilities
│   ├── socket           Socket.io client
│   ├── logger           Frontend logging
│   └── groq-key-manager Groq API key management
├── types/               TypeScript type definitions
└── constants/           UI constants and configurations
```

## Key Directories

- `docker/` - Docker Compose configurations for all services
- `helm/` - Kubernetes Helm charts for production deployment
- `docs/` - API documentation and guides
- `CONTEXT/` - Architecture documentation and startup guides
- `workflows/` - Pre-built workflow definitions (google-search, take-screenshot, etc.)
- `.github/workflows/` - CI/CD pipelines (build-agent, build-desktop, build-ui)

## File Naming Conventions

### Backend (NestJS)
- `*.module.ts` - Feature modules
- `*.service.ts` - Business logic services
- `*.controller.ts` - HTTP endpoint controllers
- `*.gateway.ts` - WebSocket gateways
- `*.dto.ts` - Data transfer objects
- `*.spec.ts` - Test files (co-located with source)

### Frontend (Next.js)
- `page.tsx` - Route pages
- `layout.tsx` - Layout components
- `loading.tsx` - Loading states
- `error.tsx` - Error boundaries
- `*.client.tsx` - Client components
- `*.server.tsx` - Server components

## Database Schema (Prisma)

Located in `packages/aria-agent/prisma/schema.prisma`:
- `Task` - Main task entity with status, priority, scheduling
- `Message` - Agent messages with Anthropic content blocks structure
- `Summary` - Hierarchical task summaries
- `File` - File attachments (base64 encoded)
- `AgentConfig` - Agent configurations

## Configuration Files

- `package.json` - Dependencies and scripts (in each package)
- `tsconfig.json` - TypeScript configuration
- `nest-cli.json` - NestJS CLI configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `docker-compose.yml` - Docker service definitions
- `Dockerfile` - Container build instructions (per package)
- `.env` - Environment variables (per package, not committed)
- `prisma/schema.prisma` - Database schema

## Important Patterns

### Feature-Based Organization
Each feature has its own module with services, controllers, and DTOs grouped together.

### Shared Utilities
Common code lives in `packages/shared/` and is imported by both backend and frontend.

### Tool Definitions
Agent tools are defined in `packages/aria-agent/src/agent/tools/` with JSON schemas for structured calling.

### Workflow Definitions
Reusable workflows are stored in `workflows/` directory as JSON files with step-by-step instructions.

### Multi-Agent Orchestration
Agent coordination logic is centralized in `packages/aria-agent/src/orchestration/` with Redis-based shared state.
