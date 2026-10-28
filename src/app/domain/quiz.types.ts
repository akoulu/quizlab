export type CategoryId = 'general' | 'science' | 'history' | 'technology';

export type DifficultyId = 'easy' | 'medium' | 'hard';

export type QuizId = string;
export type QuestionId = string;
export type AnswerId = string;
export type QuizAttemptId = string;

export interface AnswerOption {
  readonly id: AnswerId;
  readonly text: string;
}

/**
 * Legacy question shape used by the current quiz runtime.
 * Kept during the Stage 11 migration.
 */
export interface QuizQuestion {
  readonly id: QuestionId;
  readonly category: CategoryId;
  readonly difficulty: DifficultyId;
  readonly question: string;
  readonly options: readonly AnswerOption[];
  readonly correctAnswerId: AnswerId;
  readonly explanation?: string;
}

/**
 * Legacy answer shape used by the current quiz runtime.
 * Kept during the Stage 11 migration.
 */
export interface QuizAnswer {
  readonly questionId: QuestionId;
  readonly selectedAnswerId: AnswerId;
  readonly correctAnswerId: AnswerId;
  readonly isCorrect: boolean;
}
