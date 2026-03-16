# ARIA CONTEXTLETS

## What is Aria?

Aria is an open-source AI Desktop Agent. It's an AI that has its own computer to complete tasks for you. Unlike browser-only agents or traditional RPA tools, Aria comes with a full virtual desktop where it can use any application, download and organize files, log into websites, read and process documents, and complete complex multi-step workflows across different programs.

## The Problem

AI agents are stuck in browser tabs or API calls. They can't handle real-world workflows like "download invoices from 3 portals, extract data, and create a report" or "research LinkedIn posts and email me insights." Plus, they compromise your privacy by running everything in the cloud.

## The Solution

Aria gives AI its own complete desktop computer (a real VM) where it can open browsers, use applications, create files, process documents, and execute complex multi-step tasks autonomously. Just tell it what to do in plain English.

This isn't a browser use agent wrapper or browser plugin. Aria spins up an actual Virtual Machine that the AI controls. You watch it work in real-time through your browser—no 5-6 hour setup. Runs offline for privacy or online for cloud power. Control it from your phone anywhere.

## Real Examples

- **"Create a file called report.txt and write my meeting notes"** → Done from your phone
- **"Go to LinkedIn, analyze top 10 posts in marketing, email insights to xyz@email.com"** → AI does it all
- **"Download invoices from vendor portals, organize by date, create summary spreadsheet"** → Handles authentication, downloads, processing

Complete task autonomy with zero compromise. A powerful AI-driven computer you control from anywhere—desktop, laptop, or phone—while keeping all data local and private. It's like having a virtual assistant with their own computer who actually gets work done.

---

## 🚀 Core Features

### 1. Virtual Desktop Environment
- **Complete Ubuntu 22.04 with XFCE** desktop environment
- Pre-installed applications: Firefox, VS Code, Terminal, File Manager
- **Persistent environment** - installed programs stay available for future tasks
- Real-time desktop viewing via noVNC
- **Takeover mode** - take manual control when needed
- Resolution: 1024x768 (configurable)

### 2. Multi-Agent AI System (NEW!)
- **8 specialized AI agents** working together for maximum reliability
- **Intelligent task orchestration** - agents coordinate automatically
- **Smart error recovery** - 4-level escalation system handles failures
- **Cost-optimized execution** - right model for each job (~$0.24/task)
- **Real-time agent coordination** via Redis shared state
- **Transparent execution** - see which agent is working at any moment

### 3. AI-Powered Task Execution
- **Natural language task creation** - just describe what you need
- **Advanced AI integration** with multimodal capabilities
- **Vision capabilities** - AI analyzes screenshots to understand UI context
- **15+ computer use tools**: mouse control, keyboard input, screenshots, file operations
- **Extended thinking** with 24,576 token budget for complex reasoning
- **Multi-step workflow execution** across different applications

### 4. Advanced Planning & Reasoning
- **Intelligent task planning** - breaks down complex tasks into executable steps
- **Multi-path generation** - explores 2-3 different approaches before execution
- **Automatic replanning** - adapts when things don't go as expected
- **Token estimation** per step for cost optimization
- **Checkpoint system** before critical operations
- **Real-time plan updates** as tasks progress
- **Extended thinking mode** for complex problem-solving
- **Failure analysis** - learns from mistakes and tries alternative approaches

### 5. File & Document Processing
- **File upload support** - drop files directly onto tasks
- **Own file system** - download, organize, and process files
- **Document analysis** - read PDFs, spreadsheets, contracts
- **Cross-reference** information across multiple files
- **Extract data** from complex documents
- **Create new documents** based on analysis

### 6. Real-Time Interaction
- **Live desktop streaming** via WebSocket + VNC
- **Watch agent work** in real-time through the UI
- **Real-time WebSocket updates** for task progress
- **Interactive debugging** - see exactly what the agent sees
- **Takeover mode** - intervene when needed

### 7. Privacy & Security
- **Offline desktop mode** - run completely locally without cloud dependencies
- **Self-hosted deployment** - everything runs on your infrastructure
- **Data privacy** - no data leaves your environment
- **Password manager support** - 1Password, Bitwarden for secure authentication
- **Full control** over the environment and data

