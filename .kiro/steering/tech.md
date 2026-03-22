---
inclusion: always
---

# Technology Stack

## Backend
- **Framework**: NestJS (Node.js/TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Cache/State**: Redis (required for multi-agent system)
- **AI Providers**: Google Gemini 2.0, Anthropic Claude (via Bytez), Groq (Llama models)
- **Web Automation**: PinchTab (port 9867)
- **Desktop Control**: VNC + ariad service (port 9990)
- **Real-time**: Socket.io WebSockets
- **Logging**: Pino structured logging
- **Task Scheduling**: NestJS Schedule module

## Frontend
- **Framework**: Next.js 15+ with React 19
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI primitives
- **Real-time**: Socket.io client
- **VNC Viewer**: react-vnc for desktop visualization
- **Animations**: GSAP, Motion

## Desktop Environment
- **Base**: Ubuntu 22.04 with XFCE
- **Browser Automation**: PinchTab
- **VNC Server**: noVNC
- **Process Management**: Supervisor

## DevOps
- **Containers**: Docker & Docker Compose
- **Orchestration**: Kubernetes with Helm charts
- **CI/CD**: GitHub Actions
- **Deployment**: Railway, Docker, Kubernetes

## Common Commands

### Development Setup (3 Terminals Required)

**Terminal 1: Docker Services**
```bash
cd docker
docker-compose -f docker-compose.yml build aria-desktop
docker-compose -f docker-compose.yml up postgres redis aria-desktop -d
```

**Terminal 2: Backend**
```bash
cd packages/aria-agent
npm run start:dev
```

**Terminal 3: Frontend**
```bash
cd packages/aria-ui
npm run dev
```

### First-Time Setup
```bash
# Run database migrations (REQUIRED before starting backend)
cd packages/aria-agent
npx prisma migrate dev
npx prisma generate
```

### Build Commands
```bash
npm run build              # Build for production
npm run build:shared       # Build shared utilities
npm run start:prod         # Start production server
npm run lint               # Run ESLint with auto-fix
npm run format             # Format code with Prettier
```

### Database Commands
```bash
npx prisma migrate dev     # Run migrations in development
npx prisma migrate deploy  # Run migrations in production
npx prisma generate        # Generate Prisma client
npx prisma studio          # Open Prisma Studio GUI
```

### Testing
```bash
npm test                   # Run Jest tests
npm run test:watch         # Watch mode
npm run test:e2e           # End-to-end tests
npm run test:pinchtab      # PinchTab integration tests
```

### Service Ports
- 5432: PostgreSQL
- 6379: Redis
- 9867: PinchTab (web automation)
- 9990: Aria Desktop (VNC + ariad)
- 9991: Aria Agent (backend API)
- 9992: Aria UI (frontend)

### Health Checks
```bash
# Check Docker services
docker ps

# Check Desktop
curl http://localhost:9990

# Check PinchTab
curl http://localhost:9867/health

# Check Redis
docker exec aria-redis redis-cli ping

# Check PostgreSQL
docker exec aria-postgres pg_isready
```

## Environment Variables

### Backend (.env in packages/aria-agent)
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ariadb
REDIS_URL=redis://localhost:6379
ARIA_DESKTOP_BASE_URL=http://localhost:9990
PINCHTAB_BASE_URL=http://localhost:9867
GOOGLE_API_KEY=your_key_here
ENABLE_MULTI_AGENT=true
```

### Frontend (.env in packages/aria-ui)
```
ARIA_AGENT_BASE_URL=http://localhost:9991
ARIA_DESKTOP_VNC_URL=http://localhost:9990/websockify
```
