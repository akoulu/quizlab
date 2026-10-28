import { Injectable } from '@angular/core';
import type { QuizRepository } from '../../domain/quiz.repository';
import type { Quiz } from '../../domain/quiz.models';
import type { QuizId } from '../../domain/quiz.types';

import { QUIZZES_STORE } from './quizlab.database';
import { QuizLabDatabaseService } from './quizlab-database.service';
import { requestToPromise, transactionToPromise } from './indexed-db.helpers';

@Injectable({ providedIn: 'root' })
export class IndexedDbQuizRepository implements QuizRepository {
  constructor(private readonly databaseService: QuizLabDatabaseService) {}

  async getAll(): Promise<readonly Quiz[]> {
    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction(QUIZZES_STORE, 'readonly');
    const request = transaction.objectStore(QUIZZES_STORE).getAll();

    return requestToPromise<Quiz[]>(request);
  }

  async getById(id: QuizId): Promise<Quiz | null> {
    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction(QUIZZES_STORE, 'readonly');
    const request = transaction.objectStore(QUIZZES_STORE).get(id);
    const quiz = await requestToPromise<Quiz | undefined>(request);

    return quiz ?? null;
  }

  async save(quiz: Quiz): Promise<void> {
    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction(QUIZZES_STORE, 'readwrite');

    const completed = transactionToPromise(transaction);
    transaction.objectStore(QUIZZES_STORE).put(quiz);

    await completed;
  }
}
