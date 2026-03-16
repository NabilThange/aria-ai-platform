export const DEFAULT_MODEL = {
  name: 'anthropic/claude-haiku-4-5',
  title: 'Claude Haiku 4.5',
  provider: 'bytez',
  contextWindow: 200000,
};

export const BYTEZ_MODELS = [
  DEFAULT_MODEL,
  {
    name: 'anthropic/claude-opus-4-6',
    title: 'Claude Opus 4',
    provider: 'bytez',
    contextWindow: 200000,
  },
  {
    name: 'anthropic/claude-sonnet-4-6',
    title: 'Claude Sonnet 4.6',
    provider: 'bytez',
    contextWindow: 200000,
  },
  {
    name: 'anthropic/claude-sonnet-4-5',
    title: 'Claude Sonnet 4.5',
    provider: 'bytez',
    contextWindow: 200000,
  },
  {
    name: 'google/gemini-2.0-flash',
    title: 'Gemini 2.0 Flash',
    provider: 'bytez',
    contextWindow: 1000000,
  },
  {
    name: 'openai/gpt-4o',
    title: 'GPT-4o',
    provider: 'bytez',
    contextWindow: 128000,
  },
];

