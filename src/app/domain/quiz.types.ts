export type CategoryId =
  | 'general'
  | 'science'
  | 'history'
  | 'technology';

export type DifficultyId =
  | 'easy'
  | 'medium'
  | 'hard';

export type QuestionId = string;

export type AnswerId = string;

export interface AnswerOption {
  readonly id: AnswerId;
  readonly text: string;
}

export interface QuizQuestion {
  readonly id: QuestionId;
  readonly category: CategoryId;
  readonly difficulty: DifficultyId;
  readonly question: string;
  readonly options: readonly AnswerOption[];
  readonly correctAnswerId: AnswerId;
  readonly explanation?: string;
}

export interface QuizAnswer {
  readonly questionId: QuestionId;
  readonly selectedAnswerId: AnswerId;
  readonly correctAnswerId: AnswerId;
  readonly isCorrect: boolean;
}
