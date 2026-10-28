import type { QuestionId, QuizId } from './quiz.types';
import type { Question } from './quiz.models';

export interface QuestionRepository {
  getById(id: QuestionId): Promise<Question | null>;
  getByQuizId(quizId: QuizId): Promise<readonly Question[]>;
  getByIds(ids: readonly QuestionId[]): Promise<readonly Question[]>;
  save(question: Question): Promise<void>;
  saveMany(questions: readonly Question[]): Promise<void>;
  delete(id: QuestionId): Promise<void>;
}
