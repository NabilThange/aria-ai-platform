/**
 * ClarifierAgent Output Schema
 * Section 9.6 of architecture document
 */

export interface ClarifiedTask {
  original_input: string;
  clarified_goal: string;
  constraints: string[];      // e.g., "only invoices from March"
  assumptions: string[];      // e.g., "assuming Gmail is already logged in"
  task_type: 'web' | 'desktop' | 'mixed';
  questions_asked: number;    // how many clarifying questions were needed
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'text' | 'choice' | 'confirm';
  choices?: string[];         // for choice type
  required: boolean;
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
