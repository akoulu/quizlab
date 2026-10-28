import type { QuizAttemptId, QuizId } from './quiz.types';
import type { QuizAttempt } from './quiz.models';

export interface AttemptRepository {
  getAll(): Promise<readonly QuizAttempt[]>;
  getById(id: QuizAttemptId): Promise<QuizAttempt | null>;
  getByQuizId(quizId: QuizId): Promise<readonly QuizAttempt[]>;
  save(attempt: QuizAttempt): Promise<void>;
}
