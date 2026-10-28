import { Injectable } from '@angular/core';
import type { AttemptRepository } from '../../domain/attempt.repository';
import type { QuizAttempt } from '../../domain/quiz.models';
import type { QuizAttemptId, QuizId } from '../../domain/quiz.types';

import { ATTEMPTS_STORE } from './quizlab.database';
import { QuizLabDatabaseService } from './quizlab-database.service';
import { requestToPromise, transactionToPromise } from './indexed-db.helpers';

@Injectable({ providedIn: 'root' })
export class IndexedDbAttemptRepository implements AttemptRepository {
  constructor(private readonly databaseService: QuizLabDatabaseService) {}

  async getAll(): Promise<readonly QuizAttempt[]> {
    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction(ATTEMPTS_STORE, 'readonly');

    return requestToPromise<QuizAttempt[]>(transaction.objectStore(ATTEMPTS_STORE).getAll());
  }

  async getById(id: QuizAttemptId): Promise<QuizAttempt | null> {
    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction(ATTEMPTS_STORE, 'readonly');
    const attempt = await requestToPromise<QuizAttempt | undefined>(
      transaction.objectStore(ATTEMPTS_STORE).get(id),
    );

    return attempt ?? null;
  }

  async getByQuizId(quizId: QuizId): Promise<readonly QuizAttempt[]> {
    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction(ATTEMPTS_STORE, 'readonly');
    const index = transaction.objectStore(ATTEMPTS_STORE).index('quizId');

    return requestToPromise<QuizAttempt[]>(index.getAll(quizId));
  }

  async save(attempt: QuizAttempt): Promise<void> {
    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction(ATTEMPTS_STORE, 'readwrite');
    const completed = transactionToPromise(transaction);

    transaction.objectStore(ATTEMPTS_STORE).put(attempt);

    await completed;
  }
}
