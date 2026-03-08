export const DEFAULT_MODEL = {
  name: 'llama-3.1-8b-instant',
  title: 'Llama 3.1 8B Instant',
  provider: 'groq',
  contextWindow: 128000,
};

export const GROQ_MODELS = [
  DEFAULT_MODEL,
  {
    name: 'openai/gpt-oss-120b',
    title: 'GPT OSS 120B',
    provider: 'groq',
    contextWindow: 128000,
  },
  {
    name: 'meta-llama/llama-4-scout-17b-16e-instruct',
    title: 'Llama 4 Scout 17B',
    provider: 'groq',
    contextWindow: 128000,
  },
];
