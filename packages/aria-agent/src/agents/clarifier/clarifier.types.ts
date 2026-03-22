/**
 * ClarifierAgent Output Schema
 * Conversational mode: ONE question per round, full history passed each time
 */

/** One completed back-and-forth turn between clarifier and user */
export interface ClarificationTurn {
  question: string;  // what the clarifier asked
  answer: string;    // what the user replied
}

/** Full accumulated Q&A history stored in Redis across rounds */
export type ClarificationHistory = ClarificationTurn[];

export interface ClarifiedTask {
  original_input: string;
  clarified_goal: string;
  constraints: string[];      // e.g., "only invoices from March"
  assumptions: string[];      // e.g., "assuming Gmail is already logged in"
  task_type: 'web' | 'desktop' | 'mixed';
  /** 0 = task is clear, proceed to orchestrator. 1 = need one more answer. */
  questions_asked: 0 | 1;
  /** Present only when questions_asked === 1 — exactly ONE question */
  question?: ClarificationQuestion;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'text' | 'choice' | 'confirm';
  choices?: string[];         // for choice type
  required: boolean;
  assumption?: string;        // what will be assumed if user doesn't answer
}

export interface ClarificationAnswer {
  questionId: string;
  answer: string;
}

export interface ClarificationSession {
  taskId: string;
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
  status: 'pending' | 'completed' | 'skipped';
}
