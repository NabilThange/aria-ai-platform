# Product Overview

ARIA (formerly Bytebot) is an open-source AI desktop agent platform that gives AI its own virtual computer to complete complex tasks autonomously.

## Core Concept

Unlike browser-only agents or traditional RPA tools, ARIA operates in a complete Ubuntu desktop environment where it can:
- Use any application (browsers, email clients, office tools, IDEs)
- Download and organize files with its own file system
- Handle authentication including 2FA via password managers
- Process documents, PDFs, and spreadsheets
- Complete multi-step workflows across different programs
- See the screen, move the mouse, and type like a human

## Multi-Agent Architecture

The system uses 9 specialized agents working sequentially:
- **CLARIFIER** (Groq): Understands user intent, asks clarifying questions
- **ORCHESTRATOR** (Claude Opus): Plans multi-step workflows, coordinates agents
- **WEB** (Gemini 3 Flash): Browser automation via PinchTab (30 tools)
- **DESKTOP** (Claude Sonnet): OS-level control via VNC and unified computer tool
- **WORKFLOW** (Groq): Executes pre-built workflows with variable filling
- **PERCEPTION** (Groq Llama): Analyzes screenshots and visual feedback
- **VERIFIER** (Groq): Validates task completion and success criteria
- **RECOVERY** (Claude Sonnet): Handles errors and implements retry strategies
- **REPORTER** (Groq): Summarizes results and generates reports

## Key Features

- **Complete Task Autonomy**: Give natural language instructions, AI handles the rest
- **Live Desktop Viewing**: Watch AI work in real-time via VNC stream
- **Takeover Mode**: Pause AI and control desktop manually when needed
- **File Processing**: Upload files directly to AI's desktop for analysis
- **Persistent Environment**: Install programs, save files, maintain state
- **Pre-built Workflows**: Reusable automation patterns (google-search, take-screenshot)
- **REST API**: Programmatic task creation and monitoring
- **Real-time Updates**: WebSocket events for agent status and progress

## Key Differentiators

- **PinchTab Integration**: 90% token savings vs screenshot-based automation (structured DOM with element refs)
- **Redis Shared State**: Inter-agent communication and context passing
- **Tool-Based Execution**: Structured LLM tool calling (not prompt-based)
- **Escalation Strategy**: 4-level failure recovery (retry → recovery agent → replan → fail)
- **Cost Optimization**: Model selection per task complexity (Groq for simple, Claude for complex)
- **Profile Persistence**: Browser sessions persist across restarts (cookies, localStorage)

## Use Cases

- **Business Process Automation**: Invoice processing, data extraction, form filling
- **Development & Testing**: UI testing, cross-browser checks, deployment verification
- **Research & Analysis**: Competitive analysis, document processing, data gathering
- **Content Management**: Social media posting, email management, file organization