---

## 🤖 Multi-Agent Architecture (Revolutionary!)

### The 8 Specialized Agents

Aria uses a sophisticated multi-agent system where each agent has a specific role and optimal AI model:

1. **Clarifier Agent** (Groq GPT-OSS 20B)
   - Resolves ambiguity in user requests
   - Asks clarifying questions before execution
   - Fast response (user is waiting)
   - Ensures clear task understanding

2. **Orchestrator Agent** (Claude Opus 4.6)
   - The "brain" of the system
   - Creates detailed execution plans
   - Breaks complex tasks into steps
   - Handles replanning when needed
   - Most powerful model (bad plan = everything fails)

3. **Web Agent** (Groq GPT-OSS 120B)
   - Handles all browser-based tasks
   - Uses PinchTab for reliable web automation
   - Loops 15-20x per task
   - Optimized for structured web interactions

4. **Desktop Agent** (Claude Opus 4.6 - User Selectable)
   - Controls desktop applications
   - Uses mouse, keyboard, terminal
   - Vision-powered UI understanding
   - User can override model choice
   - Desktop is #1 failure point, needs best model

5. **Perception Agent** (Llama 4 Scout Vision)
   - Analyzes screenshots in real-time
   - Extracts UI state and clickable elements
   - Runs after every desktop action
   - Fast vision processing (Groq speed)
   - Fallback to Gemini 2.0 Flash

6. **Verifier Agent** (Groq GPT-OSS 20B)
   - Validates every action result
   - Strict JSON output guaranteed
   - Runs 20-30x per task
   - Cheapest + fastest for high-frequency checks
   - Triggers escalation on failures

7. **Recovery Agent** (Claude Sonnet 4.6)
   - Generates alternative strategies after failures
   - Creative problem-solving
   - Analyzes what went wrong
   - Suggests 2-3 different approaches
   - Prevents infinite loops

8. **Reporter Agent** (Groq GPT-OSS 20B)
   - Generates human-readable summaries
   - Tracks costs per agent
   - Logs execution history
   - Optional Telegram notifications
   - Zero reasoning needed, just formatting

### Intelligent Escalation System

**4-Level Failure Recovery:**

1. **Attempt 1**: Working agent retries with different approach
2. **Attempt 2**: Recovery Agent generates alternative strategies
3. **Attempt 3**: Orchestrator creates entirely new plan
4. **Attempt 4**: Notify user and pause for human intervention

This prevents infinite loops while maximizing success rate!

### Shared State Coordination

- **Redis-powered** shared state (<1ms latency)
- All agents read/write to common state
- Automatic 24-hour TTL on all data
- Persisted to PostgreSQL before expiration
- No cross-task data leakage
- Real-time agent coordination

### Cost Optimization

- **Target: ~$0.24 per task**
- Right model for each job:
  - Cheap + fast for loops (Verifier, Perception)
  - Expensive + smart for critical decisions (Orchestrator, Desktop)
  - Balanced for everything else
- Real-time cost tracking per agent
- Transparent cost breakdown in UI

---

## 🌟 Revolutionary Features

### Remote Desktop Control from Mobile
**Control a VM from your phone!**

Aria supports remote desktop access through Cloudflare tunneling:
- Run Aria desktop on `localhost:9990`
- Set up **free Cloudflare tunnel** to expose the desktop
- Configure the tunnel URL in your mobile app
- **Control a full VM computer from your phone!**
- Give tasks on mobile, watch agent execute on the VM
- Full desktop capabilities accessible from anywhere

**Use Case**: Write something on your phone, and Aria spins up a VM, controls that VM computer, and completes your task - all remotely!

### Offline Desktop Mode
**Complete privacy and local execution**

- Run Aria **completely offline** on your local machine
- No cloud dependencies required
- All AI processing happens locally (when using local models)
- Perfect for sensitive data and private workflows
- Desktop environment runs in Docker containers
- **Zero data transmission** to external servers

### Hybrid Cloud-Local Architecture
**Best of both worlds**

