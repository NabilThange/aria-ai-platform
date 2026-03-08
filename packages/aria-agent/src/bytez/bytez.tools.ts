// Bytez doesn't support function calling in the same way as OpenAI/Anthropic
// We'll handle tools through text instructions in the system prompt instead
export const bytezTools: any[] = [];
