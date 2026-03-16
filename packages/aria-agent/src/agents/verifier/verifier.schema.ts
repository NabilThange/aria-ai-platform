/**
 * Verifier JSON Schema (Strict)
 * Used with Groq GPT-OSS 20B strict JSON mode
 * Section 9.3 of architecture document
 */

export const VERIFIER_SCHEMA = {
  type: 'object',
  properties: {
    action_succeeded: {
      type: 'boolean',
      description: 'Did the action complete successfully?',
    },
    screen_changed: {
      type: 'boolean',
      description: 'Did the screen/page state change after the action?',
    },
    error_detected: {
      type: 'boolean',
      description: 'Was an error message or failure state detected?',
    },
    error_message: {
      type: ['string', 'null'],
      description: 'Description of error if detected, null otherwise',
    },
    retry_recommended: {
      type: 'boolean',
      description: 'Should the action be retried with a different approach?',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence score for this verification (0.0 to 1.0)',
    },
  },
  required: [
    'action_succeeded',
    'screen_changed',
    'error_detected',
    'error_message',
    'retry_recommended',
    'confidence',
  ],
  additionalProperties: false,
} as const;

export interface VerifierResult {
  action_succeeded: boolean;
  screen_changed: boolean;
  error_detected: boolean;
  error_message: string | null;
  retry_recommended: boolean;
  confidence: number;
}