- **Desktop runs locally** for privacy and control
- **Agent can run in cloud** for scalability
- **Flexible deployment** - choose what runs where
- Connect local desktop to cloud agent via secure tunnels
- **Cost optimization** - only pay for what you need

---

## 🎯 Key Capabilities

### Complete Task Autonomy
- **Multi-agent coordination** for complex workflows
- Open browsers and navigate websites
- Handle authentication (including 2FA via password managers)
- Download files to local file system
- Organize and process downloaded files
- Execute multi-step workflows across applications
- **Automatic error recovery** with intelligent escalation
- **Adaptive replanning** when original approach fails

### Real Application Usage
- Use desktop applications (not just web interfaces)
- Run command-line tools and scripts
- Install new software as needed
- Configure applications for specific workflows
- Access any program available on Linux
- **Vision-powered UI understanding** for any application

### Multi-Application Workflows
- Coordinate actions across different programs
- Transfer data between applications
- Automate complex business processes
- Handle document workflows (read, process, create)
- Integrate with any desktop software
- **Seamless handoffs** between web and desktop tasks

### Intelligent Execution
- **Clarifies ambiguous requests** before starting
- **Verifies every action** automatically
- **Learns from failures** and tries alternatives
- **Transparent progress** - see which agent is working
- **Cost-aware** - optimizes model selection
- **Human-in-the-loop** when needed

---

## 🏗️ Architecture

### Components

1. **Virtual Desktop** (Port 9990)
   - Ubuntu 22.04 with XFCE
   - noVNC server for browser access
   - TigerVNC for display management
   - Pre-installed productivity tools

2. **Multi-Agent AI System** (Port 9991)
   - NestJS backend service
   - 8 specialized AI agents
   - Redis shared state coordination
   - Intelligent orchestration pipeline
   - 4-level escalation system
   - Real-time cost tracking

3. **Web UI** (Port 9992)
   - Next.js 15 frontend
   - Task management interface
   - Live desktop viewer
   - Real-time agent status
   - Cost breakdown visualization
   - File upload support

4. **Database & State**
   - PostgreSQL for persistent storage
   - Redis for real-time agent coordination
   - Prisma ORM
   - Automatic state persistence

### Multi-Agent Pipeline

**Sequential Execution Flow:**

```
User Input
    ↓
Clarifier Agent (resolve ambiguity)
    ↓
Orchestrator Agent (create plan)
    ↓
┌─────────────────────────────┐
│  For each step in plan:     │
│                             │
│  Web/Desktop Agent          │
│         ↓                   │
│  Verifier Agent             │
│         ↓                   │
│  Success? → Next step       │
│  Failure? → Escalate:       │
│    • Retry (attempt 1)      │
│    • Recovery (attempt 2)   │
│    • Replan (attempt 3)     │
│    • User help (attempt 4)  │
└─────────────────────────────┘
    ↓
Reporter Agent (summarize & notify)
    ↓
Task Complete
```

### Tech Stack

**Frontend:**
- Next.js 15+ (React 19)
- TypeScript
- Radix UI, Tailwind CSS
- Socket.io client
- react-vnc for desktop viewing
- GSAP, Motion for animations

**Backend:**
- NestJS 11
- TypeScript (Node.js 20)
- Multiple AI providers (Groq, Bytez/Claude, Google)
- Prisma ORM
- Socket.io, WebSockets
- Redis for agent coordination
- EventEmitter2 for real-time updates

**Infrastructure:**
- Docker & Docker Compose
- Ubuntu 22.04 with XFCE
- noVNC for browser-based access
- Redis 7.x for shared state
- PostgreSQL for persistence
- Railway, Google Cloud Run support

**AI Capabilities:**
- 8 specialized agents with optimal models
- Extended thinking: 24,576 tokens
- Vision and multimodal processing
- Real-time reasoning and planning
- Intelligent error recovery
- Cost-optimized execution

---

## 📱 Deployment Options

### 1. Local Development
```bash
docker-compose up
# Access at http://localhost:9992
```

### 2. Railway (One-Click)
- Click deploy button
- Add your AI API key
- Live in 2 minutes

