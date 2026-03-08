export const DEFAULT_MODEL = {
  name: 'mistralai/mistral-small-3.1-24b-instruct:free',
  title: 'Mistral Small 3.1 24B (Free)',
  provider: 'openrouter',
  contextWindow: 128000,
};

export const OPENROUTER_MODELS = [
  DEFAULT_MODEL,
  {
    name: 'qwen/qwen3-vl-235b-a22b-thinking',
    title: 'Qwen3 VL 235B Thinking',
    provider: 'openrouter',
    contextWindow: 128000,
  },
];
