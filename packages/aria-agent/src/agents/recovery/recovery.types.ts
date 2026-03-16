/**
 * RecoveryAgent Output Schema
 * Section 9.8 of architecture document
 */

export interface RecoveryStrategy {
  strategy: string;           // chosen strategy description
  avoid: string[];            // what NOT to try (already failed)
  approach: string;           // specific approach to take
  alternatives: Array<{       // other options considered
    strategy: string;
    score: number;            // 0.0 to 1.0
    reasoning: string;
  }>;
}