### 3. Self-Hosted (Docker)
- Full control over infrastructure
- Run on your own servers
- Complete data privacy

### 4. Hybrid Deployment
- Desktop runs locally
- Agent runs in cloud
- Connected via Cloudflare tunnel

### 5. Mobile Remote Access
- Desktop on local/cloud VM
- Cloudflare tunnel for secure access
- Control from mobile device
- Full desktop capabilities remotely

---

## 🎨 Use Cases

### Business Process Automation
- Invoice processing and data extraction
- Multi-system data synchronization
- Report generation from multiple sources
- Compliance checking across platforms
- Vendor portal automation

### Development & Testing
- Automated UI testing
- Cross-browser compatibility checks
- Documentation generation with screenshots
- Code deployment verification
- Integration testing

### Research & Analysis
- Competitive analysis across websites
- Data gathering from multiple sources
- Document analysis and summarization
- Market research compilation
- Academic research automation

### Personal Productivity
- Email management and organization
- Document processing and filing
- Calendar and schedule management
- File organization and backup
- Web research and summarization

---

## 🔌 API Access

### REST API
```python
# Create task
requests.post('http://localhost:9991/tasks', json={
    'description': 'Download sales report and create summary'
})

# Upload files
files = {'files': open('contract.pdf', 'rb')}
requests.post('http://localhost:9991/tasks',
    data={'description': 'Review contract for dates'},
    files=files
)
```

### Direct Desktop Control
```bash
# Screenshot
curl -X POST http://localhost:9990/computer-use \
  -d '{"action": "screenshot"}'

# Click
curl -X POST http://localhost:9990/computer-use \
  -d '{"action": "click_mouse", "coordinate": [500, 300]}'
```

### WebSocket Events
- Real-time task updates
- Live desktop streaming
- Progress notifications
- Error handling

---

## 🎯 Target Users

- **Developers** building automation workflows
- **Teams** needing business process automation
- **QA Engineers** for automated testing
- **Researchers** conducting data analysis
- **Privacy-conscious users** needing offline AI
- **Mobile users** wanting remote VM control
- **Anyone** automating complex multi-step tasks

---

## 🚀 What Makes Aria Special?

1. **Full Desktop Environment** - Not just a browser, a complete computer
2. **Multi-Agent Intelligence** - 8 specialized AI agents coordinating seamlessly
3. **Self-Healing Execution** - Automatic error recovery with 4-level escalation
4. **Offline Capability** - Run completely locally for privacy
5. **Remote Mobile Control** - Control VMs from your phone via Cloudflare
6. **Advanced Planning** - Extended thinking and intelligent replanning
7. **Real-Time Viewing** - Watch agents work live with transparent status
8. **Cost-Optimized** - Right AI model for each job (~$0.24/task)
9. **Self-Hosted** - Complete control over your data
10. **Open Source** - Transparent, customizable, community-driven
11. **Flexible Deployment** - Local, cloud, or hybrid
12. **Natural Language** - Just describe what you need
13. **Persistent Environment** - Configurations and installs persist
14. **Vision-Powered** - AI sees and understands any UI
15. **Intelligent Recovery** - Learns from failures and adapts

---

## 🎉 The Vision

Give AI its own computer and see what it can do. Aria represents the future of AI agents - not limited to APIs or browser automation, but with access to a complete computing environment where it can truly work like a human assistant.

**What makes Aria special:**

- **Multi-agent intelligence** - 8 specialized agents working together
- **Self-healing execution** - automatic error recovery and replanning
- **Cost-optimized** - right model for each job (~$0.24/task)
- **Transparent** - see which agent is working in real-time
- **Reliable** - 4-level escalation prevents infinite loops
- **Flexible** - works offline, in cloud, or hybrid
- **Mobile-ready** - control from anywhere via Cloudflare tunnels

Whether you're automating business processes, conducting research, testing software, or just need help with complex tasks, Aria provides the infrastructure for AI to work autonomously with the same tools humans use every day.

**And now, with multi-agent coordination, Aria is smarter, more reliable, and more capable than ever before.**

---