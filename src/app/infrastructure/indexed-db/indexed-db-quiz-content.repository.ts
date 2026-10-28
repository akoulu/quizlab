import { Injectable } from '@angular/core';

import type { QuizContentRepository } from '../../domain/quiz-content.repository';
import type { Question, Quiz } from '../../domain/quiz.models';

import { QUESTIONS_STORE, QUIZZES_STORE } from './quizlab.database';
import { QuizLabTransactionService } from './quizlab-transaction.service';

@Injectable({ providedIn: 'root' })
export class IndexedDbQuizContentRepository implements QuizContentRepository {
  constructor(private readonly transactionService: QuizLabTransactionService) {}

  async saveQuestionAndQuiz(question: Question, quiz: Quiz): Promise<void> {
    if (question.quizId !== quiz.id) {
      throw new Error('Question and quiz IDs do not match.');
    }

    if (!quiz.questionIds.includes(question.id)) {
      throw new Error('Quiz must reference the question being saved.');
    }

    await this.transactionService.run(
      [QUIZZES_STORE, QUESTIONS_STORE],
      'readwrite',
      (transaction) => {
        transaction.objectStore(QUESTIONS_STORE).put(question);
        transaction.objectStore(QUIZZES_STORE).put(quiz);
      },
    );
  }
}
