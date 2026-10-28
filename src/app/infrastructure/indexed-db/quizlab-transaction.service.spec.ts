import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import { QuizLabDatabaseService } from './quizlab-database.service';
import { QuizLabTransactionService } from './quizlab-transaction.service';
import { requestToPromise } from './indexed-db.helpers';

describe('QuizLabTransactionService', () => {
  function createService(): QuizLabTransactionService {
    return new QuizLabTransactionService(new QuizLabDatabaseService());
  }

  it('commits writes across multiple object stores atomically', async () => {
    const service = createService();
    const quizId = `transaction-quiz-${crypto.randomUUID()}`;
    const questionId = `transaction-question-${crypto.randomUUID()}`;

    await service.run(['quizzes', 'questions'], 'readwrite', (transaction) => {
      transaction.objectStore('quizzes').put({
        id: quizId,
        title: 'Transaction test',
        description: '',
        source: 'user',
        status: 'draft',
        questionIds: [questionId],
        createdAt: 1,
        updatedAt: 1,
      });

      transaction.objectStore('questions').put({
        id: questionId,
        quizId,
        category: 'general',
        difficulty: 'easy',
        text: 'Test question',
        options: [
          { id: 'option-a', text: 'Option A' },
          { id: 'option-b', text: 'Option B' },
        ],
        correctAnswerId: 'option-a',
        createdAt: 1,
        updatedAt: 1,
      });
    });

    const db = await new QuizLabDatabaseService().getDatabase();
    const transaction = db.transaction(['quizzes', 'questions'], 'readonly');

    const quiz = await requestToPromise(transaction.objectStore('quizzes').get(quizId));
    const question = await requestToPromise(transaction.objectStore('questions').get(questionId));

    expect(quiz).toMatchObject({ id: quizId });
    expect(question).toMatchObject({ id: questionId, quizId });
  });

  it('aborts all writes when the operation throws', async () => {
    const service = createService();
    const quizId = `rollback-quiz-${crypto.randomUUID()}`;
    const questionId = `rollback-question-${crypto.randomUUID()}`;

    await expect(
      service.run(['quizzes', 'questions'], 'readwrite', (transaction) => {
        transaction.objectStore('quizzes').put({
          id: quizId,
          title: 'Must roll back',
          description: '',
          source: 'user',
          status: 'draft',
          questionIds: [questionId],
          createdAt: 1,
          updatedAt: 1,
        });

        transaction.objectStore('questions').put({
          id: questionId,
          quizId,
          category: 'general',
          difficulty: 'easy',
          text: 'Must roll back',
          options: [{ id: 'option-a', text: 'Option A' }],
          correctAnswerId: 'option-a',
          createdAt: 1,
          updatedAt: 1,
        });

        throw new Error('Simulated operation failure');
      }),
    ).rejects.toThrow('Simulated operation failure');

    const db = await new QuizLabDatabaseService().getDatabase();
    const transaction = db.transaction(['quizzes', 'questions'], 'readonly');

    const quiz = await requestToPromise(transaction.objectStore('quizzes').get(quizId));
    const question = await requestToPromise(transaction.objectStore('questions').get(questionId));

    expect(quiz).toBeUndefined();
    expect(question).toBeUndefined();
  });

  it('rejects when the transaction is explicitly aborted', async () => {
    const service = createService();

    await expect(
      service.run(['quizzes'], 'readwrite', (transaction) => transaction.abort()),
    ).rejects.toThrow();
  });

  it('rejects an empty object-store list', async () => {
    const service = createService();

    await expect(service.run([], 'readwrite', () => undefined)).rejects.toThrow(
      'At least one object store is required for a transaction.',
    );
  });
});
