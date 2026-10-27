import type {
  CategoryId,
  DifficultyId,
  QuizAnswer,
  QuizQuestion,
} from './quiz.types';

export interface QuizSettings {
  readonly category: CategoryId;
  readonly difficulty: DifficultyId;
  readonly questionCount: number;
}

export type QuizPhase =
  | 'idle'
  | 'playing'
  | 'answered'
  | 'completed';

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
