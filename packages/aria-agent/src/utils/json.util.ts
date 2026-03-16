/**
 * Universal JSON extractor - handles markdown fences, prose, and raw JSON
 * Use this instead of JSON.parse() for all LLM responses
 */
export function extractJSON(content: string): any {
  if (!content?.trim()) {
    throw new Error('Empty response');
  }

  // Try raw JSON first (fastest path)
  try {
    return JSON.parse(content.trim());
  } catch {}

  // Strip ```json ... ``` or ``` ... ``` markdown fences
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
  }

  // Extract first { } block (handles prose + JSON like "Let me try... { ... }")
  const braceMatch = content.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {}
  }

  // Extract first [ ] block (for arrays)
  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  throw new Error('No valid JSON found in response');
}
