/**
 * OpenRouter API Constants
 * OpenRouter provides unified access to 400+ AI models through OpenAI-compatible API
 * Documentation: https://openrouter.ai/docs
 */

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export const DEFAULT_MODEL = {
  name: 'openai/gpt-oss-20b:free',
  provider: 'openrouter',
};

/**
 * Free models available on OpenRouter
 * These models have no cost but may have rate limits
 */
export const FREE_MODELS = [
  {
    name: 'openai/gpt-oss-120b:free',
    displayName: 'GPT OSS 120B (Free)',
    contextLength: 8192,
    description: 'Large open-source model, good for complex tasks',
  },
  {
    name: 'openai/gpt-oss-20b:free',
    displayName: 'GPT OSS 20B (Free)',
    contextLength: 8192,
    description: 'Fast open-source model, good for simple tasks',
  },
  {
    name: 'nvidia/nemotron-3-nano-30b-a3b:free',
    displayName: 'Nemotron 3 Nano 30B (Free)',
    contextLength: 4096,
    description: 'NVIDIA model optimized for efficiency',
  },
];
