import type {
  CategoryId,
  DifficultyId,
  QuizAnswer,
  QuizAttemptId,
  QuizId,
  QuizQuestion,
  QuestionId,
  AnswerId,
} from './quiz.types';

export type QuizSource = 'builtin' | 'user';

export type QuizStatus = 'draft' | 'published' | 'archived';

export type QuizAttemptStatus = 'in_progress' | 'completed' | 'abandoned';

/**
 * A quiz owns its questions. questionIds define their display order.
 */
export interface Quiz {
  readonly id: QuizId;
  readonly title: string;
  readonly description: string;
  readonly source: QuizSource;
  readonly status: QuizStatus;
  readonly questionIds: readonly QuestionId[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

/**
 * A question belongs to exactly one quiz.
 */
export interface Question {
  readonly id: QuestionId;
  readonly quizId: QuizId;
  readonly category: CategoryId;
  readonly difficulty: DifficultyId;
  readonly text: string;
  readonly options: readonly AnswerOptionModel[];
  readonly correctAnswerId: AnswerId;
  readonly explanation?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface AnswerOptionModel {
  readonly id: AnswerId;
  readonly text: string;
}

/**
 * Immutable historical representation of a question at answer time.
 */
export interface QuestionSnapshot {
  readonly id: QuestionId;
  readonly text: string;
  readonly category: CategoryId;
  readonly difficulty: DifficultyId;
  readonly options: readonly AnswerOptionModel[];
  readonly correctAnswerId: AnswerId;
  readonly explanation?: string;
}

export interface AttemptAnswer {
  readonly questionId: QuestionId;
  readonly questionSnapshot: QuestionSnapshot;
  readonly selectedAnswerId: AnswerId;
  readonly isCorrect: boolean;
  readonly answeredAt: number;
}

export interface QuizSettings {
  readonly category: CategoryId;
  readonly difficulty: DifficultyId;
  readonly questionCount: number;
}

export type QuizPhase = 'idle' | 'playing' | 'answered' | 'completed';

export interface QuizSessionState {
  readonly phase: QuizPhase;
  readonly settings: QuizSettings;
  readonly questions: readonly QuizQuestion[];
  readonly currentQuestionIndex: number;
  readonly selectedAnswerId: string | null;
  readonly answers: readonly QuizAnswer[];
  readonly score: number;
  readonly startedAt: number | null;
  readonly finishedAt: number | null;
}

export interface QuizResult {
  readonly totalQuestions: number;
  readonly correctAnswers: number;
  readonly incorrectAnswers: number;
  readonly score: number;
  readonly percentage: number;
  readonly durationSeconds: number;
}

export interface QuizAttempt {
  readonly id: QuizAttemptId;
  readonly quizId: QuizId;
  readonly status: QuizAttemptStatus;
  readonly questionIds: readonly QuestionId[];
  readonly answers: readonly AttemptAnswer[];
  readonly startedAt: number;
  readonly finishedAt: number | null;
  readonly result: QuizResult | null;
}
