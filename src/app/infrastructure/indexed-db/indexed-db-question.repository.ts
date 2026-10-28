import { Injectable } from '@angular/core';
import type { QuestionRepository } from '../../domain/question.repository';
import type { Question } from '../../domain/quiz.models';
import type { QuestionId, QuizId } from '../../domain/quiz.types';

import { QUESTIONS_STORE } from './quizlab.database';
import { QuizLabDatabaseService } from './quizlab-database.service';
import { requestToPromise, transactionToPromise } from './indexed-db.helpers';

@Injectable({ providedIn: 'root' })
export class IndexedDbQuestionRepository implements QuestionRepository {
  constructor(private readonly databaseService: QuizLabDatabaseService) {}

  async getById(id: QuestionId): Promise<Question | null> {
    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction(QUESTIONS_STORE, 'readonly');
    const request = transaction.objectStore(QUESTIONS_STORE).get(id);
    const question = await requestToPromise<Question | undefined>(request);

    return question ?? null;
  }

  async getByQuizId(quizId: QuizId): Promise<readonly Question[]> {
    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction(QUESTIONS_STORE, 'readonly');
    const index = transaction.objectStore(QUESTIONS_STORE).index('quizId');

    return requestToPromise<Question[]>(index.getAll(quizId));
  }

  async getByIds(ids: readonly QuestionId[]): Promise<readonly Question[]> {
    if (ids.length === 0) {
      return [];
    }

    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction(QUESTIONS_STORE, 'readonly');
    const store = transaction.objectStore(QUESTIONS_STORE);

    // Queue all requests synchronously before awaiting any of them.
    const requests = ids.map((id) => requestToPromise<Question | undefined>(store.get(id)));

    const results = await Promise.all(requests);

    // Preserve the requested order and skip IDs that do not exist.
    return results.filter((question): question is Question => question !== undefined);
  }

  async save(question: Question): Promise<void> {
    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction(QUESTIONS_STORE, 'readwrite');
    const completed = transactionToPromise(transaction);

    transaction.objectStore(QUESTIONS_STORE).put(question);

    await completed;
  }

  async saveMany(questions: readonly Question[]): Promise<void> {
    if (questions.length === 0) {
      return;
    }

    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction(QUESTIONS_STORE, 'readwrite');
    const completed = transactionToPromise(transaction);
    const store = transaction.objectStore(QUESTIONS_STORE);

    try {
      for (const question of questions) {
        store.put(question);
      }
    } catch (error: unknown) {
      try {
        transaction.abort();
      } catch {
        // The transaction may already be inactive.
      }

      try {
        await completed;
      } catch {
        // Preserve the original write error.
      }

      throw error;
    }

    await completed;
  }

  async delete(id: QuestionId): Promise<void> {
    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction(QUESTIONS_STORE, 'readwrite');
    const completed = transactionToPromise(transaction);

    transaction.objectStore(QUESTIONS_STORE).delete(id);

    await completed;
  }
}
