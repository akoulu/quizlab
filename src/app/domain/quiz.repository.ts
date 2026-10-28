import type { QuizId } from './quiz.types';
import type { Quiz } from './quiz.models';

export interface QuizRepository {
  getAll(): Promise<readonly Quiz[]>;
  getById(id: QuizId): Promise<Quiz | null>;
  save(quiz: Quiz): Promise<void>;
}
