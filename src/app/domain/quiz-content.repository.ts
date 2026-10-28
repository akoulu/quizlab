import type { Question, Quiz } from './quiz.models';

export interface QuizContentRepository {
  saveQuestionAndQuiz(question: Question, quiz: Quiz): Promise<void>;
}
