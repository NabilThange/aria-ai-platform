import { BytebotAgentModel } from '../agent/agent.types';

export const GOOGLE_MODELS: BytebotAgentModel[] = [
  {
    provider: 'google',
    name: 'gemini-2.5-flash-lite',
    title: 'Gemini 2.5 Flash-Lite (Free Tier - Best)',
    contextWindow: 1000000,
  },
  {
    provider: 'google',
    name: 'gemini-2.5-flash',
    title: 'Gemini 2.5 Flash',
    contextWindow: 1000000,
  },
  {
    provider: 'google',
    name: 'gemini-2.5-pro',
    title: 'Gemini 2.5 Pro',
    contextWindow: 1000000,
  },
  {
    provider: 'google',
    name: 'gemini-1.5-flash',
    title: 'Gemini 1.5 Flash (Legacy)',
    contextWindow: 1000000,
  },
  {
    provider: 'google',
    name: 'gemini-1.5-pro',
    title: 'Gemini 1.5 Pro (Legacy)',
    contextWindow: 2000000,
  },
];

export const DEFAULT_MODEL = GOOGLE_MODELS[0];
