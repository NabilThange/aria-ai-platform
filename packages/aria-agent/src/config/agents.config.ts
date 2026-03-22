/**
 * Agent model configuration
 * Each agent has a fixed model assignment (no user override except Desktop Agent)
 * Based on Section 9.2 of architecture document
 */

export const AGENT_MODELS = {
  CLARIFIER: {
    provider: 'groq',
    model: 'openai/gpt-oss-20b',
    description: 'Fast Q&A, user is waiting',
  },
  ORCHESTRATOR: {
    provider: 'bytez',
    model: 'anthropic/claude-opus-4-6',
    description: 'Brain of system - bad plan = everything fails',
  },
  WEB: {
    provider: 'google',
    model: 'gemini-3.1-flash-lite-preview',
    description: 'Loops 15-20x, PinchTab gives structured text',
  },
  DESKTOP: {
    provider: 'bytez',
    model: 'anthropic/claude-sonnet-4-6', // Using Claude Sonnet (same as RECOVERY agent)
    description: 'User-overridable. Desktop = #1 failure point. Using Claude Sonnet.',
    userSelectable: true,
  },
  PERCEPTION: {
    provider: 'groq',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    description: 'Groq vision model, fast, runs every action',
  },
  VERIFIER: {
    provider: 'groq',
    model: 'openai/gpt-oss-20b',
    description: 'Runs 20-30x per task, strict JSON guaranteed',
    strictJson: true,
  },
  RECOVERY: {
    provider: 'bytez',
    model: 'anthropic/claude-sonnet-4-6',
    description: 'Needs creativity, smarter than Groq',
  },
  REPORTER: {
    provider: 'groq',
    model: 'openai/gpt-oss-20b',
    description: 'Reads state, writes summary - zero reasoning',
  },
  WORKFLOW: {
    provider: 'groq',
    model: 'openai/gpt-oss-20b',
    description: 'Executes pre-built workflows, fast execution',
  },
} as const;

export type AgentRole = keyof typeof AGENT_MODELS;
